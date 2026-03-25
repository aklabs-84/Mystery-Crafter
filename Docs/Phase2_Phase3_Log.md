# 프로젝트 작업 로그 (Phase 2 & 3)

## 📅 일시: 2026-02-26
## 🔍 작업 범위: 스튜디오 제작 편의성 향상 및 시각적 맵 구현

---

### ✅ 구현 내용 (Implementation)

1. **AI Assistant 통합 (Phase 2)**
   - `AIManager.ts`에 `generateDescription`, `generateImagePrompt` 메서드 추가.
   - `ItemEditor`, `NPCEditor`, `SceneEditor`에 AI 추천 버튼 UI/UX 적용.
   - Gemini API를 활용한 미스터리 스타일의 자동 텍스트 생성 로직 구축.

2. **인터랙션 템플릿 (Phase 2)**
   - `SceneEditor`의 Hotspot 관리 기능 내 '템플릿' 메뉴 신규 도입.
   - '잠긴 상자 & 열쇠', '숫자 퍼즐', '단서 발견' 등 3종의 복합 로직 생성 기능 구현.
   - `onUpdateProject` 프롭을 통해 전역 `GameData`를 실시간으로 업데이트하여 새로운 아이템 생성을 지원함.

3. **시각적 맵 (Phase 3)**
   - `VisualMap.tsx` 컴포넌트 신규 제작.
   - SVG `line`과 `marker`를 활용한 장소 간 이동 경로 시각화.
   - 노드 클릭 시 `GameEditor`의 탭과 선택 ID를 변경하여 해당 장소로 즉각 이동하는 내비게이션 기능 구현.

4. **다국어 지원 (Global)**
   - 모든 신규 UI 문자열을 `translations.ts`에 등록 (`KO`, `EN`).
   - AI 추천 버튼 시 loading 상태 및 에러 핸들링 번역 적용.

---

### 🐞 해결된 문제 (Fixed Issues)

- **장소 에디터 린트 에러**: `onUpdateProject` 프롭 미전달 및 오타(`Broadway`) 제거.
- **이미지 생성 API 키 체크**: API 키가 없을 경우 모달을 띄워 입력을 유도하고, 입력 후 지연된 작업을 실행하는 `pendingAction` 로직 안정화.
- **GameEditor 중복 Import**: `NPCEditor`가 중복으로 임포트되어 발생하던 빌드 에러 수정.
- **사이드바 내비게이션 연동**: 사이드바에서 '시각적 맵' 선택 시 에디터 메인 영역의 탭이 `MAP`으로 올바르게 전환되지 않던 문제 해결.

---

### 💡 향후 과제 (Next Steps)

- **맵 드래그 앤 드롭**: 현재는 고정된 그리드 레이아웃이나, 사용자가 직접 노드 위치를 변경할 수 있는 기능 검토.
- **엣지 라우팅 최적화**: 화살표가 장소 노드를 가리지 않도록 베지어 곡선(Bezier Curve) 방식 도입 검토.
- **대규모 프로젝트 성능**: 장소가 매우 많아질 경우(`100개 이상`) SVG 렌더링 성능 최적화 필요.

---

**기록자:** 서기 (Scribe)
