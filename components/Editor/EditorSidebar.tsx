
import React, { useState } from 'react';
import { GameData } from '../../types';
import { translations, Language } from '../../translations';

interface EditorSidebarProps {
  gameData: GameData;
  activeTab: 'SCENES' | 'ITEMS' | 'NPCS' | 'SETTINGS';
  selectedId: string | null;
  onTabChange: (tab: 'SCENES' | 'ITEMS' | 'NPCS' | 'SETTINGS') => void;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  lang: Language;
  onBackToHome: () => void;
  onSave: () => void;
  isSaving?: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

const EditorSidebar: React.FC<EditorSidebarProps> = ({
  gameData, activeTab, selectedId, onTabChange, onSelect, onAdd, onDelete, lang, onBackToHome, onSave, isSaving, isOpen, onToggle
}) => {
  const t = translations[lang];
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const l = (val: any) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val[lang] || val['EN'] || val['KO'] || '';
  };

  const getList = () => {
    switch (activeTab) {
      case 'SCENES': return Object.values(gameData.scenes);
      case 'ITEMS': return Object.values(gameData.items);
      case 'NPCS': return Object.values(gameData.npcs);
      default: return [];
    }
  };

  const getPlaceholder = (tab: string) => {
    if (tab === 'SCENES') return (
      <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700 opacity-50"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" /><path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4" /></svg>
      </div>
    );
    if (tab === 'NPCS') return (
      <div className="w-full h-full bg-emerald-950/20 flex items-center justify-center border border-emerald-500/10">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-900/50"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
      </div>
    );
    return (
      <div className="w-full h-full bg-blue-950/20 flex items-center justify-center border border-blue-500/10">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-900/50"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
      </div>
    );
  };

  const getIconUrl = (item: any) => {
    if (activeTab === 'SCENES') return item.imageUrl;
    if (activeTab === 'ITEMS') return item.iconUrl;
    if (activeTab === 'NPCS') return item.portraitUrl;
    return null;
  };

  const handleImageError = (id: string) => {
    setFailedImages(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <div
      className={`relative h-full bg-zinc-950 flex flex-col z-40 transition-all duration-500 ease-in-out border-r border-white/10 shadow-2xl ${isOpen ? 'w-80' : 'w-0 border-r-0'}`}
    >
      {/* Toggle Button - Absolute positioned at the right edge of the sidebar container */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="absolute top-1/2 -translate-y-1/2 left-full z-[60] p-2 bg-zinc-900 border-y border-r border-white/10 text-zinc-400 hover:text-white rounded-r-xl transition-all shadow-2xl hover:bg-zinc-800"
        title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-500 ${isOpen ? '' : 'rotate-180'}`}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Sidebar Inner Content - Hidden via opacity and width transition */}
      <div className={`flex flex-col h-full w-80 shrink-0 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Navigation Tabs */}
        <div className="p-4 flex flex-col gap-2 border-b border-white/10 bg-zinc-950">
          <div className="flex gap-1">
            {(['SCENES', 'ITEMS', 'NPCS'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`flex-1 py-2 text-[10px] font-bold tracking-widest uppercase rounded transition-all ${activeTab === tab ? 'bg-zinc-800 text-zinc-300 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {tab === 'SCENES' ? t.scenes : tab === 'ITEMS' ? t.items : t.npcs}
              </button>
            ))}
          </div>
          <button
            onClick={() => onTabChange('SETTINGS')}
            className={`w-full py-2 text-[10px] font-bold tracking-widest uppercase rounded transition-all ${activeTab === 'SETTINGS' ? 'bg-red-900/30 text-red-500 border border-red-900/50' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            {t.settings}
          </button>
        </div>

        {/* Assets List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin bg-zinc-950">
          {activeTab === 'SETTINGS' && (
            <div className="space-y-1">
              <button onClick={() => onSelect('settings-global')} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all ${selectedId === 'settings-global' ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                <div className="w-10 h-10 rounded bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 text-lg">⚙️</div>
                <div className="text-sm font-medium text-zinc-200">{t.settings}</div>
              </button>
              <button onClick={() => onSelect('settings-conclusion')} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all ${selectedId === 'settings-conclusion' ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                <div className="w-10 h-10 rounded bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 text-lg">🏁</div>
                <div className="text-sm font-medium text-zinc-200">{t.conclusionSettings}</div>
              </button>
            </div>
          )}

          {activeTab !== 'SETTINGS' && getList().map((item: any) => {
            const url = getIconUrl(item);
            const isBroken = failedImages.has(item.id);
            return (
              <div key={item.id} className="group relative">
                <div
                  onClick={() => onSelect(item.id)}
                  className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all cursor-pointer ${selectedId === item.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                >
                  <div className="w-10 h-10 rounded bg-zinc-900 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner">
                    {url && !isBroken ? (
                      <img src={url} className="w-full h-full object-cover" onError={() => handleImageError(item.id)} />
                    ) : (
                      getPlaceholder(activeTab)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-zinc-200 truncate">{l(item.name)}</div>
                    <div className="text-[10px] text-zinc-600 uppercase font-mono truncate">{item.id}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-zinc-700 hover:text-red-500 transition-all rounded-lg hover:bg-red-500/10"
                    title={t.delete}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 3v10m4-10v10" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
          {activeTab !== 'SETTINGS' && (
            <button onClick={onAdd} className="w-full p-4 mt-4 border border-dashed border-white/10 rounded-lg text-zinc-500 hover:text-white hover:border-white/30 text-xs font-bold uppercase tracking-widest transition-all">
              {activeTab === 'SCENES' ? t.addScene : activeTab === 'ITEMS' ? t.addItem : t.addNPC}
            </button>
          )}
        </div>

        {/* Back Home & Save Buttons */}
        <div className="p-4 border-t border-white/10 bg-zinc-950 space-y-2">
          <button
            onClick={onBackToHome}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all text-[10px] font-bold uppercase tracking-[0.2em]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            {t.backToHome}
          </button>

          <button
            onClick={onSave}
            disabled={isSaving}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg ${isSaving ? 'bg-zinc-800 text-zinc-500' : 'bg-red-600 text-white hover:bg-red-500 border border-red-500'}`}
          >
            {isSaving ? (
              <>
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></div>
                Saving...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                {t.save || 'SAVE'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorSidebar;
