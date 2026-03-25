# 토스페이먼츠 결제 연동 가이드

> Mystery Crafter 크레딧 충전 시스템을 Stripe에서 토스페이먼츠로 전환하기 위한 전체 구현 가이드

---

## 목차

1. [현재 구조 (Stripe)](#1-현재-구조-stripe)
2. [토스페이먼츠 선택 이유](#2-토스페이먼츠-선택-이유)
3. [사전 준비](#3-사전-준비)
4. [결제 흐름 설계](#4-결제-흐름-설계)
5. [프론트엔드 구현](#5-프론트엔드-구현)
6. [Supabase Edge Function 구현](#6-supabase-edge-function-구현)
7. [환경변수 설정](#7-환경변수-설정)
8. [테스트 체크리스트](#8-테스트-체크리스트)
9. [운영 전환 체크리스트](#9-운영-전환-체크리스트)

---

## 1. 현재 구조 (Stripe)

```
[클라이언트] purchaseCredits(packageId)
    → [Edge Function: create-checkout]  Stripe Checkout 세션 생성 → URL 반환
    → [브라우저] Stripe 결제 페이지로 이동
    → [결제 완료] Stripe → [Edge Function: stripe-webhook] → 크레딧 지급
```

**현재 관련 파일:**
- `hooks/useCredits.ts` — `purchaseCredits()` 호출
- `supabase/functions/create-checkout/index.ts` — Stripe 세션 생성
- `supabase/functions/stripe-webhook/index.ts` — 결제 완료 후 크레딧 지급
- `components/Credits/PurchaseModal.tsx` — UI

---

## 2. 토스페이먼츠 선택 이유

| 항목 | Stripe | 토스페이먼츠 |
|------|--------|-------------|
| 한국 카드 결제 | 제한적 | 완전 지원 |
| 카카오페이 | 불가 | 지원 |
| 네이버페이 | 불가 | 지원 |
| 수수료 | 2.9% + $0.30 | 1.5~3.3% (협의) |
| 원화 정산 | 환율 변환 필요 | 원화 직접 정산 |
| 한국어 지원 | 미흡 | 완전 지원 |

---

## 3. 사전 준비

### 3-1. 토스페이먼츠 개발자 계정 가입
1. https://developers.tosspayments.com 접속
2. 회원가입 → 개발자 센터 로그인
3. 내 개발정보 → API 키 확인

### 3-2. API 키 발급
```
테스트 클라이언트 키:  test_ck_...
테스트 시크릿 키:      test_sk_...

실제 클라이언트 키:    live_ck_...
실제 시크릿 키:        live_sk_...
```

### 3-3. 웹훅 등록 (토스페이먼츠 대시보드)
- 웹훅 URL: `https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/toss-webhook`
- 이벤트: `PAYMENT_STATUS_CHANGED`

---

## 4. 결제 흐름 설계

```
[1] 사용자가 패키지 선택 (PurchaseModal)
        ↓
[2] 클라이언트: 토스페이먼츠 SDK로 결제 요청
    - orderId 생성: `mc_{userId}_{packageId}_{timestamp}`
    - orderName: "Mystery Crafter - 60 크레딧"
    - amount: 4900
        ↓
[3] 토스페이먼츠 결제창 표시 (팝업 또는 리다이렉트)
        ↓
[4] 결제 완료 → successUrl로 리다이렉트
    - paymentKey, orderId, amount 쿼리파라미터 수신
        ↓
[5] 클라이언트: toss-confirm Edge Function 호출
    - paymentKey, orderId, amount 전달
        ↓
[6] Edge Function: 토스페이먼츠 /confirm API 호출 (서버사이드)
    - 결제 검증
    - 크레딧 지급
    - credit_transactions 기록
        ↓
[7] 완료 응답 → 클라이언트 크레딧 갱신 표시
```

---

## 5. 프론트엔드 구현

### 5-1. 토스페이먼츠 SDK 설치

```bash
npm install @tosspayments/tosspayments-sdk
```

또는 CDN (index.html):
```html
<script src="https://js.tosspayments.com/v1/payment"></script>
```

### 5-2. useCredits.ts 수정

`purchaseCredits` 함수를 Stripe → 토스페이먼츠로 교체:

```typescript
// hooks/useCredits.ts

import { loadTossPayments } from '@tosspayments/tosspayments-sdk';

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY;

const purchaseCredits = useCallback(async (packageId: 'starter' | 'popular' | 'pro') => {
    if (!user) return;

    const PACKAGES = {
        starter: { credits: 20,  amount: 1900,  name: '입문 탐정 - 20 크레딧' },
        popular: { credits: 60,  amount: 4900,  name: '베테랑 탐정 - 60 크레딧' },
        pro:     { credits: 200, amount: 14900, name: '수석 탐정 - 200 크레딧' },
    };

    const pkg = PACKAGES[packageId];
    const orderId = `mc_${user.id.slice(0, 8)}_${packageId}_${Date.now()}`;

    const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);

    await tossPayments.requestPayment('카드', {
        amount: pkg.amount,
        orderId,
        orderName: `Mystery Crafter - ${pkg.name}`,
        customerName: user.email || '탐정',
        successUrl: `${window.location.origin}/payment/success?packageId=${packageId}`,
        failUrl: `${window.location.origin}/payment/fail`,
    });
}, [user]);
```

### 5-3. 결제 성공 페이지 (PaymentSuccessPage.tsx)

```typescript
// pages/PaymentSuccessPage.tsx

import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const PaymentSuccessPage = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const confirm = async () => {
            const paymentKey = params.get('paymentKey');
            const orderId    = params.get('orderId');
            const amount     = params.get('amount');
            const packageId  = params.get('packageId');

            if (!paymentKey || !orderId || !amount) return;

            const { data: { session } } = await supabase.auth.getSession();

            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toss-confirm`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ paymentKey, orderId, amount: parseInt(amount), packageId }),
                }
            );

            const result = await res.json();
            if (result.success) {
                navigate('/games?credits=success');
            } else {
                navigate('/payment/fail?reason=' + result.error);
            }
        };

        confirm();
    }, []);

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
            <div className="text-center space-y-4">
                <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-zinc-400">결제를 확인하는 중...</p>
            </div>
        </div>
    );
};

export default PaymentSuccessPage;
```

### 5-4. routes.tsx에 라우트 추가

```typescript
// routes.tsx에 추가
{ path: '/payment/success', element: <PaymentSuccessPage /> },
{ path: '/payment/fail',    element: <PaymentFailPage /> },
```

---

## 6. Supabase Edge Function 구현

### 6-1. toss-confirm (결제 확인 + 크레딧 지급)

파일 위치: `supabase/functions/toss-confirm/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 패키지별 크레딧 정의
const PACKAGES: Record<string, { credits: number; amount: number }> = {
    starter: { credits: 20,  amount: 1900  },
    popular: { credits: 60,  amount: 4900  },
    pro:     { credits: 200, amount: 14900 },
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. 유저 인증
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: '로그인이 필요합니다.' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const supabaseUser = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabaseUser.auth.getUser();
        if (!user) {
            return new Response(JSON.stringify({ error: '인증 실패' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 2. 요청 파싱
        const { paymentKey, orderId, amount, packageId } = await req.json();
        const pkg = PACKAGES[packageId];

        if (!pkg) {
            return new Response(JSON.stringify({ error: '유효하지 않은 패키지' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 3. 금액 검증 (위변조 방지)
        if (amount !== pkg.amount) {
            return new Response(JSON.stringify({ error: '결제 금액 불일치' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 4. 토스페이먼츠 결제 확인 API 호출
        const tossSecretKey = Deno.env.get('TOSS_SECRET_KEY')!;
        const encoded = btoa(`${tossSecretKey}:`);

        const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${encoded}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ paymentKey, orderId, amount }),
        });

        if (!tossRes.ok) {
            const err = await tossRes.json();
            console.error('토스페이먼츠 confirm 실패:', err);
            return new Response(JSON.stringify({ error: err.message || '결제 확인 실패' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const payment = await tossRes.json();

        // 5. 중복 처리 방지 (orderId로 기존 처리 여부 확인)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { data: existing } = await supabaseAdmin
            .from('credit_transactions')
            .select('id')
            .eq('toss_order_id', orderId)
            .single();

        if (existing) {
            return new Response(JSON.stringify({ error: '이미 처리된 결제입니다.' }), {
                status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 6. 크레딧 지급
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('credits')
            .eq('id', user.id)
            .single();

        const newCredits = (profile?.credits ?? 0) + pkg.credits;
        await supabaseAdmin
            .from('profiles')
            .update({ credits: newCredits })
            .eq('id', user.id);

        // 7. 거래 로그 기록
        await supabaseAdmin.from('credit_transactions').insert({
            user_id: user.id,
            amount: pkg.credits,
            type: 'purchase',
            description: `${pkg.credits}크레딧 구매 (토스페이먼츠)`,
            toss_order_id: orderId,
            toss_payment_key: paymentKey,
        });

        return new Response(JSON.stringify({ success: true, credits: newCredits }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
```

### 6-2. toss-webhook (선택 — 이중 안전장치)

> `toss-confirm`이 클라이언트에서 직접 호출되므로 대부분의 경우 불필요.
> 결제 이탈/오류 등 예외 상황 처리를 위한 보완적 웹훅.

파일 위치: `supabase/functions/toss-webhook/index.ts`

```typescript
Deno.serve(async (req) => {
    const body = await req.json();

    // 토스페이먼츠 웹훅 시크릿 검증
    const secret = req.headers.get('TossPayments-Webhook-Signature');
    // 실제 구현 시 HMAC 검증 필요

    if (body.eventType === 'PAYMENT_STATUS_CHANGED' && body.data?.status === 'DONE') {
        // toss-confirm과 동일한 크레딧 지급 로직
        // orderId 중복 체크로 이중 지급 방지
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
});
```

---

## 7. 환경변수 설정

### 7-1. 프론트엔드 (.env.local)

```env
# 토스페이먼츠
VITE_TOSS_CLIENT_KEY=test_ck_...      # 테스트 시
# VITE_TOSS_CLIENT_KEY=live_ck_...   # 운영 시
```

### 7-2. Supabase Edge Function 시크릿

Supabase 대시보드 → Edge Functions → Secrets:

```
TOSS_SECRET_KEY = test_sk_...    # 테스트 시
                = live_sk_...    # 운영 시
```

또는 CLI:
```bash
supabase secrets set TOSS_SECRET_KEY=test_sk_...
```

### 7-3. credit_transactions 테이블 컬럼 추가

```sql
-- Supabase SQL Editor에서 실행
ALTER TABLE credit_transactions
  ADD COLUMN IF NOT EXISTS toss_order_id   TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS toss_payment_key TEXT;
```

---

## 8. 테스트 체크리스트

### 토스페이먼츠 테스트 카드 정보
- 카드번호: `4330123412341234`
- 유효기간: `12/30`
- 생년월일/사업자번호: `991212`
- 비밀번호: `00`

### 기능 테스트
- [ ] 패키지 선택 → 토스페이먼츠 결제창 팝업
- [ ] 테스트 카드로 결제 완료 → successUrl 리다이렉트
- [ ] PaymentSuccessPage에서 toss-confirm 호출 → 크레딧 지급 확인
- [ ] 크레딧 잔액 UI 즉시 갱신 확인
- [ ] 결제 취소 → failUrl 리다이렉트 → 크레딧 미지급 확인
- [ ] 동일 orderId 중복 결제 시도 → 409 응답 확인
- [ ] 금액 위변조 시도 → 400 응답 확인

---

## 9. 운영 전환 체크리스트

- [ ] 토스페이먼츠 사업자 심사 완료
- [ ] live_ck_* / live_sk_* 키로 환경변수 교체
- [ ] Supabase Edge Function 시크릿 live 키로 교체
- [ ] 웹훅 URL 등록 (토스페이먼츠 대시보드)
- [ ] 기존 Stripe 관련 코드 삭제:
  - `supabase/functions/create-checkout/index.ts`
  - `supabase/functions/stripe-webhook/index.ts`
  - `hooks/useCredits.ts`의 `purchaseCredits` Stripe 로직
- [ ] 실제 결제 1회 테스트 후 오픈

---

## 파일 변경 요약

| 파일 | 액션 |
|------|------|
| `hooks/useCredits.ts` | `purchaseCredits` → 토스페이먼츠 SDK 호출로 교체 |
| `pages/PaymentSuccessPage.tsx` | 신규 생성 |
| `pages/PaymentFailPage.tsx` | 신규 생성 |
| `routes.tsx` | `/payment/success`, `/payment/fail` 라우트 추가 |
| `supabase/functions/toss-confirm/index.ts` | 신규 생성 |
| `supabase/functions/toss-webhook/index.ts` | 신규 생성 (선택) |
| `supabase/migrations/002_toss.sql` | toss 컬럼 추가 마이그레이션 |
| `supabase/functions/create-checkout/index.ts` | 삭제 |
| `supabase/functions/stripe-webhook/index.ts` | 삭제 |
| `.env.local` | `VITE_TOSS_CLIENT_KEY` 추가 |

---

*작성일: 2026-03-25*
