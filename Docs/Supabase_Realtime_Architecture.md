# Supabase Realtime 실시간 멀티플레이어 설계도

> 작성일: 2026-03-22
> 기반 프로젝트: Mystery Crafter (`hooks/useMultiplayer.ts`)
> 목적: 다른 앱에서도 동일한 실시간 구조를 처음부터 올바르게 구축하기 위한 레퍼런스

---

## 1. 전체 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                        클라이언트 A                          │
│   React State ◄──► useRealtimeSession Hook                  │
│                         │                                    │
│          ┌──────────────┼──────────────┐                    │
│          ▼              ▼              ▼                    │
│      Broadcast    Postgres        Polling                   │
│      (빠른 경로)   Changes        (폴백)                    │
└──────────┼──────────────┼──────────────┼────────────────────┘
           │              │              │
           ▼              ▼              │
    Supabase Realtime  Supabase DB ◄─────┘
           │              │
           ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                        클라이언트 B                          │
│   React State ◄──► useRealtimeSession Hook                  │
└─────────────────────────────────────────────────────────────┘
```

**핵심 원칙: 3중 동기화 전략**

| 경로 | 속도 | 신뢰성 | 용도 |
|------|------|--------|------|
| Broadcast | 즉시 (~50ms) | 낮음 (UDP성) | 빠른 UI 반응 (턴 변경, 채팅) |
| Postgres Changes | 빠름 (~200ms) | 높음 | DB 변경 구독 (보장 경로) |
| Polling (2초) | 느림 | 확실 | 두 경로 모두 실패 시 최종 동기화 |

세 경로를 모두 쓰는 이유: Broadcast만 쓰면 신뢰성 부족, Postgres Changes만 쓰면 느림, 폴링만 쓰면 UI가 버벅임.

---

## 2. DB 스키마 설계

어떤 실시간 멀티플레이어 앱이든 기본적으로 이 3개 테이블 구조를 따른다.

```sql
-- 1. 세션 (방) 테이블
CREATE TABLE sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_code VARCHAR(8) UNIQUE NOT NULL,   -- 참여 코드 (예: "AB3K9Z")
    host_name   TEXT NOT NULL,                  -- 방장 식별자
    is_active   BOOLEAN DEFAULT false,          -- 게임 진행 중 여부

    -- 앱별로 추가하는 게임 상태 컬럼들
    current_turn_player TEXT,                   -- 현재 턴 플레이어 (턴제 게임)
    game_state  JSONB DEFAULT '{}',             -- 앱별 자유 상태 저장

    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. 참가자 테이블
CREATE TABLE session_players (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    is_ready    BOOLEAN DEFAULT false,

    -- 앱별 추가 데이터 (점수, 역할 등)
    score       INTEGER DEFAULT 0,

    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(session_id, player_name)             -- 같은 방에 같은 이름 불가
);

-- 3. 메시지/이벤트 테이블 (채팅, 행동 로그 등)
CREATE TABLE session_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    event_type  TEXT NOT NULL,    -- 'chat' | 'action' | 'system' 등 앱별 정의
    content     TEXT,
    metadata    JSONB DEFAULT '{}',  -- 앱별 추가 데이터
    created_at  TIMESTAMPTZ DEFAULT now()
);
```

### Supabase RLS (Row Level Security) 설정

```sql
-- RLS 활성화
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;

-- 익명 사용자도 읽기/쓰기 허용 (로그인 없는 멀티플레이)
CREATE POLICY "anyone can read sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "anyone can insert sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone can update sessions" ON sessions FOR UPDATE USING (true);

CREATE POLICY "anyone can read players" ON session_players FOR SELECT USING (true);
CREATE POLICY "anyone can upsert players" ON session_players FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone can delete players" ON session_players FOR DELETE USING (true);

CREATE POLICY "anyone can read events" ON session_events FOR SELECT USING (true);
CREATE POLICY "anyone can insert events" ON session_events FOR INSERT WITH CHECK (true);

-- Postgres Changes를 위한 publication 설정
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_events;
```

---

## 3. React Hook 설계 (`useRealtimeSession`)

모든 실시간 로직을 하나의 커스텀 훅으로 캡슐화한다.

### 3-1. Ref vs State 선택 기준

```
실시간 훅에서 가장 중요한 설계 결정:
"이 값을 Ref로 관리할까, State로 관리할까?"

State  → 바뀌면 컴포넌트를 리렌더해야 하는 값 (화면에 보이는 것)
Ref    → useCallback/useEffect 클로저 안에서 항상 최신값을 읽어야 하는 값
```

```typescript
// ✅ State로 관리: 화면에 표시되는 것들
const [session, setSession] = useState(null);
const [players, setPlayers] = useState([]);
const [messages, setMessages] = useState([]);
const [loading, setLoading] = useState(true);

// ✅ Ref로 관리: 콜백/이펙트 내부에서 최신값 접근용
const sessionRef = useRef(null);      // useCallback 안에서 최신 session 읽기용
const playersRef = useRef([]);        // useCallback 안에서 최신 players 읽기용
const channelRef = useRef(null);      // 채널 인스턴스 (리렌더마다 새로 만들지 않도록)
const isActionRef = useRef(false);    // 중복 실행 방지 lock

// Ref를 State와 동기화 (useEffect로)
useEffect(() => { sessionRef.current = session; }, [session]);
useEffect(() => { playersRef.current = players; }, [players]);
```

**왜 이게 중요한가?**

`useCallback`은 의존성 배열에 있는 값만 최신 상태로 본다.
`session`을 의존성에 넣으면 `session`이 바뀔 때마다 함수가 재생성된다.
`sessionRef.current`를 쓰면 의존성 없이 항상 최신값을 읽을 수 있다.

```typescript
// ❌ 잘못된 패턴: session이 바뀔 때마다 함수 재생성
const doAction = useCallback(async () => {
    console.log(session.id); // 클로저가 오래된 session을 봄
}, [session]);

// ✅ 올바른 패턴: ref로 항상 최신값
const doAction = useCallback(async () => {
    const current = sessionRef.current; // 항상 최신
    console.log(current.id);
}, []); // 의존성 없음
```

### 3-2. 채널 구독 구조

```typescript
const setupRealtime = async () => {
    // 1. 초기 데이터 로드 (한 번만)
    const { data: sess } = await supabase
        .from('sessions')
        .select('*')
        .eq('session_code', sessionCode)
        .single();

    // 2. 참가자 등록 (upsert로 중복 방지)
    await supabase.from('session_players').upsert(
        { session_id: sess.id, player_name: playerName },
        { onConflict: 'session_id, player_name' }
    );

    // 3. 채널 생성 (self: true = 내가 보낸 것도 내가 받음)
    const channel = supabase.channel(`room_${sess.id}`, {
        config: { broadcast: { self: true } }
    })

    // 4. Broadcast 구독 (빠른 경로)
    .on('broadcast', { event: 'state_update' }, ({ payload }) => {
        setSession(prev => ({ ...prev, ...payload })); // 부분 업데이트
    })

    // 5. Postgres Changes 구독 (보장 경로)
    .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sess.id}`
    }, ({ new: newSession }) => {
        setSession(newSession);
    })
    .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_events',
        filter: `session_id=eq.${sess.id}`
    }, ({ new: newEvent }) => {
        setEvents(prev => {
            if (prev.some(e => e.id === newEvent.id)) return prev; // 중복 방지
            return [...prev, newEvent];
        });
    })

    .subscribe();

    channelRef.current = channel;

    // 6. 입장 알림 브로드캐스트 (1초 후, 채널 준비 대기)
    setTimeout(() => {
        channel.send({
            type: 'broadcast',
            event: 'player_join',
            payload: { playerName }
        });
    }, 1000);
};
```

### 3-3. 중복 이벤트 방지 패턴

Broadcast와 Postgres Changes 두 경로가 모두 있으면 **같은 데이터가 두 번** 올 수 있다.
항상 ID 기반 중복 체크를 한다.

```typescript
// ❌ 잘못된 패턴: 중복 추가됨
setMessages(prev => [...prev, newMsg]);

// ✅ 올바른 패턴: ID로 중복 체크
setMessages(prev => {
    if (prev.some(m => m.id === newMsg.id)) return prev;
    return [...prev, newMsg];
});
```

### 3-4. 폴링 폴백

```typescript
useEffect(() => {
    if (!sessionCode) return;

    const poll = setInterval(async () => {
        const current = sessionRef.current;
        if (!current) return;

        const { data } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', current.id)
            .single();

        if (data) {
            setSession(prev => {
                // 실제로 변경된 필드가 있을 때만 업데이트 (리렌더 최소화)
                if (prev?.some_key === data.some_key &&
                    prev?.is_active === data.is_active) return prev;
                return data;
            });
        }
    }, 2000); // 2초마다

    return () => clearInterval(poll);
}, [sessionCode]);
```

---

## 4. 상태 변경 패턴: Optimistic Update + Rollback

**사용자 행동이 UI에 즉각 반영되어야 할 때** 항상 이 패턴을 쓴다.

```typescript
const performAction = useCallback(async (expectedCurrentState?: string) => {
    // 1. 중복 실행 방지
    if (isActionRef.current) return;
    isActionRef.current = true;

    try {
        const current = sessionRef.current;

        // 2. 현재 상태 검증 (다른 경로가 이미 변경했을 수 있음)
        if (expectedCurrentState && current.some_field !== expectedCurrentState) {
            return; // 예상과 다르면 실행 안 함
        }

        const nextState = computeNextState(current);

        // 3. Optimistic Update (DB 응답 전에 먼저 로컬 반영)
        setSession(prev => ({ ...prev, some_field: nextState }));

        // 4. 다른 클라이언트에 즉시 알림
        channelRef.current?.send({
            type: 'broadcast',
            event: 'state_update',
            payload: { some_field: nextState }
        });

        // 5. DB 업데이트
        const { error } = await supabase
            .from('sessions')
            .update({ some_field: nextState })
            .eq('id', current.id);

        // 6. 실패 시 롤백
        if (error) {
            setSession(prev => ({ ...prev, some_field: current.some_field }));
            return;
        }

    } finally {
        isActionRef.current = false; // 항상 lock 해제
    }
}, []);
```

---

## 5. 턴제 게임 전용 패턴

### 타이머 구조 (각 클라이언트 독립 카운트다운)

```typescript
const TURN_DURATION = 60; // 초

// 턴이 바뀌면 타이머 리셋
useEffect(() => {
    if (session?.current_turn_player) {
        setTimeLeft(TURN_DURATION);
    }
}, [session?.current_turn_player]);

// 독립 카운트다운 (한 번만 실행)
useEffect(() => {
    const timer = setInterval(() => {
        if (!sessionRef.current?.current_turn_player) return;
        setTimeLeft(prev => prev > -10 ? prev - 1 : prev);
    }, 1000);
    return () => clearInterval(timer);
}, []);
```

### 자동 턴 넘기기 (핵심 race condition 방지)

```typescript
// MultiplayerPlayer.tsx
const hasAutoPassedRef = useRef(false);
const lastTurnPlayerRef = useRef(null);

useEffect(() => {
    const currentTurnPlayer = session?.current_turn_player;
    if (!currentTurnPlayer) return;

    // 턴이 바뀌면 → 차단 상태로 시작 (타이머 리셋 전에 즉시 발동 방지)
    if (lastTurnPlayerRef.current !== currentTurnPlayer) {
        lastTurnPlayerRef.current = currentTurnPlayer;
        hasAutoPassedRef.current = true; // ← false가 아닌 true!
    }

    // 타이머가 리셋되어 양수임을 확인한 후에만 허용
    if (timeLeft > 10 && isMyTurn) {
        hasAutoPassedRef.current = false;
    }

    // 자동 넘기기 발동 조건
    if (!hasAutoPassedRef.current && timeLeft <= 0 && isMyTurn && !isProcessing) {
        hasAutoPassedRef.current = true;
        passTurn(playerName); // expectedCurrentPlayer 전달 필수
    }
}, [timeLeft, isMyTurn, isProcessing, passTurn, session?.current_turn_player]);
```

**왜 `true`로 시작하는가?**

```
잘못된 흐름 (false로 시작할 때):
  A 타이머 0 → passTurn() → B로 전환 → effect 재실행
  → hasAutoPassedRef = false (리셋)
  → B의 timeLeft도 0 → 즉시 다시 passTurn() → A로 돌아옴 ← 버그!

올바른 흐름 (true로 시작할 때):
  A 타이머 0 → passTurn() → B로 전환
  → hasAutoPassedRef = true (차단)
  → 타이머 리셋 → timeLeft = 60 → timeLeft > 10 → false로 해제
  → 정상 카운트다운 후 자동 넘기기 ← 정상!
```

---

## 6. 플레이어 입장/퇴장 동기화

새 플레이어가 들어올 때 기존 플레이어 목록에 보이지 않는 문제가 생긴다.
**상호 재공지(Mutual Re-announce)** 패턴으로 해결한다.

```typescript
// 새 플레이어 입장 수신
channel.on('broadcast', { event: 'player_join' }, ({ payload }) => {
    const { playerName: newPlayer } = payload;

    // 1. 새 플레이어를 내 목록에 추가
    setPlayers(prev => {
        if (prev.some(p => p.player_name === newPlayer)) return prev;
        return [...prev, { player_name: newPlayer }];
    });

    // 2. 새 플레이어가 나를 모를 수 있으니 내 존재도 다시 알림
    if (newPlayer !== playerName) {
        setTimeout(() => {
            channelRef.current?.send({
                type: 'broadcast',
                event: 'player_join',
                payload: { playerName }
            });
        }, 300); // 약간의 딜레이로 루프 방지
    }
});

// 채널 준비 후 입장 알림
setTimeout(() => {
    channelRef.current?.send({
        type: 'broadcast',
        event: 'player_join',
        payload: { playerName }
    });
}, 1000);
```

**호스트 보장**: 호스트는 세션 테이블에 `host_name`으로 기록되므로,
`session_players` RLS로 조회가 안 돼도 세션 데이터에서 호스트를 복원할 수 있다.

```typescript
const playersList = initPlayers || [];
// DB 조회 실패해도 host는 항상 포함
if (sess.host_name && !playersList.some(p => p.player_name === sess.host_name)) {
    playersList.unshift({ player_name: sess.host_name, is_host: true });
}
setPlayers(playersList);
```

---

## 7. 세션 종료 처리

```typescript
useEffect(() => {
    if (!session || session.is_active) return;
    if (resultState) return; // 이미 결과 처리 중

    // 종료 원인 판별: 승리 이벤트가 있으면 정상 종료, 없으면 강제 종료
    const victoryEvent = events.find(e => e.event_type === 'victory');

    if (victoryEvent) {
        setResultState({ winner: victoryEvent.metadata.winner });
    } else {
        // 이벤트가 아직 전파 안 됐을 수 있음 → 잠시 대기 후 재확인
        const timer = setTimeout(() => {
            const delayed = events.find(e => e.event_type === 'victory');
            if (delayed) {
                setResultState({ winner: delayed.metadata.winner });
            } else {
                navigate('/lobby'); // 강제 종료로 판단
            }
        }, 2000);
        return () => clearTimeout(timer);
    }
}, [session?.is_active, events, resultState]);
```

---

## 8. 클린업 (메모리 누수 방지)

```typescript
// 채널 구독 effect의 cleanup
return () => {
    // 채널 구독 해제
    if (channel) supabase.removeChannel(channel);
    channelRef.current = null;

    // 페이지 이탈 시 플레이어 제거
    window.removeEventListener('beforeunload', handleUnload);
    handleUnload();
};

// 브라우저 닫기/새로고침 처리
const handleUnload = () => {
    const current = sessionRef.current;
    if (current && playerName) {
        // 동기 요청으로 처리 (비동기면 브라우저가 닫혀서 실행 안 됨)
        supabase.from('session_players')
            .delete()
            .eq('session_id', current.id)
            .eq('player_name', playerName)
            .then(); // fire and forget
    }
};
window.addEventListener('beforeunload', handleUnload);
```

---

## 9. 실전 체크리스트

새 프로젝트에서 이 구조를 구현할 때 확인할 것들:

### DB 설정
- [ ] `sessions`, `session_players`, `session_events` 테이블 생성
- [ ] RLS 정책 설정 (익명 접근 허용 여부 결정)
- [ ] `supabase_realtime` publication에 테이블 추가
- [ ] `session_id, player_name` unique 제약 조건

### Hook 구현
- [ ] 화면에 보이는 값 → `useState`
- [ ] 콜백/이펙트 내부에서 읽는 값 → `useRef` + `useEffect`로 동기화
- [ ] 채널 구독 시 `self: true` 설정
- [ ] Broadcast + Postgres Changes 둘 다 구독 (3중 전략)
- [ ] 2초 폴링 폴백 구현
- [ ] 중복 이벤트 ID 체크

### 상태 변경 함수
- [ ] `useCallback`으로 메모이제이션
- [ ] 중복 실행 방지 `isActionRef` lock
- [ ] `expectedCurrentState` 검증 파라미터
- [ ] Optimistic Update → DB 업데이트 → 실패 시 롤백 순서
- [ ] `onClick={() => fn()}` 으로 이벤트 객체 전달 방지

### 턴제 게임 추가 체크
- [ ] 타이머 리셋 시 `hasAutoPassedRef = true` (차단 상태)로 시작
- [ ] `timeLeft > threshold` 확인 후에만 auto-pass 활성화
- [ ] 모든 `passTurn()` 호출에 `expectedCurrentPlayer` 전달

### 클린업
- [ ] `beforeunload` 이벤트로 플레이어 제거
- [ ] Effect cleanup에서 `supabase.removeChannel(channel)` 호출
- [ ] 타이머/인터벌 `clearInterval` 처리

---

## 10. 응용: 이 구조로 만들 수 있는 것들

| 앱 종류 | sessions 추가 컬럼 | events 타입 |
|---------|-------------------|-------------|
| 투표/설문 | `current_question`, `votes: JSONB` | `vote`, `result` |
| 실시간 퀴즈 | `current_question_idx`, `scores: JSONB` | `answer`, `score_update` |
| 화이트보드 협업 | `canvas_state: JSONB` | `draw`, `clear` |
| 경매 | `current_item`, `highest_bid` | `bid`, `sold` |
| 단어 게임 | `current_word`, `current_turn` | `guess`, `hint` |
| 라이어 게임 | `phase`, `votes: JSONB` | `vote`, `reveal` |

모두 동일한 Hook 구조(`useRealtimeSession`) 위에서, DB 컬럼과 이벤트 타입만 앱에 맞게 정의하면 된다.
