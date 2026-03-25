# 프로젝트 작업 로그 (Phase 4)

## 📅 일시: 2026-02-26
## 🔍 작업 범위: API 키 유효성 검증 기능 구현 (Counselor & Solver)

---

### ✅ 구현 내용 (Implementation)

1. **API 키 검증 로직 추가 (`AIManager.ts`)**
   - `validateAPIKey` 정적 메서드 구현.
   - Google Gemini: `generateContent` API에 `maxOutputTokens: 1` 옵션으로 최소 요청 송신.
   - OpenAI GPT: `chat/completions` API에 `max_tokens: 1` 옵션으로 최소 요청 송신.
   - Anthropic Claude: `messages` API에 `max_tokens: 1` 옵션으로 최소 요청 송신.
   - 각 제공자별 에러 응답(401, 403 등)을 캣치하여 유효성 여부 판별.

2. **설정 단계 UI 개선 (`WizardPage.tsx`)**
   - Step 1 (AI 설정)의 각 제공자 카드 하단에 '키 검증하기' 버튼 추가.
   - `verifyingProvider` 상태를 통해 검증 중 로딩 애니메이션 및 버튼 비활성화 처리.
   - `handleVerifyKey` 함수를 통해 검증 프로세스 제어 및 결과 모달 연동.

3. **사용자 피드백 강화**
   - `MessageModal`을 활용하여 성공 시 초록색(INFO), 실패 시 빨간색(ALERT) 알림창 노출.
   - 에러 메시지에 구체적인 실패 원인(API 응답 메시지) 포함.

---

### 🐞 해결된 문제 (Fixed Issues)

- **검증 시 모델 ID 누락**: `activeModel`이 아닌 다른 제공자의 키를 검증할 때 적절한 기본 모델 ID(`AI_MODELS[provider][0].id`)를 사용하도록 수정.
- **모달 중첩 및 상태 관리**: 성공/실패 메시지가 사라진 후에도 모달이 남지 않도록 상태 초기화 로직 보강.

---

### 💡 향후 과제 (Next Steps)

- **키 입력 시 자동 검증**: 버튼 클릭뿐만 아니라 입력 필드 Focus Out 시 자동으로 유효성을 체크하는 옵션 검토.
- **키 유효기간 및 한도 표시**: 단순히 '유효함'을 넘어 남은 쿼터나 유효기간 정보가 있는 경우 이를 UI에 추가 표시 검토.

---

**기록자:** 서기 (Scribe)
