
import React, { useState, useEffect } from 'react';
import { NPC, DialogueNode, Item, Localized, Scene } from '../../types';
import { translations, Language } from '../../translations';
import { gemini } from '../../services/geminiService';

const l = (val: any, lang: Language): string => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val[lang] || val['EN'] || val['KO'] || '';
};

interface DialogueBoxProps {
  npc: NPC;
  node: DialogueNode;
  onOptionClick: (option: any) => void;
  onClose: () => void;
  inventory: string[];
  items: Record<string, Item>;
  lang: Language;
  gameTitle: Localized;
  currentScene: Scene;
  isAiEnabled?: boolean;
}

const DialogueBox: React.FC<DialogueBoxProps> = ({ npc, node, onOptionClick, onClose, inventory, items, lang, gameTitle, currentScene, isAiEnabled }) => {
  const t = translations[lang];
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // aiResponse를 Localized 객체로 관리
  const [aiResponse, setAiResponse] = useState<Localized | null>(null);
  const [transitionTrigger, setTransitionTrigger] = useState<any>(null);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isTyping || !isAiEnabled) return;

    const question = chatInput.trim();
    setChatInput('');
    setIsTyping(true);
    setAiResponse(null);
    setTransitionTrigger(null);

    try {
      // 1. 현재 언어로 응답 생성
      const response = await gemini.npcChat(npc, currentScene, gameTitle, question, lang, node);
      
      let cleanResponse = response;
      let triggerOption = null;

      const triggerMatch = response.match(/\[OPTION_TRIGGER:(\d+)\]/);
      if (triggerMatch) {
        const idx = parseInt(triggerMatch[1], 10);
        const option = node.options[idx];
        if (option) {
          const reqs = option.requiredItems || [];
          const isLocked = reqs.some(id => !inventory.includes(id));
          if (!isLocked) triggerOption = option;
        }
        cleanResponse = response.replace(/\[OPTION_TRIGGER:\d+\]/, '').trim();
      }

      // 2. Localized 객체 생성 및 반대 언어 번역 예약
      const initialLocalized: Localized = {
        KO: lang === 'KO' ? cleanResponse : '',
        EN: lang === 'EN' ? cleanResponse : ''
      };
      setAiResponse(initialLocalized);
      setTransitionTrigger(triggerOption);

      // 3. 백그라운드에서 즉시 번역 수행 (사용자 경험을 위해 비동기 처리)
      const targetLangName = lang === 'KO' ? 'English' : 'Korean';
      gemini.translateText(cleanResponse, targetLangName).then(translated => {
        setAiResponse(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            [lang === 'KO' ? 'EN' : 'KO']: translated
          };
        });
      });

    } catch (error) {
      console.error("AI Chat failed:", error);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (transitionTrigger && aiResponse) {
      const timer = setTimeout(() => {
        onOptionClick(transitionTrigger);
        setTransitionTrigger(null);
        setAiResponse(null);
      }, 3500); 
      return () => clearTimeout(timer);
    }
  }, [transitionTrigger, aiResponse, onOptionClick]);

  const showOptions = !aiResponse && (!isAiEnabled || node?.options?.length > 0);

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end p-12 bg-black/40 backdrop-blur-[2px]">
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-10 duration-500">
        
        <div className="bg-[#121212]/95 border border-white/10 p-10 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] relative ring-1 ring-white/5 group">
          <button 
            onClick={onClose}
            className="absolute -top-3 -right-3 w-10 h-10 bg-zinc-950 border border-white/20 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-red-600 hover:border-red-500 transition-all shadow-2xl z-50 group/close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
              <h4 className="mystery-font text-zinc-400 font-bold tracking-widest text-[11px] uppercase">{l(npc.name, lang)}</h4>
            </div>
            {isAiEnabled && (
              <span className="text-[8px] font-bold text-red-500/50 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                {lang === 'KO' ? 'AI 심문 활성화' : 'AI Inquiry Active'}
              </span>
            )}
          </div>
          
          <div className="min-h-[80px]">
            {isTyping ? (
              <div className="flex items-center gap-2 text-zinc-500 mystery-font text-xl italic animate-pulse">
                <span>{t.thinking}</span>
              </div>
            ) : (
              <p className="text-zinc-100 text-2xl leading-relaxed italic mystery-font animate-in fade-in duration-500">
                {/* Localized helper를 사용하여 현재 언어에 맞는 aiResponse 출력 */}
                {aiResponse ? l(aiResponse, lang) : (l(node?.text, lang) || "...")}
              </p>
            )}
          </div>
          
          {transitionTrigger && (
            <div className="mt-6 animate-in fade-in duration-500 flex items-center gap-3 text-[10px] text-emerald-500 font-bold uppercase tracking-widest bg-emerald-500/5 px-4 py-2 rounded-full w-fit border border-emerald-500/20">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></div>
               {lang === 'KO' ? '대화 속에서 새로운 단서를 발견했습니다...' : 'Uncovered new information from dialogue...'}
            </div>
          )}

          {isAiEnabled && (
            <form onSubmit={handleChatSubmit} className="mt-10 pt-8 border-t border-white/5 flex gap-4">
              <input 
                autoFocus
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={lang === 'KO' ? '인물에게 직접 질문하기...' : 'Ask the suspect anything...'}
                disabled={isTyping}
                className="flex-1 bg-zinc-950/80 border border-white/5 rounded-2xl px-6 py-3.5 text-base text-zinc-200 outline-none focus:border-red-600/50 transition-all placeholder-zinc-700 shadow-inner"
              />
              <button 
                disabled={!chatInput.trim() || isTyping}
                className="px-8 py-3.5 bg-red-900/40 text-red-500 rounded-2xl text-[10px] font-bold uppercase tracking-widest disabled:opacity-30 hover:bg-red-600 hover:text-white transition-all shadow-lg border border-red-900/30"
              >
                {t.send}
              </button>
            </form>
          )}
        </div>

        <div className="flex flex-col gap-3 items-center w-full max-w-2xl mx-auto">
          {showOptions ? (
            node.options.map((opt, idx) => {
              const reqs = opt.requiredItems || [];
              const isLocked = reqs.some(id => !inventory.includes(id));

              return (
                <button
                  key={idx}
                  disabled={isLocked}
                  onClick={() => onOptionClick(opt)}
                  className={`w-full px-10 py-5 rounded-2xl text-base font-bold uppercase tracking-widest transition-all duration-300 border shadow-2xl flex items-center justify-between gap-4 group ${
                    isLocked 
                      ? 'bg-zinc-800/20 text-zinc-600 border-white/5 cursor-not-allowed hover:bg-zinc-800/40 hover:text-zinc-400 hover:border-white/20' 
                      : 'bg-zinc-900/60 hover:bg-white text-zinc-200 hover:text-black border-white/10 hover:border-white'
                  }`}
                >
                  <span className="flex-1 text-left">{l(opt.text, lang)}</span>
                  {isLocked && <span className="text-xl filter grayscale group-hover:grayscale-0 transition-all">🔒</span>}
                </button>
              );
            })
          ) : (aiResponse || !isAiEnabled) ? (
            <button
              onClick={aiResponse ? () => setAiResponse(null) : onClose}
              className="w-full px-10 py-5 rounded-2xl text-base font-bold uppercase tracking-widest bg-zinc-950/80 text-zinc-500 border border-white/5 hover:bg-white hover:text-black hover:border-white transition-all shadow-2xl"
            >
              [ {aiResponse ? t.goBack : t.closeDialogue} ]
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default DialogueBox;
