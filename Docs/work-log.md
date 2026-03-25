# 프로젝트 작업 로그 (Work Log)

## 일시
- **날짜**: 2026년 3월 25일
- **작성자**: 서기 (Scribe)

## 작업 개요
- **목표**: 게임 실행 화면(`GamePlayer`)의 테마 대응성 확보 및 튜토리얼 UI 개선
- **주요 내용**: 하드코딩된 다크 스타일 제거, 실시간 테마 토글 추가, 튜토리얼 오버레이 위치 버그 수정

## 상세 내역

### 1. 구현 (Implementation)
- **GamePlayer.tsx**:
    - `useTheme` 훅을 연동하여 전역 테마 상태에 따라 UI가 동적으로 변하도록 수정.
    - 상단 바(Top Bar)에 `ThemeToggle` 컴포넌트를 배치하여 게임 중에도 상시 테마 전환 가능하게 개선.
    - 배경, 사이드바, 카드, 텍스트 요소들에 테마 변수(`bg-background`, `text-foreground` 등) 적용.
- **TutorialOverlay.tsx**:
    - 튜토리얼 팝업창의 디자인을 테마 가변형(`bg-card`, `text-muted-foreground`)으로 변경.
    - 메시지 박스의 `left`, `top` 계산식에 `Math.min/max` 클램핑을 적용하여 뷰포트 밖으로 잘리는 현상 해결.
- **하위 컴포넌트**:
    - `InventoryBar.tsx`, `DialogueBox.tsx` 등 게임 플레이에 필수적인 하위 UI들의 색상값을 테마 변수로 치환.

### 2. 에러 및 해결 (Error & Solution)
- **문제**: 튜토리얼 시작 시 메시지 박스가 특정 해상도나 위치에서 화면 오른쪽 또는 아래쪽으로 잘려 보임.
- **원인**: 고정된 오프셋 계산 방식이 브라우저 윈도우 크기를 고려하지 않음.
- **해결**: `window.innerWidth`, `window.innerHeight`를 기준으로 팝업의 최소/최대 좌표를 제한하는 로직 추가.
- **수정 코드 예시**:
    ```tsx
    top: targetRect 
      ? (targetRect.top > window.innerHeight / 2 
          ? Math.max(20, targetRect.top - 280) 
          : Math.min(window.innerHeight - 300, targetRect.bottom + 40)) 
      : '50%'
    ```

### 3. 수정 사항 (Modifications)
- 전체 프로젝트 내 `text-muted` 클래스를 `text-muted-foreground`로 일괄 교체하여 라이트 모드에서의 가독성(대비비) 확보.
- 메인 홈 화면 및 스튜디오 페이지의 말풍선, 버튼 색상을 테마에 맞게 조정.

## 검증 결과 (Verification)
- 브라우저 서브에이전트를 통해 라이트/다크 모드 각각에서의 가독성 및 튜토리얼 위치 확인 완료.
- 테마 전환 시 모든 텍스트와 컨테이너가 즉각적으로 반응함.
- 튜토리얼 메시지 박스가 중앙 정렬 및 클램핑을 통해 모든 대상(Hotspot) 가리키기에서 온전하게 표시됨.

---
*본 로그는 다음 작업 시 참고를 위해 기록되었습니다.*
