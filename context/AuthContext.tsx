
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    userType: 'user' | 'admin' | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithKakao: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [userType, setUserType] = useState<'user' | 'admin' | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        try {
            console.log("[Auth] Fetching profile for:", userId);
            const { data, error } = await supabase
                .from('profiles')
                .select('user_type')
                .eq('id', userId)
                .single();

            if (error) {
                console.warn("[Auth] Profile fetch error:", error.message);
                // If it's a real "not found" error, try to create it. 
                // Note: RLS might block SELECT but allow INSERT, or vice versa.
                if (error.code === 'PGRST116') { // PGRST116 is "JSON object requested, but no rows returned"
                    console.log("[Auth] Profile missing, creating default...");
                    const { data: newData, error: insertError } = await supabase
                        .from('profiles')
                        .upsert({ id: userId, user_type: 'user' })
                        .select('user_type')
                        .single();

                    if (!insertError && newData) {
                        setUserType(newData.user_type as 'user' | 'admin');
                    } else {
                        if (insertError) console.error("[Auth] Profile creation failed:", insertError.message);
                        setUserType('user'); // Fallback
                    }
                } else {
                    // Other error (like RLS or Connection)
                    setUserType('user');
                }
            } else if (data) {
                console.log("[Auth] Profile loaded. Role:", data.user_type);
                setUserType(data.user_type as 'user' | 'admin');
            }
        } catch (e) {
            console.error("[Auth] fetchProfile exception:", e);
            setUserType('user');
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setUserType(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        // Once session AND userType are determined, stop loading
        if (session === null || (session && userType)) {
            setLoading(false);
        }
    }, [session, userType]);

    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    };

    const signInWithKakao = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'kakao',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ session, user: session?.user ?? null, userType, loading, signInWithGoogle, signInWithKakao, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
