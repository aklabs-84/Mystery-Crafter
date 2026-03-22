# 멀티플레이 턴 시스템 버그 해결 기록

> 작성일: 2026-03-22
> 대상 파일: `hooks/useMultiplayer.ts`, `components/Player/MultiplayerPlayer.tsx`

---

## 개요

멀티플레이 턴 시스템을 구축하면서 반복적으로 마주친 버그들과 그 원인, 해결 방법을 정리한다.
핵심 원인은 대부분 **React 상태 업데이트의 비동기성**과 **여러 이벤트 소스가 동시에 passTurn()을 호출**하는 race condition이었다.

---

## Bug 1. 턴 넘기기 버튼이 동작하지 않음

### 증상
"턴 넘기기" 버튼을 눌러도 아무 반응이 없음.

### 원인
`passTurn()` 함수에 `expectedCurrentPlayer?: string` 파라미터를 추가한 이후,
버튼에 `onClick={passTurn}` 으로 연결했을 때 **React가 클릭 이벤트 객체(MouseEvent)를 첫 번째 인자로 전달**한다.

```ts
// passTurn 내부 가드 조건
if (expectedCurrentPlayer && currentSession.current_turn_player !== expectedCurrentPlayer) {
    return; // MouseEvent는 truthy → 항상 여기서 차단됨
}
```

`MouseEvent !== "아크"` 이므로 항상 조기 return → 버튼이 작동 안 함.

### 해결
```tsx
// 잘못된 코드
<button onClick={passTurn}>턴 넘기기</button>

// 올바른 코드
<button onClick={() => passTurn()}>턴 넘기기</button>
```

### 교훈
> **함수에 파라미터가 생기면 onClick 핸들러는 반드시 화살표 함수로 감싸야 한다.**
> `onClick={fn}` 은 이벤트 객체를 첫 인자로 넘기므로, 파라미터가 있는 함수에는 항상 위험하다.

---

## Bug 2. 질문 제출 후 턴이 4번 연속으로 튀는 현상

### 증상
질문을 제출하고 AI가 답변하면 정상적으로 한 번 넘어가야 하는데,
채팅창에 "턴이 ㅋㅋ → 아크 → ㅋㅋ → 아크" 처럼 4번 연속 turn-change 메시지가 나타남.

### 원인: 두 개의 passTurn() 경로가 충돌

타이머가 0이 된 시점과 handleAsk()가 완료되는 시점이 겹쳐서 `passTurn()`이 **두 번** 호출됨.

```
[타이머 0] → 자동 passTurn() 시작 → A→B 변경 → DB 완료 → lock 해제
[AI 응답 완료] → handleAsk()의 passTurn() 실행 →
    이때 sessionRef는 이미 B → B→A로 다시 넘김  ← 문제!
[B 클라이언트도 타이머 0] → 또 passTurn() → A→B
...
```

`isPassingTurnRef`(lock)는 첫 번째 passTurn이 완료된 후 해제되기 때문에,
몇 초 뒤 두 번째 호출을 막지 못함.

### 해결: expectedCurrentPlayer 가드 추가

`passTurn()`이 실행 시점에 세션의 현재 턴 플레이어를 검증하도록 함.

```ts
// useMultiplayer.ts
const passTurn = useCallback(async (expectedCurrentPlayer?: string) => {
    if (isPassingTurnRef.current) return;
    isPassingTurnRef.current = true;

    try {
        const currentSession = sessionRef.current;

        // 이미 다른 경로가 턴을 넘겼으면 차단
        if (expectedCurrentPlayer && currentSession.current_turn_player !== expectedCurrentPlayer) {
            console.log(`passTurn skipped: expected ${expectedCurrentPlayer}, current is ${currentSession.current_turn_player}`);
            return;
        }
        // ...
    } finally {
        isPassingTurnRef.current = false;
    }
}, []);
```

```ts
// MultiplayerPlayer.tsx - 호출 측
await passTurn(playerName); // handleAsk, handleSolveSubmit, 자동 넘기기 모두 동일
```

첫 번째 passTurn이 A→B로 세션을 바꾸면, 두 번째 호출 시점에 `sessionRef.current.current_turn_player`는 이미 B다.
`playerName(A) !== B` → 두 번째 호출이 차단됨.

### 교훈
> **async 함수의 lock(ref)은 함수 실행 중만 보호한다. 완료 후 연속 호출은 막지 못한다.**
> 상태가 이미 변경됐는지를 "현재 상태와 기대값 비교"로 검증하는 패턴이 필요하다.
> 멀티플레이어에서 여러 이벤트(타이머, 사용자 입력, 폴링)가 같은 함수를 부를 수 있는 경우,
> 항상 "지금 실행해도 유효한가?"를 함수 내부에서 검증해야 한다.

---

## Bug 3. 타이머 만료 시 자동 넘기기가 다시 자기에게 돌아오는 현상

### 증상
타이머가 0이 되면 다음 참가자에게 넘어가야 하는데, 즉시 다시 현재 플레이어에게 돌아옴.

### 원인: 두 클라이언트의 독립 타이머 + React 상태 업데이트 순서

두 클라이언트는 각각 독립적으로 45초 카운트다운을 한다.
플레이어 A의 타이머가 0에 도달해 자동 넘기기가 실행되면:

1. A의 세션: `current_turn_player = B` (optimistic update)
2. B의 클라이언트도 타이머가 거의 동시에 0임
3. B가 턴을 받는 순간, B의 effect에서: `isMyTurn = true`, `timeLeft = 0` → **즉시 자동 넘기기 발동!**
4. B → A로 다시 넘어감

**핵심**: React의 `useEffect`는 의존성 값이 바뀌면 재실행된다.
턴 변경 시 `hasAutoPassedRef = false`로 리셋하는 코드가,
타이머 리셋(`setTimeLeft(45)`)보다 먼저 실행되어 `timeLeft=0` 상태에서 auto-pass가 즉시 발동함.

```ts
// 문제가 된 코드
if (lastTurnPlayerRef.current !== currentTurnPlayer) {
    lastTurnPlayerRef.current = currentTurnPlayer;
    hasAutoPassedRef.current = false; // ← 리셋하는 순간 timeLeft=0이면 즉시 발동
}
if (timeLeft === 0 && isMyTurn && !hasAutoPassedRef.current) {
    passTurn(); // ← 바로 실행됨
}
```

### 해결: 턴 변경 시 차단 상태로 시작, 타이머 리셋 확인 후 해제

```ts
// 턴이 바뀌면 차단 상태로 시작
if (lastTurnPlayerRef.current !== currentTurnPlayer) {
    lastTurnPlayerRef.current = currentTurnPlayer;
    hasAutoPassedRef.current = true; // false 대신 true로 → 즉시 발동 방지
}

// 타이머가 실제로 리셋(45→ 감소)된 것을 확인한 후에만 해제
if (timeLeft > 10 && isMyTurn) {
    hasAutoPassedRef.current = false; // 이제 auto-pass 허용
}

if (!hasAutoPassedRef.current && timeLeft === 0 && isMyTurn && !isThinking) {
    hasAutoPassedRef.current = true;
    passTurn(playerName);
}
```

`timeLeft > 10`을 한 번이라도 확인해야만 auto-pass가 활성화된다.
턴을 막 받은 시점엔 타이머가 0이더라도 차단 상태이므로 즉시 발동하지 않는다.

### 교훈
> **독립 타이머를 쓰는 멀티플레이어에서 "상태 변경 직후 자동 실행"은 항상 위험하다.**
> 새 턴을 받은 직후엔 항상 "차단 상태"로 시작하고,
> 정상적인 조건(타이머 리셋 확인)을 만족한 후에만 기능을 활성화하는 패턴이 안전하다.

---

## Bug 4. 입력창이 턴을 넘긴 후에도 활성화된 채로 남아 있음

### 증상
턴을 넘겼는데 현재 플레이어의 입력창이 여전히 활성화되어 입력이 가능한 상태.

### 원인: DB 응답을 기다리는 동안 로컬 상태가 업데이트되지 않음

```ts
// 기존 코드 - DB 완료 후 상태 업데이트
await supabase.from('game_sessions').update({ current_turn_player: nextPlayer })
setSession(prev => ({ ...prev, current_turn_player: nextPlayer })); // 느림
```

`isMyTurn`은 `session.current_turn_player === playerName`으로 계산된다.
DB 응답이 올 때까지 (수백ms~수초) `session`이 업데이트되지 않으므로
그 사이에 `isMyTurn = true` 상태가 유지됨 → 입력창이 열려 있음.

### 해결: Optimistic Update (DB 응답 전에 로컬 상태 먼저 업데이트)

```ts
// 수정된 코드 - DB 호출 전에 먼저 로컬 상태 업데이트
setSession(prev => prev ? { ...prev, current_turn_player: nextPlayer } : prev); // 즉시!
channelRef.current?.send({ type: 'broadcast', event: 'turn_change', payload: { current_turn_player: nextPlayer } });

// DB는 그 다음에
const { error } = await supabase.from('game_sessions').update({ current_turn_player: nextPlayer })...
if (error) {
    // 실패 시 롤백
    setSession(prev => prev ? { ...prev, current_turn_player: currentSession.current_turn_player } : prev);
}
```

### 교훈
> **사용자에게 즉각적인 피드백이 중요한 UI는 Optimistic Update를 써야 한다.**
> DB가 느릴수록 사용자 경험이 나빠진다. 성공을 가정하고 먼저 업데이트,
> 실패 시 롤백하는 패턴이 실시간 멀티플레이어의 표준이다.

---

## Bug 5. 방장이 정답 화면 대신 게임 목록으로 튕겨 나감

### 증상
참가자가 정답을 맞추면 참가자는 승리 화면이 보이는데, 방장은 즉시 `/games`로 이동됨.

### 원인: 승리 메시지 도착 전에 세션 종료 감지

정답 제출 흐름:
```
handleSolveSubmit()
  → setGameResult({ winner }) // 로컬만 업데이트
  → DB: is_active = false     // 모든 클라이언트에 전파
  → DB: 시스템 메시지 insert  // 약간의 딜레이 있음
```

방장은 `is_active = false`를 받는 순간 effect가 실행된다.
이때 `[수사 완료]` 메시지가 아직 DB에서 도착하지 않았으면:

```ts
const victoryMsg = messages.find(m => m.content.includes('[수사 완료]'));
// victoryMsg = undefined → navigate('/games') 즉시 실행 ← 튕김!
```

### 해결: 2초 대기 후 재확인

```ts
useEffect(() => {
    if (!session || session.is_active) return;
    if (gameResult) return;

    const victoryMsg = messages.find(m => m.message_type === 'system' && m.content.includes('[수사 완료]'));
    if (victoryMsg) {
        const match = victoryMsg.content.match(/\[수사 완료\] (.+?) 탐정이/);
        setGameResult({ winner: match ? match[1] : '알 수 없음' });
    } else {
        // 메시지가 아직 안 도착했을 수 있음 → 2초 대기
        const timer = setTimeout(() => {
            const delayed = messages.find(m => m.content.includes('[수사 완료]'));
            if (delayed) {
                const match = delayed.content.match(/\[수사 완료\] (.+?) 탐정이/);
                setGameResult({ winner: match ? match[1] : '알 수 없음' });
            } else {
                navigate('/games'); // 2초 후에도 없으면 강제 폐쇄로 판단
            }
        }, 2000);
        return () => clearTimeout(timer);
    }
}, [session?.is_active, messages, gameResult, navigate]);
```

### 교훈
> **실시간 시스템에서 여러 DB 작업은 순서가 보장되지 않는다.**
> "A 이후 B가 와야 한다"는 가정 대신, "B가 아직 안 왔을 수 있다"는 가정으로 짜야 한다.
> 짧은 대기(setTimeout)로 비동기 전파 딜레이를 흡수하는 패턴이 유효하다.

---

## 전체 요약: 멀티플레이어 개발 시 체크리스트

| 체크 항목 | 이유 |
|-----------|------|
| `onClick={fn}` → `onClick={() => fn()}` | 이벤트 객체가 인자로 들어가는 것 방지 |
| passTurn 호출 시 `expectedCurrentPlayer` 전달 | 세션이 이미 바뀐 후 중복 호출 차단 |
| 새 턴 수신 시 auto-pass를 차단 상태로 시작 | 타이머 race condition 방지 |
| DB 호출 전 Optimistic Update | 즉각적인 UI 반응 |
| DB 여러 작업 후 상태 감지 시 딜레이 허용 | 메시지/세션 전파 순서 불일치 흡수 |
| async lock은 완료 후 재호출을 막지 못함 | 상태 기반 검증으로 보완 |
