
import React, { useState } from 'react';
import { Localized } from '../../types';
import { Language } from '../../translations';
import { gemini } from '../../services/geminiService';

interface LocalizedInputProps {
  label: string;
  value: Localized | string;
  onChange: (value: Localized) => void;
  lang: Language; 
  multiline?: boolean;
  placeholder?: string;
  className?: string;
}

const LocalizedInput: React.FC<LocalizedInputProps> = ({ label, value, onChange, lang, multiline, placeholder, className }) => {
  const [isTranslating, setIsTranslating] = useState(false);
  
  const locValue: Localized = typeof value === 'string' 
    ? { KO: value, EN: value } 
    : (value || { KO: '', EN: '' });

  const handleChange = (newVal: string) => {
    onChange({ ...locValue, [lang]: newVal });
  };

  const handleAutoTranslate = async () => {
    const sourceText = lang === 'EN' ? locValue.KO : locValue.EN;
    if (!sourceText || isTranslating) return;

    setIsTranslating(true);
    try {
      const translated = await gemini.translateText(sourceText, lang === 'EN' ? 'English' : 'Korean');
      onChange({ ...locValue, [lang]: translated });
    } catch (e) {
      console.error("Translation failed", e);
    } finally {
      setIsTranslating(false);
    }
  };

  const inputClass = "w-full bg-zinc-900/50 border border-white/5 rounded-lg p-3 text-sm outline-none focus:border-red-500/50 transition-all text-white placeholder-zinc-800";
  
  // 번역 버튼 활성화 조건: 대상 언어 필드가 비어있거나 편집 중일 때 소스 언어 필드에 내용이 있는 경우
  const canTranslate = (lang === 'EN' ? !!locValue.KO : !!locValue.EN);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        {label && <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</label>}
        {canTranslate && (
          <button 
            onClick={handleAutoTranslate} 
            disabled={isTranslating}
            title="Auto-translate using AI"
            className={`flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border transition-all ${isTranslating ? 'text-zinc-600 border-zinc-800' : 'text-emerald-500 border-emerald-500/30 hover:bg-emerald-500 hover:text-white'}`}
          >
            {isTranslating ? '...' : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                AI Translate
              </>
            )}
          </button>
        )}
      </div>
      <div className="relative">
        <span className="absolute top-2 right-3 text-[8px] font-bold text-zinc-700 pointer-events-none select-none">{lang}</span>
        {multiline ? (
          <textarea
            value={locValue[lang] || ''}
            onChange={(e) => handleChange(e.target.value)}
            className={`${inputClass} min-h-[100px] resize-none scrollbar-thin`}
            placeholder={placeholder}
          />
        ) : (
          <input
            type="text"
            value={locValue[lang] || ''}
            onChange={(e) => handleChange(e.target.value)}
            className={inputClass}
            placeholder={placeholder}
          />
        )}
      </div>
    </div>
  );
};

export default LocalizedInput;
