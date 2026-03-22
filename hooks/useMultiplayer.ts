import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';

export const generateSessionCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const useMultiplayer = (sessionCode: string | undefined, playerName: string | undefined) => {
    const [session, setSession] = useState<any>(null);
    const [players, setPlayers] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(45);

    const sessionRef = useRef<any>(null);
    const playersRef = useRef<any[]>([]);
    const channelRef = useRef<any>(null);
    const isPassingTurnRef = useRef(false);

    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    useEffect(() => {
        playersRef.current = players;
    }, [players]);

    // ── 채널 구독 셋업 ──
    useEffect(() => {
        if (!sessionCode || !playerName) {
            setLoading(false);
            return;
        }

        let channel: any = null;

        const setupRealtime = async () => {
            setLoading(true);
            try {
                const { data: sess, error: sessErr } = await supabase
                    .from('game_sessions')
                    .select('*')
                    .eq('session_code', sessionCode)
                    .single();

                if (sessErr || !sess) {
                    setError('방을 찾을 수 없거나 이미 만료되었습니다.');
                    setLoading(false);
                    return;
                }
                setSession(sess);

                await supabase
                    .from('session_players')
                    .upsert({
                        session_id: sess.id,
                        player_name: playerName,
                        is_ready: true
                    }, { onConflict: 'session_id, player_name' });

                const { data: initPlayers } = await supabase
                    .from('session_players')
                    .select('*')
                    .eq('session_id', sess.id)
                    .order('created_at', { ascending: true });
                setPlayers(initPlayers || []);

                const { data: initMsgs } = await supabase
                    .from('session_messages')
                    .select('*')
                    .eq('session_id', sess.id)
                    .order('created_at', { ascending: true });
                setMessages(initMsgs || []);

                channel = supabase.channel(`room_${sess.id}`, {
                    config: { broadcast: { self: true } }
                })
                    // A. Broadcast 메시지 (빠른 경로)
                    .on('broadcast', { event: 'new_message' }, (payload: any) => {
                        setMessages((prev: any[]) => {
                            const exists = prev.some((m: any) => m.id === payload.payload.id);
                            if (exists) return prev;
                            return [...prev, payload.payload];
                        });
                    })

                    // B. Postgres Changes: 메시지 INSERT (broadcast 실패 시 보장 경로)
                    .on('postgres_changes', {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'session_messages',
                        filter: `session_id=eq.${sess.id}`
                    }, (payload: any) => {
                        setMessages((prev: any[]) => {
                            const exists = prev.some((m: any) => m.id === payload.new.id);
                            if (exists) return prev;
                            return [...prev, payload.new];
                        });
                    })

                    // C. Postgres Changes: 세션 업데이트 (턴 변경, 게임 종료 등)
                    .on('postgres_changes', {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'game_sessions',
                        filter: `id=eq.${sess.id}`
                    }, (payload: any) => {
                        setSession(payload.new);
                    })

                    // D. Broadcast 턴 변경 (즉각 반영 빠른 경로)
                    .on('broadcast', { event: 'turn_change' }, (payload: any) => {
                        setSession((prev: Record<string, any> | null) =>
                            prev ? { ...prev, current_turn_player: payload.payload.current_turn_player } : prev
                        );
                    })

                    // E. Broadcast 플레이어 입장
                    .on('broadcast', { event: 'player_change' }, (payload: any) => {
                        const { type, player } = payload.payload;
                        if (type === 'join') {
                            setPlayers((prev: any[]) => {
                                if (prev.some((p: any) => p.player_name === player.player_name)) return prev;
                                return [...prev, player];
                            });
                        }
                    })

                    .subscribe((status: string) => {
                        console.log("Realtime Channel Status:", status);
                    });

                channelRef.current = channel;

                setTimeout(() => {
                    if (channelRef.current) {
                        channelRef.current.send({
                            type: 'broadcast',
                            event: 'player_change',
                            payload: { type: 'join', player: { id: Date.now().toString(), session_id: sess.id, player_name: playerName, is_ready: true } }
                        });
                    }
                }, 1000);

            } catch (err: any) {
                setError(err.message || '네트워크 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        };

        setupRealtime();

        const handleUnload = () => {
            const currentSess = sessionRef.current;
            if (currentSess && playerName) {
                supabase.from('session_players').delete().eq('session_id', currentSess.id).eq('player_name', playerName).then();
            }
        };
        window.addEventListener('beforeunload', handleUnload);

        return () => {
            if (channel) supabase.removeChannel(channel);
            channelRef.current = null;
            window.removeEventListener('beforeunload', handleUnload);
            handleUnload();
        };
    }, [sessionCode, playerName]);

    // ── 폴링 폴백: 2초마다 DB에서 최신 상태 동기화 (broadcast/postgres_changes 실패 보완) ──
    useEffect(() => {
        if (!sessionCode) return;

        const poll = setInterval(async () => {
            const currentSess = sessionRef.current;
            if (!currentSess) return;

            // 세션 상태 동기화 (턴 변경, 게임 활성화 여부)
            const { data: latestSession } = await supabase
                .from('game_sessions')
                .select('*')
                .eq('id', currentSess.id)
                .single();

            if (latestSession) {
                setSession((prev: Record<string, any> | null) => {
                    // 실제로 변경된 경우에만 업데이트 (불필요한 리렌더 방지)
                    if (!prev) return latestSession;
                    if (prev.current_turn_player !== latestSession.current_turn_player ||
                        prev.is_active !== latestSession.is_active) {
                        return latestSession;
                    }
                    return prev;
                });
            }

            // 메시지 동기화
            const { data: latestMsgs } = await supabase
                .from('session_messages')
                .select('*')
                .eq('session_id', currentSess.id)
                .order('created_at', { ascending: true });

            if (latestMsgs) {
                setMessages((prev: any[]) => {
                    if (prev.length === latestMsgs.length) return prev; // 변경 없으면 skip
                    return latestMsgs;
                });
            }
        }, 2000);

        return () => clearInterval(poll);
    }, [sessionCode]);

    // ── 타이머: 턴이 바뀌면 45초로 리셋 ──
    useEffect(() => {
        if (session?.current_turn_player) {
            setTimeLeft(45);
        }
    }, [session?.current_turn_player]);

    // ── 타이머: 모든 클라이언트가 독립적으로 카운트다운 (broadcast 의존성 제거) ──
    useEffect(() => {
        const timer = setInterval(() => {
            const currentTurn = sessionRef.current?.current_turn_player;
            if (!currentTurn) return;

            setTimeLeft(prev => {
                const next = prev - 1;
                if (next < -10) return prev;
                return next;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []); // 한 번만 실행

    // ── sendMessage: DB에 저장 후 실제 ID로 broadcast (dedup 보장) ──
    const sendMessage = useCallback(async (content: string, type: 'question' | 'answer_ai' | 'hint' | 'system', status?: string) => {
        const currentSession = sessionRef.current;
        if (!currentSession || !playerName) return;

        // DB에 먼저 저장해서 실제 ID 확보
        const { data, error: insertErr } = await supabase
            .from('session_messages')
            .insert({
                session_id: currentSession.id,
                sender_name: playerName,
                message_type: type,
                content,
                status
            })
            .select()
            .single();

        if (insertErr || !data) {
            console.error("Message insert error:", insertErr);
            return;
        }

        // 1. 로컬에 즉시 추가 (실제 DB ID 사용)
        setMessages((prev: any[]) => {
            const exists = prev.some((m: any) => m.id === data.id);
            if (exists) return prev;
            return [...prev, data];
        });

        // 2. 다른 클라이언트에게 broadcast (빠른 경로, 실패해도 postgres_changes/폴링이 보완)
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'new_message',
                payload: data
            });
        }
    }, [playerName]);

    // ── passTurn: playersRef(메모리) 사용으로 DB 쿼리 제거 ──
    const passTurn = useCallback(async () => {
        if (isPassingTurnRef.current) return;
        isPassingTurnRef.current = true;

        try {
            const currentSession = sessionRef.current;
            if (!currentSession) return;

            const currentPlayers = playersRef.current;
            if (currentPlayers.length === 0) {
                console.error("No players in ref for turn pass");
                return;
            }

            const currentIndex = currentPlayers.findIndex((p: any) => p.player_name === currentSession.current_turn_player);
            // currentIndex === -1이면 첫 번째 플레이어로 fallback
            const safeIndex = currentIndex === -1 ? 0 : currentIndex;
            const nextIndex = (safeIndex + 1) % currentPlayers.length;
            const nextPlayer = currentPlayers[nextIndex].player_name;

            // 로컬 즉각 업데이트 (낙관적 업데이트 - DB 응답 기다리지 않고 즉시 반영)
            setSession((prev: Record<string, any> | null) =>
                prev ? { ...prev, current_turn_player: nextPlayer } : prev
            );

            // Broadcast로 다른 클라이언트에 즉각 알림
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'turn_change',
                    payload: { current_turn_player: nextPlayer }
                });
            }

            // DB 업데이트 (폴링으로 복구 가능)
            const { error: updateErr } = await supabase
                .from('game_sessions')
                .update({ current_turn_player: nextPlayer })
                .eq('id', currentSession.id);

            if (updateErr) {
                console.error("Turn Update Fail:", updateErr);
                // DB 실패 시 로컬 상태 복구
                setSession((prev: Record<string, any> | null) =>
                    prev ? { ...prev, current_turn_player: currentSession.current_turn_player } : prev
                );
                return;
            }

            // 시스템 메시지 DB 저장 (postgres_changes/폴링으로 모든 클라이언트에 전달)
            const { data: sysData } = await supabase
                .from('session_messages')
                .insert({
                    session_id: currentSession.id,
                    sender_name: 'system',
                    message_type: 'system',
                    content: `턴이 ${nextPlayer} 탐정에게 넘어갔습니다.`,
                })
                .select()
                .single();

            if (sysData) {
                setMessages((prev: any[]) => {
                    const exists = prev.some((m: any) => m.id === sysData.id);
                    if (exists) return prev;
                    return [...prev, sysData];
                });

                if (channelRef.current) {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'new_message',
                        payload: sysData
                    });
                }
            }

        } catch (err: any) {
            console.error("Pass Turn error:", err);
        } finally {
            isPassingTurnRef.current = false;
        }
    }, []);

    const leaveSession = useCallback(async () => {
        const currentSession = sessionRef.current;
        if (!currentSession || !playerName) return;

        await supabase
            .from('session_players')
            .delete()
            .eq('session_id', currentSession.id)
            .eq('player_name', playerName);

        await supabase.from('session_messages').insert({
            session_id: currentSession.id,
            sender_name: 'system',
            message_type: 'system',
            content: `${playerName} 탐정이 수사에서 이탈했습니다.`,
        });
    }, [playerName]);

    const endSession = useCallback(async () => {
        const currentSession = sessionRef.current;
        if (!currentSession) return;

        await supabase
            .from('game_sessions')
            .update({ is_active: false })
            .eq('id', currentSession.id);

        await supabase.from('session_messages').insert({
            session_id: currentSession.id,
            sender_name: 'system',
            message_type: 'system',
            content: '🚨 [수사 종료] 방장이 수사 본부를 폐쇄했습니다.',
        });
    }, []);

    return { session, players, messages, loading, error, timeLeft, sendMessage, passTurn, leaveSession, endSession };
};
