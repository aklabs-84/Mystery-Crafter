import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export const useCredits = () => {
    const { user, userType } = useAuth();
    const isAdmin = userType === 'admin';
    const [credits, setCredits] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    // 크레딧 조회
    const fetchCredits = useCallback(async () => {
        if (!user) { setCredits(null); return; }
        if (isAdmin) { setCredits(Infinity); return; } // 관리자는 무제한
        const { data } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', user.id)
            .single();
        if (data) setCredits(data.credits);
    }, [user, isAdmin]);

    useEffect(() => {
        fetchCredits();
    }, [fetchCredits]);

    // 크레딧 차감 (Edge Function 경유) — amount 기본값 1
    const useCredit = useCallback(async (amount: number = 1): Promise<boolean> => {
        if (!user) return false;
        if (isAdmin) return true; // 관리자는 차감 없이 항상 통과

        setLoading(true);
        try {
            // 세션 갱신 후 최신 토큰 사용 (만료 토큰 방지)
            const { data: { session } } = await supabase.auth.refreshSession();
            if (!session) {
                console.error('[useCredit] 세션 갱신 실패 — 재로그인 필요');
                return false;
            }

            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/use-credit`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ amount }),
                }
            );

            const result = await res.json();
            console.log('[useCredit] 응답:', res.status, result);

            if (!res.ok) {
                console.error('[useCredit] 실패:', result.error);
                if (result.error === 'insufficient_credits') {
                    setCredits(result.credits ?? 0);
                }
                return false;
            }

            setCredits(result.credits); // 서버 응답값으로 동기화
            return true;
        } catch (e) {
            console.error('[useCredit] fetch 예외:', e);
            return false;
        } finally {
            setLoading(false);
        }
    }, [user, isAdmin]);

    // Stripe Checkout 시작
    const purchaseCredits = useCallback(async (packageId: 'starter' | 'popular' | 'pro') => {
        if (!user) return;

        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    packageId,
                    successUrl: `${window.location.origin}/games?credits=success`,
                    cancelUrl: `${window.location.origin}/games`,
                }),
            }
        );

        const { url } = await res.json();
        if (url) window.location.href = url; // Stripe Checkout 페이지로 이동
    }, [user]);

    return { credits, loading, useCredit, purchaseCredits, refetch: fetchCredits };
};
