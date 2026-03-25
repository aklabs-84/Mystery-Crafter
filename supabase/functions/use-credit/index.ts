// Supabase Edge Function: use-credit
// 역할: 로그인 유저의 크레딧을 1 차감 (원자적 처리)
// 호출: 클라이언트에서 AI 호출 직전에 실행

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. 요청한 유저 인증
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: '로그인이 필요합니다.' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // anon 클라이언트로 유저 확인
        const supabaseUser = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({ error: '인증 실패' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 2. service_role 클라이언트로 크레딧 차감 (RLS 우회)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // 현재 크레딧 조회
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('credits')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return new Response(JSON.stringify({ error: '프로필을 찾을 수 없습니다.' }), {
                status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 3. amount 파싱 (기본값 1)
        let amount = 1;
        try {
            const body = await req.json();
            if (body?.amount && typeof body.amount === 'number' && body.amount > 0) {
                amount = Math.floor(body.amount);
            }
        } catch { /* body 없으면 기본값 사용 */ }

        const descriptionMap: Record<number, string> = {
            1:  'AI 질문 1회',
            5:  '게임 참여',
            10: '게임 생성',
        };
        const description = descriptionMap[amount] ?? `크레딧 ${amount}개 사용`;

        // 4. 크레딧 부족 체크
        if (profile.credits < amount) {
            return new Response(JSON.stringify({ error: 'insufficient_credits', credits: profile.credits }), {
                status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 5. 크레딧 차감 (원자적)
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ credits: profile.credits - amount })
            .eq('id', user.id)
            .eq('credits', profile.credits) // optimistic lock
            .select('credits')
            .single();

        if (updateError || !updated) {
            return new Response(JSON.stringify({ error: '크레딧 차감 실패, 다시 시도해주세요.' }), {
                status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 6. 거래 로그 기록
        await supabaseAdmin.from('credit_transactions').insert({
            user_id: user.id,
            amount: -amount,
            type: 'use',
            description,
        });

        return new Response(JSON.stringify({ success: true, credits: updated.credits }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
