import React, { useState, useRef, useEffect } from 'react';
import { GameData } from '../../types';
import { gemini } from '../../services/geminiService';
import { useCredits } from '../../hooks/useCredits';

interface QuickModePlayerProps {
    gameData: GameData;
    gameId?: string;
    onBackToHome: () => void;
}

interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    status?: 'yes' | 'no' | 'irrelevant' | 'close' | 'error' | 'typing';
}

// localStorage 세션 키 헬퍼
const SESSION_TTL = 2 * 60 * 60 * 1000; // 2시간
const getSessionKey = (id: string) => `mc_solo_${id}`;
const getChatKey    = (id: string) => `mc_chat_${id}`;

interface StoredSession { paidAt: number; expiresAt: number; }

const QuickModePlayer: React.FC<QuickModePlayerProps> = ({ gameData, gameId, onBackToHome }) => {
    const { useCredit, credits } = useCredits();

    const difficulty = gameData.difficulty || 'normal';
    const HINT_COUNTS = { easy: 5, normal: 3, hard: 1 } as const;
    const DIFFICULTY_LABELS = { easy: '🟢 쉬움', normal: '🟡 보통', hard: '🔴 어려움' };

    const gameIdKey = gameId || gameData.id || 'unknown';

    // 세션 유효 여부 확인
    const isSessionValid = (): boolean => {
        try {
            const raw = localStorage.getItem(getSessionKey(gameIdKey));
            if (!raw) return false;
            const s: StoredSession = JSON.parse(raw);
            return Date.now() < s.expiresAt;
        } catch { return false; }
    };

    // 저장된 채팅 복원
    const loadSavedMessages = (): ChatMessage[] => {
        try {
            const raw = localStorage.getItem(getChatKey(gameIdKey));
            if (!raw) return [];
            return JSON.parse(raw) as ChatMessage[];
        } catch { return []; }
    };

    const savedMessages = isSessionValid() ? loadSavedMessages() : [];
    const initialMessages: ChatMessage[] = savedMessages.length > 0
        ? savedMessages
        : [{
            id: 'welcome',
            sender: 'ai',
            text: '사건 현장에 오신 것을 환영합니다. 무엇이든 물어보세요. 저는 오직 "예 / 아니오 / 관계없음 / 정답에 근접함" 으로만 대답합니다.'
        }];

    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [isSolving, setIsSolving] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const [sessionPaid, setSessionPaid] = useState<boolean>(isSessionValid());
    const [sessionError, setSessionError] = useState<string | null>(null);
    const [hintsLeft, setHintsLeft] = useState(HINT_COUNTS[difficulty]);
    const [creditAttempted, setCreditAttempted] = useState(false);

    // Quick Mode always uses the start scene
    const startSceneId = gameData.startSceneId || 'scene_1';
    const scene = gameData.scenes[startSceneId];
    const surfaceStory = scene?.descriptionText?.KO || gameData.description?.KO || '설명이 없습니다.';
    const hiddenTruth = gameData.conclusion?.mysterySolution?.KO || '';
    const imageUrl = scene?.imageUrl; // Assuming the image is generated and saved here

    const chatEndRef = useRef<HTMLDivElement>(null);

    // 입장 크레딧 차감 (세션 미존재 시에만, auth 로딩 완료 후 실행)
    useEffect(() => {
        if (sessionPaid || creditAttempted || credits === null) return;
        setCreditAttempted(true);
        (async () => {
            const ok = await useCredit(5);
            if (ok) {
                const session: StoredSession = { paidAt: Date.now(), expiresAt: Date.now() + SESSION_TTL };
                localStorage.setItem(getSessionKey(gameIdKey), JSON.stringify(session));
                setSessionPaid(true);
            } else {
                if (credits >= 5) {
                    setSessionError('게임 입장 중 오류가 발생했습니다. 다시 시도해 주세요.');
                } else {
                    setSessionError('크레딧이 부족합니다. 게임 참여에는 5크레딧이 필요합니다.');
                }
            }
        })();
    }, [credits, creditAttempted, sessionPaid]); // eslint-disable-line react-hooks/exhaustive-deps

    // 채팅 기록 localStorage 저장
    useEffect(() => {
        if (!sessionPaid || messages.length === 0) return;
        try {
            localStorage.setItem(getChatKey(gameIdKey), JSON.stringify(messages));
        } catch { /* 저장 실패 무시 */ }
    }, [messages, sessionPaid, gameIdKey]);

    // 스크롤
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleAsk = async () => {
        if (!inputValue.trim() || isThinking) return;

        const userQ = inputValue.trim();
        setInputValue('');

        const newMsgId = Date.now().toString();
        setMessages(prev => [...prev, { id: newMsgId, sender: 'user', text: userQ }]);

        setIsThinking(true);
        // Add a typing indicator message
        setMessages(prev => [...prev, { id: `wait_${newMsgId}`, sender: 'ai', text: '...', status: 'typing' }]);

        try {
            const reply = await gemini.askQuickModeQuestion(userQ, surfaceStory, hiddenTruth, difficulty);
            
            setMessages(prev => prev.map(m => 
                m.id === `wait_${newMsgId}` 
                    ? { id: `ai_${newMsgId}`, sender: 'ai', text: reply.message, status: reply.status as any }
                    : m
            ));
        } catch (error) {
            console.error("AI QA Error:", error);
             setMessages(prev => prev.map(m => 
                m.id === `wait_${newMsgId}` 
                    ? { id: `ai_${newMsgId}`, sender: 'ai', text: '지금은 대답할 수 없습니다. 통신 장애가 발생했습니다.', status: 'error' }
                    : m
            ));
        } finally {
            setIsThinking(false);
        }
    };

    const handleHint = async () => {
        if (hintsLeft <= 0 || isThinking) return;

        setIsThinking(true);

        const newMsgId = Date.now().toString();
        setMessages(prev => [...prev, { id: `wait_${newMsgId}`, sender: 'ai', text: '단서를 분석 중입니다...', status: 'typing' }]);

        try {
            setHintsLeft(prev => prev - 1);

            // Compile history of user questions to give context to the AI
            const history = messages
                .filter(m => m.sender === 'user')
                .map(m => `- ${m.text}`)
                .join("\n");

            const reply = await gemini.askQuickModeHint(surfaceStory, hiddenTruth, history);
            
            setMessages(prev => prev.map(m => 
                m.id === `wait_${newMsgId}` 
                    ? { id: `ai_${newMsgId}`, sender: 'ai', text: reply.message, status: 'hint' as any }
                    : m
            ));
        } catch (error) {
            console.error("Hint Error:", error);
             setMessages(prev => prev.map(m => 
                m.id === `wait_${newMsgId}` 
                    ? { id: `ai_${newMsgId}`, sender: 'ai', text: '통신 장애로 힌트를 가져오지 못했습니다. (힌트 구슬은 반환됩니다.)', status: 'error' }
                    : m
            ));
            setHintsLeft(prev => prev + 1); // Refund
        } finally {
            setIsThinking(false);
        }
    };

    const handleSolveSubmit = async () => {
        if (!inputValue.trim() || isThinking || isGameOver) return;
        
        const userSolution = inputValue.trim();
        setInputValue('');
        setIsThinking(true);
        
        const newMsgId = Date.now().toString();
        setMessages(prev => [...prev, { id: newMsgId, sender: 'user', text: `[최후의 추론 제출]: ${userSolution}` }]);
        setMessages(prev => [...prev, { id: `wait_${newMsgId}`, sender: 'ai', text: '제출된 진상을 판독 중입니다...', status: 'typing' }]);

        try {
            const reply = await gemini.evaluateQuickModeSolution(surfaceStory, hiddenTruth, userSolution);
            
            setMessages(prev => prev.map(m => 
                m.id === `wait_${newMsgId}` 
                    ? { id: `ai_${newMsgId}`, sender: 'ai', text: reply.feedback, status: reply.isCorrect ? 'yes' : 'no' as any }
                    : m
            ));

            if (reply.isCorrect) {
                setIsGameOver(true);
                // Delay then show victory message
                setTimeout(() => {
                    setMessages(prev => [...prev, {
                        id: 'victory',
                        sender: 'ai',
                        text: `🏆 [사건 해결] ${gameData.conclusion?.successBody?.KO || '진실에 완벽히 도달했습니다.'}`,
                        status: 'yes'
                    }]);
                }, 1500);
            } else {
                setIsSolving(false); // Go back to questioning mode automatically on fail
            }
        } catch (error) {
            console.error("Evaluate Error:", error);
             setMessages(prev => prev.map(m => 
                m.id === `wait_${newMsgId}` 
                    ? { id: `ai_${newMsgId}`, sender: 'ai', text: '판독 시스템에 오류가 발생했습니다. 다시 시도해 주세요.', status: 'error' }
                    : m
            ));
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans selection:bg-red-900 selection:text-white">
            {/* 크레딧 부족 / 입장 오류 오버레이 */}
            {sessionError && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center gap-6 p-8">
                    <div className="text-5xl">⚡</div>
                    <h2 className="text-2xl font-black text-white text-center">{sessionError}</h2>
                    <p className="text-zinc-400 text-sm text-center max-w-sm">
                        {(credits ?? 0) >= 5
                            ? '일시적인 오류입니다. 다시 시도하거나 페이지를 새로고침해 주세요.'
                            : '크레딧을 충전하고 다시 입장해 주세요.'}
                    </p>
                    <div className="flex gap-3">
                        {(credits ?? 0) >= 5 && (
                            <button
                                onClick={() => { setSessionError(null); setCreditAttempted(false); }}
                                className="px-6 py-3 bg-red-700 hover:bg-red-600 text-white rounded-xl font-bold transition"
                            >
                                다시 시도
                            </button>
                        )}
                        <button onClick={onBackToHome} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition">
                            목록으로
                        </button>
                    </div>
                </div>
            )}
            <header className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
                <button 
                    onClick={onBackToHome}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    사건 목록으로
                </button>
                <div className="text-xl font-mystery font-bold tracking-widest text-red-600">
                    MYSTERY CRAFTER
                </div>
            </header>

            <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
                
                {/* Visual & Context Section (Left/Top) */}
                <div className="lg:col-span-6 flex flex-col gap-6">
                    {/* Image Viewer */}
                    <div className="w-full aspect-video md:aspect-[4/3] bg-zinc-900 rounded-[2rem] border border-white/5 overflow-hidden relative shadow-2xl">
                        {imageUrl ? (
                            <img src={imageUrl} alt="사건 현장" className="w-full h-full object-cover" />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 font-mystery space-y-4">
                                <span className="text-6xl opacity-20">🪞</span>
                                <span className="text-sm tracking-widest">NO ASSET AVAILABLE</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                        <div className="absolute bottom-6 left-6 right-6">
                            <h1 className="text-3xl md:text-4xl font-black text-white mb-2 font-mystery drop-shadow-lg">
                                {gameData.title?.KO || '사건 기록'}
                            </h1>
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/50 border border-red-900/50 text-red-500 text-xs font-bold tracking-widest">
                                    <span>🔒</span> 기밀 문서
                                </div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-700/50 text-zinc-300 text-xs font-bold tracking-widest">
                                    {DIFFICULTY_LABELS[difficulty]}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Surface Story */}
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-6 md:p-8 shadow-xl">
                        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-2 h-2 bg-amber-500 rounded-full"></div> 
                            사건 개요
                        </h2>
                        <p className="text-lg md:text-xl text-zinc-300 leading-relaxed font-serif break-keep">
                            {surfaceStory}
                        </p>
                    </div>
                </div>

                {/* AI Chat Terminal Section (Right/Bottom) */}
                <div className="lg:col-span-6 flex flex-col h-[600px] lg:h-auto bg-[#0a0a0a] border border-white/5 rounded-[2rem] shadow-xl overflow-hidden relative">
                    {/* Terminal Header */}
                    <div className="h-14 border-b border-white/5 bg-zinc-900/50 flex items-center px-4 md:px-6 justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-red-500/20 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                            </div>
                            <span className="text-xs font-bold text-zinc-400 tracking-widest uppercase">AI 심문 단말기</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleHint}
                                disabled={hintsLeft <= 0 || isThinking || isGameOver}
                                className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-amber-500/10"
                            >
                                <span>💡 힌트 요청</span>
                                <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-md ml-1">{hintsLeft}</span>
                            </button>
                            <button 
                                onClick={() => !isGameOver && setIsSolving(!isSolving)}
                                disabled={isGameOver}
                                className={`text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30 ${
                                    isSolving 
                                    ? 'text-zinc-400 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700' 
                                    : 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20'
                                }`}
                            >
                                {isSolving ? '질문 모드로 돌아가기' : '정답 제출하기'}
                            </button>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col bg-gradient-to-b from-[#0a0a0a] to-[#050505]">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} max-w-full animate-fade-in`}>
                                <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                                    msg.sender === 'user' 
                                        ? 'bg-zinc-800 text-white rounded-br-sm' 
                                        : msg.status === 'yes' ? 'bg-emerald-950/30 border border-emerald-900/50 text-emerald-300 rounded-bl-sm'
                                        : msg.status === 'no' ? 'bg-red-950/30 border border-red-900/50 text-red-300 rounded-bl-sm'
                                        : msg.status === 'irrelevant' ? 'bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-bl-sm'
                                        : msg.status === 'close' ? 'bg-amber-950/30 border border-amber-900/50 text-amber-300 rounded-bl-sm'
                                        : msg.status === 'typing' ? 'bg-zinc-900 text-zinc-500 animate-pulse'
                                        : 'bg-zinc-900 border border-white/5 text-zinc-300 rounded-bl-sm'
                                }`}>
                                    {msg.sender === 'ai' && msg.status && msg.status !== 'typing' && (
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1 border-b border-current pb-1 mb-2">
                                            {msg.status === 'yes' ? 'TRUE' : msg.status === 'no' ? 'FALSE' : msg.status === 'close' ? 'CRITICAL' : msg.status === 'hint' ? 'HINT' : 'IRRELEVANT'}
                                        </div>
                                    )}
                                    <p className="text-sm md:text-base break-keep leading-relaxed">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-zinc-950 border-t border-white/5 shrink-0 relative">
                        {isGameOver && (
                            <div className="absolute inset-0 bg-emerald-900/20 backdrop-blur-sm z-10 flex items-center justify-center">
                                <span className="font-black text-emerald-400 tracking-widest uppercase">CASE CLOSED</span>
                            </div>
                        )}
                        <form 
                            onSubmit={(e) => { 
                                e.preventDefault(); 
                                if (isSolving) handleSolveSubmit(); else handleAsk(); 
                            }}
                            className={`flex items-center gap-2 border rounded-xl p-1 focus-within:border-zinc-600 transition-colors ${isSolving ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-zinc-900 border-zinc-800'}`}
                        >
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={isSolving ? "사건의 최후의 진상을 상세히 적어 제출하세요..." : "예/아니오로 대답할 수 있는 질문을 입력하세요..."}
                                className={`flex-1 bg-transparent border-none outline-none text-white text-sm md:text-base px-4 py-2 placeholder:text-zinc-600 focus:ring-0 ${isSolving ? 'text-emerald-300 font-bold' : ''}`}
                                disabled={isThinking || isGameOver}
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || isThinking || isGameOver}
                                className="w-10 h-10 rounded-lg bg-white text-black flex items-center justify-center disabled:opacity-30 disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors shrink-0"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default QuickModePlayer;
