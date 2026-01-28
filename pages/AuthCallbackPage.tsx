import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const AuthCallbackPage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleAuth = async () => {
            try {
                // hash(#) 또는 code 등으로부터 세션을 파싱하고 저장합니다.
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Error fetching session:', error);
                    navigate('/', { replace: true });
                    return;
                }

                // 세션이 확인되면 즉시 홈으로 보냅니다 (지체 방지)
                navigate('/', { replace: true });
            } catch (err) {
                console.error('Auth callback error:', err);
                navigate('/', { replace: true });
            }
        };

        handleAuth();
    }, [navigate]);

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
                <p className="text-white font-medium">로그인 처리 중...</p>
            </div>
        </div>
    );
};

export default AuthCallbackPage;
