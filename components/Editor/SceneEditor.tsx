
import React, { useState, useRef, useEffect } from 'react';
import { Scene, VisualStyle, Hotspot, GameData, Item, NPC, SceneExit, SceneNPC } from '../../types';
import { gemini } from '../../services/geminiService';
import { translations, Language } from '../../translations';
import LocalizedInput from './LocalizedInput';
import ImageUploader from './ImageUploader';

interface SceneEditorProps {
  scene: Scene;
  onUpdate: (updates: Partial<Scene>) => void;
  lang: Language;
  allAssets: GameData;
}

const SceneEditor: React.FC<SceneEditorProps> = ({ scene, onUpdate, lang, allAssets }) => {
  const t = translations[lang];
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlacingHotspot, setIsPlacingHotspot] = useState(false);
  const [isGeneratingHsDetail, setIsGeneratingHsDetail] = useState<string | null>(null);
  const [selectedHsId, setSelectedHsId] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [expandedHsId, setExpandedHsId] = useState<string | null>(null);
  const [expandedExitId, setExpandedExitId] = useState<string | null>(null);

  const [foldedHsDetails, setFoldedHsDetails] = useState<Record<string, boolean>>({});
  const [dragState, setDragState] = useState<{ id: string, type: 'move' | 'resize', startX: number, startY: number, initialX: number, initialY: number, initialW: number, initialH: number } | null>(null);

  const imageRef = useRef<HTMLDivElement>(null);

  const l = (val: any) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val[lang] || val['EN'] || val['KO'] || '';
  };

  const handleGenerateImage = async () => {
    setIsGenerating(true);
    setImageError(false);
    const url = await gemini.generateImage(scene.imagePrompt, scene.visualStyle, 'SCENE', { hotspots: scene.hotspots || [] });
    if (url) onUpdate({ imageUrl: url });
    setIsGenerating(false);
  };

  const handleGenerateHsDetail = async (hs: Hotspot) => {
    setIsGeneratingHsDetail(hs.id);
    const url = await gemini.generateImage(l(hs.detailImagePrompt) || `Close-up view of ${l(hs.label)}`, scene.visualStyle || allAssets.visualStyle || VisualStyle.LIGNE_CLAIRE, 'SCENE');
    if (url) updateHotspot(hs.id, { detailImageUrl: url });
    setIsGeneratingHsDetail(null);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (!isPlacingHotspot || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newHotspot: Hotspot = {
      id: `hs_${Date.now()}`,
      x: Math.round(x - 5),
      y: Math.round(y - 5),
      width: 10,
      height: 10,
      label: { KO: '새 포인트', EN: 'New Hotspot' },
      actionType: 'EXAMINE',
      visualEffect: 'NONE',
      isSubAction: false
    };
    onUpdate({ hotspots: [...(scene.hotspots || []), newHotspot] });
    setIsPlacingHotspot(false);
    setSelectedHsId(newHotspot.id);
    setExpandedHsId(newHotspot.id);
  };

  const handleMouseDown = (e: React.MouseEvent, hs: Hotspot, type: 'move' | 'resize') => {
    e.stopPropagation();
    setSelectedHsId(hs.id);
    setExpandedHsId(hs.id);
    setDragState({
      id: hs.id,
      type,
      startX: e.clientX,
      startY: e.clientY,
      initialX: hs.x,
      initialY: hs.y,
      initialW: hs.width,
      initialH: hs.height
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState || !imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - dragState.startX) / rect.width) * 100;
      const deltaY = ((e.clientY - dragState.startY) / rect.height) * 100;

      const hotspots = [...(scene.hotspots || [])];
      const index = hotspots.findIndex(h => h.id === dragState.id);
      if (index === -1) return;

      if (dragState.type === 'move') {
        hotspots[index] = {
          ...hotspots[index],
          x: Math.max(0, Math.min(100 - hotspots[index].width, dragState.initialX + deltaX)),
          y: Math.max(0, Math.min(100 - hotspots[index].height, dragState.initialY + deltaY))
        };
      } else {
        hotspots[index] = {
          ...hotspots[index],
          width: Math.max(2, Math.min(100 - hotspots[index].x, dragState.initialW + deltaX)),
          height: Math.max(2, Math.min(100 - hotspots[index].height, dragState.initialH + deltaY))
        };
      }
      onUpdate({ hotspots });
    };

    const handleMouseUp = () => setDragState(null);
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, scene.hotspots, onUpdate]);

  const updateHotspot = (id: string, updates: Partial<Hotspot>) => {
    onUpdate({ hotspots: (scene.hotspots || []).map(h => h.id === id ? { ...h, ...updates } : h) });
  };

  const deleteHotspot = (id: string) => {
    onUpdate({ hotspots: (scene.hotspots || []).filter(h => h.id !== id) });
    if (selectedHsId === id) setSelectedHsId(null);
    if (expandedHsId === id) setExpandedHsId(null);
  };

  const addExit = () => {
    const newExit: SceneExit = {
      id: `exit_${Date.now()}`,
      targetSceneId: '',
      label: { KO: '이동하기', EN: 'Move To' }
    };
    onUpdate({ exits: [...(scene.exits || []), newExit] });
    setExpandedExitId(newExit.id);
  };

  const updateExit = (id: string, updates: Partial<SceneExit>) => {
    onUpdate({ exits: (scene.exits || []).map(e => e.id === id ? { ...e, ...updates } : e) });
  };

  const deleteExit = (id: string) => {
    onUpdate({ exits: (scene.exits || []).filter(e => e.id !== id) });
    if (expandedExitId === id) setExpandedExitId(null);
  };

  const toggleNpcInScene = (npcId: string) => {
    const currentNpcs = scene.npcConfigs || [];
    const exists = currentNpcs.some(c => c.npcId === npcId);
    if (exists) {
      onUpdate({ npcConfigs: currentNpcs.filter(c => c.npcId !== npcId) });
    } else {
      onUpdate({ npcConfigs: [...currentNpcs, { npcId, requiredItemId: undefined }] });
    }
  };

  const updateNpcConfig = (npcId: string, updates: Partial<SceneNPC>) => {
    const nextConfigs = (scene.npcConfigs || []).map(c => c.npcId === npcId ? { ...c, ...updates } : c);
    onUpdate({ npcConfigs: nextConfigs });
  };

  const handleCreateAndLinkHotspot = (parentHs: Hotspot) => {
    const newId = `hs_sub_${Date.now()}`;
    const newHs: Hotspot = {
      id: newId,
      x: 0, y: 0, width: 0, height: 0,
      label: { KO: '연동된 포인트', EN: 'Linked Point' },
      actionType: 'EXAMINE',
      initialHidden: true,
      isSubAction: true,
    };

    const updatedHotspots = [...(scene.hotspots || []), newHs];
    const parentIdx = updatedHotspots.findIndex(h => h.id === parentHs.id);
    if (parentIdx !== -1) {
      const currentReveals = updatedHotspots[parentIdx].revealsHotspotIds || [];
      updatedHotspots[parentIdx] = {
        ...updatedHotspots[parentIdx],
        revealsHotspotIds: Array.from(new Set([...currentReveals, newId]))
      };
    }

    onUpdate({ hotspots: updatedHotspots });
    setExpandedHsId(newId);
    setSelectedHsId(newId);
  };

  const showPlaceholder = !scene.imageUrl || imageError;
  const assignedNpcIds = (scene.npcConfigs || []).map(c => c.npcId);

  const canvasHotspots = (scene.hotspots || []).filter(h => !h.isSubAction);

  return (
    <div className="p-8 max-7xl mx-auto space-y-10 pb-20 select-none">
      <header className="flex justify-between items-end border-b border-white/5 pb-6">
        <LocalizedInput label={t.location} value={scene.name} onChange={(v) => onUpdate({ name: v })} lang={lang} className="flex-1 mr-10" />
        <button onClick={handleGenerateImage} disabled={isGenerating} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest disabled:opacity-50 hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all">
          {isGenerating ? t.working : t.generateAIArt}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-6">
          <LocalizedInput label={t.atmosphericText} value={scene.descriptionText} onChange={(v) => onUpdate({ descriptionText: v })} lang={lang} multiline />

          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 space-y-4">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.aiPrompt}</label>
            <textarea value={scene.imagePrompt} onChange={(e) => onUpdate({ imagePrompt: e.target.value })} className="w-full h-24 bg-zinc-800 border border-white/10 rounded-lg p-3 text-xs text-white outline-none focus:border-red-500 transition-all resize-none" />
          </div>

          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">{t.npcsInScene}</label>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
              {(Object.values(allAssets.npcs) as NPC[]).map(npc => {
                const isAssigned = assignedNpcIds.includes(npc.id);
                const config = (scene.npcConfigs || []).find(c => c.npcId === npc.id);
                return (
                  <div key={npc.id} className={`p-3 rounded-xl border transition-all space-y-2 ${isAssigned ? 'bg-emerald-600/5 border-emerald-500/30' : 'bg-zinc-800/40 border-white/5'}`}>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleNpcInScene(npc.id)}
                        className={`text-[11px] font-bold ${isAssigned ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        {isAssigned ? '✓ ' : '+ '}{l(npc.name)}
                      </button>
                    </div>
                    {isAssigned && (
                      <div className="pt-2 border-t border-white/5">
                        <label className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-1">{t.requiredItem}</label>
                        <select
                          value={config?.requiredItemId || ''}
                          onChange={(e) => updateNpcConfig(npc.id, { requiredItemId: e.target.value || undefined })}
                          className="w-full bg-zinc-900 text-[10px] p-2 rounded border border-white/5 text-zinc-400 outline-none focus:border-emerald-500"
                        >
                          <option value="">[{t.none}]</option>
                          {Object.values(allAssets.items).map((i: any) => <option key={i.id} value={i.id}>{l(i.name)}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-zinc-950 p-6 rounded-2xl border border-white/5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.navigationExits}</label>
              <button onClick={addExit} className="text-[8px] font-bold text-red-500 uppercase tracking-widest hover:text-white transition-colors">
                {t.addExit}
              </button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
              {(scene.exits || []).map(exit => {
                const isExExpanded = expandedExitId === exit.id;
                return (
                  <div key={exit.id} className="rounded-xl bg-zinc-900 border border-white/5 overflow-hidden">
                    <div onClick={() => setExpandedExitId(isExExpanded ? null : exit.id)} className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5">
                      <span className="text-[10px] font-bold text-zinc-300 truncate">{l(exit.label)}</span>
                      <button onClick={(e) => { e.stopPropagation(); deleteExit(exit.id); }} className="text-zinc-600 hover:text-red-500 transition-colors">×</button>
                    </div>
                    {isExExpanded && (
                      <div className="p-4 border-t border-white/5 space-y-4 bg-black/20">
                        <LocalizedInput label="Label" value={exit.label} onChange={(v) => updateExit(exit.id, { label: v })} lang={lang} />
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{t.targetScene}</label>
                          <select value={exit.targetSceneId} onChange={(e) => updateExit(exit.id, { targetSceneId: e.target.value })} className="w-full bg-zinc-800 text-[10px] p-2 rounded border border-white/10 text-white outline-none">
                            <option value="">[{t.none}]</option>
                            {Object.values(allAssets.scenes).map((s: any) => <option key={s.id} value={s.id}>{l(s.name)}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{t.requiredItem}</label>
                          <select value={exit.requiredItemId || ''} onChange={(e) => updateExit(exit.id, { requiredItemId: e.target.value || undefined })} className="w-full bg-zinc-800 text-[10px] p-2 rounded border border-white/10 text-white outline-none">
                            <option value="">[{t.none}]</option>
                            {Object.values(allAssets.items).map((i: any) => <option key={i.id} value={i.id}>{l(i.name)}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div
            ref={imageRef}
            onClick={handleImageClick}
            className={`relative aspect-video bg-zinc-950 rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all ${isPlacingHotspot ? 'cursor-crosshair ring-2 ring-red-500' : ''}`}
          >
            {!showPlaceholder ? (
              <img src={scene.imageUrl} className="w-full h-full pointer-events-none" onError={() => setImageError(true)} alt="Scene Preview" />
            ) : (
              <div className="w-full h-full bg-[#0a0a0a] flex flex-col items-center justify-center relative">
                <div className="z-10 flex flex-col items-center gap-6">
                  <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5 shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700 animate-pulse"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="m3 9 2.45-2.45a2.2 2.2 0 0 1 3.1 0L12 10l4.45-4.45a2.2 2.2 0 0 1 3.1 0L21 9" /><circle cx="15" cy="15" r="2" /></svg>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.6em] text-zinc-600">Waiting for AI Art</div>
                </div>
              </div>
            )}

            {canvasHotspots.map(hs => (
              <div
                key={hs.id}
                onMouseDown={(e) => handleMouseDown(e, hs, 'move')}
                className={`absolute border-2 transition-shadow cursor-move group ${selectedHsId === hs.id ? 'border-red-500 bg-red-500/20 shadow-[0_0_15px_rgba(220,38,38,0.3)] z-20' : 'border-red-500/30 hover:border-red-500/60 z-10'}`}
                style={{
                  left: `${hs.x}%`,
                  top: `${hs.y}%`,
                  width: `${hs.width}%`,
                  height: `${hs.height}%`
                }}
              >
                <span className="absolute -top-6 left-0 bg-red-600 text-[8px] px-2 py-0.5 text-white font-bold whitespace-nowrap rounded shadow-lg uppercase tracking-widest">{l(hs.label)}</span>
                {selectedHsId === hs.id && <div onMouseDown={(e) => handleMouseDown(e, hs, 'resize')} className="absolute -right-1 -bottom-1 w-3 h-3 bg-red-500 rounded-sm cursor-nwse-resize shadow-md" />}
              </div>
            ))}
          </div>

          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 space-y-4">
            <label className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-2">{t.imageUrl}</label>
            <div className="flex gap-2">
              <input
                value={scene.imageUrl || ''}
                onChange={(e) => { setImageError(false); onUpdate({ imageUrl: e.target.value }); }}
                className="flex-1 bg-zinc-950 border border-white/5 rounded-lg p-3 text-[10px] outline-none text-zinc-500 focus:border-red-500 transition-all"
                placeholder="https://..."
              />
              <ImageUploader
                onUpload={(url) => { setImageError(false); onUpdate({ imageUrl: url }); }}
                storagePath={`games/${allAssets.id}/scenes/${scene.id}_main_${Date.now()}.webp`}
                className="w-24"
                label="Upload"
              />
            </div>
          </div>

          <div className="bg-zinc-950 p-8 rounded-3xl border border-white/5 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="mystery-font text-2xl text-white font-bold">{t.hotspots} ({scene.hotspots?.length || 0})</h3>
              <button onClick={() => setIsPlacingHotspot(!isPlacingHotspot)} className={`text-[10px] px-6 py-2 rounded-xl font-bold uppercase tracking-widest transition-all ${isPlacingHotspot ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
                {isPlacingHotspot ? t.cancelPlacement : t.addHotspot}
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2 scrollbar-thin">
              {(scene.hotspots || []).length === 0 && <div className="py-10 text-center border border-dashed border-white/5 rounded-2xl text-zinc-700 text-[10px] font-bold uppercase tracking-widest">{t.clickToPlace}</div>}
              {(scene.hotspots || []).map(hs => {
                const isExpanded = expandedHsId === hs.id;
                const isFolded = foldedHsDetails[hs.id] !== false;

                return (
                  <div key={hs.id} className={`rounded-2xl border overflow-hidden transition-all duration-300 ${isExpanded ? 'bg-zinc-900/80 border-red-500/50 shadow-lg' : 'bg-zinc-900/30 border-white/5 hover:border-white/10'}`}>
                    <div onClick={() => { setExpandedHsId(isExpanded ? null : hs.id); setSelectedHsId(hs.id); }} className="p-4 flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-2 h-2 rounded-full ${hs.actionType === 'EXAMINE' ? 'bg-blue-500' : hs.actionType === 'GOTO' ? 'bg-emerald-500' : hs.actionType === 'TALK' ? 'bg-purple-500' : hs.actionType === 'INPUT_PUZZLE' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                        <span className="text-xs font-bold text-zinc-300 truncate">{l(hs.label)}</span>
                        <span className="text-[9px] font-mono text-zinc-600 uppercase">[{hs.actionType}]</span>
                        {hs.isSubAction && <span className="text-[8px] bg-red-600/10 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20 font-bold uppercase tracking-tighter shadow-sm">Detail Only</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); deleteHotspot(hs.id); }} className="p-1.5 text-zinc-700 hover:text-red-500 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-zinc-600 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-6 border-t border-white/5 space-y-6 bg-black/20 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <LocalizedInput label="Label" value={hs.label} onChange={(v) => updateHotspot(hs.id, { label: v })} lang={lang} />
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Action</label>
                              <select value={hs.actionType} onChange={(e) => updateHotspot(hs.id, { actionType: e.target.value as any })} className="w-full bg-zinc-800 text-[10px] p-3 rounded-lg text-white border border-white/10 outline-none">
                                <option value="EXAMINE">Examine</option>
                                <option value="GOTO">Go To (Change Scene)</option>
                                <option value="GET_ITEM">Get Item</option>
                                <option value="TALK">Talk (Dialogue)</option>
                                <option value="INPUT_PUZZLE">{t.inputPuzzle}</option>
                              </select>
                            </div>
                            <div className="flex flex-col gap-4 justify-end pb-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={hs.initialHidden || false}
                                  onChange={(e) => updateHotspot(hs.id, { initialHidden: e.target.checked })}
                                  className="accent-red-600"
                                />
                                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Initial Hidden</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={hs.isSubAction || false}
                                  onChange={(e) => updateHotspot(hs.id, { isSubAction: e.target.checked })}
                                  className="accent-emerald-600"
                                />
                                <span className="text-[8px] font-bold text-emerald-500/70 uppercase tracking-widest group-hover:text-emerald-400 transition-colors">Modal Only</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Precision Position & Size Controls */}
                        <div className="grid grid-cols-4 gap-4 bg-zinc-950/40 p-4 rounded-xl border border-white/5">
                          <div>
                            <label className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-2 text-center">X (%)</label>
                            <input type="number" step="0.1" value={hs.x} onChange={(e) => updateHotspot(hs.id, { x: parseFloat(e.target.value) || 0 })} className="w-full bg-zinc-800 border border-white/10 rounded p-1.5 text-xs text-white text-center" />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-2 text-center">Y (%)</label>
                            <input type="number" step="0.1" value={hs.y} onChange={(e) => updateHotspot(hs.id, { y: parseFloat(e.target.value) || 0 })} className="w-full bg-zinc-800 border border-white/10 rounded p-1.5 text-xs text-white text-center" />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-2 text-center">Width (%)</label>
                            <input type="number" step="0.1" value={hs.width} onChange={(e) => updateHotspot(hs.id, { width: parseFloat(e.target.value) || 2 })} className="w-full bg-zinc-800 border border-white/10 rounded p-1.5 text-xs text-white text-center" />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-2 text-center">Height (%)</label>
                            <input type="number" step="0.1" value={hs.height} onChange={(e) => updateHotspot(hs.id, { height: parseFloat(e.target.value) || 2 })} className="w-full bg-zinc-800 border border-white/10 rounded p-1.5 text-xs text-white text-center" />
                          </div>
                        </div>

                        {hs.actionType === 'INPUT_PUZZLE' && (
                          <div className="bg-yellow-900/10 p-4 rounded-xl border border-yellow-500/20 space-y-6">
                            <LocalizedInput label={t.puzzlePromptLabel} value={hs.puzzlePrompt || { KO: '', EN: '' }} onChange={(v) => updateHotspot(hs.id, { puzzlePrompt: v })} lang={lang} multiline placeholder="Enter password..." />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-2">{t.answerKey}</label>
                                <input value={hs.puzzleAnswer || ''} onChange={(e) => updateHotspot(hs.id, { puzzleAnswer: e.target.value })} className="w-full bg-zinc-800 text-[10px] p-3 rounded-lg text-white border border-white/10 outline-none" placeholder="724" />
                              </div>
                              <LocalizedInput label={t.failureMessageLabel} value={hs.failureMessage || { KO: '', EN: '' }} onChange={(v) => updateHotspot(hs.id, { failureMessage: v })} lang={lang} placeholder="Wrong code..." />
                            </div>
                          </div>
                        )}

                        <div className="space-y-6">
                          <LocalizedInput label={t.successMessage} value={hs.successMessage || { KO: '', EN: '' }} onChange={(v) => updateHotspot(hs.id, { successMessage: v })} lang={lang} multiline />
                          {hs.requiredItemId && (
                            <div className="pt-2 animate-in fade-in duration-300">
                              <LocalizedInput label={t.itemMissingMessageLabel} value={hs.itemMissingMessage || { KO: '', EN: '' }} onChange={(v) => updateHotspot(hs.id, { itemMissingMessage: v })} lang={lang} multiline placeholder={t.needSomething} />
                            </div>
                          )}
                        </div>

                        {!hs.isSubAction && (
                          <div className="bg-zinc-900/30 p-5 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Reveals Sub-Actions</label>
                              <button onClick={() => handleCreateAndLinkHotspot(hs)} className="px-3 py-1 bg-red-600/10 border border-red-500/30 rounded-full text-[8px] font-bold text-red-500 hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest">
                                + {t.createAndLinkHotspot}
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-2 min-h-[44px] p-2 bg-zinc-950/50 rounded-xl border border-white/5 items-center">
                              {(hs.revealsHotspotIds || []).map(hid => {
                                const targetHs = scene.hotspots.find(h => h.id === hid);
                                return (
                                  <div key={hid} className="flex items-center gap-2 bg-red-600/20 border border-red-500/30 px-3 py-1.5 rounded-lg text-[9px] text-red-400 font-bold uppercase group/link">
                                    <span onClick={() => { setExpandedHsId(hid); setSelectedHsId(hid); }} className="cursor-pointer hover:underline">{targetHs ? l(targetHs.label) : hid}</span>
                                    <button onClick={() => updateHotspot(hs.id, { revealsHotspotIds: (hs.revealsHotspotIds || []).filter(i => i !== hid) })} className="hover:text-white transition-colors opacity-60 group-hover/link:opacity-100">×</button>
                                  </div>
                                );
                              })}
                              <select
                                value=""
                                onChange={(e) => {
                                  if (!e.target.value) return;
                                  const nextIds = [...(hs.revealsHotspotIds || []), e.target.value];
                                  updateHotspot(hs.id, { revealsHotspotIds: Array.from(new Set(nextIds)) });
                                }}
                                className="bg-transparent text-zinc-600 text-[8px] font-bold uppercase outline-none cursor-pointer"
                              >
                                <option value="">+ {lang === 'KO' ? '기존 포인트 연결' : 'Link Existing Point'}</option>
                                {scene.hotspots.filter(h => h.id !== hs.id).map(h => (
                                  <option key={h.id} value={h.id}>{l(h.label)} ({h.id})</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                        <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 space-y-4 transition-all">
                          <div className="flex justify-between items-center cursor-pointer" onClick={() => setFoldedHsDetails(prev => ({ ...prev, [hs.id]: !isFolded }))}>
                            <div className="flex items-center gap-2">
                              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t.detailImage}</h3>
                              {hs.detailImageUrl && <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>}
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`text-zinc-600 transition-transform ${!isFolded ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
                          </div>
                          {!isFolded && (
                            <div className="space-y-4 pt-2 animate-in slide-in-from-top-1 duration-200">
                              <div className="flex justify-end">
                                <button onClick={() => handleGenerateHsDetail(hs)} disabled={isGeneratingHsDetail === hs.id} className="text-[9px] font-bold text-red-500 hover:text-white transition-all uppercase tracking-widest">{isGeneratingHsDetail === hs.id ? t.working : t.generateDetailImage}</button>
                              </div>
                              <textarea value={l(hs.detailImagePrompt) || ''} onChange={(e) => updateHotspot(hs.id, { detailImagePrompt: e.target.value })} className="w-full h-16 bg-zinc-800 border border-white/10 rounded-lg p-3 text-[10px] outline-none focus:border-red-500 transition-all resize-none text-white" placeholder={t.detailImagePrompt} />
                              <div className="flex gap-2">
                                <input value={hs.detailImageUrl || ''} onChange={(e) => updateHotspot(hs.id, { detailImageUrl: e.target.value })} className="flex-1 bg-zinc-800 border border-white/5 rounded-lg p-2 text-[10px] outline-none text-zinc-500" placeholder={t.detailImageUrl} />
                                <ImageUploader
                                  onUpload={(url) => updateHotspot(hs.id, { detailImageUrl: url })}
                                  storagePath={`games/${allAssets.id}/scenes/${scene.id}_hs_${hs.id}_${Date.now()}.webp`}
                                  className="w-20"
                                  label="Up"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-2">{(hs.actionType === 'GET_ITEM' || hs.actionType === 'INPUT_PUZZLE') ? t.obtainedItem : t.targetSelection}</label>
                              <select value={hs.targetId || ''} onChange={(e) => updateHotspot(hs.id, { targetId: e.target.value })} className="w-full bg-zinc-800 text-[10px] p-3 rounded-lg text-zinc-300 border border-white/10 outline-none">
                                <option value="">[{t.noTarget}]</option>
                                {(hs.actionType === 'GET_ITEM' || hs.actionType === 'INPUT_PUZZLE') ? (
                                  <optgroup label={t.items}>
                                    {(Object.values(allAssets.items) as Item[]).map(i => <option key={i.id} value={i.id}>{l(i.name)}</option>)}
                                  </optgroup>
                                ) : (
                                  <>
                                    <optgroup label={t.scenes}>
                                      {(Object.values(allAssets.scenes) as Scene[]).map(s => <option key={s.id} value={s.id}>{l(s.name)}</option>)}
                                    </optgroup>
                                    <optgroup label={t.npcs}>
                                      {(Object.values(allAssets.npcs) as NPC[]).map(n => <option key={n.id} value={n.id}>{l(n.name)}</option>)}
                                    </optgroup>
                                    <optgroup label={t.items}>
                                      {(Object.values(allAssets.items) as Item[]).map(i => <option key={i.id} value={i.id}>{l(i.name)}</option>)}
                                    </optgroup>
                                  </>
                                )}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-2">{t.requiredItem}</label>
                              <select value={hs.requiredItemId || ''} onChange={(e) => updateHotspot(hs.id, { requiredItemId: e.target.value || undefined })} className="w-full bg-zinc-800 text-[10px] p-3 rounded-lg text-zinc-300 border border-white/10 outline-none">
                                <option value="">[{t.none}]</option>
                                {(Object.values(allAssets.items) as Item[]).map(i => <option key={i.id} value={i.id}>{l(i.name)}</option>)}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Visual Effect</label>
                            <select value={hs.visualEffect || 'NONE'} onChange={(e) => updateHotspot(hs.id, { visualEffect: e.target.value as any })} className="w-full bg-zinc-800 text-[10px] p-3 rounded-lg text-zinc-300 border border-white/10 outline-none">
                              <option value="NONE">None</option><option value="SHAKE">Shake</option><option value="FLASH">Flash</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SceneEditor;
