import React from 'react';
import { GameData, Scene, NPC, Item } from '../../types';

interface StoryboardPreviewProps {
    data: GameData;
}

const StoryboardPreview: React.FC<StoryboardPreviewProps> = ({ data }) => {
    const scenes = Object.values(data.scenes || {}) as Scene[];
    const npcs = Object.values(data.npcs || {}) as NPC[];
    const items = Object.values(data.items || {}) as Item[];

    // Helper to get text based on language priority
    const t = (obj: any, fallback = '') => {
        if (!obj) return fallback;
        if (typeof obj === 'string') return obj;
        return obj.KO || obj.EN || fallback;
    };

    return (
        <div className="w-full h-full bg-[#1a1a1a] p-8 overflow-y-auto rounded-xl border border-white/10 shadow-inner break-keep">
            <header className="mb-8 text-center">
                <h2 className="text-3xl font-mystery font-bold text-white mb-2">{t(data.title, 'No Title')}</h2>
                <p className="text-zinc-500 italic">{t(data.description)}</p>
            </header>

            <div className="space-y-12">
                {/* 1. SCENES & FLOW */}
                <section>
                    <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-4 border-b border-red-900/30 pb-2">
                        Location Network
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {scenes.map(scene => (
                            <div key={scene.id} className={`relative p-5 rounded-lg border ${scene.id === data.startSceneId ? 'border-green-600 bg-green-950/20' : 'border-zinc-700 bg-zinc-900'} hover:border-white/30 transition shadow-lg`}>
                                {scene.id === data.startSceneId && (
                                    <span className="absolute -top-3 left-4 px-2 py-0.5 bg-green-600 text-[10px] font-bold text-black uppercase rounded-full">시작점</span>
                                )}
                                <h4 className="font-bold text-white mb-1">{t(scene.name)}</h4>
                                <p className="text-zinc-400 text-xs line-clamp-2 mb-3">{t(scene.descriptionText)}</p>

                                <div className="space-y-2">
                                    {/* Hotspots */}
                                    <div className="flex flex-wrap gap-2">
                                        {scene.hotspots.map(hs => (
                                            <span key={hs.id} className="px-2 py-1 bg-zinc-800 rounded text-[10px] text-zinc-300 border border-zinc-700 flex items-center gap-1">
                                                {hs.actionType === 'GOTO' ? '🚪' : hs.actionType === 'TALK' ? '💬' : '🔍'}
                                                {t(hs.label, '알 수 없음')}
                                            </span>
                                        ))}
                                    </div>

                                    {/* NPCs in Scene */}
                                    {(scene.npcIds || []).map(npcId => {
                                        const npc = data.npcs[npcId];
                                        if (!npc) return null;
                                        return (
                                            <div key={npcId} className="flex items-center gap-2 mt-2 p-2 bg-purple-900/20 border border-purple-500/30 rounded">
                                                <span className="text-lg">👤</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-bold text-purple-300 truncate">{t(npc.name)}</div>
                                                    {npc.isKiller && <div className="text-[9px] text-red-400 font-bold uppercase animate-pulse">범인</div>}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 2. CAST & SUSPECTS */}
                <section>
                    <h3 className="text-xs font-bold text-purple-500 uppercase tracking-widest mb-4 border-b border-purple-900/30 pb-2">
                        Cast & Personas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {npcs.map(npc => (
                            <div key={npc.id} className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-white">{t(npc.name)}</h4>
                                    {npc.isKiller && <span className="text-[10px] bg-red-950 text-red-500 px-2 py-0.5 rounded border border-red-900">범인</span>}
                                </div>
                                <p className="text-xs text-zinc-500 flex-1">{t(npc.secretPersona)}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 3. KEY ITEMS */}
                <section>
                    <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-4 border-b border-yellow-900/30 pb-2">
                        Key Evidence
                    </h3>
                    <div className="flex flex-wrap gap-4">
                        {items.map(item => (
                            <div key={item.id} className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg border border-zinc-800 pr-6">
                                <div className="w-10 h-10 bg-black rounded flex items-center justify-center text-xl">📦</div>
                                <div>
                                    <h4 className="font-bold text-zinc-300 text-sm">{t(item.name)}</h4>
                                    <p className="text-[10px] text-zinc-600 max-w-[150px] truncate">{t(item.description)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 4. CONCLUSION Logic */}
                <section>
                    <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-4 border-b border-blue-900/30 pb-2">
                        The Truth
                    </h3>
                    <div className="bg-zinc-900/50 p-6 rounded-xl border border-dashed border-zinc-700">
                        <h4 className="font-mystery text-xl text-white mb-2">{t(data.conclusion?.mysterySolution, '진실이 밝혀지지 않았습니다')}</h4>
                        <div className="grid grid-cols-2 gap-8 border-t border-white/5 pt-4 mt-4">
                            <div>
                                <span className="text-[10px] font-bold text-green-500 uppercase">성공 엔딩</span>
                                <p className="text-sm text-zinc-400 mt-1">{t(data.conclusion?.successBody)}</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-red-500 uppercase">실패 엔딩</span>
                                <p className="text-sm text-zinc-400 mt-1">{t(data.conclusion?.failureBody)}</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default StoryboardPreview;
