
import React, { useMemo } from 'react';
import { GameData, Scene } from '../../types';
import { translations, Language } from '../../translations';

interface VisualMapProps {
    gameData: GameData;
    lang: Language;
    onSelectScene: (sceneId: string) => void;
}

const VisualMap: React.FC<VisualMapProps> = ({ gameData, lang, onSelectScene }) => {
    const t = translations[lang];
    const scenes = Object.values(gameData.scenes) as Scene[];

    // Simple layout calculation (can be improved later)
    const nodes = useMemo(() => {
        return scenes.map((scene, idx) => ({
            ...scene,
            x: 100 + (idx % 3) * 250,
            y: 100 + Math.floor(idx / 3) * 200
        }));
    }, [scenes]);

    const l = (val: any) => {
        if (!val) return '';
        if (typeof val === 'string') return val;
        return val[lang] || val['EN'] || val['KO'] || '';
    };

    return (
        <div className="p-10 w-full min-h-full bg-[#050505] overflow-auto select-none relative">
            <header className="mb-10">
                <h2 className="text-3xl mystery-font font-bold text-white mb-2">{t.visualMap}</h2>
                <p className="text-sm text-zinc-500 uppercase tracking-widest">{t.mapHelp}</p>
            </header>

            <div className="relative" style={{ width: '1200px', height: '800px' }}>
                {/* Draw Edges (Arrows) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#3f3f46" />
                        </marker>
                    </defs>
                    {nodes.map(scene => (
                        (scene.exits || []).map(exit => {
                            const target = nodes.find(n => n.id === exit.targetSceneId);
                            if (!target) return null;

                            // Edge coordinates (center to center)
                            const startX = scene.x + 100;
                            const startY = scene.y + 40;
                            const endX = target.x + 100;
                            const endY = target.y + 40;

                            return (
                                <line
                                    key={`${scene.id}-${exit.id}`}
                                    x1={startX} y1={startY}
                                    x2={endX} y2={endY}
                                    stroke="#27272a"
                                    strokeWidth="2"
                                    markerEnd="url(#arrowhead)"
                                    className="transition-all"
                                />
                            );
                        })
                    ))}
                </svg>

                {/* Draw Nodes (Scenes) */}
                {nodes.map(scene => (
                    <div
                        key={scene.id}
                        onClick={() => onSelectScene(scene.id)}
                        style={{ left: scene.x, top: scene.y }}
                        className={`absolute w-[200px] h-[80px] bg-zinc-900 border ${gameData.startSceneId === scene.id ? 'border-red-600/50 shadow-lg shadow-red-900/20' : 'border-white/10'} rounded-2xl p-4 flex flex-col justify-center cursor-pointer hover:bg-zinc-800 hover:border-white/30 transition-all group z-10`}
                    >
                        {gameData.startSceneId === scene.id && (
                            <span className="absolute -top-2 -left-2 bg-red-600 text-[8px] font-bold text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Start</span>
                        )}
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 truncate">{scene.id}</div>
                        <div className="text-sm font-bold text-white truncate group-hover:text-red-400 transition-colors">{l(scene.name)}</div>

                        <div className="flex gap-1 mt-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" title={`${scene.hotspots?.length || 0} Hotspots`} />
                            {scene.npcIds?.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" title={`${scene.npcIds.length} NPCs`} />}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default VisualMap;
