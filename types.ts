
export enum VisualStyle {
  FILM_NOIR = 'film_noir',
  NEO_NOIR = 'neo_noir',
  WATERCOLOR = 'watercolor',
  DIGITAL_PAINTING = 'digital_painting',
  LIGNE_CLAIRE = 'ligne_claire',
  FLAT_VECTOR = 'flat_vector',
}

export enum AIModelTier {
  FLASH = 'FLASH',
  PRO = 'PRO',
}

export type Localized = {
  KO: string;
  EN: string;
};

export interface Hotspot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: Localized;
  actionType: 'GOTO' | 'GET_ITEM' | 'TALK' | 'EXAMINE' | 'INPUT_PUZZLE';
  targetId?: string;
  requiredItemId?: string;
  conditionFlag?: string;
  successMessage?: Localized;
  itemMissingMessage?: Localized; // Custom message when required item is missing
  setFlag?: string;
  isEnding?: boolean;
  endingType?: 'SUCCESS' | 'FAILURE';
  visualEffect?: 'NONE' | 'SHAKE' | 'FLASH';
  // Detailed view fields
  detailImageUrl?: string;
  detailImagePrompt?: string;
  // Linked interaction fields
  initialHidden?: boolean;
  revealsHotspotIds?: string[];
  isSubAction?: boolean; // If true, doesn't render on the main scene image
  // Puzzle specific fields
  puzzleAnswer?: string;
  puzzlePrompt?: Localized;
  failureMessage?: Localized;
}

export interface SceneExit {
  id: string;
  targetSceneId: string;
  label: Localized;
  requiredItemId?: string;
}

export interface SceneNPC {
  npcId: string;
  requiredItemId?: string;
}

export interface DialogueNode {
  id: string;
  text: Localized;
  isEnding?: boolean;
  endingType?: 'SUCCESS' | 'FAILURE';
  options: {
    text: Localized;
    nextNodeId?: string;
    requiredItems?: string[];
    rewardItemId?: string;
    setFlag?: string;
    isCluePresentation?: boolean;
  }[];
}

export interface NPC {
  id: string;
  name: Localized;
  portraitUrl?: string;
  imagePrompt?: string;
  initialDialogueId: string;
  dialogueTree: Record<string, DialogueNode>;
  isKiller?: boolean;
  secretPersona?: Localized;
  useAiOnlyChat?: boolean;
}

export interface Item {
  id: string;
  name: Localized;
  description: Localized;
  imagePrompt?: string;
  iconUrl?: string;
  detailImageUrl?: string;
  detailImagePrompt?: string;
  combinableWith?: string;
  resultItemId?: string;
  isCrucialEvidence?: boolean;
}

export interface Scene {
  id: string;
  name: Localized;
  visualStyle: VisualStyle;
  imageUrl?: string;
  imagePrompt: string;
  descriptionText: Localized;
  bgmId?: string;
  hotspots: Hotspot[];
  exits?: SceneExit[];
  npcIds: string[];
  npcConfigs?: SceneNPC[];
}

export interface CaseConclusion {
  mysterySolution: Localized;
  successTitle: Localized;
  successBody: Localized;
  failureTitle: Localized;
  failureBody: Localized;
}

export interface GameData {
  id: string;
  title: Localized;
  description?: Localized;
  visualStyle: VisualStyle;
  startSceneId: string;
  scenes: Record<string, Scene>;
  items: Record<string, Item>;
  npcs: Record<string, NPC>;
  initialFlags: Record<string, boolean>;
  conclusion?: CaseConclusion;
  globalBgmUrl?: string;
}

export interface GameState {
  currentSceneId: string;
  sceneHistory: string[];
  inventory: string[];
  flags: Record<string, boolean>;
  activeDialogueNpcId: string | null;
  activeDialogueNodeId: string | null;
  inspectedItemId: string | null;
  revealedHotspotIds?: string[];
  solvedHotspotIds?: string[]; // Track solved puzzles or triggered interactions
  visitedSceneIds: string[];
  talkedToNpcIds: string[];
  isGameFinished: boolean;
  endingType?: 'SUCCESS' | 'FAILURE';
}
