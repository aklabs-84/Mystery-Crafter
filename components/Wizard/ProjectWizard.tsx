
import React, { useState } from 'react';
import { GameData, VisualStyle, AIModelTier, Localized } from '../../types';
import { translations, Language } from '../../translations';
import { gemini, GameBlueprint } from '../../services/geminiService';

interface ProjectWizardProps {
  lang: Language;
  onComplete: (data: GameData) => void;
  onCancel: () => void;
}

const ProjectWizard: React.FC<ProjectWizardProps> = ({ lang, onComplete, onCancel }) => {
  const t = translations[lang];
  // step: 0(Tier), 1(Core Theme), 2(Deep Dive), 2.5(Review Blueprint), 3(Asset Creation)
  const [step, setStep] = useState<number | string>(0); 
  const [tier, setTier] = useState<AIModelTier>(AIModelTier.FLASH);
  const [subject, setSubject] = useState('');
  const [length, setLength] = useState('Medium');
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [blueprint, setBlueprint] = useState<GameBlueprint | null>(null);

  const l = (val: any) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val[lang] || val['EN'] || val['KO'] || '';
  };

  const handleTierSelection = (selectedTier: AIModelTier) => {
    setTier(selectedTier);
  };

  // handleNextFromTier manages the model tier transition and handles API key selection for Pro models
  const handleNextFromTier = async () => {
    if (tier === AIModelTier.PRO) {
      try {
        // As per guidelines, we trigger the key selection and proceed immediately to avoid race conditions
        await (window as any).aistudio.openSelectKey();
        setStep(1);
      } catch (e) {
        console.error("Key selection failed", e);
        // If it fails, we still allow proceeding or show the error
        setStep(1);
      }
    } else {
      setStep(1);
    }
  };

  const handleNextToQuestions = async () => {
    setIsGenerating(true);
    try {
      const qs = await gemini.generateStoryQuestions(subject, lang);
      setQuestions(qs || []);
      setStep(2);
    } catch (e) {
      console.error(e);
      alert(lang === 'KO' ? "질문 생성 중 오류가 발생했습니다." : "Error generating questions.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoFill = async () => {
    if (isAutoFilling) return;
    setIsAutoFilling(true);
    try {
      const suggestedAnswers = await gemini.generateStoryAnswers(subject, questions, lang);
      if (suggestedAnswers && suggestedAnswers.length === 3) {
        setAnswers(suggestedAnswers);
      }
    } catch (error) {
      console.error("Auto-fill failed:", error);
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleReviewPlan = async () => {
    setIsGenerating(true);
    try {
      const finalAnswers = useCustomInput ? [customInput] : answers;
      const bp = await gemini.generateGameBlueprint(subject, length, finalAnswers, lang);
      setBlueprint(bp);
      setStep(2.5);
    } catch (e) {
      console.error(e);
      alert("Blueprint analysis failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleStartGeneration = async () => {
    setStep(3);
    setIsGenerating(true);
    setStatus(t.wizardGenerating);
    setProgress(5);

    try {
      const finalAnswers = useCustomInput ? [customInput] : answers;
      const gameData = await gemini.generateFullGameData(subject, length, finalAnswers, tier);
      setProgress(25);
      setStatus(t.wizardVisualizing);

      const items = Object.values(gameData.items);
      const npcs = Object.values(gameData.npcs);
      const scenes = Object.values(gameData.scenes);
      const totalTasks = items.length + npcs.length + scenes.length;
      let completedTasks = 0;

      const updateProgress = (name: string) => {
        completedTasks++;
        setStatus(`${t.wizardVisualizing}\n(${name})`);
        const p = 25 + (totalTasks > 0 ? (completedTasks / totalTasks) * 75 : 75);
        setProgress(Math.round(p));
      };

      for (const item of items) {
        updateProgress(l(item.name));
        const url = await gemini.generateImage(item.imagePrompt || l(item.name), VisualStyle.LIGNE_CLAIRE, 'ITEM', null, tier);
        if (url) gameData.items[item.id].iconUrl = url;
        await sleep(500);
      }

      for (const npc of npcs) {
        updateProgress(l(npc.name));
        const url = await gemini.generateImage(npc.imagePrompt || l(npc.name), VisualStyle.LIGNE_CLAIRE, 'NPC', null, tier);
        if (url) gameData.npcs[npc.id].portraitUrl = url;
        await sleep(500);
      }

      for (const scene of scenes) {
        updateProgress(l(scene.name));
        const url = await gemini.generateImage(scene.imagePrompt, VisualStyle.LIGNE_CLAIRE, 'SCENE', { hotspots: scene.hotspots || [] }, tier);
        if (url) gameData.scenes[scene.id].imageUrl = url;
        await sleep(500);
      }

      setStatus(t.wizardComplete);
      setProgress(100);
      setTimeout(() => onComplete(gameData), 800);
    } catch (error: any) {
      console.error(error);
      // As per guidelines, handle the specific error to re-trigger key selection if needed
      if (error?.message?.includes("Requested entity was not found")) {
        alert(lang === 'KO' ? "API 키에 문제가 있습니다. 유료 프로젝트의 키를 다시 선택해주세요." : "There is an issue with your API key. Please re-select a key from a paid project.");
        setStep(0);
      } else {
        alert("Generation failed. Please try again.");
        setStep(1);
      }
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full w-full bg-black flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-3xl w-full bg-zinc-900/50 border border-white/10 rounded-[3rem] p-12 shadow-2xl backdrop-blur-xl animate-in zoom-in duration-500 my-10">
        
        {step === 0 && (
          <div className="space-y-10">
            <header>
              <h2 className="mystery-font text-5xl font-bold text-white mb-2">{t.selectModelTier}</h2>
              <p className="text-zinc-500">{lang === 'KO' ? '이야기의 품질을 결정할 인공지능 모델을 선택하세요.' : 'Choose AI model quality.'}</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button onClick={() => handleTierSelection(AIModelTier.FLASH)} className={`p-8 bg-zinc-950/50 border rounded-3xl text-left transition-all ${tier === AIModelTier.FLASH ? 'border-red-600 ring-2 ring-red-600/20' : 'border-white/5 hover:border-white/20'}`}>
                <h3 className="mystery-font text-2xl font-bold text-white mb-2">{t.modelTierFlash}</h3>
                <p className="text-zinc-500 text-xs">{t.modelTierFlashDesc}</p>
              </button>
              <button onClick={() => handleTierSelection(AIModelTier.PRO)} className={`p-8 bg-red-900/10 border rounded-3xl text-left transition-all ${tier === AIModelTier.PRO ? 'border-red-600 ring-2 ring-red-600/20' : 'border-red-500/20 hover:border-red-500/40'}`}>
                <h3 className="mystery-font text-2xl font-bold text-white mb-2">{t.modelTierPro}</h3>
                <p className="text-zinc-500 text-xs">{t.modelTierProDesc}</p>
                {/* Billing documentation link required for key selection */}
                <a 
                   href="https://ai.google.dev/gemini-api/docs/billing" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="mt-4 block text-[10px] text-zinc-500 underline hover:text-white"
                   onClick={(e) => e.stopPropagation()}
                >
                  {lang === 'KO' ? '결제 및 프로젝트 정보 확인' : 'View Billing & Project Info'}
                </a>
              </button>
            </div>
            <button onClick={handleNextFromTier} className="w-full py-5 bg-white text-black font-bold rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-xl uppercase tracking-widest text-[10px]">{t.wizardNext}</button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-10">
            <header><h2 className="mystery-font text-5xl font-bold text-white mb-2">{t.wizardTitle}</h2><p className="text-zinc-500">{t.wizardStep1}</p></header>
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">{t.wizardSubject}</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="..." className="w-full bg-zinc-950/50 border border-white/10 rounded-2xl p-5 text-xl text-white outline-none focus:border-red-600 transition-all" />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">{t.wizardLength}</label>
                <div className="grid grid-cols-3 gap-4">
                  {['Short', 'Medium', 'Long'].map(l => (
                    <button key={l} onClick={() => setLength(l)} className={`py-5 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all ${length === l ? 'bg-red-600 text-white border-red-600 shadow-xl' : 'bg-zinc-950/30 text-zinc-600 border-white/5'}`}>
                      {l === 'Short' ? t.wizardLengthShort : l === 'Medium' ? t.wizardLengthMedium : t.wizardLengthLong}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(0)} className="flex-1 py-5 bg-zinc-800 text-zinc-400 font-bold rounded-2xl">{lang === 'KO' ? '이전' : 'Back'}</button>
              <button disabled={!subject || isGenerating} onClick={handleNextToQuestions} className="flex-[2] py-5 bg-white text-black font-bold rounded-2xl hover:bg-red-600 hover:text-white transition-all disabled:opacity-50">{isGenerating ? t.working : t.wizardNext}</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-10">
            <header className="flex justify-between items-start">
              <h2 className="mystery-font text-5xl font-bold text-white mb-2">{t.wizardStep2}</h2>
              <button onClick={() => setUseCustomInput(!useCustomInput)} className="px-4 py-2 bg-zinc-800 border border-white/10 rounded-xl text-zinc-300 text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-all">
                {useCustomInput ? t.useQuestions : t.useCustomPrompt}
              </button>
            </header>

            {useCustomInput ? (
              <div className="space-y-4">
                <label className="block text-xs font-bold text-red-500 uppercase tracking-widest">{t.customPromptLabel}</label>
                <textarea 
                  value={customInput} 
                  onChange={(e) => setCustomInput(e.target.value)} 
                  className="w-full h-80 bg-zinc-950 border border-white/10 rounded-2xl p-6 text-zinc-300 outline-none focus:border-red-600 transition-all resize-none scrollbar-thin"
                  placeholder={lang === 'KO' ? "인물 관계, 범행 동기, 트릭 등을 자유롭게 적어주세요..." : "Enter relations, motives, tricks..."}
                />
              </div>
            ) : (
              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 scrollbar-thin">
                <div className="flex justify-end mb-4">
                   <button onClick={handleAutoFill} disabled={isAutoFilling} className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-white">{isAutoFilling ? t.working : t.autoFillAI}</button>
                </div>
                {(questions || []).map((q, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="text-white text-lg mystery-font">{q}</div>
                    <textarea value={answers[idx]} onChange={(e) => { const n = [...answers]; n[idx] = e.target.value; setAnswers(n); }} className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-4 text-sm text-zinc-300 outline-none h-24 resize-none" />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 py-5 bg-zinc-800 text-zinc-400 font-bold rounded-2xl uppercase tracking-widest text-[10px]">{lang === 'KO' ? '이전' : 'Back'}</button>
              <button disabled={isGenerating} onClick={handleReviewPlan} className="flex-[2] py-5 bg-white text-black font-bold rounded-2xl hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest text-[10px]">
                {isGenerating ? t.working : t.reviewPlan}
              </button>
            </div>
          </div>
        )}

        {step === 2.5 && blueprint && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
             <header>
               <h2 className="mystery-font text-5xl font-bold text-white mb-2">{t.blueprintTitle}</h2>
               <p className="text-zinc-500">{lang === 'KO' ? '생성 전 AI가 설계한 시나리오 요약입니다.' : 'Scenario summary before creation.'}</p>
             </header>

             <div className="grid grid-cols-1 gap-6 bg-zinc-950/50 p-8 rounded-3xl border border-white/10 shadow-2xl overflow-y-auto max-h-[500px] scrollbar-thin">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{t.gameTitle}</label>
                   <div className="text-2xl mystery-font text-white">{l(blueprint.title)}</div>
                </div>
                <div className="h-px bg-white/5" />
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.blueprintCharacters}</label>
                   <p className="text-zinc-300 text-sm leading-relaxed">{l(blueprint.characters)}</p>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.blueprintPlot}</label>
                   <p className="text-zinc-300 text-sm leading-relaxed italic">{l(blueprint.plot)}</p>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.blueprintComplexity}</label>
                   <p className="text-zinc-400 text-xs">{l(blueprint.complexity)}</p>
                </div>
             </div>

             <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="flex-1 py-5 bg-zinc-800 text-zinc-400 font-bold rounded-2xl uppercase tracking-widest text-[10px]">{lang === 'KO' ? '설정 수정' : 'Edit Design'}</button>
              <button onClick={handleStartGeneration} className="flex-[2] py-5 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-500 transition-all uppercase tracking-widest text-[10px]">
                {t.wizardStartGame}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="py-20 flex flex-col items-center text-center space-y-12">
            <div className="relative w-40 h-40">
              <div className="absolute inset-0 border-[6px] border-red-600/10 rounded-full"></div>
              <div className="absolute inset-0 border-[6px] border-red-600 rounded-full border-t-transparent animate-spin" style={{ animationDuration: '1.5s' }}></div>
              <div className="absolute inset-0 flex items-center justify-center mystery-font text-4xl font-bold text-white">{progress}%</div>
            </div>
            <div className="space-y-4">
              <h3 className="mystery-font text-3xl text-white font-bold tracking-tight animate-pulse uppercase whitespace-pre-line">{status}</h3>
              <div className="w-80 h-1.5 bg-zinc-800 rounded-full overflow-hidden mx-auto">
                <div className="h-full bg-red-600 transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectWizard;
