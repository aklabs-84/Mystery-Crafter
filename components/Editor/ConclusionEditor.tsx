
import React, { useState } from 'react';
import { CaseConclusion, Localized } from '../../types';
import { translations, Language } from '../../translations';
import { gemini } from '../../services/geminiService';
import LocalizedInput from './LocalizedInput';

interface ConclusionEditorProps {
  conclusion: CaseConclusion;
  onUpdate: (updates: Partial<CaseConclusion>) => void;
  gameTitle: Localized | string;
  lang: Language;
}

const ConclusionEditor: React.FC<ConclusionEditorProps> = ({ conclusion, onUpdate, gameTitle, lang }) => {
  const t = translations[lang];
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Added implementation for generateConclusionLogic in geminiService
    const result = await gemini.generateConclusionLogic(gameTitle, lang);
    if (result) onUpdate(result);
    setIsGenerating(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10 pb-20">
      <header className="flex justify-between items-end border-b border-white/5 pb-6">
        <div>
          <span className="text-[10px] font-bold text-red-500 tracking-[0.2em] uppercase">{t.conclusionSettings}</span>
          <h2 className="text-4xl mystery-font font-bold text-white mt-1">{t.conclusionSettings}</h2>
          <p className="text-zinc-500 text-xs mt-2">{t.conclusionHint}</p>
        </div>
        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs uppercase tracking-widest disabled:opacity-50 transition-all shadow-lg shadow-red-600/20"
        >
          {isGenerating ? t.working : t.generateConclusion}
        </button>
      </header>

      <div className="space-y-8">
        <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 space-y-6">
          {/* Fixed: Added missing lang prop */}
          <LocalizedInput 
            label={t.mysterySolution} 
            value={conclusion.mysterySolution} 
            onChange={(v) => onUpdate({ mysterySolution: v })} 
            multiline 
            placeholder={lang === 'KO' ? "사건의 진상을 기록하세요. (예: 범인은 집사, 독살 트릭 사용...)" : "Record the truth of the case."} 
            lang={lang}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Success Config */}
          <div className="bg-emerald-900/10 p-6 rounded-2xl border border-emerald-500/20 space-y-4">
            <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {t.successEnding}
            </h3>
            {/* Fixed: Added missing lang props */}
            <LocalizedInput label={t.successTitle} value={conclusion.successTitle} onChange={(v) => onUpdate({ successTitle: v })} lang={lang} />
            <LocalizedInput label={t.successBody} value={conclusion.successBody} onChange={(v) => onUpdate({ successBody: v })} multiline lang={lang} />
          </div>

          {/* Failure Config */}
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
              {t.failureEnding}
            </h3>
            {/* Fixed: Added missing lang props */}
            <LocalizedInput label={t.failureTitle} value={conclusion.failureTitle} onChange={(v) => onUpdate({ failureTitle: v })} lang={lang} />
            <LocalizedInput label={t.failureBody} value={conclusion.failureBody} onChange={(v) => onUpdate({ failureBody: v })} multiline lang={lang} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConclusionEditor;
