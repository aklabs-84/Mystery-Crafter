// Supabase Edge Function: create-checkout
// 역할: Stripe Checkout 세션 생성 후 결제 URL 반환

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 크레딧 패키지 정의
const CREDIT_PACKAGES: Record<string, { credits: number; price: number; label: string }> = {
    starter:  { credits: 20,  price: 1900,  label: '20 크레딧' },
    popular:  { credits: 60,  price: 4900,  label: '60 크레딧' },
    pro:      { credits: 200, price: 14900, label: '200 크레딧' },
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

        // 2. 패키지 선택 파싱
        const { packageId, successUrl, cancelUrl } = await req.json();
        const pkg = CREDIT_PACKAGES[packageId];
        if (!pkg) {
            return new Response(JSON.stringify({ error: '유효하지 않은 패키지' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 3. Stripe Checkout 세션 생성
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
            apiVersion: '2024-04-10',
        });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'krw',
                    product_data: {
                        name: `Mystery Crafter - ${pkg.label}`,
                        description: `게임 생성 10⚡ · 게임 참여 5⚡ / ${pkg.credits}크레딧 충전`,
                    },
                    unit_amount: pkg.price,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: successUrl || `${Deno.env.get('SITE_URL')}/credits?success=true`,
            cancel_url: cancelUrl || `${Deno.env.get('SITE_URL')}/credits?cancelled=true`,
            metadata: {
                user_id: user.id,
                package_id: packageId,
                credits: pkg.credits.toString(),
            },
        });

        return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
