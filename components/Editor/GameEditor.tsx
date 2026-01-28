import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GameData, Scene, VisualStyle, Item, NPC, CaseConclusion } from '../../types';
import { translations, Language } from '../../translations';
import { gemini } from '../../services/geminiService';
import SceneEditor from './SceneEditor';
import ItemEditor from './ItemEditor';
import NPCEditor from './NPCEditor';
import EditorSidebar from './EditorSidebar';
import ConclusionEditor from './ConclusionEditor';
import LocalizedInput from './LocalizedInput';
import MessageModal from '../UI/MessageModal';

interface GameEditorProps {
  gameData: GameData;
  onSave: (data: GameData) => Promise<void>;
  isSaving: boolean;
  isPublic?: boolean;
  onTogglePublish?: () => void;
}

const GameEditor: React.FC<GameEditorProps> = ({ gameData, onSave, isSaving, isPublic = false, onTogglePublish }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const lang = 'KO'; // Force KO or fetch from user pref
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'SCENES' | 'ITEMS' | 'NPCS' | 'SETTINGS' | 'CONCLUSION'>('SCENES');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(gameData.startSceneId || (Object.keys(gameData.scenes)[0] || null));
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'ALERT' | 'CONFIRM';
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  } | null>(null);

  const showAlert = (title: string, message: string) => {
    setModalConfig({
      isOpen: true,
      type: 'ALERT',
      title,
      message,
      onConfirm: () => setModalConfig(null)
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, isDestructive = false) => {
    setModalConfig({
      isOpen: true,
      type: 'CONFIRM',
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setModalConfig(null);
      },
      isDestructive
    });
  };

  const handleUpdate = (type: 'scenes' | 'items' | 'npcs', id: string, updates: any) => {
    const newData = {
      ...gameData,
      [type]: {
        ...gameData[type],
        [id]: { ...gameData[type][id], ...updates }
      }
    };
    onSave(newData);
  };

  const handleUpdateConclusion = (updates: Partial<CaseConclusion>) => {
    onSave({
      ...gameData,
      conclusion: { ...(gameData.conclusion || { mysterySolution: { KO: '', EN: '' }, successTitle: { KO: '', EN: '' }, successBody: { KO: '', EN: '' }, failureTitle: { KO: '', EN: '' }, failureBody: { KO: '', EN: '' } }), ...updates }
    });
  };

  const handleTranslateAll = async () => {
    if (isTranslatingAll) return;
    setIsTranslatingAll(true);

    try {
      const nextData = JSON.parse(JSON.stringify(gameData)) as GameData;

      // Translate Title
      if (nextData.title.KO && !nextData.title.EN) {
        nextData.title.EN = await gemini.translateText(nextData.title.KO, 'English');
      }

      // Translate Scenes
      for (const scene of Object.values(nextData.scenes)) {
        if (scene.name.KO && !scene.name.EN) scene.name.EN = await gemini.translateText(scene.name.KO, 'English');
        if (scene.descriptionText.KO && !scene.descriptionText.EN) scene.descriptionText.EN = await gemini.translateText(scene.descriptionText.KO, 'English');
        for (const hs of scene.hotspots) {
          if (hs.label.KO && !hs.label.EN) hs.label.EN = await gemini.translateText(hs.label.KO, 'English');
          if (hs.successMessage?.KO && !hs.successMessage?.EN) hs.successMessage.EN = await gemini.translateText(hs.successMessage.KO, 'English');
        }
      }

      // Translate Items
      for (const item of Object.values(nextData.items)) {
        if (item.name.KO && !item.name.EN) item.name.EN = await gemini.translateText(item.name.KO, 'English');
        if (item.description.KO && !item.description.EN) item.description.EN = await gemini.translateText(item.description.KO, 'English');
      }

      // Translate NPCs
      for (const npc of Object.values(nextData.npcs)) {
        if (npc.name.KO && !npc.name.EN) npc.name.EN = await gemini.translateText(npc.name.KO, 'English');
        if (npc.secretPersona?.KO && !npc.secretPersona?.EN) npc.secretPersona.EN = await gemini.translateText(npc.secretPersona.KO, 'English');
        for (const node of Object.values(npc.dialogueTree)) {
          if (node.text.KO && !node.text.EN) node.text.EN = await gemini.translateText(node.text.KO, 'English');
          for (const opt of node.options) {
            if (opt.text.KO && !opt.text.EN) opt.text.EN = await gemini.translateText(opt.text.KO, 'English');
          }
        }
      }

      // Translate Conclusion
      if (nextData.conclusion) {
        const c = nextData.conclusion;
        if (c.mysterySolution.KO && !c.mysterySolution.EN) c.mysterySolution.EN = await gemini.translateText(c.mysterySolution.KO, 'English');
        if (c.successTitle.KO && !c.successTitle.EN) c.successTitle.EN = await gemini.translateText(c.successTitle.KO, 'English');
        if (c.successBody.KO && !c.successBody.EN) c.successBody.EN = await gemini.translateText(c.successBody.KO, 'English');
        if (c.failureTitle.KO && !c.failureTitle.EN) c.failureTitle.EN = await gemini.translateText(c.failureTitle.KO, 'English');
        if (c.failureBody.KO && !c.failureBody.EN) c.failureBody.EN = await gemini.translateText(c.failureBody.KO, 'English');
      }

      onSave(nextData);
      showAlert('Success', t.translateSuccess);
    } catch (e) {
      console.error("Global translation failed", e);
    } finally {
      setIsTranslatingAll(false);
    }
  };

  const handleAdd = () => {
    const id = `${activeTab.toLowerCase()}_${Date.now()}`;
    let newData = { ...gameData };

    if (activeTab === 'SCENES') {
      const newScene: Scene = {
        id,
        name: { KO: '새 장소', EN: 'New Scene' },
        visualStyle: gameData.visualStyle || VisualStyle.LIGNE_CLAIRE,
        imagePrompt: 'A mysterious room',
        descriptionText: { KO: '장소 설명을 입력하세요.', EN: 'Describe your scene here...' },
        hotspots: [], npcIds: []
      };
      newData.scenes = { ...gameData.scenes, [id]: newScene };
    } else if (activeTab === 'ITEMS') {
      const newItem: Item = {
        id,
        name: { KO: '새 아이템', EN: 'New Item' },
        description: { KO: '아이템 설명...', EN: 'Item description...' }
      };
      newData.items = { ...gameData.items, [id]: newItem };
    } else if (activeTab === 'NPCS') {
      const newNPC: NPC = {
        id,
        name: { KO: '새 인물', EN: 'New Person' },
        initialDialogueId: 'start',
        dialogueTree: {
          'start': {
            id: 'start',
            text: { KO: '안녕하세요.', EN: 'Hello.' },
            options: []
          }
        }
      };
      newData.npcs = { ...gameData.npcs, [id]: newNPC };
    }

    onSave(newData);
    setSelectedEntityId(id);
  };

  const handleDelete = (id: string) => {
    const collectionName = activeTab.toLowerCase() as 'scenes' | 'items' | 'npcs';
    if (!gameData[collectionName]) return;

    const collection = { ...gameData[collectionName] };
    if (Object.keys(collection).length <= 1 && activeTab !== 'SETTINGS' && activeTab !== 'CONCLUSION') {
      showAlert('Error', lang === 'KO' ? '최소 한 개의 항목은 유지되어야 합니다.' : 'At least one item must remain.');
      return;
    }

    showConfirm(
      t.delete,
      translations[lang].confirmDelete,
      () => {
        delete (collection as any)[id];
        onSave({ ...gameData, [collectionName]: collection });
        if (selectedEntityId === id) setSelectedEntityId(Object.keys(collection)[0] || null);
      },
      true
    );
  };

  const renderEditor = () => {
    if (activeTab === 'SETTINGS') {
      const sceneList = Object.values(gameData.scenes || {}) as Scene[];
      return (
        <div className="p-8 max-w-4xl mx-auto space-y-10">
          <header className="flex justify-between items-end border-b border-white/5 pb-6">
            <div>
              <span className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase">{t.settings}</span>
              <h2 className="text-4xl mystery-font font-bold text-white mt-1">{t.settings}</h2>
            </div>
            <button
              onClick={handleTranslateAll}
              disabled={isTranslatingAll}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${isTranslatingAll ? 'bg-zinc-800 text-zinc-600' : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20'}`}
            >
              {isTranslatingAll ? t.translating : t.translateAllToEn}
            </button>
          </header>
          <div className="space-y-8">
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 space-y-8">
              <div>
                <LocalizedInput
                  label={t.gameTitle}
                  value={gameData.title}
                  onChange={(v) => onSave({ ...gameData, title: v })}
                  lang={lang}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{t.startScene}</label>
                  <select
                    value={gameData.startSceneId}
                    onChange={(e) => onSave({ ...gameData, startSceneId: e.target.value })}
                    className="w-full bg-zinc-800 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-red-500 transition-all text-white"
                  >
                    {sceneList.length > 0 ? (
                      sceneList.map(s => (
                        <option key={s.id} value={s.id}>{s.name[lang] || s.id}</option>
                      ))
                    ) : (
                      <option value="">{t.noTarget}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{t.globalBgm}</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={gameData.globalBgmUrl || ''}
                    onChange={(e) => onSave({ ...gameData, globalBgmUrl: e.target.value })}
                    className="w-full bg-zinc-800 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-red-500 transition-all text-white"
                  />
                  <p className="text-[9px] text-zinc-600 mt-2 italic">{t.globalBgmDesc}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'CONCLUSION') {
      return (
        <ConclusionEditor
          conclusion={gameData.conclusion || { mysterySolution: { KO: '', EN: '' }, successTitle: { KO: '', EN: '' }, successBody: { KO: '', EN: '' }, failureTitle: { KO: '', EN: '' }, failureBody: { KO: '', EN: '' } }}
          onUpdate={handleUpdateConclusion}
          gameTitle={gameData.title}
          lang={lang}
        />
      );
    }

    if (!selectedEntityId) return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-600 p-10 text-center">
        <div className="text-6xl mb-4 opacity-20">📂</div>
        <h2 className="text-xl font-medium mb-2">{t.selectionRequired}</h2>
        <p className="max-w-xs text-sm">{t.selectSidebar}</p>
      </div>
    );

    switch (activeTab) {
      case 'SCENES':
        return gameData.scenes[selectedEntityId] ? (
          <SceneEditor
            scene={gameData.scenes[selectedEntityId]}
            onUpdate={(u) => handleUpdate('scenes', selectedEntityId, u)}
            lang={lang}
            allAssets={gameData}
          />
        ) : null;
      case 'ITEMS':
        return gameData.items[selectedEntityId] ? (
          <ItemEditor
            item={gameData.items[selectedEntityId]}
            onUpdate={(u) => handleUpdate('items', selectedEntityId, u)}
            lang={lang}
            allAssets={gameData}
          />
        ) : null;
      case 'NPCS':
        return gameData.npcs[selectedEntityId] ? (
          <NPCEditor
            npc={gameData.npcs[selectedEntityId]}
            onUpdate={(u) => handleUpdate('npcs', selectedEntityId, u)}
            lang={lang}
            allAssets={gameData}
          />
        ) : null;
      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900 overflow-hidden relative">
      {/* Top Header for Editor */}
      <div className="h-14 bg-black border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(location.pathname.includes('/admin/') ? '/admin/studio' : '/user/studio')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition group"
          >
            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center group-hover:border-red-600 transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            </div>
            <span className="text-sm font-bold uppercase tracking-widest">Back to Studio</span>
          </button>
          <div className="h-6 w-px bg-zinc-800"></div>
          <h1 className="text-sm font-bold text-white truncate max-w-xs">{gameData.title[lang] || 'Untitled Mystery'}</h1>
        </div>

        <div id="header-controls" className="flex items-center gap-4">
          {/* Public/Draft Toggle */}
          {onTogglePublish && (
            <button
              onClick={onTogglePublish}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-[10px] font-bold uppercase tracking-widest ${isPublic
                ? 'bg-green-950/30 border-green-600/50 text-green-500 hover:bg-green-900/50'
                : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                }`}
            >
              <div className={`w-2 h-2 rounded-full transition-colors ${isPublic ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-zinc-600'}`} />
              {isPublic ? 'Public' : 'Draft'}
            </button>
          )}

          {/* Save Indicator */}
          {isSaving ? (
            <div className="flex items-center gap-2 text-green-500 text-xs font-bold uppercase tracking-widest">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Saving...
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-600 text-xs font-bold uppercase tracking-widest">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
              Saved
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div id="asset-sidebar-container" className="h-full">
          <EditorSidebar
            gameData={gameData}
            activeTab={activeTab === 'CONCLUSION' ? 'SETTINGS' : activeTab}
            selectedId={selectedIdForSidebar(activeTab, selectedEntityId)}
            onTabChange={(t) => {
              if (t === 'SETTINGS') {
                setActiveTab('SETTINGS');
              } else {
                setActiveTab(t as any);
              }
              setSelectedEntityId(null);
            }}
            onSelect={(id) => {
              if (id === 'settings-global') setActiveTab('SETTINGS');
              else if (id === 'settings-conclusion') setActiveTab('CONCLUSION');
              else setSelectedEntityId(id);
            }}
            onAdd={handleAdd}
            onDelete={handleDelete}
            lang={lang}
            onBackToHome={() => navigate('/')}
            onSave={() => onSave(gameData)}
            isSaving={isSaving}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        </div>

        <div id="main-editor-stage" className="flex-1 overflow-y-auto bg-[#0a0a0a] transition-all duration-500">
          {renderEditor()}
        </div>
      </div>

      {modalConfig && (
        <MessageModal
          isOpen={modalConfig.isOpen}
          type={modalConfig.type}
          title={modalConfig.title}
          message={modalConfig.message}
          onConfirm={modalConfig.onConfirm}
          onCancel={() => setModalConfig(null)}
          isDestructive={modalConfig.isDestructive}
        />
      )}
    </div>
  );
};

function selectedIdForSidebar(activeTab: string, selectedEntityId: string | null) {
  if (activeTab === 'SETTINGS') return 'settings-global';
  if (activeTab === 'CONCLUSION') return 'settings-conclusion';
  return selectedEntityId;
}

export default GameEditor;
