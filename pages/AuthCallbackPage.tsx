
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const AuthCallbackPage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Handle the OAuth callback
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                navigate('/');
            }
        });
    }, [navigate]);

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-black">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        </div>
    );
};

export default AuthCallbackPage;
