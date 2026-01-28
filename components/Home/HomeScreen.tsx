
import React from 'react';
import { Language, translations } from '../../translations';

interface HomeScreenProps {
  onStartNew: () => void;
  onStartWizard: () => void;
  onImport: () => void;
  lang: Language;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onStartNew, onStartWizard, onImport, lang }) => {
  const t = translations[lang];

  return (
    <div className="h-full w-full bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/30 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-zinc-800/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="z-10 text-center space-y-12 max-w-5xl w-full">
        <div className="space-y-4 animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="w-20 h-20 bg-red-600 mx-auto rounded-2xl flex items-center justify-center text-5xl font-bold text-white shadow-[0_0_50px_rgba(220,38,38,0.3)] transform rotate-3 hover:rotate-0 transition-transform duration-500">
            M
          </div>
          <h1 className="mystery-font text-7xl font-bold tracking-tight text-white">{t.welcomeTitle}</h1>
          <p className="text-zinc-500 text-lg font-medium tracking-wide max-w-lg mx-auto leading-relaxed">
            {t.welcomeSub}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
          {/* AI Wizard Card */}
          <button 
            onClick={onStartWizard}
            className="group relative bg-red-900/20 border border-red-500/20 hover:border-red-500/50 p-8 rounded-[2rem] text-left transition-all duration-500 hover:bg-red-900/30 overflow-hidden"
          >
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
              </div>
              <h3 className="mystery-font text-2xl text-white font-bold">{t.startWithAI}</h3>
              <p className="text-zinc-500 text-xs leading-relaxed group-hover:text-zinc-400 transition-colors">
                {t.startWithAIDesc}
              </p>
            </div>
          </button>

          {/* Create Card */}
          <button 
            onClick={onStartNew}
            className="group relative bg-zinc-900/40 border border-white/5 hover:border-zinc-500/30 p-8 rounded-[2rem] text-left transition-all duration-500 hover:bg-zinc-900/60 overflow-hidden"
          >
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 mb-4 group-hover:bg-zinc-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              </div>
              <h3 className="mystery-font text-2xl text-white font-bold">{t.startNewProject}</h3>
              <p className="text-zinc-500 text-xs leading-relaxed group-hover:text-zinc-400 transition-colors">
                {t.startNewProjectDesc}
              </p>
            </div>
          </button>

          {/* Import Card */}
          <button 
            onClick={onImport}
            className="group relative bg-zinc-900/40 border border-white/5 hover:border-zinc-500/30 p-8 rounded-[2rem] text-left transition-all duration-500 hover:bg-zinc-900/60 overflow-hidden"
          >
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 mb-4 group-hover:bg-zinc-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </div>
              <h3 className="mystery-font text-2xl text-white font-bold">{t.importProjectHome}</h3>
              <p className="text-zinc-500 text-xs leading-relaxed group-hover:text-zinc-400 transition-colors">
                {t.importProjectHomeDesc}
              </p>
            </div>
          </button>
        </div>

        <div className="pt-8 text-zinc-700 text-[10px] font-bold uppercase tracking-[0.4em] animate-in fade-in duration-1000 delay-700">
          Powered by Gemini 3.0 Pro & Flash
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
