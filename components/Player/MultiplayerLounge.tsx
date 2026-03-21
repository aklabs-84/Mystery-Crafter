import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { generateSessionCode, useMultiplayer } from '../../hooks/useMultiplayer';

const MultiplayerLounge: React.FC = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const [playerName, setPlayerName] = useState('');
    const [sessionCode, setSessionCode] = useState('');
    const [joinedCode, setJoinedCode] = useState<string | null>(null);
    const [isHost, setIsHost] = useState(false);
    
    const navigate = useNavigate();

    // Custom Hook for Realtime Sync
    const { session, players, loading, error, sendMessage } = useMultiplayer(
        joinedCode || undefined, 
        playerName || undefined
    );

    // 1. Create a New Room (Host)
    const handleHostRoom = async () => {
        if (!playerName.trim() || !gameId) return;

        try {
            const code = generateSessionCode();
            const { data, error: err } = await supabase
                .from('game_sessions')
                .insert({
                    game_id: gameId,
                    host_name: playerName.trim(),
                    session_code: code,
                    is_active: false // Waiting in Lobby
                })
                .select()
                .single();

            if (err) throw err;
            setJoinedCode(code);
            setIsHost(true);
        } catch (e) {
            console.error("Failed to create room:", e);
            alert("방 고유 코드 생성에 실패했습니다.");
        }
    };

    // 2. Join Existing Room (Guest)
    const handleJoinRoom = () => {
        if (!playerName.trim() || !sessionCode.trim()) return;
        setJoinedCode(sessionCode.trim().toUpperCase());
    };

    // 3. Start Game (Host only)
    const handleStartGame = async () => {
        if (!session || !isHost) return;
        
        await supabase
            .from('game_sessions')
            .update({ 
                is_active: true,
                current_turn_player: playerName // HOST starts with the turn
            })
            .eq('id', session.id);
            
        // Insert System Message
        await sendMessage('탐정단이 전원 집결했습니다. 사건 현장에 접근합니다...', 'system');
    };

    // If game starts, we will redirect or render Gameplay component
    React.useEffect(() => {
        if (session?.is_active) {
            navigate(`/play/multiplayer/${session.session_code}/game`, { state: { playerName } });
        }
    }, [session?.is_active, session?.session_code, navigate, playerName]);

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-zinc-900/50 border border-white/5 rounded-3xl p-8 shadow-2xl space-y-8 backdrop-blur-xl">
                
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black font-mystery tracking-widest text-red-600">MULTIPL_EXPLORER</h1>
                    <p className="text-zinc-500 text-sm">실시간 바다거북스프 범죄 수사대</p>
                </div>

                {!joinedCode ? (
                    // 🔒 STEP 1: Entrance / Auth
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">탐정 닉네임</label>
                            <input 
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="사용할 닉네임을 입력하세요"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition"
                            />
                        </div>

                        <div className="border-t border-zinc-800 my-4"></div>

                        {gameId && (
                            <button 
                                onClick={handleHostRoom}
                                disabled={!playerName.trim()}
                                className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-900/10 disabled:opacity-30"
                            >
                                🎙️ 방장으로 실시간 방 만들기
                            </button>
                        )}

                        <div className="relative flex py-3 items-center">
                            <div className="flex-grow border-t border-zinc-800"></div>
                            <span className="flex-shrink mx-4 text-zinc-600 text-xs">OR</span>
                            <div className="flex-grow border-t border-zinc-800"></div>
                        </div>

                        <div className="space-y-3">
                            <input 
                                type="text"
                                value={sessionCode}
                                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                                placeholder="6자리 참여 코드 입력"
                                maxLength={6}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-center font-mono font-bold tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500 transition"
                            />
                            <button 
                                onClick={handleJoinRoom}
                                disabled={!playerName.trim() || sessionCode.length < 6}
                                className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-bold transition disabled:opacity-30"
                            >
                                🚪 코드로 방 입장하기
                            </button>
                        </div>
                    </div>
                ) : (
                    // 📡 STEP 2: Waiting Lobby
                    <div className="space-y-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10">
                                <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-xs text-zinc-500 mt-4">채널 보안 연동 중...</p>
                            </div>
                        ) : error ? (
                            <div className="bg-red-950/30 border border-red-900/50 text-red-500 p-4 rounded-xl text-center text-sm">
                                {error}
                                <button onClick={() => setJoinedCode(null)} className="block mt-2 underline text-xs">돌아가기</button>
                            </div>
                        ) : (
                            <>
                                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-center">
                                    <div className="text-xs font-bold text-zinc-500">참가 대기 번호 (코드)</div>
                                    <div className="text-3xl font-black font-mono tracking-widest text-emerald-400 mt-1">{session?.session_code}</div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-xs text-zinc-500 font-bold">
                                        <span>접속한 탐정단</span>
                                        <span>{players.length}명</span>
                                    </div>
                                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                                        {players.map((p, i) => (
                                            <div key={p.id} className="flex items-center gap-2 text-sm text-zinc-300">
                                                <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                                <span className="truncate">{p.player_name}</span>
                                                {p.player_name === session?.host_name && <span className="text-[10px] text-zinc-500 ml-1">(HOST)</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {isHost ? (
                                    <button 
                                        onClick={handleStartGame}
                                        disabled={players.length < 1} // Minimum 2 for ideal, but 1 allowed for sole testing support
                                        className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition shadow-lg shadow-red-900/20 disabled:opacity-30"
                                    >
                                        🚀 수사 시작 (게임 스타트)
                                    </button>
                                ) : (
                                    <div className="text-center text-xs text-zinc-500 animate-pulse">방장이 사건을 개시하기를 기다리는 중...</div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MultiplayerLounge;
