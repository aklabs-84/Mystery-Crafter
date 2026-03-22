import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useMultiplayer } from '../../hooks/useMultiplayer';
import { gemini } from '../../services/geminiService';
import { DataManager } from '../../services/dataManager';
import { GameData } from '../../types';

const MultiplayerPlayer: React.FC = () => {
    const { sessionCode } = useParams<{ sessionCode: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const playerName = location.state?.playerName;

    const [gameData, setGameData] = useState<GameData | null>(null);
    const [isThinking, setIsThinking] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isSolving, setIsSolving] = useState(false);
    const [gameResult, setGameResult] = useState<{ winner: string } | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // 1. Realtime Sync Hook
    const { session, players, messages, loading, error, timeLeft, sendMessage, passTurn, leaveSession, endSession } = useMultiplayer(
        sessionCode,
        playerName
    );

    const isMyTurn = session?.current_turn_player === playerName;

    // 게임 데이터에서 필요한 값 추출 (gameData가 null이면 기본값)
    const startSceneId = gameData?.startSceneId || 'scene_1';
    const scene = gameData?.scenes?.[startSceneId];
    const surfaceStory = scene?.descriptionText?.KO || gameData?.description?.KO || '설명이 없습니다.';
    const hiddenTruth = gameData?.conclusion?.mysterySolution?.KO || '';
    const imageUrl = scene?.imageUrl;

    // ── 모든 useEffect는 early return 이전에 선언 (Rules of Hooks) ──

    // 0.6 타이머 만료 시 자동 턴 넘기기
    const hasAutoPassedRef = useRef(false);
    const lastTurnPlayerRef = useRef<string | null>(null);
    useEffect(() => {
        const currentTurnPlayer = session?.current_turn_player;
        if (!currentTurnPlayer) return;

        if (lastTurnPlayerRef.current !== currentTurnPlayer) {
            lastTurnPlayerRef.current = currentTurnPlayer;
            hasAutoPassedRef.current = false;
        }

        if (hasAutoPassedRef.current) return;

        if (timeLeft === 0 && isMyTurn && !isThinking) {
            hasAutoPassedRef.current = true;
            passTurn();
        }
    }, [timeLeft, isMyTurn, isThinking, passTurn, session?.current_turn_player]);

    // 2. 게임 데이터 로드
    useEffect(() => {
        if (!session?.game_id) return;

        const loadGame = async () => {
            try {
                const data = await DataManager.loadGame(session.game_id);
                setGameData(data);

                const hasChat = messages.some(m => m.message_type === 'question' || m.message_type === 'answer_ai');
                if (session?.host_name === playerName && !hasChat) {
                    setTimeout(() => {
                        sendMessage('🎙️ 수사본부가 가동되었습니다. 사건의 전말을 밝혀내기 위한 질문을 던져주세요. 발언권을 가진 탐정님만 타이핑이 가능합니다.', 'answer_ai', 'close');
                    }, 1500);
                }
            } catch (err) {
                console.error("Failed to load game data:", err);
            }
        };
        loadGame();
    }, [session?.game_id]); // eslint-disable-line react-hooks/exhaustive-deps

    // 채팅창 자동 스크롤
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 세션 종료 시 처리
    useEffect(() => {
        if (!session || session.is_active) return;
        if (gameResult) return; // 이미 결과 화면 표시 중

        // 승리 메시지에서 winner 이름 파싱
        const victoryMsg = messages.find(m => m.message_type === 'system' && m.content.includes('[수사 완료]'));
        if (victoryMsg) {
            // "🏆 [수사 완료] OOO 탐정이 진실을 밝혀냈습니다!!" 패턴에서 이름 추출
            const match = victoryMsg.content.match(/\[수사 완료\] (.+?) 탐정이/);
            const winner = match ? match[1] : '알 수 없음';
            setGameResult({ winner });
        } else {
            // 승리 메시지 없이 종료 = 방장이 강제 폐쇄
            navigate('/games');
        }
    }, [session?.is_active, messages, gameResult, navigate]);

    // (HOST 중계 구조 제거 - 각 플레이어가 직접 AI 호출)

    // ── early return은 모든 hook 선언 이후 ──

    if (loading || !gameData) {
        return (
            <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center text-white">
                <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-zinc-500 mt-4 tracking-widest uppercase">Initializing Realtime Matrix...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center text-white p-4">
                <p className="text-red-500 font-bold mb-4">{error}</p>
                <button onClick={() => navigate('/games')} className="text-xs underline text-zinc-400">목록으로 돌아가기</button>
            </div>
        );
    }

    const handleLeave = async () => {
        await leaveSession();
        navigate('/games');
    };

    const handleEnd = async () => {
        if (window.confirm("정말로 수사를 폐쇄하고 게임을 강제로 종료하시겠습니까?")) {
            await endSession();
            navigate('/games');
        }
    };

    // 3. 질문 제출 - 각 플레이어가 직접 AI 호출 후 자동 턴 넘기기
    const handleAsk = async () => {
        if (!inputValue.trim() || isThinking || !isMyTurn) return;

        const userQ = inputValue.trim();
        setInputValue('');
        setIsThinking(true);

        try {
            await sendMessage(userQ, 'question');
            const reply = await gemini.askQuickModeQuestion(userQ, surfaceStory, hiddenTruth);
            await sendMessage(reply.message, 'answer_ai', reply.status);
            await passTurn();
        } catch (err: any) {
            console.error("AI Question Error:", err);
            await sendMessage(`⚠️ 통신 혼선 (AI 오류): ${err.message || '대답 지연 중'}`, 'answer_ai', 'error');
            await passTurn();
        } finally {
            setIsThinking(false);
        }
    };

    // 4. 정답 제출 - 각 플레이어가 직접 AI 평가 후 자동 턴 넘기기
    const handleSolveSubmit = async () => {
        if (!inputValue.trim() || isThinking || !isMyTurn) return;

        const userSolution = inputValue.trim();
        setInputValue('');
        setIsThinking(true);

        try {
            await sendMessage(`[최종 진상 제출]: ${userSolution}`, 'question');
            const reply = await gemini.evaluateQuickModeSolution(surfaceStory, hiddenTruth, userSolution);
            await sendMessage(reply.feedback, 'answer_ai', reply.isCorrect ? 'yes' : 'no');

            if (reply.isCorrect) {
                setGameResult({ winner: playerName });
                await supabase.from('game_sessions').update({ is_active: false }).eq('id', session.id);
                await sendMessage(`🏆 [수사 완료] ${playerName} 탐정이 진실을 밝혀냈습니다!!`, 'system');
            } else {
                setIsSolving(false);
                await passTurn();
            }
        } catch (err: any) {
            console.error("AI Solve Error:", err);
            await sendMessage(`⚠️ 판독 시스템 장애: ${err.message || '분석 실패'}`, 'answer_ai', 'error');
            await passTurn();
        } finally {
            setIsThinking(false);
        }
    };

    // 원형 타이머 계산
    const TIMER_TOTAL = 45;
    const timerRadius = 22;
    const timerCirc = 2 * Math.PI * timerRadius;
    const timerProgress = Math.max(0, Math.min(timeLeft, TIMER_TOTAL)) / TIMER_TOTAL;
    const timerOffset = timerCirc * (1 - timerProgress);
    const isCritical = timeLeft <= 5 && !!session?.current_turn_player;
    const isUrgent = timeLeft <= 10 && !!session?.current_turn_player;
    const timerColor = isCritical ? '#ef4444' : isUrgent ? '#f97316' : '#22c55e';

    // 승리 화면 오버레이
    if (gameResult) {
        const isWinner = gameResult.winner === playerName;
        return (
            <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-50 text-white text-center p-8">
                <div className="text-8xl mb-6">{isWinner ? '🏆' : '🕵️'}</div>
                <h1 className="text-4xl font-black font-mystery tracking-widest text-red-500 mb-4">
                    {isWinner ? '수사 완료!' : '사건 해결!'}
                </h1>
                <p className="text-xl text-zinc-300 mb-2">
                    {isWinner
                        ? '당신이 진실을 밝혀냈습니다!'
                        : `${gameResult.winner} 탐정이 진실을 밝혀냈습니다!`}
                </p>
                <p className="text-sm text-zinc-500 mb-10">숨겨진 진실: {hiddenTruth}</p>
                <button
                    onClick={() => navigate('/games')}
                    className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition text-lg"
                >
                    게임 목록으로 돌아가기
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans">

            {/* ── Sticky Header ── */}
            <header className={`sticky top-0 z-50 border-b border-white/5 backdrop-blur-md transition-colors duration-500 ${
                isCritical ? 'bg-red-950/30' : 'bg-[#050505]/95'
            }`}>
                <div className="flex justify-between items-center max-w-7xl mx-auto px-4 md:px-8 py-3">
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-mystery font-bold tracking-widest text-red-600">MULTIPL_EXPLORER</span>
                        <div className="px-2 py-0.5 bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 text-xs font-mono rounded-md">CODE: {sessionCode}</div>
                    </div>

                    <div className="flex items-center gap-3">

                        {/* 원형 타이머 */}
                        {session?.current_turn_player && (
                            <div className={`flex items-center gap-3 ${isCritical ? 'animate-pulse' : ''}`}>
                                {/* 발언자 표시 */}
                                <div className="text-right hidden sm:block">
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest">현재 발언권</div>
                                    <div className={`text-sm font-bold ${isMyTurn ? 'text-emerald-400' : 'text-zinc-200'}`}>
                                        {session.current_turn_player} {isMyTurn && <span className="text-emerald-500 text-xs">(나)</span>}
                                    </div>
                                </div>

                                {/* SVG 원형 타이머 */}
                                <div className={`relative flex items-center justify-center transition-transform duration-300 ${isCritical ? 'scale-110' : ''}`}>
                                    <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
                                        {/* 배경 트랙 */}
                                        <circle cx="28" cy="28" r={timerRadius} fill="none"
                                            stroke={isCritical ? '#450a0a' : '#27272a'} strokeWidth="5" />
                                        {/* 진행 링 */}
                                        <circle cx="28" cy="28" r={timerRadius} fill="none"
                                            stroke={timerColor}
                                            strokeWidth="5"
                                            strokeDasharray={timerCirc}
                                            strokeDashoffset={timerOffset}
                                            strokeLinecap="round"
                                            style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.5s ease' }}
                                        />
                                    </svg>
                                    {/* 숫자 */}
                                    <span className={`absolute font-black font-mono leading-none ${
                                        isCritical ? 'text-xl text-red-400' :
                                        isUrgent  ? 'text-lg text-orange-400' :
                                                    'text-base text-emerald-400'
                                    }`}>
                                        {Math.max(0, timeLeft)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {!session?.current_turn_player && (
                            <>
                                <span className="text-xs text-zinc-500">현재 발언권: 대기 중</span>
                                <button
                                    onClick={async () => {
                                        await supabase.from('game_sessions').update({ current_turn_player: playerName }).eq('id', session.id);
                                        await sendMessage(`${playerName} 탐정이 발언권을 획득했습니다.`, 'system');
                                    }}
                                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded transition"
                                >
                                    🎙️ 발언권 잡기
                                </button>
                            </>
                        )}

                        {(isMyTurn || session?.host_name === playerName) && session?.current_turn_player && (
                            <button
                                onClick={passTurn}
                                disabled={isThinking}
                                className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1.5 rounded border border-zinc-700 transition disabled:opacity-40"
                            >
                                턴 넘기기 ➡️
                            </button>
                        )}

                        <div className="border-l border-zinc-800 h-5 mx-1"></div>

                        {session?.host_name === playerName ? (
                            <button onClick={handleEnd}
                                className="text-xs bg-red-950/30 border border-red-900/50 hover:bg-red-900/40 text-red-500 px-3 py-1.5 rounded-lg font-bold transition">
                                🛑 수사 폐쇄
                            </button>
                        ) : (
                            <button onClick={handleLeave}
                                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-700 transition">
                                🚪 이탈
                            </button>
                        )}
                    </div>
                </div>

                {/* 긴급 시 하단 빨간 진행 바 */}
                {isUrgent && (
                    <div className="h-0.5 bg-zinc-900">
                        <div
                            className="h-full transition-all duration-1000"
                            style={{
                                width: `${timerProgress * 100}%`,
                                backgroundColor: isCritical ? '#ef4444' : '#f97316',
                            }}
                        />
                    </div>
                )}
            </header>

            <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-8 pb-20">
                {/* Left side static scene */}
                <div className="lg:col-span-12 xl:col-span-5 flex flex-col gap-6">
                    <div className="aspect-video bg-zinc-900 rounded-[2rem] border border-white/5 overflow-hidden relative shadow-2xl">
                        {imageUrl ? <img src={imageUrl} alt="사건 현장" className="w-full h-full object-cover" /> : null}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        <div className="absolute bottom-6 left-6">
                            <h1 className="text-2xl font-black text-white font-mystery">{gameData.title?.KO || '사건 기록'}</h1>
                        </div>
                    </div>
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-6 shadow-xl flex-1">
                        <h2 className="text-xs font-bold text-zinc-500 uppercase mb-3 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div> 사건 개요
                        </h2>
                        <p className="text-zinc-300 leading-relaxed font-serif break-keep text-base">{surfaceStory}</p>
                    </div>

                    {/* 실시간 탐정단 참가 목록 */}
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-5 shadow-xl">
                        <h2 className="text-xs font-bold text-zinc-500 uppercase mb-3 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div> 실시간 탐정단 ({players.length}명)
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {players.map(p => (
                                <div key={p.id} className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-300 flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${p.player_name === session?.current_turn_player ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`}></div>
                                    <span className="truncate max-w-[100px]">{p.player_name}</span>
                                    {p.player_name === session?.host_name && <span className="text-[9px] text-amber-500 tracking-tighter">(Host)</span>}
                                    {p.player_name === playerName && <span className="text-[9px] text-zinc-500">(나)</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right side live multi chat terminal */}
                <div className="lg:col-span-12 xl:col-span-7 flex flex-col h-[600px] bg-[#0a0a0a] border border-white/5 rounded-[2rem] shadow-xl overflow-hidden relative">
                    {/* Header */}
                    <div className="h-12 border-b border-white/5 bg-zinc-900/50 flex items-center px-6 justify-between shrink-0">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">수사 합동 터미널</span>
                        <div className="flex gap-2">
                            <button
                                disabled={!isMyTurn}
                                onClick={() => setIsSolving(!isSolving)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                                    isSolving ? 'bg-zinc-700 text-white border-zinc-600' : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-30'
                                }`}
                            >
                                {isSolving ? '질문 모드' : '정답 제출'}
                            </button>
                        </div>
                    </div>

                    {/* Live Stream Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col bg-gradient-to-b from-[#0a0a0a] to-[#050505] font-mono">
                        {messages.map((msg) => {
                            const isSystem = msg.message_type === 'system';
                            if (isSystem) {
                                return (
                                    <div key={msg.id} className="text-center text-xs text-zinc-500 font-sans px-4 py-1 bg-zinc-950/50 rounded-full self-center">
                                        📢 {msg.content}
                                    </div>
                                );
                            }

                            const isAi = msg.message_type === 'answer_ai';
                            const self = msg.sender_name === playerName;

                            return (
                                <div key={msg.id} className={`flex flex-col ${self ? 'items-end' : 'items-start'} max-w-full`}>
                                    <span className="text-[10px] text-zinc-600 mb-1">{msg.sender_name}</span>
                                    <div className={`max-w-[85%] rounded-xl px-4 py-2 text-sm ${
                                        isAi ? (
                                            msg.status === 'yes' ? 'bg-emerald-950/30 border border-emerald-900/50 text-emerald-300'
                                            : msg.status === 'no' ? 'bg-red-950/30 border border-red-900/50 text-red-300'
                                            : msg.status === 'close' ? 'bg-amber-950/30 border border-amber-900/50 text-amber-300'
                                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                                        ) : self ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-300 border border-white/5'
                                    }`}>
                                        {isAi && msg.status && (
                                            <div className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1 border-b border-current pb-0.5">
                                                {msg.status.toUpperCase()}
                                            </div>
                                        )}
                                        <p className="break-keep">{msg.content}</p>
                                    </div>
                                </div>
                            );
                        })}

                        {/* AI 응답 대기 인디케이터 */}
                        {isThinking && (
                            <div className="flex items-start">
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-500 flex items-center gap-2">
                                    <div className="w-3 h-3 border border-zinc-500 border-t-transparent rounded-full animate-spin"></div>
                                    AI 탐문 분석 중...
                                </div>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-zinc-950 border-t border-white/5 shrink-0 relative">
                        {!isMyTurn && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
                                <span className="font-bold text-zinc-500 text-xs tracking-widest uppercase">
                                    {session?.current_turn_player ? `${session.current_turn_player} 탐정의 턴` : '다른 탐정의 턴을 기다리는 중...'}
                                </span>
                            </div>
                        )}
                        <form
                            onSubmit={(e) => { e.preventDefault(); if (isSolving) handleSolveSubmit(); else handleAsk(); }}
                            className={`flex items-center gap-2 border rounded-xl p-1 transition ${isSolving ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-zinc-900 border-zinc-800'}`}
                        >
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={isSolving ? "최후의 진상을 제출하세요..." : "질문을 입력하세요..."}
                                className="flex-1 bg-transparent border-none outline-none text-white text-sm px-4 py-2 placeholder:text-zinc-600 focus:ring-0"
                                disabled={isThinking || !isMyTurn}
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || isThinking || !isMyTurn}
                                className="w-10 h-10 rounded-lg bg-white text-black flex items-center justify-center disabled:opacity-30 disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors shrink-0"
                            >
                                {isThinking ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div> : <span>➡️</span>}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MultiplayerPlayer;
