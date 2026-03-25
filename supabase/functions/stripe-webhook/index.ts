// Supabase Edge Function: stripe-webhook
// 역할: Stripe 결제 완료 이벤트 수신 → 크레딧 지급

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    // 1. Stripe 웹훅 서명 검증 (위조 방지)
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
        apiVersion: '2024-04-10',
    });

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature!,
            Deno.env.get('STRIPE_WEBHOOK_SECRET')!
        );
    } catch (err) {
        console.error('Webhook 서명 검증 실패:', err.message);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // 2. 결제 완료 이벤트만 처리
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const { user_id, credits } = session.metadata!;

        if (!user_id || !credits) {
            console.error('메타데이터 누락:', session.metadata);
            return new Response('Missing metadata', { status: 400 });
        }

        const creditsToAdd = parseInt(credits, 10);
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // 3. 현재 크레딧 조회
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('credits')
            .eq('id', user_id)
            .single();

        // 4. 크레딧 추가
        const newCredits = (profile?.credits ?? 0) + creditsToAdd;
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ credits: newCredits })
            .eq('id', user_id);

        if (updateError) {
            console.error('크레딧 추가 실패:', updateError);
            return new Response('Credits update failed', { status: 500 });
        }

        // 5. 거래 로그
        await supabaseAdmin.from('credit_transactions').insert({
            user_id,
            amount: creditsToAdd,
            type: 'purchase',
            description: `${creditsToAdd}크레딧 구매`,
            stripe_session_id: session.id,
        });

        console.log(`✅ ${user_id} 에게 ${creditsToAdd} 크레딧 지급 완료`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
});
