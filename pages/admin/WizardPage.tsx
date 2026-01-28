
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { WizardLayout } from '../../components/Wizard/WizardLayout';
import { AIManager, AI_MODELS, GlobalAIConfig } from '../../services/aiManager';
import { DataManager } from '../../services/dataManager';
import StoryboardPreview from '../../components/Wizard/StoryboardPreview';
import MessageModal from '../../components/UI/MessageModal';
import Spinner from '../../components/Spinner';
import { VisualStyle } from '../../types';
import { STYLE_METADATA } from '../../constants';

const WizardPage: React.FC = () => {
    const navigate = useNavigate();
    const { userType } = useAuth();
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

    // Step 1: Config
    const [config, setConfig] = useState<GlobalAIConfig>(AIManager.getConfig());

    // Step 2: Theme
    const [themeInput, setThemeInput] = useState('');
    const [suggestedConcepts, setSuggestedConcepts] = useState<string[]>([]);
    const [loadingConcepts, setLoadingConcepts] = useState(false);

    // Step 3: Visual Style
    const [selectedStyle, setSelectedStyle] = useState<VisualStyle>(VisualStyle.LIGNE_CLAIRE);

    // Step 4: Storyboard
    const [selectedConcept, setSelectedConcept] = useState('');
    const [storyboard, setStoryboard] = useState<any>(null);
    const [generatingStoryboard, setGeneratingStoryboard] = useState(false);
    const [refinementInput, setRefinementInput] = useState('');
    const [refining, setRefining] = useState(false);

    // General
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        // Load initial config
        const savedConfig = AIManager.getConfig();
        setConfig(savedConfig);

        // Check if we have a usable key (either in localStorage or Env)
        const activeKey = AIManager.getActiveKey();
        if (activeKey) {
            setStep(2);
        }
    }, []);

    const saveConfig = () => {
        AIManager.saveConfig(config);
    };

    const handleGenerateConcepts = async () => {
        if (!themeInput.trim()) return;
        setLoadingConcepts(true);
        try {
            saveConfig(); // Save keys first
            const concepts = await AIManager.generateStoryConcepts(themeInput);
            setSuggestedConcepts(concepts);
        } catch (e: any) {
            setErrorMsg(`${e.message}\n\n[설정 확인이 필요합니다. 1단계에서 API 키와 모델을 다시 확인해주세요.]`);
        } finally {
            setLoadingConcepts(false);
        }
    };

    const handleSelectConcept = (concept: string) => {
        setSelectedConcept(concept);
        setStep(3);
    };

    const handleStartGeneration = async () => {
        setStep(4);
        setGeneratingStoryboard(true);
        try {
            const data = await AIManager.generateGameBlueprint(selectedConcept, selectedStyle);
            setStoryboard(data);
        } catch (e: any) {
            setErrorMsg(e.message);
            setStep(3); // Go back on error
        } finally {
            setGeneratingStoryboard(false);
        }
    };

    const handleRefine = async () => {
        if (!refinementInput.trim() || !storyboard) return;
        setRefining(true);
        try {
            const data = await AIManager.refineGameBlueprint(storyboard, refinementInput);
            setStoryboard(data);
            setRefinementInput('');
        } catch (e: any) {
            setErrorMsg(e.message);
        } finally {
            setRefining(false);
        }
    };

    const handleFinalSave = async () => {
        if (!storyboard) return;
        try {
            if (!storyboard.id) storyboard.id = `game_${Date.now()}`;
            // Ensure ownerId is retrieved - assume user is authenticated for now or handle in DataManager
            // For now, passing 'wizard-user' until proper auth context is hooked if missing
            // But Studio requires Auth. Assuming safe here since it's /admin route.
            // Let's get real user ID using supabase check if possible, or pass null and let DataManager handle checks?
            // DataManager needs ownerId.
            // We'll rely on the existing auth context in the App. 
            // Ideally we'd use useAuth hook here.

            // Temporary: fetch user from session storage or let DataManager resolve current session
            const { data: { user } } = await import('../../services/supabase').then(m => m.supabase.auth.getUser());
            if (!user) throw new Error("Please log in to save.");

            await DataManager.saveGame(null, storyboard, user.id);
            const studioBase = userType === 'admin' ? '/admin/studio' : '/user/studio';
            navigate(`${studioBase}/${storyboard.id}`);
        } catch (e: any) {
            setErrorMsg(e.message);
        }
    };

    return (
        <WizardLayout>
            <div className="flex flex-col max-w-5xl mx-auto p-4 md:p-8 break-keep min-h-screen">
                {/* Progress Indicators */}
                <div className="flex items-center gap-4 mb-12 text-[10px] md:text-xs font-bold uppercase tracking-widest overflow-x-auto pb-4 hide-scrollbar">
                    <div className={`px-4 py-1.5 rounded-full whitespace-nowrap ${step >= 1 ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-600'}`}>1. AI 설정</div>
                    <div className="min-w-8 h-px bg-zinc-800" />
                    <div className={`px-4 py-1.5 rounded-full whitespace-nowrap ${step >= 2 ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-600'}`}>2. 주제 선정</div>
                    <div className="min-w-8 h-px bg-zinc-800" />
                    <div className={`px-4 py-1.5 rounded-full whitespace-nowrap ${step >= 3 ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-600'}`}>3. 비주얼 스타일</div>
                    <div className="min-w-8 h-px bg-zinc-800" />
                    <div className={`px-4 py-1.5 rounded-full whitespace-nowrap ${step >= 4 ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-600'}`}>4. 스토리보드</div>
                </div>

                {/* STEP 1: AI CONFIG */}
                {step === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <h2 className="text-3xl font-mystery font-bold text-white">AI 어시스턴트 설정</h2>
                                <p className="text-zinc-500">미스터리 생성을 위해 사용할 AI 모델을 선택하세요.</p>
                            </div>
                            <button
                                onClick={() => { localStorage.removeItem('mc_ai_config'); window.location.reload(); }}
                                className="text-xs text-zinc-600 hover:text-red-500 transition-colors border border-zinc-800 px-3 py-1 rounded"
                            >
                                설정 초기화
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* GOOGLE */}
                            <div className={`p-6 rounded-xl border cursor-pointer transition ${config.activeModel.provider === 'google' ? 'bg-zinc-800 border-red-600 ring-1 ring-red-600' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                                onClick={() => setConfig({ ...config, activeModel: { ...config.activeModel, provider: 'google' } })}>
                                <h3 className="font-bold text-white mb-4">Google Gemini</h3>
                                <div className="space-y-3">
                                    <input
                                        type="password"
                                        placeholder="API Key (Optional if Env set)"
                                        value={config.keys.google || ''}
                                        onChange={e => setConfig({ ...config, keys: { ...config.keys, google: e.target.value } })}
                                        className="w-full bg-black/50 border border-zinc-700 rounded p-2 text-xs text-white focus:border-red-600 outline-none"
                                        onClick={e => e.stopPropagation()}
                                    />
                                    <select
                                        value={config.activeModel.provider === 'google' ? config.activeModel.modelId : ''}
                                        onChange={e => setConfig({ ...config, activeModel: { provider: 'google', modelId: e.target.value } })}
                                        className="w-full bg-black/50 border border-zinc-700 rounded p-2 text-xs text-white"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {AI_MODELS.google.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* OPENAI */}
                            <div className={`p-6 rounded-xl border cursor-pointer transition ${config.activeModel.provider === 'openai' ? 'bg-zinc-800 border-green-600 ring-1 ring-green-600' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                                onClick={() => setConfig({ ...config, activeModel: { ...config.activeModel, provider: 'openai' } })}>
                                <h3 className="font-bold text-white mb-4">OpenAI GPT</h3>
                                <div className="space-y-3">
                                    <input
                                        type="password"
                                        placeholder="sk-..."
                                        value={config.keys.openai || ''}
                                        onChange={e => setConfig({ ...config, keys: { ...config.keys, openai: e.target.value } })}
                                        className="w-full bg-black/50 border border-zinc-700 rounded p-2 text-xs text-white focus:border-green-600 outline-none"
                                        onClick={e => e.stopPropagation()}
                                    />
                                    <select
                                        value={config.activeModel.provider === 'openai' ? config.activeModel.modelId : ''}
                                        onChange={e => setConfig({ ...config, activeModel: { provider: 'openai', modelId: e.target.value } })}
                                        className="w-full bg-black/50 border border-zinc-700 rounded p-2 text-xs text-white"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {AI_MODELS.openai.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* ANTHROPIC */}
                            <div className={`p-6 rounded-xl border cursor-pointer transition ${config.activeModel.provider === 'anthropic' ? 'bg-zinc-800 border-purple-600 ring-1 ring-purple-600' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                                onClick={() => setConfig({ ...config, activeModel: { ...config.activeModel, provider: 'anthropic' } })}>
                                <h3 className="font-bold text-white mb-4">Anthropic Claude</h3>
                                <div className="space-y-3">
                                    <input
                                        type="password"
                                        placeholder="sk-ant-..."
                                        value={config.keys.anthropic || ''}
                                        onChange={e => setConfig({ ...config, keys: { ...config.keys, anthropic: e.target.value } })}
                                        className="w-full bg-black/50 border border-zinc-700 rounded p-2 text-xs text-white focus:border-purple-600 outline-none"
                                        onClick={e => e.stopPropagation()}
                                    />
                                    <select
                                        value={config.activeModel.provider === 'anthropic' ? config.activeModel.modelId : ''}
                                        onChange={e => setConfig({ ...config, activeModel: { provider: 'anthropic', modelId: e.target.value } })}
                                        className="w-full bg-black/50 border border-zinc-700 rounded p-2 text-xs text-white"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {AI_MODELS.anthropic.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-8">
                            <button
                                onClick={() => { saveConfig(); setStep(2); }}
                                className="px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition"
                            >
                                다음 단계로 →
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: THEME */}
                {step === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col">
                        <div className="space-y-2 shrink-0">
                            <button onClick={() => setStep(1)} className="text-xs text-zinc-500 hover:text-white mb-2">← 설정으로 돌아가기</button>
                            <h2 className="text-3xl font-mystery font-bold text-white">미스터리 주제 선택</h2>
                            <p className="text-zinc-500">원하는 스토리의 종류를 설명하거나 AI에게 트렌드를 추천받으세요.</p>
                        </div>

                        <div className="flex gap-4 shrink-0">
                            <input
                                type="text"
                                value={themeInput}
                                onChange={e => setThemeInput(e.target.value)}
                                placeholder="예: 사이버펑크 우주 정거장에서 발생한 살인 사건..."
                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-red-600 outline-none text-lg"
                                onKeyDown={e => e.key === 'Enter' && handleGenerateConcepts()}
                            />
                            <button
                                onClick={handleGenerateConcepts}
                                disabled={loadingConcepts}
                                className="px-6 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition disabled:opacity-50 min-w-[120px]"
                            >
                                {loadingConcepts ? <Spinner className="w-5 h-5 border-2 border-white border-t-transparent" /> : '아이디어 얻기'}
                            </button>
                        </div>

                        {/* Suggestions Grid */}
                        <div className="flex-1 overflow-y-auto min-h-[300px]" style={{ scrollbarGutter: 'stable' }}>
                            {loadingConcepts ? (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4">
                                    <Spinner className="w-8 h-8 border-4 border-red-600 border-t-transparent" />
                                    <p className="animate-pulse">입력하신 주제 관련 웹 검색 및 트렌드 분석 중...</p>
                                </div>
                            ) : suggestedConcepts.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {suggestedConcepts.map((concept, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => handleSelectConcept(concept)}
                                            className="group p-6 bg-zinc-900/50 border border-zinc-800 hover:border-red-600 hover:bg-zinc-900 rounded-xl cursor-pointer transition-all"
                                        >
                                            <div className="flex justify-between items-start">
                                                <span className="text-xs font-bold text-red-500 mb-2 block uppercase tracking-widest">컨셉 {idx + 1}</span>
                                                <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-bold uppercase tracking-widest border border-white px-3 py-1 rounded-full transition-opacity">선택 및 생성</span>
                                            </div>
                                            <p className="text-zinc-300 leading-relaxed group-hover:text-white transition-colors">{concept}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-zinc-700 border-2 border-dashed border-zinc-800 rounded-xl">
                                    위 입력창에 주제를 입력하여 아이디어를 생성해보세요.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 3: VISUAL STYLE */}
                {step === 3 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-2">
                            <button onClick={() => setStep(2)} className="text-xs text-zinc-500 hover:text-white mb-2">← 주제 선택으로 돌아가기</button>
                            <h2 className="text-3xl font-mystery font-bold text-white">비주얼 스타일 선택</h2>
                            <p className="text-zinc-500">게임의 분위기를 결정할 이미지 스타일을 선택하세요. 모든 장소와 아이템에 이 스타일이 적용됩니다.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {(Object.entries(STYLE_METADATA) as [VisualStyle, any][]).map(([key, meta]) => (
                                <div
                                    key={key}
                                    onClick={() => setSelectedStyle(key)}
                                    className={`group relative rounded-[2.5rem] border-2 cursor-pointer transition-all duration-500 overflow-hidden aspect-[4/5] flex flex-col ${selectedStyle === key
                                        ? 'border-red-600 shadow-[0_25px_60px_-15px_rgba(220,38,38,0.4)] scale-[1.03] z-10'
                                        : 'border-white/5 hover:border-white/20 hover:scale-[1.01]'}`}
                                >
                                    {/* Preview Image */}
                                    <div className="absolute inset-0">
                                        <img
                                            src={meta.preview}
                                            alt={meta.label}
                                            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${selectedStyle === key ? 'brightness-110' : 'brightness-50 grayscale-[0.3]'}`}
                                        />
                                        <div className={`absolute inset-0 transition-opacity duration-500 ${selectedStyle === key ? 'bg-gradient-to-t from-black via-black/40 to-transparent opacity-100' : 'bg-black/60 opacity-80'}`} />
                                    </div>

                                    {/* content */}
                                    <div className="mt-auto p-8 relative z-10 space-y-3">
                                        <div className={`text-4xl transition-transform duration-500 flex items-center justify-between ${selectedStyle === key ? 'scale-110' : 'opacity-50'}`}>
                                            <span>{meta.icon}</span>
                                            {/* Radio indicator */}
                                            <div className={`w-6 h-6 rounded-full border-2 transition-all duration-500 flex items-center justify-center ${selectedStyle === key ? 'border-red-600 bg-red-600' : 'border-zinc-500'}`}>
                                                {selectedStyle === key && <div className="w-2.5 h-2.5 bg-white rounded-full shadow-lg" />}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className={`text-xl font-bold mystery-font transition-colors ${selectedStyle === key ? 'text-white' : 'text-zinc-400'}`}>
                                                {meta.label}
                                            </h3>
                                            <p className={`text-xs mt-2 leading-relaxed transition-opacity duration-500 ${selectedStyle === key ? 'text-zinc-300 opacity-100' : 'text-zinc-500 opacity-0 group-hover:opacity-100'}`}>
                                                {meta.desc}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Selection Glow */}
                                    {selectedStyle === key && (
                                        <div className="absolute inset-0 border-[3px] border-red-600/50 rounded-[2.5rem] pointer-events-none animate-pulse" />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-12 border-t border-white/5">
                            <div className="flex items-center gap-4 bg-zinc-900/50 px-6 py-3 rounded-2xl border border-white/5">
                                <span className="text-3xl">{STYLE_METADATA[selectedStyle].icon}</span>
                                <div>
                                    <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">선택된 스타일</div>
                                    <div className="text-sm font-bold text-white mystery-font">{STYLE_METADATA[selectedStyle].label}</div>
                                </div>
                            </div>
                            <button
                                onClick={handleStartGeneration}
                                className="w-full md:w-auto px-12 py-5 bg-white text-black font-black rounded-2xl hover:bg-red-600 hover:text-white transition-all duration-300 shadow-2xl uppercase tracking-[0.2em] text-sm group"
                            >
                                <span className="flex items-center gap-3">
                                    스토리보드 설계 시작
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:translate-x-1 transition-transform"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4: STORYBOARD */}
                {step === 4 && (
                    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {generatingStoryboard ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
                                <Spinner className="w-16 h-16 border-4 border-red-600 border-t-transparent" />
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">미스터리 설계 중...</h3>
                                    <p className="text-zinc-500 max-w-md mx-auto">장소를 만들고, 스토리보드를 구성하고, 증거를 심고, 대사를 작성하고 있습니다.</p>
                                </div>
                            </div>
                        ) : storyboard ? (
                            <div className="flex flex-col">
                                <div className="flex justify-between items-center mb-6 shrink-0">
                                    <div>
                                        <button onClick={() => setStep(2)} className="text-xs text-zinc-500 hover:text-white mb-1">← 아이디어로 돌아가기</button>
                                        <h2 className="text-2xl font-bold text-white">스토리보드 준비 완료</h2>
                                    </div>
                                    <button
                                        onClick={handleFinalSave}
                                        className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 transition shadow-lg shadow-green-900/20 flex items-center gap-2"
                                    >
                                        <span>확인 및 스튜디오 열기</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                    </button>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <div className="">
                                        <StoryboardPreview data={storyboard} />
                                    </div>

                                    {/* Refinement UI */}
                                    <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl flex gap-4 items-end shadow-2xl">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">스토리보드 수정 요청</label>
                                            <textarea
                                                value={refinementInput}
                                                onChange={e => setRefinementInput(e.target.value)}
                                                placeholder="예: 더 길게, 더 복잡하게, 더 많은 인원과 장소 추가해줘, 아이템 조합 요소도 넣어줘..."
                                                className="w-full bg-black/50 border border-zinc-700 rounded-lg p-3 text-sm text-white focus:border-red-600 outline-none min-h-[80px] resize-none"
                                            />
                                        </div>
                                        <button
                                            onClick={handleRefine}
                                            disabled={refining || !refinementInput.trim()}
                                            className="px-6 py-4 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition disabled:opacity-50 min-w-[120px] h-[80px] flex items-center justify-center border border-zinc-700"
                                        >
                                            {refining ? <Spinner className="w-5 h-5 border-2 border-white border-t-transparent" /> : '수정 및 재설계'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            {/* Error Modal */}
            {
                errorMsg && (
                    <MessageModal
                        isOpen={!!errorMsg}
                        type="ALERT"
                        title="Error"
                        message={errorMsg}
                        onConfirm={() => setErrorMsg('')}
                    />
                )
            }
        </WizardLayout >
    );
};

export default WizardPage;
