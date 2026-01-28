
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { GameData, GameState, Item, Localized, NPC, Hotspot, SceneExit, SceneNPC } from '../../types';
import { translations, Language } from '../../translations';
import BgmPlayer from './BgmPlayer';
import InventoryBar from './InventoryBar';
import DialogueBox from './DialogueBox';
import TutorialOverlay from './TutorialOverlay';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';

const l = (val: any, lang: Language): string => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val[lang] || val['EN'] || val['KO'] || '';
};

import { supabase } from '../../services/supabase';

// --- Main GamePlayer ---
interface GamePlayerProps {
  gameData: GameData;
  initialState?: GameState;
  gameId?: string;
  lang: Language;
  onBackToHome?: () => void;
  onBgmChange?: (url?: string) => void;
  onProgressUpdate?: (progress: { current: number, total: number } | null) => void;
}

const GamePlayer: React.FC<GamePlayerProps> = ({ gameData, initialState, gameId, lang, onBackToHome, onBgmChange, onProgressUpdate }) => {
  const t = translations[lang];

  const getInitialState = useCallback((): GameState => {
    if (initialState) return initialState;
    const startId = gameData.startSceneId || (Object.keys(gameData.scenes)[0] || '');
    return {
      currentSceneId: startId,
      sceneHistory: [],
      inventory: [],
      flags: { ...gameData.initialFlags },
      activeDialogueNpcId: null,
      activeDialogueNodeId: null,
      inspectedItemId: null,
      revealedHotspotIds: [],
      solvedHotspotIds: [],
      visitedSceneIds: [startId],
      talkedToNpcIds: [],
      isGameFinished: false,
      endingType: undefined
    };
  }, [gameData, initialState]);

  const [state, setState] = useState<GameState>(getInitialState);

  // Auto-Save Logic
  useEffect(() => {
    if (!gameId) return;

    const saveProgress = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('saves')
        .upsert({
          user_id: user.id,
          game_id: gameId,
          state: state,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, game_id' });
    };

    const timeoutId = setTimeout(saveProgress, 2000); // Debounce 2s
    return () => clearTimeout(timeoutId);
  }, [state, gameId]);
  const [examineMessage, setExamineMessage] = useState<string | null>(null);
  const [examineHs, setExamineHs] = useState<Hotspot | null>(null);
  const [showHsDetail, setShowHsDetail] = useState(false);
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [obtainedItem, setObtainedItem] = useState<Item | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAiOverrideEnabled, setIsAiOverrideEnabled] = useState<boolean>(false);
  const [isAccusing, setIsAccusing] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => {
    const skip = localStorage.getItem('skip-tutorial');
    return !skip;
  });

  // Accordion toggle states (Suspects open by default)
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [isSuspectsOpen, setIsSuspectsOpen] = useState(true);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

  // Puzzle States
  const [activePuzzleHs, setActivePuzzleHs] = useState<Hotspot | null>(null);
  const [puzzleInput, setPuzzleInput] = useState('');
  const [puzzleError, setPuzzleError] = useState<string | null>(null);

  const currentScene = gameData.scenes[state.currentSceneId];

  const activeBgmUrl = useMemo(() => {
    return currentScene?.bgmId || gameData.globalBgmUrl;
  }, [currentScene?.bgmId, gameData.globalBgmUrl]);

  // Sync BGM URL to App component
  useEffect(() => {
    if (onBgmChange) onBgmChange(activeBgmUrl);
  }, [activeBgmUrl, onBgmChange]);

  const activeNPC = useMemo(() => {
    if (state.activeDialogueNpcId) return gameData.npcs[state.activeDialogueNpcId];
    return null;
  }, [state.activeDialogueNpcId, gameData.npcs]);

  const activeDialogueNode = useMemo(() => {
    if (activeNPC && state.activeDialogueNodeId) {
      return activeNPC.dialogueTree[state.activeDialogueNodeId];
    }
    return null;
  }, [activeNPC, state.activeDialogueNodeId]);

  const triggerShake = useCallback(() => { setIsShaking(true); setTimeout(() => setIsShaking(false), 300); }, []);
  const triggerFlash = useCallback(() => { setIsFlashing(true); setTimeout(() => setIsFlashing(false), 400); }, []);

  const checkNavigationRequirement = (reqId?: string, alreadyMet: boolean = false): boolean => {
    if (alreadyMet) return true;
    if (!reqId) return true;
    return state.inventory.includes(reqId);
  };

  const handleReveals = useCallback((action: Hotspot) => {
    if (action.revealsHotspotIds && action.revealsHotspotIds.length > 0) {
      setState(p => ({
        ...p,
        revealedHotspotIds: [...(p.revealedHotspotIds || []), ...action.revealsHotspotIds!]
      }));
    }
  }, []);

  const handleCombineItems = useCallback((id1: string, id2: string) => {
    const item1 = gameData.items[id1];
    const item2 = gameData.items[id2];
    if (!item1 || !item2) return;

    const canCombine1 = item1.combinableWith === id2 && item1.resultItemId;
    const canCombine2 = item2.combinableWith === id1 && item2.resultItemId;

    if ((canCombine1 || canCombine2) && gameData.items[item1.resultItemId || item2.resultItemId!]) {
      const resultId = canCombine1 ? item1.resultItemId! : item2.resultItemId!;
      const resultItem = gameData.items[resultId];

      setState(p => ({
        ...p,
        inventory: [...p.inventory.filter(id => id !== id1 && id !== id2), resultId]
      }));
      setObtainedItem(resultItem);
      setIsInventoryOpen(true);
      triggerFlash();
    } else {
      setExamineMessage(t.wrongCombination);
      triggerShake();
    }
  }, [gameData.items, t.wrongCombination, triggerFlash, triggerShake]);

  const accusationPrerequisites = useMemo(() => {
    const itemsArray = Object.values(gameData.items) as Item[];
    const crucialItems = itemsArray.filter(i => i.isCrucialEvidence);
    const crucialItemsFound = crucialItems.filter(i => state.inventory.includes(i.id)).length;

    return {
      canAccuse: crucialItemsFound >= crucialItems.length && crucialItems.length > 0,
      current: crucialItemsFound,
      total: crucialItems.length
    };
  }, [gameData, state.inventory]);

  useEffect(() => {
    if (onProgressUpdate) {
      onProgressUpdate({
        current: accusationPrerequisites.current,
        total: accusationPrerequisites.total
      });
    }
  }, [accusationPrerequisites.current, accusationPrerequisites.total, onProgressUpdate]);

  const triggerAction = useCallback((action: Hotspot) => {
    let alreadyMet = false;
    if (action.actionType === 'GOTO' && action.targetId) {
      alreadyMet = state.visitedSceneIds.includes(action.targetId);
    } else if (action.actionType === 'TALK' && action.targetId) {
      alreadyMet = state.talkedToNpcIds.includes(action.targetId);
    } else {
      alreadyMet = state.solvedHotspotIds?.includes(action.id) || false;
    }

    if (!checkNavigationRequirement(action.requiredItemId, alreadyMet)) {
      const missingMsg = action.itemMissingMessage ? l(action.itemMissingMessage, lang) : t.needSomething;
      setExamineMessage(missingMsg);
      triggerShake();
      return;
    }

    if (action.visualEffect === 'SHAKE') triggerShake();
    if (action.visualEffect === 'FLASH') triggerFlash();

    // 퍼즐이 아닌 경우에만 상호작용 시 해결 목록에 추가 (퍼즐은 정답 제출 시에만 해결 처리)
    if (action.actionType !== 'INPUT_PUZZLE' && !state.solvedHotspotIds?.includes(action.id)) {
      setState(p => ({
        ...p,
        solvedHotspotIds: [...(p.solvedHotspotIds || []), action.id]
      }));
    }

    switch (action.actionType) {
      case 'GOTO':
        if (action.targetId && gameData.scenes[action.targetId]) {
          const targetId = action.targetId;
          setState(p => ({
            ...p,
            currentSceneId: targetId,
            sceneHistory: [...p.sceneHistory, p.currentSceneId],
            visitedSceneIds: p.visitedSceneIds.includes(targetId) ? p.visitedSceneIds : [...p.visitedSceneIds, targetId]
          }));
          handleReveals(action);
        }
        break;
      case 'GET_ITEM':
        if (action.targetId && !state.inventory.includes(action.targetId)) {
          const item = gameData.items[action.targetId];
          if (item) {
            setObtainedItem(item);
            setIsInventoryOpen(true);
            setState(p => ({ ...p, inventory: [...p.inventory, action.targetId!] }));
            handleReveals(action);
          }
        }
        if (action.successMessage) {
          const msg = l(action.successMessage, lang);
          if (msg) setExamineMessage(msg);
        }
        break;
      case 'TALK':
        if (action.targetId) {
          startDialogue(action.targetId);
          handleReveals(action);
        }
        break;
      case 'EXAMINE':
        setExamineHs(action);
        setShowHsDetail(false);
        handleReveals(action);
        if (action.successMessage) {
          const msg = l(action.successMessage, lang);
          if (msg) setExamineMessage(msg);
        }
        break;
      case 'INPUT_PUZZLE':
        // 이미 해결된 퍼즐이라면 어떠한 메시지나 창도 띄우지 않고 로직 종료
        if (state.solvedHotspotIds?.includes(action.id)) {
          return;
        }
        setActivePuzzleHs(action);
        setPuzzleInput('');
        setPuzzleError(null);
        break;
    }

    if (action.isEnding) {
      setState(p => ({ ...p, isGameFinished: true, endingType: action.endingType || 'SUCCESS' }));
    }
  }, [state.inventory, state.solvedHotspotIds, state.visitedSceneIds, state.talkedToNpcIds, gameData, lang, t.needSomething, handleReveals, triggerShake, triggerFlash]);

  const handleExitClick = (exit: SceneExit) => {
    const alreadyVisited = state.visitedSceneIds.includes(exit.targetSceneId);
    if (checkNavigationRequirement(exit.requiredItemId, alreadyVisited)) {
      const targetId = exit.targetSceneId;
      setState(p => ({
        ...p,
        currentSceneId: targetId,
        sceneHistory: [...p.sceneHistory, p.currentSceneId],
        visitedSceneIds: p.visitedSceneIds.includes(targetId) ? p.visitedSceneIds : [...p.visitedSceneIds, targetId]
      }));
    } else {
      setExamineMessage(t.lockedPath);
      triggerShake();
    }
  };

  const handleGoBack = () => {
    if (state.sceneHistory.length === 0) return;
    const history = [...state.sceneHistory];
    const prevId = history.pop();
    if (prevId) {
      setState(p => ({ ...p, currentSceneId: prevId, sceneHistory: history }));
    }
  };

  const handlePuzzleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePuzzleHs) return;

    if (puzzleInput === activePuzzleHs.puzzleAnswer) {
      const solvedId = activePuzzleHs.id;
      setPuzzleError(null);
      handleReveals(activePuzzleHs);
      if (activePuzzleHs.visualEffect === 'FLASH' || activePuzzleHs.visualEffect === 'NONE') triggerFlash();
      if (activePuzzleHs.visualEffect === 'SHAKE') triggerShake();

      // 퍼즐 성공 시 아이템 보상 처리
      if (activePuzzleHs.targetId && !state.inventory.includes(activePuzzleHs.targetId)) {
        const item = gameData.items[activePuzzleHs.targetId];
        if (item) {
          setObtainedItem(item);
          setIsInventoryOpen(true);
          setState(p => ({ ...p, inventory: [...p.inventory, activePuzzleHs.targetId!] }));
        }
      }

      if (activePuzzleHs.successMessage) {
        setExamineMessage(l(activePuzzleHs.successMessage, lang));
      }

      // 퍼즐이 완벽히 해결된 시점에만 해결 목록에 추가
      setState(p => ({
        ...p,
        solvedHotspotIds: [...(p.solvedHotspotIds || []), solvedId]
      }));

      setActivePuzzleHs(null);
    } else {
      triggerShake();
      if (activePuzzleHs.failureMessage) {
        setPuzzleError(l(activePuzzleHs.failureMessage, lang));
      } else {
        setPuzzleError(lang === 'KO' ? '비밀번호가 일치하지 않습니다.' : 'Incorrect password.');
      }
    }
  };

  const startDialogue = (npcId: string) => {
    const npc = gameData.npcs[npcId];
    if (npc) {
      setState(p => ({
        ...p,
        activeDialogueNpcId: npcId,
        activeDialogueNodeId: npc.initialDialogueId,
        talkedToNpcIds: p.talkedToNpcIds.includes(npcId) ? p.talkedToNpcIds : [...p.talkedToNpcIds, npcId]
      }));
      setIsSidebarOpen(true);
    }
  };

  const handleDialogueOption = (option: any) => {
    if (option.rewardItemId && !state.inventory.includes(option.rewardItemId)) {
      const item = gameData.items[option.rewardItemId];
      if (item) {
        setObtainedItem(item);
        setIsInventoryOpen(true);
      }
      setState(p => ({ ...p, inventory: [...p.inventory, option.rewardItemId] }));
    }
    if (option.nextNodeId) {
      setState(p => ({ ...p, activeDialogueNodeId: option.nextNodeId }));
    } else {
      setState(p => ({ ...p, activeDialogueNpcId: null, activeDialogueNodeId: null }));
    }
  };

  const handleAccuse = (npcId: string) => {
    const npc = gameData.npcs[npcId];
    if (!npc) return;

    const isKiller = !!npc.isKiller;
    setState(p => ({
      ...p,
      isGameFinished: true,
      endingType: isKiller ? 'SUCCESS' : 'FAILURE'
    }));
    setIsAccusing(false);
  };

  const handleRestart = () => {
    setState(getInitialState());
    setIsAccusing(false);
    setExamineMessage(null);
    setObtainedItem(null);
    setActivePuzzleHs(null);
    setPuzzleError(null);
    setExamineHs(null);
    setShowHsDetail(false);
  };

  const inspectedItem = useMemo(() => {
    return state.inspectedItemId ? gameData.items[state.inspectedItemId] : null;
  }, [state.inspectedItemId, gameData.items]);

  const visibleHotspots = useMemo(() => {
    if (!currentScene) return [];
    return (currentScene.hotspots || []).filter(hs => {
      if (hs.isSubAction) return false;
      if (!hs.initialHidden) return true;
      return state.revealedHotspotIds?.includes(hs.id);
    });
  }, [currentScene, state.revealedHotspotIds]);

  const finishTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('skip-tutorial', 'true');
  };

  if (state.isGameFinished) {
    const isSuccess = state.endingType === 'SUCCESS';
    const conclusion = gameData.conclusion;
    return (
      <div className="h-full w-full bg-black flex items-center justify-center p-12 overflow-y-auto animate-in fade-in duration-1000">
        <div className="max-w-4xl w-full space-y-12 text-center">
          <div className="space-y-4">
            <span className={`text-[10px] font-bold uppercase tracking-[0.5em] ${isSuccess ? 'text-emerald-500' : 'text-red-500'}`}>{isSuccess ? t.caseClosed : t.gameOver}</span>
            <h1 className="mystery-font text-7xl font-bold text-white leading-tight">{isSuccess ? l(conclusion?.successTitle, lang) : l(conclusion?.failureTitle, lang)}</h1>
          </div>
          <div className="bg-zinc-900/30 border border-white/5 p-10 rounded-[3rem] backdrop-blur-xl space-y-8 shadow-2xl">
            <p className="text-zinc-300 text-xl leading-relaxed mystery-font italic">{isSuccess ? l(conclusion?.successBody, lang) : l(conclusion?.failureBody, lang)}</p>
            <div className="pt-8 border-t border-white/5 space-y-4">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.mysterySolution}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed max-w-2xl mx-auto">{l(conclusion?.mysterySolution, lang)}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={handleRestart} className="px-12 py-4 bg-white text-black font-bold rounded-full hover:bg-red-600 hover:text-white transition-all shadow-xl uppercase tracking-widest text-xs">{t.tryAgain}</button>
            <button onClick={onBackToHome} className="px-12 py-4 bg-zinc-900 border border-white/10 text-zinc-400 font-bold rounded-full hover:text-white transition-all uppercase tracking-widest text-xs">{t.backToHome}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <div className={`h-screen w-screen flex bg-black overflow-hidden relative transition-all duration-300 ${isShaking ? 'animate-shake' : ''}`}>
        {isFlashing && <div className="absolute inset-0 z-[100] animate-flash pointer-events-none" />}

        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`absolute top-1/2 -translate-y-1/2 z-50 p-2 bg-zinc-900 border-y border-r border-white/10 text-zinc-400 hover:text-white rounded-r-xl transition-all shadow-2xl ${isSidebarOpen ? 'left-[260px]' : 'left-0'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isSidebarOpen ? 'rotate-180' : ''}`}><polyline points="9 18 15 12 9 6" /></svg>
        </button>

        <aside id="game-sidebar" className={`border-r border-white/5 bg-[#080808] flex flex-col z-30 shadow-[4px_0_15px_rgba(0,0,0,0.4)] shrink-0 transition-all duration-500 ease-in-out ${isSidebarOpen ? 'w-[260px] opacity-100' : 'w-0 opacity-0 pointer-events-none overflow-hidden'}`}>
          <div id="sidebar-header" className="p-4 bg-zinc-950 border-b border-white/5 flex items-center gap-4 min-w-[260px]">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden flex-shrink-0 shadow-lg relative">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:8px_8px]"></div>
              {activeNPC?.portraitUrl ? (
                <img src={activeNPC.portraitUrl} className="w-full h-full object-cover animate-in fade-in duration-500 relative z-10" alt="NPC" />
              ) : currentScene?.imageUrl ? (
                <img src={currentScene.imageUrl} className="w-full h-full object-cover animate-in fade-in duration-500 relative z-10" alt="Scene" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-800 relative z-10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-zinc-500 text-[8px] font-bold uppercase tracking-[0.2em] mb-1 truncate">
                {activeNPC ? (lang === 'KO' ? '대화 중' : 'Conversation') : t.location}
              </span>
              <h2 className="mystery-font text-base text-zinc-100 font-bold truncate">
                {activeNPC ? l(activeNPC.name, lang) : (currentScene ? l(currentScene.name, lang) : "...")}
              </h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin min-w-[260px] bg-zinc-900/5 flex flex-col">
            <div id="movement-section" className="border-b border-white/5">
              <button
                onClick={() => setIsMovementOpen(!isMovementOpen)}
                className="w-full px-4 py-4 flex items-center justify-between hover:bg-white/5 transition-colors group"
              >
                <h3 className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest group-hover:text-zinc-300">{t.movement}</h3>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`text-zinc-600 transition-transform duration-300 ${isMovementOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
              </button>

              {isMovementOpen && (
                <div className="px-4 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-300">
                  {state.sceneHistory.length > 0 && (
                    <button
                      onClick={handleGoBack}
                      className="flex items-center gap-4 p-4 rounded-2xl border bg-zinc-900/40 border-white/5 hover:border-red-600/50 hover:bg-red-950/20 group transition-all shadow-lg w-full"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 text-zinc-400 group-hover:text-red-500 bg-black/20 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6" /></svg>
                      </div>
                      <div className="flex flex-col text-left overflow-hidden">
                        <span className="text-sm font-bold text-zinc-200 group-hover:text-white truncate">{t.previousLocation}</span>
                        <span className="text-[9px] text-zinc-600 uppercase leading-none mt-1 truncate">{t.backToPrevious}</span>
                      </div>
                    </button>
                  )}

                  {(currentScene?.exits || []).map(exit => {
                    const alreadyVisited = state.visitedSceneIds.includes(exit.targetSceneId);
                    const isLocked = exit.requiredItemId && !state.inventory.includes(exit.requiredItemId) && !alreadyVisited;
                    const targetScene = gameData.scenes[exit.targetSceneId];
                    return (
                      <button
                        key={exit.id}
                        onClick={() => handleExitClick(exit)}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all group shadow-lg w-full ${isLocked ? 'bg-zinc-950/20 border-white/5 opacity-50' : 'bg-zinc-950/40 border-white/5 hover:border-emerald-600/50 hover:bg-emerald-950/20'}`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 bg-black/20 shrink-0 ${isLocked ? 'text-zinc-800' : 'text-emerald-500'}`}>
                          {isLocked ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6" /></svg>
                          )}
                        </div>
                        <div className="flex flex-col text-left overflow-hidden">
                          <span className={`text-sm font-bold truncate ${isLocked ? 'text-zinc-600' : 'text-zinc-200 group-hover:text-white'}`}>{l(exit.label, lang)}</span>
                          <span className="text-[10px] text-zinc-500 uppercase leading-none mt-1 truncate">
                            {isLocked ? t.lockedPath : (targetScene ? l(targetScene.name, lang) : "")}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div id="suspects-section" className="border-b border-white/5">
              <button
                onClick={() => setIsSuspectsOpen(!isSuspectsOpen)}
                className="w-full px-4 py-4 flex items-center justify-between hover:bg-white/5 transition-colors group"
              >
                <h3 className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest group-hover:text-zinc-300">{t.presentSuspects}</h3>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`text-zinc-600 transition-transform duration-300 ${isSuspectsOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
              </button>

              {isSuspectsOpen && (
                <div className="px-4 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-300">
                  {(currentScene?.npcConfigs || []).length > 0 ? (
                    currentScene?.npcConfigs.map(config => {
                      const npc = gameData.npcs[config.npcId];
                      if (!npc) return null;
                      const alreadyTalked = state.talkedToNpcIds.includes(config.npcId);
                      const isLocked = config.requiredItemId && !state.inventory.includes(config.requiredItemId) && !alreadyTalked;
                      return (
                        <button
                          key={config.npcId}
                          onClick={() => {
                            if (isLocked) {
                              setExamineMessage(t.lockedPath);
                              triggerShake();
                            } else {
                              startDialogue(config.npcId);
                            }
                          }}
                          className={`flex items-center gap-4 p-4 rounded-2xl bg-zinc-950/30 border border-white/5 transition-all group shadow-md w-full ${isLocked ? 'opacity-50 grayscale' : 'hover:border-red-600/50 hover:bg-red-950/20'}`}
                        >
                          <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 relative bg-black shrink-0">
                            <img src={npc.portraitUrl} className="w-full h-full object-cover" alt="Avatar" />
                            {isLocked && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col text-left overflow-hidden">
                            <span className={`text-sm font-bold transition-colors truncate ${isLocked ? 'text-zinc-500' : 'text-zinc-200 group-hover:text-white'}`}>{l(npc.name, lang)}</span>
                            <span className="text-[9px] text-zinc-600 uppercase tracking-tighter leading-none mt-1">
                              {isLocked ? t.lockedPath : t.clickToTalk}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-4 text-center text-zinc-700 text-[10px] uppercase font-bold tracking-widest">{lang === 'KO' ? '아무도 없습니다' : 'No suspects here'}</div>
                  )}
                </div>
              )}
            </div>

            <div id="inventory-section" className="border-b border-white/5">
              <button
                onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                className="w-full px-4 py-4 flex items-center justify-between hover:bg-white/5 transition-colors group"
              >
                <h3 className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest group-hover:text-zinc-300">{t.inventory}</h3>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`text-zinc-600 transition-transform duration-300 ${isInventoryOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
              </button>

              {isInventoryOpen && (
                <div className="px-4 pb-6 animate-in slide-in-from-top-2 duration-300">
                  <InventoryBar items={state.inventory.map(id => gameData.items[id]).filter(Boolean)} onCombine={handleCombineItems} onInspect={id => setState(p => ({ ...p, inspectedItemId: id }))} lang={lang} vertical />
                </div>
              )}
            </div>

            <div className="flex-1" />
          </div>

          <div className="bg-zinc-950 p-4 border-t border-white/5 space-y-4">
            <div className="px-5 py-2 flex items-center justify-between bg-zinc-900/30 rounded-xl mb-2">
              <span className="text-[7px] font-bold text-zinc-600 uppercase tracking-widest">{t.enableAiChat}</span>
              <input type="checkbox" checked={isAiOverrideEnabled} onChange={(e) => setIsAiOverrideEnabled(e.target.checked)} className="accent-red-600 w-3 h-3 cursor-pointer" />
            </div>

            <button
              id="accuse-button"
              onClick={() => {
                if (accusationPrerequisites.canAccuse) {
                  setIsAccusing(true);
                } else {
                  setExamineMessage(lang === 'KO' ? '결정적인 증거를 모두 모아야 범인을 지목할 수 있습니다.' : 'Collect all crucial evidence before accusing.');
                  triggerShake();
                }
              }}
              className={`w-full py-3 rounded-xl text-[8px] font-bold uppercase tracking-[0.2em] transition-all shadow-lg flex items-center justify-center gap-2 group ${accusationPrerequisites.canAccuse
                ? 'bg-red-600 text-white hover:bg-red-500 animate-pulse'
                : 'bg-zinc-900 border border-white/5 text-zinc-600 opacity-60'
                }`}
            >
              {!accusationPrerequisites.canAccuse && (
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              )}
              {t.makeAccusation}
            </button>
          </div>
        </aside>

        <section className="flex-1 relative flex flex-col items-center justify-center p-4 bg-black overflow-hidden">

          {/* Top Bar: Always at the top of the screen */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-30 pointer-events-none bg-gradient-to-b from-black/80 to-transparent">
            {/* Left: BGM & Exit */}
            <div className="flex items-center gap-3 pointer-events-auto">
              <button
                onClick={onBackToHome}
                className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-full text-white transition-all group"
                title={t.backToHome}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              </button>
              <BgmPlayer url={activeBgmUrl} lang={lang} />
            </div>

            {/* Right: Clues */}
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
              <div className="bg-black/40 backdrop-blur-md border border-white/10 px-6 py-2 rounded-2xl shadow-lg flex items-center gap-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t.cluesFound}</span>
                <div className="flex items-end gap-1.5">
                  <span className="text-2xl font-bold text-white mystery-font leading-none">{accusationPrerequisites.current}</span>
                  <span className="text-xs text-zinc-500 font-bold mb-0.5">/ {accusationPrerequisites.total}</span>
                </div>
              </div>
              {accusationPrerequisites.canAccuse && (
                <div className="bg-red-600 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse shadow-lg shadow-red-600/30">
                  {lang === 'KO' ? '범인 지목 가능' : 'Ready to Accuse'}
                </div>
              )}
            </div>
          </div>

          {/* Game Stage Container - Enforces Aspect Ratio */}
          <div id="game-stage" className="relative w-full max-w-full max-h-full aspect-video mx-auto bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/5">

            {currentScene?.imageUrl && <img src={currentScene.imageUrl} className="w-full h-full" alt="Scene" draggable="false" />}

            {visibleHotspots.map((hs) => (
              <button
                key={hs.id}
                onClick={() => triggerAction(hs)}
                className="absolute group z-10 cursor-pointer outline-none"
                style={{ left: `${hs.x}%`, top: `${hs.y}%`, width: `${hs.width}%`, height: `${hs.height}%` }}
              >
                <div className="w-full h-full transition-all rounded-lg hover:bg-white/[0.02]" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-1.5 h-1.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-sm shadow-white/50"></div>
                </div>
              </button>
            ))}

            {activePuzzleHs && (
              <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
                <div className="max-w-md w-full bg-[#121212] border border-white/10 p-10 rounded-[2.5rem] shadow-2xl relative animate-in zoom-in duration-500">
                  <button onClick={() => setActivePuzzleHs(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                  <div className="flex flex-col gap-8 text-center">
                    <div className="space-y-2">
                      <h3 className="mystery-font text-3xl font-bold text-white">{l(activePuzzleHs.label, lang)}</h3>
                      <p className="text-zinc-500 text-sm mystery-font italic">{l(activePuzzleHs.puzzlePrompt, lang)}</p>
                    </div>
                    <form onSubmit={handlePuzzleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <input
                          autoFocus
                          value={puzzleInput}
                          onChange={(e) => {
                            setPuzzleInput(e.target.value);
                            if (puzzleError) setPuzzleError(null);
                          }}
                          className={`w-full bg-zinc-950 border rounded-2xl px-6 py-4 text-2xl text-center text-white font-mono tracking-widest outline-none transition-all ${puzzleError ? 'border-red-600 ring-4 ring-red-600/20' : 'border-white/10 focus:border-red-600'}`}
                          placeholder="..."
                        />
                        {puzzleError && (
                          <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-1 duration-300">
                            {puzzleError}
                          </p>
                        )}
                      </div>
                      <button type="submit" className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest text-xs">{t.submit}</button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {(examineMessage || examineHs) && (
              <div className="absolute inset-0 z-50 flex items-center justify-center p-8 lg:p-12 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="max-w-2xl w-full bg-[#121212] border border-red-900/40 p-8 lg:p-10 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">{t.examine}</span>
                  </div>
                  <div className="space-y-6">
                    {!showHsDetail ? (
                      <p className="text-zinc-100 text-xl mystery-font leading-relaxed italic animate-in fade-in duration-300">
                        {examineMessage || l(examineHs?.successMessage, lang)}
                      </p>
                    ) : (
                      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black/40 animate-in zoom-in duration-500 shadow-inner ring-1 ring-white/5">
                        <img src={examineHs?.detailImageUrl} className="w-full h-full object-contain" alt="Detailed View" draggable="false" />
                      </div>
                    )}
                    {examineHs?.revealsHotspotIds && examineHs.revealsHotspotIds.length > 0 && (
                      <div className="pt-4 border-t border-white/5 space-y-3">
                        <div className="flex flex-col gap-3">
                          {examineHs.revealsHotspotIds.map(hid => {
                            const linkedHs = currentScene.hotspots.find(h => h.id === hid);
                            if (!linkedHs) return null;
                            const isLocked = linkedHs.requiredItemId && !state.inventory.includes(linkedHs.requiredItemId);
                            return (
                              <button
                                key={hid}
                                onClick={() => {
                                  if (isLocked) {
                                    triggerShake();
                                    return;
                                  }
                                  setExamineMessage(null); setExamineHs(null); setShowHsDetail(false);
                                  triggerAction(linkedHs);
                                }}
                                className={`w-full flex items-center justify-between p-5 rounded-[1.5rem] transition-all group shadow-xl border ${isLocked ? 'bg-zinc-900 border-white/5 opacity-60 cursor-not-allowed' : 'bg-red-600/10 border-red-500/20 hover:bg-red-600 hover:text-white hover:border-red-500'}`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`w-2 h-2 rounded-full ${isLocked ? 'bg-zinc-700' : 'bg-red-500 group-hover:bg-white shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
                                  <span className="mystery-font text-xl font-bold">{l(linkedHs.label, lang)}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      {examineHs?.detailImageUrl && (
                        <button
                          onClick={() => setShowHsDetail(!showHsDetail)}
                          className="flex-1 py-4 bg-zinc-800 border border-white/10 text-[11px] font-bold text-zinc-300 rounded-xl hover:bg-zinc-700 transition-all uppercase tracking-widest shadow-lg"
                        >
                          {showHsDetail ? t.goBack : t.viewDetail}
                        </button>
                      )}
                      <button
                        onClick={() => { setExamineMessage(null); setExamineHs(null); setShowHsDetail(false); }}
                        className="flex-1 py-4 bg-zinc-900 border border-white/5 text-[11px] font-bold text-zinc-500 rounded-xl hover:text-white hover:bg-zinc-800 transition-all uppercase tracking-widest shadow-lg"
                      >
                        [ {t.closeDetail} ]
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {inspectedItem && (
              <div className="absolute inset-0 z-[80] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="max-w-2xl w-full bg-[#0f0f0f] border border-white/10 p-10 rounded-[2.5rem] shadow-2xl relative">
                  <button onClick={() => { setState(p => ({ ...p, inspectedItemId: null })); setShowItemDetail(false); }} className="absolute top-6 right-6 text-zinc-600 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                  <div className="flex flex-col items-center gap-8 text-center">
                    {!showItemDetail ? (
                      <>
                        <div className="w-48 h-48 bg-zinc-900 border border-white/5 rounded-3xl p-8 shadow-inner animate-in zoom-in duration-500">
                          <img src={inspectedItem.iconUrl} className="w-full h-full object-contain p-4" alt="Item" draggable="false" />
                        </div>
                        <div className="space-y-4">
                          <h3 className="mystery-font text-4xl font-bold text-white">{l(inspectedItem.name, lang)}</h3>
                          <p className="text-zinc-500 text-base italic mystery-font max-w-lg leading-relaxed">{l(inspectedItem.description, lang)}</p>
                        </div>
                      </>
                    ) : (
                      <div className="w-full aspect-video rounded-3xl overflow-hidden bg-black/40 border border-white/5 animate-in zoom-in duration-500 shadow-2xl">
                        <img src={inspectedItem.detailImageUrl} className="w-full h-full object-contain" alt="Detailed View" />
                      </div>
                    )}
                    {inspectedItem.detailImageUrl && (
                      <button
                        onClick={() => setShowItemDetail(!showItemDetail)}
                        className="px-12 py-3 bg-red-600/10 border border-red-500/20 text-red-500 hover:bg-red-600 hover:text-white rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all"
                      >
                        {showItemDetail ? t.goBack : t.viewDetail}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {obtainedItem && (
              <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="flex flex-col items-center gap-8 animate-in zoom-in duration-500 scale-110">
                  <div className="relative"><div className="absolute inset-0 bg-red-600 blur-3xl opacity-20 animate-pulse"></div><div className="w-48 h-48 bg-zinc-900 border-2 border-red-500/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden"><img src={obtainedItem.iconUrl} className="w-full h-full object-contain p-4" alt="Item" /></div></div>
                  <div className="text-center space-y-2"><span className="text-red-500 text-[10px] font-bold uppercase tracking-[0.5em]">{lang === 'KO' ? '새로운 단서 획득' : 'NEW CLUE FOUND'}</span><h3 className="mystery-font text-4xl font-bold text-white">{l(obtainedItem.name, lang)}</h3></div>
                  <button onClick={() => setObtainedItem(null)} className="px-12 py-3 bg-white text-black font-bold rounded-full hover:bg-red-600 hover:text-white transition-all shadow-xl uppercase tracking-widest text-[10px]">{lang === 'KO' ? '수첩에 추가됨' : 'Added to notebook'}</button>
                </div>
              </div>
            )}

            {activeNPC && activeDialogueNode && (
              <DialogueBox npc={activeNPC} node={activeDialogueNode} onOptionClick={handleDialogueOption} onClose={() => setState(p => ({ ...p, activeDialogueNpcId: null, activeDialogueNodeId: null }))} inventory={state.inventory} items={gameData.items} lang={lang} gameTitle={gameData.title} currentScene={currentScene} isAiEnabled={isAiOverrideEnabled && (activeNPC.useAiOnlyChat !== false)} />
            )}

            {isAccusing && (
              <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-8 lg:p-12 animate-in fade-in duration-300">
                <div className="max-w-4xl w-full text-center space-y-8 lg:space-y-12">
                  <div className="space-y-4"><h2 className="mystery-font text-5xl font-bold text-white uppercase tracking-tight">{t.makeAccusation}</h2><p className="text-red-500 text-xs font-bold uppercase tracking-widest animate-pulse">{t.accusationWarning}</p></div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
                    {(Object.values(gameData.npcs) as NPC[]).map(npc => (
                      <button key={npc.id} onClick={() => handleAccuse(npc.id)} className="group flex flex-col items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-red-600 hover:bg-red-950/20 transition-all">
                        <div className="aspect-square w-full rounded-xl overflow-hidden grayscale group-hover:grayscale-0 transition-all"><img src={npc.portraitUrl} className="w-full h-full object-cover" alt={l(npc.name, lang)} /></div>
                        <span className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors mystery-font">{l(npc.name, lang)}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setIsAccusing(false)} className="px-8 py-2 bg-zinc-800 text-zinc-500 rounded-full text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors">{t.goBack}</button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Tutorial Overlay */}
        {showTutorial && <TutorialOverlay lang={lang} onFinish={finishTutorial} />}
      </div>
    </DndProvider>
  );
};

export default GamePlayer;
