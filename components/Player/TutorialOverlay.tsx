
import React, { useState, useEffect } from 'react';
import { translations, Language } from '../../translations';

interface TutorialStep {
  id: string;
  targetId?: string; // 포인터가 가리킬 요소의 ID
  titleKey: string;
  descKey: string;
}

interface TutorialOverlayProps {
  lang: Language;
  onFinish: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ lang, onFinish }) => {
  const t = translations[lang];
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps: TutorialStep[] = [
    { id: 'intro', titleKey: 'tutStep1Title', descKey: 'tutStep1Desc' },
    { id: 'stage', targetId: 'game-stage', titleKey: 'tutStep2Title', descKey: 'tutStep2Desc' },
    { id: 'movement', targetId: 'movement-section', titleKey: 'tutStep3Title', descKey: 'tutStep3Desc' },
    { id: 'suspects', targetId: 'suspects-section', titleKey: 'tutStep4Title', descKey: 'tutStep4Desc' },
    { id: 'inventory', targetId: 'inventory-section', titleKey: 'tutStep5Title', descKey: 'tutStep5Desc' },
    { id: 'accuse', targetId: 'accuse-button', titleKey: 'tutStep6Title', descKey: 'tutStep6Desc' },
    { id: 'ready', titleKey: 'tutStep7Title', descKey: 'tutStep7Desc' },
  ];

  const currentStep = steps[stepIndex];

  // 대상 요소의 위치 추적
  useEffect(() => {
    const updateRect = () => {
      if (currentStep.targetId) {
        const el = document.getElementById(currentStep.targetId);
        if (el) {
          setTargetRect(el.getBoundingClientRect());
          return;
        }
      }
      setTargetRect(null);
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    const interval = setInterval(updateRect, 300); 

    return () => {
      window.removeEventListener('resize', updateRect);
      clearInterval(interval);
    };
  }, [stepIndex, currentStep]);

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      onFinish();
    }
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFinish();
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-auto cursor-default overflow-hidden">
      
      {/* 딤드 배경 (전체 마우스 이벤트 차단) */}
      <div 
        className="absolute inset-0 bg-black/70 transition-all duration-700 ease-in-out"
        style={{
          clipPath: targetRect 
            ? `polygon(0% 0%, 0% 100%, ${targetRect.left}px 100%, ${targetRect.left}px ${targetRect.top}px, ${targetRect.right}px ${targetRect.top}px, ${targetRect.right}px ${targetRect.bottom}px, ${targetRect.left}px ${targetRect.bottom}px, ${targetRect.left}px 100%, 100% 100%, 100% 0%)`
            : 'none'
        }}
      />

      {/* 가이드 대상 하이라이트 클릭 영역 */}
      {targetRect && (
        <div 
          onClick={handleNext}
          className="absolute cursor-pointer transition-all duration-700 ease-in-out group"
          style={{
            left: targetRect.left,
            top: targetRect.top,
            width: targetRect.width,
            height: targetRect.height,
          }}
        >
          <div 
            className="absolute laser-point transition-all duration-300"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%) scale(1.5)'
            }}
          />
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-[10px] text-red-500 font-bold uppercase tracking-widest guide-font">
            Click here or Next button
          </div>
        </div>
      )}

      {/* 가이드 메시지 박스 */}
      <div 
        className={`absolute transition-all duration-700 ease-in-out flex flex-col items-center gap-6 max-w-sm w-full`}
        style={{
          left: targetRect ? Math.min(Math.max(20, targetRect.left + targetRect.width / 2 - 192), window.innerWidth - 404) : '50%',
          top: targetRect ? (targetRect.top > window.innerHeight / 2 ? targetRect.top - 280 : targetRect.bottom + 40) : '50%',
          transform: targetRect ? 'none' : 'translate(-50%, -50%)'
        }}
      >
        <div className="bg-[#0a0a0a] border border-red-900/40 p-8 rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.8)] space-y-5 ring-1 ring-white/5 backdrop-blur-xl">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-pulse" />
            <h4 className="guide-font text-white font-bold text-xl tracking-tight">{(t as any)[currentStep.titleKey]}</h4>
          </div>
          
          <p className="text-zinc-400 text-sm leading-relaxed guide-font font-medium min-h-[60px]">
            {(t as any)[currentStep.descKey]}
          </p>

          <div className="flex items-center gap-4 pt-4">
            <button 
              onClick={handleSkip}
              className="px-2 py-2 text-[10px] font-bold text-zinc-600 hover:text-red-500 uppercase tracking-widest transition-colors guide-font"
            >
              {t.tutorialSkip}
            </button>
            <button 
              onClick={(e) => handleNext(e)}
              className="flex-1 py-4 bg-white text-black font-bold rounded-2xl hover:bg-red-600 hover:text-white transition-all text-xs uppercase tracking-widest shadow-xl active:scale-95 guide-font"
            >
              {stepIndex === steps.length - 1 ? t.tutorialFinish : t.tutorialNext}
            </button>
          </div>
        </div>
        
        {/* 단계 표시 인디케이터 */}
        <div className="flex gap-2 mt-2">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all duration-500 ${i === stepIndex ? 'w-8 bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]' : 'w-2 bg-zinc-800'}`} 
            />
          ))}
        </div>
      </div>

      {stepIndex === 0 && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-zinc-600 text-[10px] font-bold uppercase tracking-[0.5em] animate-pulse guide-font">
          Tutorial Mode: Follow the laser guide
        </div>
      )}
    </div>
  );
};

export default TutorialOverlay;
