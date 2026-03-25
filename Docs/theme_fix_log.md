# 테마 및 가독성 개선 작업 로그 (2026-03-25)

## 1. 개요
사용자의 피드백에 따라 라이트 모드 전환 시 배경 및 UI 요소가 제대로 변경되지 않는 버그를 수정하고, 텍스트 가독성 향상을 위해 Pretendard 폰트를 도입하였습니다.

## 2. 주요 수정 사항

### 디자인 매니저 (UI Polish - 디자이너)
- **Pretendard 폰트 도입**: `index.html`에 Google Fonts(Pretendard)를 추가하고, `index.css` 및 Tailwind 설정을 통해 전역 폰트를 교체하였습니다.
- **Theme-Aware UI 적용**: 하드코딩된 다크 모드 색상(`bg-black`, `bg-[#050505]`, `text-white`)을 CSS 변수(`bg-background`, `text-foreground`, `bg-card`, `border-border`)로 교체하였습니다.
- **디자인 시스템 변수 최적화**: 라이트 모드에서 `bg-muted` 색상이 너무 어둡게 설정되어 있어 버튼 가독성이 떨어지던 문제를 `index.css`의 `--muted` 값을 명도 조정을 통해 해결하였습니다.
- **가독성 최적화 (홈 화면)**: `GalleryPage`의 멀티플레이어 섹션 말풍선 대비를 라이트 모드에 최적화하여 시인성을 확보하였습니다.
- **사이드바 및 레이아웃 테마화**: `AdminLayout`, `EditorSidebar`, `GamePlayer` 사이드바 등 모든 레이아웃 요소에 Glassmorphism 2.0과 테마 변수를 적용하여 라이트 모드에서도 프리미엄한 디자인을 유지하도록 개선하였습니다.
- **시각적 완성도 향상**: 라이트 모드에서도 프리미엄한 느낌을 유지할 수 있도록 `bg-card/80`, `backdrop-blur`, `shadow-sm` 등을 적재적소에 활용하였습니다.

### 작업자 (Relector - 작업자)
- **페이지 리팩토링**: `GalleryPage.tsx`, `GamesPage.tsx`, `GamePlayerPage.tsx`, `StudioPage.tsx`의 컨테이너 스타일을 테마 변수 기반으로 전환하였습니다.
- **컴포넌트 테마화**: `GamePlayer.tsx`, `QuickModePlayer.tsx`, `DialogueBox.tsx`, `MessageModal.tsx` 등 핵심 게임 플레이 및 공통 UI 요소의 오버레이, 사이드바, 입력창 스타일을 수정하였습니다.

### 해결사 (Fix - 해결자)
- **라이트 모드 고립 배경 버그 해결**: 테마 토글 시에도 배경이 검은색으로 유지되던 전역 레이아웃 문제를 해결하였습니다.
- **폰트 렌더링 최적화**: Pretendard 폰트 적용 시 한글 가독성이 떨어지지 않도록 `font-pretendard` 클래스를 주요 텍스트 요소에 명시적으로 추가하였습니다.

## 3. 구현 세부 내용
- **`index.html`**: Pretendard 웹폰트 로드 스크립트 추가.
- **`index.css`**: `:root`와 `.dark` 섹션의 CSS 변수값 최적화.
- **`GalleryPage.tsx`**: 갤러리 그리드 및 카드 배경 수정, 멀티플레이어 섹션 말풍선 가독성 개선.
- **`AdminLayout.tsx`**: 관리자 페이지 전역 레이아웃 및 사이드바 테마 대응.
- **`EditorSidebar.tsx` / `GamePlayer.tsx`**: 에디터 및 플레이어 사이드바의 하바코딩 스타일 제거 및 디자인 시스템 적용.
- **`GamesPage.tsx`**: 게임 목록 배경 및 태그 스타일 수정.
- **`StudioPage.tsx`**: 메인 홈, 생성/수정 모달, 에셋 피커 등 스튜디오 전체 페이지 테마 대응 및 리팩토링.
- **`MessageModal.tsx`**: 공통 알림/확인 창의 디자인 시스템 변수 적용.
- **`GamePlayer.tsx`**: 사이드바, 퍼즐창, 조사창, 결과창 등 모든 UI 요소 테마화.

## 4. 향후 참고 사항
- 향후 새로운 UI 컴포넌트 제작 시, 절대값(ex: `bg-zinc-900`) 대신 테마 변수(ex: `bg-card`)를 우선적으로 사용해야 합니다.
- 다크/라이트 모드 전환 시 부드러운 전이를 위해 `transition-colors duration-300` 클래스를 적극 활용 권장합니다.
