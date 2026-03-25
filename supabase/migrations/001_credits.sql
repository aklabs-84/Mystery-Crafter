-- ─────────────────────────────────────────
-- 크레딧 시스템 마이그레이션
-- Supabase SQL Editor에서 실행
-- ─────────────────────────────────────────

-- 1. profiles 테이블에 credits 컬럼 추가 (기본값 15)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 15;

-- 2. 신규 가입자에게 15 무료 크레딧 부여 (기존 유저 포함)
UPDATE profiles SET credits = 15 WHERE credits <= 5;

-- 3. 크레딧 거래 로그 테이블 (감사 추적용)
CREATE TABLE IF NOT EXISTS credit_transactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount      INTEGER NOT NULL,              -- 양수: 충전, 음수: 사용
    type        TEXT NOT NULL,                 -- 'purchase' | 'use' | 'free' | 'refund'
    description TEXT,                          -- 예: "AI 질문 1회", "10크레딧 구매"
    stripe_session_id TEXT,                    -- 결제 건 추적용
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 4. RLS 설정
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- 본인 거래 내역만 조회 가능
CREATE POLICY "users can read own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT는 Edge Function (service_role)만 가능 (클라이언트 직접 삽입 차단)
CREATE POLICY "service role can insert transactions"
  ON credit_transactions FOR INSERT
  WITH CHECK (false); -- 클라이언트 직접 INSERT 차단 (Edge Function이 service_role로 처리)

-- 5. profiles credits도 클라이언트 직접 수정 차단
-- (기존 UPDATE 정책이 있다면 credits 컬럼은 제외하도록 수정 필요)
-- Edge Function이 service_role로 차감 처리
