
import { GoogleGenAI, Type } from "@google/genai";
import { VisualStyle, GameData, Scene, Item, NPC, Hotspot, CaseConclusion, Localized, AIModelTier, DialogueNode } from "../types";
import { STYLE_PRESETS } from "../constants";
import { Language } from "../translations";
import { AIManager } from "./aiManager";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;

export interface GameBlueprint {
  title: Localized;
  characters: Localized;
  plot: Localized;
  complexity: Localized;
}

export class GeminiService {
  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async callWithRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const isRateLimit = error?.message?.includes('429') || error?.status === 429 || error?.message?.includes('RESOURCE_EXHAUSTED');

        if (isRateLimit && i < retries - 1) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, i);
          console.warn(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
          await this.sleep(delay);
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  async translateText(text: string, targetLang: 'English' | 'Korean'): Promise<string> {
    if (!text || text.trim() === "") return "";
    return this.callWithRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: AIManager.getActiveKey() });
      const prompt = `You are a professional localizer for noir mystery games.
      Translate the following content into ${targetLang}. 
      RULES:
      1. Maintain a mysterious, sophisticated, and dramatic tone.
      2. For character dialogue, preserve their specific personality and social status.
      3. If translating to Korean, use appropriate politeness levels (Honorifics) if the character seems formal.
      4. If translating to English, use evocative and genre-appropriate vocabulary.
      5. Output ONLY the translated text. Do not add quotes, explanations, or metadata.

      Content to translate: "${text}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      return response.text.trim() || text;
    });
  }

  async generateImage(
    prompt: string,
    style: VisualStyle,
    type: 'SCENE' | 'ITEM' | 'NPC' = 'SCENE',
    contextData?: any,
    tier: AIModelTier = AIModelTier.FLASH
  ): Promise<string | null> {
    return this.callWithRetry(async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: AIManager.getActiveKey() });
        let context = STYLE_PRESETS[style];
        const forbiddenElements = " ABSOLUTELY NO TEXT. NO LETTERS. NO WORDS. NO LOGOS. Pure visual art only.";

        let specializedPrompt = prompt;
        const ratio = type === 'SCENE' ? '16:9' : type === 'NPC' ? '3:4' : '1:1';
        const model = tier === AIModelTier.PRO ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

        if (type === 'ITEM') {
          context += " Single object, centered, high quality asset.";
        } else if (type === 'NPC') {
          context += " Character portrait, head and shoulders shot, dramatic lighting.";
        } else if (type === 'SCENE') {
          context += " Cinematic environmental background illustration, wide angle view.";

          if (contextData?.hotspots && contextData.hotspots.length > 0) {
            const hsDescriptions = contextData.hotspots.map((hs: Hotspot) => {
              const labelStr = typeof hs.label === 'string' ? hs.label : (hs.label?.EN || hs.label?.KO || 'interactable point');
              const hPos = hs.x < 33 ? "on the left side" : hs.x > 66 ? "on the right side" : "in the center";
              const vPos = hs.y < 33 ? "top" : hs.y > 66 ? "bottom" : "middle";

              let objectDesc = "";
              if (hs.actionType === 'GOTO') objectDesc = `a prominent doorway or path to the next area`;
              else if (hs.actionType === 'TALK') objectDesc = `a character or NPC silhouette waiting`;
              else if (hs.actionType === 'GET_ITEM' || hs.actionType === 'EXAMINE') objectDesc = `a specific suspicious object like a ${labelStr}`;

              return `Clearly render ${objectDesc} at the ${vPos} ${hPos} of the image.`;
            }).join(" ");

            specializedPrompt = `${prompt}. Visual Layout: ${hsDescriptions}. Ensure every interactive element mentioned is visually distinct and matches its described position.`;
          }
        }

        const fullPrompt = `${context}${forbiddenElements} Subject: ${specializedPrompt}`;

        const response = await ai.models.generateContent({
          model: model,
          contents: { parts: [{ text: fullPrompt }] },
          config: {
            imageConfig: {
              aspectRatio: ratio as any,
              imageSize: tier === AIModelTier.PRO ? "1K" : undefined
            },
            tools: tier === AIModelTier.PRO ? [{ googleSearch: {} }] : undefined
          }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
        return null;
      } catch (error) {
        console.error("Image generation failed:", error);
        throw error;
      }
    });
  }

  async generateGameBlueprint(
    subject: string,
    length: string,
    answers: string[],
    lang: Language
  ): Promise<GameBlueprint> {
    return this.callWithRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: AIManager.getActiveKey() });
      const prompt = `Based on the following mystery theme and details, create a brief "Game Design Blueprint". 
      Theme: ${subject}
      Details: ${answers.join(" | ")}
      Length: ${length}
      
      Output exactly in JSON format:
      {
        "title": { "KO": "...", "EN": "..." },
        "characters": { "KO": "...", "EN": "..." },
        "plot": { "KO": "...", "EN": "..." },
        "complexity": { "KO": "...", "EN": "..." }
      }
      
      Focus on who the culprit might be, the key motive, and how the scale "${length}" will affect the complexity of the deduction board.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      return JSON.parse(response.text);
    });
  }

  async generateFullGameData(
    subject: string,
    length: string,
    answers: string[],
    tier: AIModelTier = AIModelTier.FLASH
  ): Promise<GameData> {
    return this.callWithRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: AIManager.getActiveKey() });
      const model = tier === AIModelTier.PRO ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

      const prompt = `Design a complete, high-quality point-and-click mystery game.
      Theme: ${subject}
      Context: ${answers.join(" | ")}
      Target Scale: ${length}
      
      MINIMUM ASSET COUNTS BASED ON SCALE:
      - If "Short": 2-3 Scenes, 2-3 NPCs, 2-3 Items. Simple alibis.
      - If "Medium": 4-5 Scenes, 4-5 NPCs, 4-5 Items. Each NPC must have a motive. Add 1-2 red herrings (misleading clues).
      - If "Long": 6+ Scenes, 6+ NPCs, 7+ Items. Intricate web of lies. Cross-referencing alibis required. Nested logic (Item A opens Room B, which has Clue C needed for NPC D).
      
      CRITICAL DESIGN RULES:
      1. COMPLEXITY: Scale the difficulty of finding the killer according to "${length}". For Long cases, make alibis conflict and require deep investigation.
      2. VISUAL ANCHORING: For every Scene, define Hotspots with (x, y) coordinates (0-100). The "imagePrompt" MUST describe the objects at those coordinates.
      3. DIALOGUE: NPCs should have non-linear dialogue trees. Medium/Long cases should have dialogue options locked behind "requiredItem".
      4. KILLER: Exactly ONE NPC must be the killer ("isKiller": true). They must have a plausible but catchable lie in their "secretPersona".
      5. LOCALIZATION: All strings must be { "KO": "...", "EN": "..." }. Ensure EN translations are high quality and distinct from KO.
      
      JSON STRUCTURE:
      {
        "id": "case_id",
        "title": { "KO": "...", "EN": "..." },
        "startSceneId": "scene_start",
        "scenes": { 
          "id": { 
            "id", "name", "visualStyle", "imagePrompt", "descriptionText", 
            "hotspots": [
              { "id", "x", "y", "width", "height", "label": {KO, EN}, "actionType", "targetId", "requiredItemId", "successMessage": {KO, EN} }
            ], 
            "npcIds": [] 
          } 
        },
        "items": { "id": { "id", "name", "description", "imagePrompt", "isCrucialEvidence" } },
        "npcs": { "id": { "id", "name", "initialDialogueId", "dialogueTree", "isKiller", "secretPersona", "imagePrompt", "useAiOnlyChat": false } },
        "conclusion": { "mysterySolution", "successTitle", "successBody", "failureTitle", "failureBody" }
      }`;

      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      return JSON.parse(response.text);
    });
  }

  async npcChat(npc: NPC, scene: Scene, gameTitle: Localized, question: string, lang: Language, currentNode?: DialogueNode): Promise<string> {
    return this.callWithRetry(async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: AIManager.getActiveKey() });
        const npcName = typeof npc.name === 'string' ? npc.name : npc.name[lang];
        const gameTitleStr = typeof gameTitle === 'string' ? gameTitle : gameTitle[lang];
        const secret = npc.secretPersona ? (typeof npc.secretPersona === 'string' ? npc.secretPersona : npc.secretPersona[lang]) : "";

        let discoveryInstruction = "";
        if (npc.useAiOnlyChat && currentNode?.options && currentNode.options.length > 0) {
          const optionsDesc = currentNode.options.map((opt, idx) => `[ID:${idx}] "${opt.text[lang]}"`).join(", ");
          discoveryInstruction = `
            CURRENT DIALOGUE OPTIONS: ${optionsDesc}
            If the player's question or intent matches any of these options, fulfill it in your persona. 
            Crucially, if the intent is matched, you MUST end your response with exactly: [OPTION_TRIGGER:X] where X is the ID number.
            If multiple match, pick the most relevant one. If none match, do not add any trigger.
          `;
        }

        const systemInstruction = `
          You are ${npcName} in a mystery game "${gameTitleStr}". 
          Persona: ${secret}. 
          Current Setting: ${scene.name[lang]} - ${scene.descriptionText[lang]}.
          Respond to the player in ${lang === 'KO' ? 'Korean' : 'English'}. Keep it under 3 sentences. 
          Be consistent with your secret and defensive/cooperative state.
          ${discoveryInstruction}
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: question,
          config: { systemInstruction }
        });
        return response.text || "...";
      } catch (error) { throw error; }
    });
  }

  async generateStoryQuestions(subject: string, lang: 'KO' | 'EN'): Promise<string[]> {
    return this.callWithRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: AIManager.getActiveKey() });
      const prompt = `Based on the mystery theme "${subject}", generate 3 specific questions for the creator to deepen the plot. Output as JSON array of strings in ${lang}.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
      return JSON.parse(response.text);
    });
  }

  async generateStoryAnswers(subject: string, questions: string[], lang: 'KO' | 'EN'): Promise<string[]> {
    return this.callWithRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: AIManager.getActiveKey() });
      const prompt = `Theme: "${subject}". Answers for: 1. ${questions[0]} 2. ${questions[1]} 3. ${questions[2]}. Provide intriguing and consistent answers. Output as JSON array of 3 strings in ${lang}.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
      return JSON.parse(response.text);
    });
  }

  async generateConclusionLogic(gameTitle: Localized | string, lang: Language): Promise<CaseConclusion | null> {
    return this.callWithRetry(async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: AIManager.getActiveKey() });
        const titleStr = typeof gameTitle === 'string' ? gameTitle : gameTitle[lang];
        const prompt = `Generate case conclusion for "${titleStr}" as JSON: { "mysterySolution": {KO, EN}, "successTitle": {KO, EN}, "successBody": {KO, EN}, "failureTitle": {KO, EN}, "failureBody": {KO, EN} }`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
        return JSON.parse(response.text);
      } catch (error) { throw error; }
    });
  }
}

export const gemini = new GeminiService();
