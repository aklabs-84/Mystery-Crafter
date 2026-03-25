import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameData } from '../../types';
import { gemini } from '../../services/geminiService';
import { useCredits } from '../../hooks/useCredits';

interface QuickModeEditorProps {
    gameData: GameData;
    onSave: (data: GameData) => Promise<void>;
}

const QuickModeEditor: React.FC<QuickModeEditorProps> = ({ gameData, onSave }) => {
    const [title, setTitle] = useState(gameData.title?.KO || '바다거북스프 미스터리');
    const [surfaceStory, setSurfaceStory] = useState(gameData.description?.KO || '');
    
    // Quick Mode uses the conclusion.mysterySolution as the Hidden Truth
    const [hiddenTruth, setHiddenTruth] = useState(
        gameData.conclusion?.mysterySolution?.KO || ''
    );
    
    // Quick Mode uses the startScene's imagePrompt for its single image
    const startSceneId = gameData.startSceneId || 'scene_1';
    const [imagePrompt, setImagePrompt] = useState(
        gameData.scenes[startSceneId]?.imagePrompt || ''
    );
    const [imageUrl, setImageUrl] = useState(
        gameData.scenes[startSceneId]?.imageUrl || ''
    );
    
    // AI Auto-Complete State
    const [aiIdea, setAiIdea] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState<string>('mystery');
    const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');

    const STYLES = [
        { key: 'casual',  emoji: '🌸', label: '캐주얼',    desc: '전연령 · 따뜻한 일상' },
        { key: 'mystery', emoji: '🔍', label: '미스터리',   desc: '심리 · 범죄 추리' },
        { key: 'comic',   emoji: '😂', label: '코믹',      desc: '황당 · 유머 반전' },
        { key: 'horror',  emoji: '👻', label: '호러',      desc: '공포 · 오컬트' },
        { key: 'scifi',   emoji: '🚀', label: 'SF/판타지', desc: '미래 · 마법 세계' },
    ];

    const DIFFICULTIES = [
        { key: 'easy'   as const, emoji: '🟢', label: '쉬움',  desc: '힌트 5개 · 단순 반전',      color: 'emerald' },
        { key: 'normal' as const, emoji: '🟡', label: '보통',  desc: '힌트 3개 · 표준 추리',      color: 'amber'   },
        { key: 'hard'   as const, emoji: '🔴', label: '어려움', desc: '힌트 1개 · 다단계 논리',    color: 'red'     },
    ];
    
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const navigate = useNavigate();
    const { useCredit, credits } = useCredits();

    const handleGenerate = async () => {
        if (!aiIdea) return;
        setIsGenerating(true);
        try {
            const ok = await useCredit(10);
            if (!ok) {
                alert('크레딧이 부족합니다. 게임 생성에는 10크레딧이 필요합니다.\n상단의 크레딧 버튼을 눌러 충전해 주세요.');
                setIsGenerating(false);
                return;
            }
            const result = await gemini.generateQuickModeMystery(aiIdea, selectedStyle, selectedDifficulty);
            setTitle(result.title);
            setSurfaceStory(result.surfaceStory);
            setHiddenTruth(result.hiddenTruth);
            setImagePrompt(result.imagePrompt);
            setAiIdea(''); // Clear idea after success
            
            // Generate Image right away
            try {
                const imgData = await gemini.generateImage(result.imagePrompt, 'retro_pixel' as any);
                if (imgData) setImageUrl(imgData);
            } catch (err) {
                console.warn("Image generation skipped/failed:", err);
            }

        } catch (error) {
            console.error("AI Generation failed:", error);
            alert("AI 생성에 실패했습니다. API 키 설정이나 네트워크를 확인해 주세요.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        const updatedData = { ...gameData };
        
        updatedData.difficulty = selectedDifficulty;
        updatedData.title = { ...updatedData.title, KO: title };
        updatedData.description = { ...updatedData.description, KO: surfaceStory };
        
        // Ensure conclusion exists
        if (!updatedData.conclusion) {
            updatedData.conclusion = {
                mysterySolution: { KO: '', EN: '' },
                successTitle: { KO: '진실 파악', EN: 'Truth Revealed' },
                successBody: { KO: '당신은 진실에 도달했습니다.', EN: 'You found the truth.' },
                failureTitle: { KO: '미제 사건', EN: 'Cold Case' },
                failureBody: { KO: '미궁에 빠졌습니다.', EN: 'The case went cold.' }
            };
        }
        updatedData.conclusion.mysterySolution = { 
            ...updatedData.conclusion.mysterySolution, 
            KO: hiddenTruth 
        };

        // Ensure start scene exists
        if (!updatedData.scenes[startSceneId]) {
            updatedData.scenes[startSceneId] = {
                id: startSceneId,
                name: { KO: '사건 현장', EN: 'Crime Scene' },
                visualStyle: 'ligne_claire',
                imagePrompt: '',
                descriptionText: { KO: '', EN: '' },
                hotspots: [],
                npcIds: []
            };
        }
        updatedData.scenes[startSceneId].imagePrompt = imagePrompt;
        updatedData.scenes[startSceneId].imageUrl = imageUrl;
        updatedData.scenes[startSceneId].descriptionText = { 
            ...updatedData.scenes[startSceneId].descriptionText, 
            KO: surfaceStory 
        };

        await onSave(updatedData);
        setIsSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 lg:p-12 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-900/20 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Back to Studio Link */}
                <div className="mb-6">
                    <button 
                        onClick={() => navigate('/user/studio')}
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        스튜디오로 돌아가기
                    </button>
                </div>

                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-widest uppercase mb-2">
                            <span>🐢</span> Quick Mode
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">
                            바다거북스프 에디터
                        </h1>
                        <p className="text-zinc-400 text-sm md:text-base font-medium max-w-xl">
                            플레이어는 오직 '예/아니오' 질문만 던질 수 있습니다. 표면적인 사건과 충격적인 진실을 설정하여 AI 추리 게임을 단숨에 완성하세요.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleSave}
                            disabled={isSaving || saveSuccess}
                            className={`group relative px-6 py-4 font-bold rounded-2xl overflow-hidden transition-all duration-300 disabled:opacity-80 flex items-center justify-center gap-3 shrink-0 ${saveSuccess ? 'bg-emerald-500 text-black' : 'bg-white text-black shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)]'}`}
                        >
                            {!saveSuccess && <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-[150%] skew-x-[-20deg] group-hover:animate-shimmer"></div>}
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                            ) : saveSuccess ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                            )}
                            <span>{isSaving ? '저장 중...' : saveSuccess ? '저장 완료!' : '프로젝트 저장'}</span>
                        </button>
                        <button
                            onClick={() => navigate(`/play/${gameData.id}`)}
                            className="group px-6 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-500 transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)] flex items-center justify-center gap-3 shrink-0"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            <span>바로 플레이</span>
                        </button>
                    </div>
                </header>

                {/* AI Assistant Banner */}
                <div className="mb-8 rounded-3xl bg-gradient-to-r from-emerald-900 via-[#0a0a0a] to-[#0a0a0a] border border-emerald-500/20 shadow-2xl relative group overflow-hidden p-0.5">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[150%] skew-x-[-20deg] group-hover:animate-shimmer pointer-events-none"></div>
                    <div className="bg-[#0a0a0a] rounded-[22px] p-6 lg:p-8 flex flex-col gap-5 relative z-10">

                        {/* Style Tag Buttons */}
                        <div className="space-y-2">
                            <label className="text-zinc-500 font-bold text-xs tracking-widest uppercase flex items-center gap-2">
                                <span>🎭</span> 게임 스타일 선택
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {STYLES.map((s) => {
                                    const isSelected = selectedStyle === s.key;
                                    return (
                                        <button
                                            key={s.key}
                                            onClick={() => setSelectedStyle(s.key)}
                                            className={`group/style flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm transition-all duration-200
                                                ${isSelected
                                                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.2)]'
                                                    : 'bg-zinc-900/60 border-zinc-700/50 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                                                }`}
                                        >
                                            <span className="text-base">{s.emoji}</span>
                                            <span>{s.label}</span>
                                            <span className={`text-[10px] font-normal hidden sm:block ${isSelected ? 'text-emerald-400/70' : 'text-zinc-600'}`}>
                                                {s.desc}
                                            </span>
                                            {isSelected && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Difficulty Selector */}
                        <div className="space-y-2">
                            <label className="text-zinc-500 font-bold text-xs tracking-widest uppercase flex items-center gap-2">
                                <span>⚡</span> 난이도 선택
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {DIFFICULTIES.map((d) => {
                                    const isSelected = selectedDifficulty === d.key;
                                    const colorMap: Record<string, string> = {
                                        emerald: isSelected ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.2)]' : 'bg-zinc-900/60 border-zinc-700/50 text-zinc-400 hover:border-emerald-700/50 hover:text-zinc-200',
                                        amber:   isSelected ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.2)]'   : 'bg-zinc-900/60 border-zinc-700/50 text-zinc-400 hover:border-amber-700/50 hover:text-zinc-200',
                                        red:     isSelected ? 'bg-red-500/20 border-red-500/60 text-red-300 shadow-[0_0_16px_rgba(239,68,68,0.2)]'         : 'bg-zinc-900/60 border-zinc-700/50 text-zinc-400 hover:border-red-700/50 hover:text-zinc-200',
                                    };
                                    return (
                                        <button
                                            key={d.key}
                                            onClick={() => setSelectedDifficulty(d.key)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm transition-all duration-200 ${colorMap[d.color]}`}
                                        >
                                            <span className="text-base">{d.emoji}</span>
                                            <span>{d.label}</span>
                                            <span className="text-[10px] font-normal hidden sm:block opacity-60">{d.desc}</span>
                                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 shadow-[0_0_6px_currentColor]"></span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Keyword Input + Generate Button */}
                        <div className="flex flex-col md:flex-row gap-6 items-center">
                            <div className="flex-1 w-full space-y-3">
                                <label className="text-emerald-400 font-bold text-xs tracking-widest flex items-center gap-2">
                                    <span className="animate-pulse">✨</span> 원키워드 AI 자동완성
                                </label>
                                <input
                                    type="text"
                                    value={aiIdea}
                                    onChange={(e) => setAiIdea(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
                                    placeholder="생각나는 짧은 키워드 한 줄을 적으세요. (예: 우산을 썼는데 비를 맞았다)"
                                    className="w-full bg-transparent border-none outline-none text-xl sm:text-2xl font-bold placeholder:text-zinc-600 p-0 text-white focus:ring-0"
                                />
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !aiIdea.trim()}
                                className="w-full md:w-auto px-8 py-4 bg-emerald-500 text-black font-black rounded-xl hover:bg-emerald-400 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 shrink-0 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                        마법 부리는 중...
                                    </>
                                ) : (
                                    <>AI 단숨에 게임 만들기 <span className="text-xs font-normal opacity-70">(-10⚡)</span></>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-min">
                    
                    {/* Title Input - Spans full width on small, 4 cols on large */}
                    <div className="md:col-span-12 lg:col-span-4 p-1 rounded-3xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-800 shadow-2xl relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none"></div>
                        <div className="h-full bg-[#0a0a0a] rounded-[22px] p-6 lg:p-8 flex flex-col gap-4 relative z-10">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div> 타이틀
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="예: 한밤중의 초대장"
                                className="w-full bg-transparent border-none outline-none text-2xl font-bold placeholder:text-zinc-700 focus:ring-0 p-0 text-white"
                            />
                            <p className="text-zinc-500 text-sm mt-auto pt-4 border-t border-zinc-800/50">
                                사건의 제목을 매력적으로 지어주세요.
                            </p>
                        </div>
                    </div>

                    {/* Image Prompt & Preview - Spans 8 cols */}
                    <div className="md:col-span-12 lg:col-span-8 p-1 rounded-3xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-800 shadow-2xl relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none"></div>
                        <div className="h-full bg-[#0a0a0a] rounded-[22px] p-6 lg:p-8 flex flex-col md:flex-row gap-6 relative z-10">
                            
                            {/* Image Preview Window */}
                            <div className="w-full md:w-1/2 rounded-xl bg-zinc-900 border border-zinc-800 relative flex items-center justify-center overflow-hidden shrink-0">
                                {imageUrl ? (
                                    <img src={imageUrl} alt="Generated Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center text-zinc-600 flex flex-col items-center gap-2 py-12">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                        <span className="text-xs font-bold uppercase tracking-widest">No Image</span>
                                    </div>
                                )}
                            </div>

                            {/* Prompt & Actions */}
                            <div className="flex-1 flex flex-col gap-4">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> 메인 이미지 프롬프트
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if(!imagePrompt) return;
                                            try {
                                                setIsGenerating(true);
                                                const imgUrl = await gemini.generateImage(imagePrompt, 'retro_pixel' as any);
                                                if (imgUrl) setImageUrl(imgUrl);
                                            } finally { setIsGenerating(false); }
                                        }}
                                        disabled={isGenerating || !imagePrompt}
                                        className="text-[10px] bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 px-3 py-1.5 rounded-md border border-blue-500/20 font-bold tracking-widest uppercase transition-colors"
                                    >
                                        {isGenerating ? '생성 중...' : '이미지 다시 생성'}
                                    </button>
                                </label>
                                <textarea
                                    value={imagePrompt}
                                    onChange={(e) => setImagePrompt(e.target.value)}
                                    placeholder="예: 비가 내리는 어두운 숲 속, 버려진 경찰차 한 대. 안개 낀 스릴러 분위기."
                                    className="w-full h-full bg-transparent border-none outline-none text-sm text-zinc-300 placeholder:text-zinc-700 resize-none focus:ring-0 p-0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Surface Story - Spans 6 cols */}
                    <div className="md:col-span-12 xl:col-span-6 p-1 rounded-3xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-800 shadow-2xl relative group md:min-h-[320px]">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none"></div>
                        <div className="h-full bg-[#0a0a0a] rounded-[22px] p-6 lg:p-8 flex flex-col gap-4 relative z-10">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500"></div> 표면적 사건 (플레이어 공개)
                            </label>
                            <textarea
                                value={surfaceStory}
                                onChange={(e) => setSurfaceStory(e.target.value)}
                                placeholder="어떤 남자가 레스토랑에서 바다거북스프를 먹고 밖으로 나가 자살했다. 왜 그랬을까?"
                                className="w-full bg-transparent border-none outline-none text-xl sm:text-2xl font-serif text-white placeholder:text-zinc-700 resize-none flex-1 focus:ring-0 p-0 leading-relaxed"
                            />
                        </div>
                    </div>

                    {/* Hidden Truth - Spans 6 cols */}
                    <div className="md:col-span-12 xl:col-span-6 p-1 rounded-3xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-800 shadow-2xl relative group md:min-h-[320px]">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none"></div>
                        <div className="h-full bg-[#0a0a0a] rounded-[22px] p-6 lg:p-8 flex flex-col gap-4 relative z-10">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div> 숨겨진 진실 (AI 전용)
                                </div>
                                <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-lg">1급 기밀</span>
                            </label>
                            <textarea
                                value={hiddenTruth}
                                onChange={(e) => setHiddenTruth(e.target.value)}
                                placeholder="남자는 과거 무인도에 조난되었을 때 맹인 상태였고... (AI가 사용자 질문에 Yes/No를 판단하는 절대 기준이 됩니다.)"
                                className="w-full bg-transparent border-none outline-none text-lg text-red-50/80 placeholder:text-red-900/40 resize-none flex-1 focus:ring-0 p-0 leading-relaxed"
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default QuickModeEditor;
