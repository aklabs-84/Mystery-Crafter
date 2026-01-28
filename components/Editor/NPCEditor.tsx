
import React, { useState } from 'react';
import { NPC, VisualStyle, DialogueNode, GameData, Item } from '../../types';
import { translations, Language } from '../../translations';
import { gemini } from '../../services/geminiService';
import LocalizedInput from './LocalizedInput';
import ImageUploader from './ImageUploader';

interface NPCEditorProps {
  npc: NPC;
  onUpdate: (updates: Partial<NPC>) => void;
  lang: Language;
  allAssets: GameData;
}

const NPCEditor: React.FC<NPCEditorProps> = ({ npc, onUpdate, lang, allAssets }) => {
  const t = translations[lang];
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(npc?.initialDialogueId || null);
  const [imageError, setImageError] = useState(false);
  const [tempNodeId, setTempNodeId] = useState<string>('');

  const l = (val: any) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val[lang] || val['EN'] || val['KO'] || '';
  };

  if (!npc) return <div className="p-10 text-zinc-500 text-center">NPC data missing...</div>;

  const handleGeneratePortrait = async () => {
    setIsGenerating(true);
    setImageError(false);
    const nameText = l(npc.name);
    const url = await gemini.generateImage(npc.imagePrompt || nameText, allAssets.visualStyle || VisualStyle.LIGNE_CLAIRE, 'NPC');
    if (url) onUpdate({ portraitUrl: url });
    setIsGenerating(false);
  };

  const handleAddNode = () => {
    const id = `node_${Date.now()}`;
    const newNode: DialogueNode = { id, text: { KO: '...', EN: '...' }, options: [] };
    onUpdate({ dialogueTree: { ...npc.dialogueTree, [id]: newNode } });
    setEditingNodeId(id);
  };

  const handleDeleteNode = (id: string) => {
    if (id === 'start' || Object.keys(npc.dialogueTree).length <= 1) return;
    const newTree = { ...npc.dialogueTree };
    delete newTree[id];

    // Cleanup references
    Object.keys(newTree).forEach(k => {
      newTree[k].options = newTree[k].options.map(opt =>
        opt.nextNodeId === id ? { ...opt, nextNodeId: undefined } : opt
      );
    });

    onUpdate({ dialogueTree: newTree });
    if (editingNodeId === id) setEditingNodeId(Object.keys(newTree)[0]);
  };

  const handleRenameNode = (oldId: string, newId: string) => {
    if (!newId || oldId === newId || npc.dialogueTree[newId]) return;

    const newTree = { ...npc.dialogueTree };
    newTree[newId] = { ...newTree[oldId], id: newId };
    delete newTree[oldId];

    // Update references in all nodes
    Object.keys(newTree).forEach(k => {
      newTree[k].options = newTree[k].options.map(opt =>
        opt.nextNodeId === oldId ? { ...opt, nextNodeId: newId } : opt
      );
    });

    onUpdate({
      dialogueTree: newTree,
      initialDialogueId: npc.initialDialogueId === oldId ? newId : npc.initialDialogueId
    });
    setEditingNodeId(newId);
  };

  const handleUpdateNode = (id: string, updates: Partial<DialogueNode>) => {
    onUpdate({
      dialogueTree: {
        ...npc.dialogueTree,
        [id]: { ...npc.dialogueTree[id], ...updates }
      }
    });
  };

  const currentNode = editingNodeId ? npc.dialogueTree[editingNodeId] : null;
  const showPlaceholder = !npc.portraitUrl || imageError;
  const itemsList = Object.values(allAssets.items) as Item[];

  return (
    <div className="p-8 max-6xl mx-auto space-y-10 pb-20">
      <header className="flex justify-between items-end border-b border-white/5 pb-6">
        <div className="flex-1 mr-10">
          <span className="text-[10px] font-bold text-emerald-500 tracking-[0.2em] uppercase">{t.editingNPC}</span>
          <LocalizedInput
            label=""
            value={npc.name}
            onChange={(v) => onUpdate({ name: v })}
            lang={lang}
            className="mt-1"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-red-600/10 border border-red-500/20 rounded-lg">
            <input type="checkbox" id="isKiller" checked={npc.isKiller || false} onChange={(e) => onUpdate({ isKiller: e.target.checked })} className="accent-red-600" />
            <label htmlFor="isKiller" className="text-[10px] font-bold text-red-500 uppercase tracking-widest cursor-pointer">{t.isKiller}</label>
          </div>
          <button onClick={handleGeneratePortrait} disabled={isGenerating} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-emerald-600/20">
            {isGenerating ? t.working : t.generatePortrait}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <section className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-950 rounded-3xl border border-white/5 overflow-hidden aspect-[3/4] shadow-2xl relative flex flex-col items-center justify-center">
            {!showPlaceholder ? (
              <img
                src={npc.portraitUrl}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
                alt="NPC Portrait"
              />
            ) : (
              <div className="w-full h-full bg-[#0d0d0d] flex flex-col items-center justify-center relative">
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute top-4 left-4 text-[40px] font-bold uppercase -rotate-12 border-4 border-white p-4">Classified</div>
                </div>

                <div className="flex flex-col items-center gap-6 relative z-10">
                  <div className="w-32 h-32 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5 shadow-2xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-800">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-600">Identity Not Confirmed</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 space-y-4">
            <label className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-2">{t.portraitUrl}</label>
            <div className="flex gap-2">
              <input
                value={npc.portraitUrl || ''}
                onChange={(e) => { setImageError(false); onUpdate({ portraitUrl: e.target.value }); }}
                className="flex-1 bg-zinc-950 border border-white/5 rounded-lg p-3 text-[10px] outline-none text-zinc-500 focus:border-emerald-500 transition-all"
                placeholder="https://..."
              />
              <ImageUploader
                onUpload={(url) => { setImageError(false); onUpdate({ portraitUrl: url }); }}
                storagePath={`games/${allAssets.id}/npcs/${npc.id}_portrait_${Date.now()}.webp`}
                className="w-24"
                label="Upload"
              />
            </div>
          </div>
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">{t.aiPrompt}</label>
            <textarea value={npc.imagePrompt || ''} onChange={(e) => onUpdate({ imagePrompt: e.target.value })} className="w-full h-24 bg-zinc-800 border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-emerald-500 transition-all resize-none" placeholder="..." />
          </div>

          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 flex items-center gap-4">
            <input
              type="checkbox"
              id="useAiOnlyChat"
              checked={npc.useAiOnlyChat || false}
              onChange={(e) => onUpdate({ useAiOnlyChat: e.target.checked })}
              className="accent-red-600 w-5 h-5"
            />
            <div className="flex flex-col">
              <label htmlFor="useAiOnlyChat" className="text-xs font-bold text-white uppercase tracking-widest cursor-pointer">AI Discovery Mode</label>
              <span className="text-[9px] text-zinc-500 font-medium">Chat unlocks dialogue branches automatically.</span>
            </div>
          </div>
        </section>

        <section className="lg:col-span-8 space-y-8">
          <LocalizedInput label={t.secretPersona} value={npc.secretPersona || { KO: '', EN: '' }} onChange={(v) => onUpdate({ secretPersona: v })} lang={lang} multiline className="bg-emerald-900/5 p-6 rounded-2xl border border-emerald-500/10" />

          <div className="bg-zinc-900/30 rounded-3xl border border-white/5 p-8 space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="mystery-font text-2xl text-white font-bold">{t.dialogueOverview}</h3>
              <button onClick={handleAddNode} className="text-[10px] px-4 py-2 bg-emerald-600/10 text-emerald-500 rounded-lg border border-emerald-500/30 font-bold uppercase tracking-widest transition-all hover:bg-emerald-600 hover:text-white">
                {t.addDialogueNode}
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-thin">
              {Object.keys(npc.dialogueTree || {}).map(nodeId => (
                <button
                  key={nodeId}
                  onClick={() => {
                    setEditingNodeId(nodeId);
                    setTempNodeId(nodeId);
                  }}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg border text-[10px] font-mono transition-all group relative ${editingNodeId === nodeId ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-zinc-300'}`}
                >
                  {nodeId}
                  {nodeId !== 'start' && editingNodeId === nodeId && (
                    <span
                      onClick={(e) => { e.stopPropagation(); handleDeleteNode(nodeId); }}
                      className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 text-[8px] flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >×</span>
                  )}
                </button>
              ))}
            </div>

            {currentNode && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end bg-zinc-950 p-6 rounded-2xl border border-white/5">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.nodeId}</label>
                    <div className="flex gap-2">
                      <input
                        value={tempNodeId}
                        onChange={(e) => setTempNodeId(e.target.value)}
                        className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                        placeholder="node_name"
                      />
                      <button
                        onClick={() => handleRenameNode(currentNode.id, tempNodeId)}
                        disabled={!tempNodeId || tempNodeId === currentNode.id || !!npc.dialogueTree[tempNodeId]}
                        className="px-3 py-2 bg-zinc-800 text-[10px] font-bold text-zinc-400 rounded-lg hover:text-white disabled:opacity-30 transition-all uppercase"
                      >
                        Rename
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-2">
                    <input type="checkbox" checked={currentNode.isEnding || false} onChange={(e) => handleUpdateNode(currentNode.id, { isEnding: e.target.checked })} id="isEnding" className="accent-emerald-500 w-4 h-4" />
                    <label htmlFor="isEnding" className="text-xs text-white font-bold cursor-pointer">{t.isEndingNode}</label>
                  </div>
                </div>

                <LocalizedInput label={t.npcText} value={currentNode.text} onChange={(v) => handleUpdateNode(currentNode.id, { text: v })} lang={lang} multiline />

                {!currentNode.isEnding && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{t.playerOptions}</label>
                      <button
                        onClick={() => handleUpdateNode(currentNode.id, { options: [...(currentNode.options || []), { text: { KO: '...', EN: '...' }, nextNodeId: '', requiredItems: [] }] })}
                        className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest hover:text-emerald-400"
                      >
                        {t.addOption}
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(currentNode.options || []).map((opt, idx) => (
                        <div key={idx} className="bg-zinc-950 p-6 rounded-2xl border border-white/5 space-y-6 relative group/opt">
                          <button
                            onClick={() => {
                              const newOptions = currentNode.options.filter((_, i) => i !== idx);
                              handleUpdateNode(currentNode.id, { options: newOptions });
                            }}
                            className="absolute top-4 right-4 text-zinc-700 hover:text-red-500 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                          </button>

                          <LocalizedInput label="Option Text" value={opt.text} onChange={(v) => {
                            const newOptions = [...currentNode.options];
                            newOptions[idx] = { ...opt, text: v };
                            handleUpdateNode(currentNode.id, { options: newOptions });
                          }} lang={lang} />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{t.nextNode}</label>
                              <select
                                value={opt.nextNodeId || ''}
                                onChange={(e) => {
                                  const newOptions = [...currentNode.options];
                                  newOptions[idx] = { ...opt, nextNodeId: e.target.value || undefined };
                                  handleUpdateNode(currentNode.id, { options: newOptions });
                                }}
                                className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-[10px] text-emerald-500 font-mono outline-none focus:border-emerald-500"
                              >
                                <option value="">[{t.closeDialogue}]</option>
                                {Object.keys(npc.dialogueTree || {}).map(id => <option key={id} value={id}>{id}</option>)}
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{t.rewardItem}</label>
                              <select
                                value={opt.rewardItemId || ''}
                                onChange={(e) => {
                                  const newOptions = [...currentNode.options];
                                  newOptions[idx] = { ...opt, rewardItemId: e.target.value || undefined };
                                  handleUpdateNode(currentNode.id, { options: newOptions });
                                }}
                                className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-[10px] text-zinc-400 outline-none focus:border-emerald-500"
                              >
                                <option value="">[{t.none}]</option>
                                {itemsList.map(item => <option key={item.id} value={item.id}>{l(item.name)}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{t.requiredItem} (Multiple)</label>
                            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-zinc-900/50 rounded-xl border border-white/5">
                              {(opt.requiredItems || []).map(itemId => {
                                const item = allAssets.items[itemId];
                                return (
                                  <div key={itemId} className="flex items-center gap-2 bg-emerald-600/20 border border-emerald-500/30 px-2 py-1 rounded text-[10px] text-emerald-400">
                                    <span>{item ? l(item.name) : itemId}</span>
                                    <button onClick={() => {
                                      const newOptions = [...currentNode.options];
                                      newOptions[idx] = { ...opt, requiredItems: (opt.requiredItems || []).filter(id => id !== itemId) };
                                      handleUpdateNode(currentNode.id, { options: newOptions });
                                    }} className="hover:text-white transition-colors">×</button>
                                  </div>
                                );
                              })}
                              <select
                                value=""
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (!val || (opt.requiredItems || []).includes(val)) return;
                                  const newOptions = [...currentNode.options];
                                  newOptions[idx] = { ...opt, requiredItems: [...(opt.requiredItems || []), val] };
                                  handleUpdateNode(currentNode.id, { options: newOptions });
                                }}
                                className="bg-transparent border-none outline-none text-[10px] text-zinc-500 font-bold uppercase cursor-pointer"
                              >
                                <option value="">+ Add Requirement</option>
                                {itemsList.map(item => <option key={item.id} value={item.id}>{l(item.name)}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default NPCEditor;
