
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
      const ai = new GoogleGenAI({ apiKey: AIManager.getGoogleKey() });
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
        const ai = new GoogleGenAI({ apiKey: AIManager.getGoogleKey() });
        let context = STYLE_PRESETS[style];
        const forbiddenElements = " ABSOLUTELY NO TEXT. NO LETTERS. NO WORDS. NO LOGOS. Pure visual art only.";

        let specializedPrompt = prompt;
        const ratio = type === 'SCENE' ? '16:9' : type === 'NPC' ? '3:4' : '1:1';
        const model = tier === AIModelTier.PRO ? 'gemini-3-pro-image-preview' : 'gemini-3.1-flash-image-preview';

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
      const ai = new GoogleGenAI({ apiKey: AIManager.getGoogleKey() });
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
      const ai = new GoogleGenAI({ apiKey: AIManager.getGoogleKey() });
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
        const ai = new GoogleGenAI({ apiKey: AIManager.getGoogleKey() });
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
      const ai = new GoogleGenAI({ apiKey: AIManager.getGoogleKey() });
      const prompt = `Based on the mystery theme "${subject}", generate 3 specific questions for the creator to deepen the plot. Output as JSON array of strings in ${lang}.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
      return JSON.parse(response.text);
    });
  }

  async generateStoryAnswers(subject: string, questions: string[], lang: 'KO' | 'EN'): Promise<string[]> {
    return this.callWithRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: AIManager.getGoogleKey() });
      const prompt = `Theme: "${subject}". Answers for: 1. ${questions[0]} 2. ${questions[1]} 3. ${questions[2]}. Provide intriguing and consistent answers. Output as JSON array of 3 strings in ${lang}.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
      return JSON.parse(response.text);
    });
  }

  async generateConclusionLogic(gameTitle: Localized | string, lang: Language): Promise<CaseConclusion | null> {
    return this.callWithRetry(async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: AIManager.getGoogleKey() });
        const titleStr = typeof gameTitle === 'string' ? gameTitle : gameTitle[lang];
        const prompt = `Generate case conclusion for "${titleStr}" as JSON: { "mysterySolution": {KO, EN}, "successTitle": {KO, EN}, "successBody": {KO, EN}, "failureTitle": {KO, EN}, "failureBody": {KO, EN} }`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
        return JSON.parse(response.text);
      } catch (error) { throw error; }
    });
  }

  async generateQuickModeMystery(idea: string, style?: string, difficulty?: string): Promise<{ title: string, imagePrompt: string, surfaceStory: string, hiddenTruth: string }> {
    return this.callWithRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: AIManager.getGoogleKey() });

      const styleInstructions: Record<string, string> = {
        casual: `STYLE: Casual & Family-Friendly.
- Target audience: all ages including children and students.
- No death, murder, violence, or adult content. Keep it warm and wholesome.
- Everyday settings: school, family, pets, neighborhood, hobbies.
- Tone: light, curious, heartwarming.`,
        mystery: `STYLE: Dark Mystery & Psychological Thriller.
- Classic dark "Turtle Soup" style with psychological depth.
- May involve death, crime, or disturbing revelations — tasteful but impactful.
- Surface story feels illogical and unsettling; hidden truth is shocking yet airtight.
- Tone: dark, suspenseful, intellectually tense.`,
        comic: `STYLE: Comedy & Witty Twist.
- The humor comes from a REALISTIC but hilariously unexpected explanation — not fantasy.
- No magic, no impossible technology, no talking animals. Real world only.
- The surface story should seem absurd; the hidden truth must be a clever, logical punchline grounded in everyday reality (misunderstanding, coincidence, wordplay, social situation).
- Good comic Turtle Soup example: "A man laughed out loud at a funeral. The family thanked him." → He was a professional funeral mourner hired by a family who had no other mourners.
- Tone: playful, witty, comedic — but always plausible.`,
        horror: `STYLE: Horror & Psychological Dread.
- No supernatural magic or fantasy. Horror must come from REAL human psychology, behavior, or situations.
- Allowed: serial killers, cults, isolation madness, paranoia, dark secrets, trauma.
- The surface story should feel deeply unsettling; the hidden truth should be genuinely disturbing but 100% real-world plausible.
- Tone: terrifying, oppressive, psychologically disturbing.`,
        scifi: `STYLE: Near-Future Sci-Fi.
- Grounded in plausible near-future or cutting-edge technology — NO magic, NO fantasy races, NO impossible physics.
- Allowed: AI, biotech, advanced robotics, space colonization, genetic engineering, VR.
- The hidden truth must be scientifically plausible, even if not yet real today.
- Tone: intellectual, wonder-filled, thought-provoking.`,
      };

      const styleKey = style && styleInstructions[style] ? style : 'mystery';
      const styleBlock = styleInstructions[styleKey];

      const difficultyInstructions: Record<string, string> = {
        easy: `DIFFICULTY: Easy.
- Surface story: Long and descriptive. Embed 2-3 subtle clues directly into the surface text so players can spot directions quickly.
- Hidden truth: Single, simple cause. Requires only 1-2 logical deduction steps.
- No red herrings or misleading details.
- The twist should feel like a pleasant "aha!" moment, not a shock.`,
        normal: `DIFFICULTY: Normal.
- Surface story: Medium length. A few suggestive details, but the key clues are not obvious.
- Hidden truth: 2-3 logical deduction steps with one non-obvious connection.
- One minor misleading detail is acceptable.
- Classic Turtle Soup feel — satisfying to solve with focused questioning.`,
        hard: `DIFFICULTY: Hard.
- Surface story: Short and dry. Minimal information given. Every word is deliberate.
- Hidden truth: 4+ logical deduction steps. Multiple facts must be connected to reach the answer.
- Include 1-2 intentional red herrings that seem relevant but lead nowhere.
- The answer should feel surprising even after all the questioning, yet perfectly logical in hindsight.`,
      };

      const diffKey = difficulty && difficultyInstructions[difficulty] ? difficulty : 'normal';
      const diffBlock = difficultyInstructions[diffKey];

      const prompt = `You are a master creator of "Turtle Soup" (lateral thinking) puzzles.
      Based on the following seed idea: "${idea}"

      === ABSOLUTE RULES (apply to ALL styles and difficulties — never break these) ===
      1. REALISM IS MANDATORY. The hidden truth must be something that could actually happen in the real world. No magic, no impossible technology, no fantasy elements unless the style explicitly allows near-future sci-fi.
      2. LOGICAL CONSISTENCY. Every detail in the surface story must be fully explainable by the hidden truth. A player asking Yes/No questions must be able to deduce the answer through logic alone.
      3. NO WORDPLAY TRICKS. Do not hide the answer behind a trick definition. The twist must come from a REAL misunderstanding of context, perspective, or circumstance.
      4. FALSIFIABILITY. The hidden truth must be specific enough that the AI can clearly answer YES or NO to any reasonable player question.
      5. STYLE SHAPES TONE ONLY. The selected style changes the emotional tone — it never overrides the realism rule.

      === SELECTED STYLE ===
      ${styleBlock}

      === SELECTED DIFFICULTY ===
      ${diffBlock}

      Create a complete Turtle Soup puzzle in Korean following all rules above.
      Output ONLY valid JSON in this exact format:
      {
        "title": "A catchy title for the mystery (Korean)",
        "surfaceStory": "The surface story presented to the player. Apply the difficulty rules strictly for length and embedded clues. Match the style tone. (Korean)",
        "hiddenTruth": "The complete hidden truth. Must be realistic and logically airtight. Apply the difficulty rules strictly for complexity. Match the style tone. (Korean)",
        "imagePrompt": "An English prompt for an AI image generator illustrating the surface story scene. Match the style tone. (English)"
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      return JSON.parse(response.text);
    });
  }

  async askQuickModeQuestion(question: string, surfaceStory: string, hiddenTruth: string, difficulty?: string): Promise<{ status: 'yes'|'no'|'irrelevant'|'close', message: string }> {
    return this.callWithRetry(async () => {
      const googleKey = AIManager.getGoogleKey();
      if (!googleKey) throw new Error('Google API 키가 없습니다. 스튜디오 → 설정(Settings)에서 Google Gemini API 키를 입력해주세요.');
      const ai = new GoogleGenAI({ apiKey: googleKey });

      const gmRules: Record<string, string> = {
        easy: `GM DIFFICULTY RULES (Easy):
- Be generous with the 'close' status. If the player is on the right track even partially, answer 'close'.
- For 'yes' answers, you may add one short encouraging hint in the message to nudge the player in the right direction. Keep it subtle.
- Avoid 'irrelevant' unless the question is truly unrelated. When borderline, lean toward 'yes' or 'no'.`,
        normal: `GM DIFFICULTY RULES (Normal):
- Standard judging. Answer 'close' only when the player correctly identifies a major part of the truth.
- Give pure yes/no/irrelevant/close responses with no extra hints.
- Be fair and consistent.`,
        hard: `GM DIFFICULTY RULES (Hard):
- Be strict. Answer 'close' only when the player has essentially identified the core of the hidden truth — not just a component.
- Never add hints or encouraging words beyond the bare minimum response.
- For borderline questions, lean toward 'irrelevant' rather than giving free information.
- Your tone should be cold, terse, and unreadable.`,
      };

      const gmRule = gmRules[difficulty || 'normal'] || gmRules['normal'];

      const prompt = `You are a Game Master for a "Turtle Soup" (lateral thinking) puzzle.

      SURFACE STORY (Player knows this): "${surfaceStory}"
      HIDDEN TRUTH (Player must guess this): "${hiddenTruth}"

      THE PLAYER ASKS: "${question}"

      CORE RULES:
      1. Answer strictly based on whether the player's question is true or false according to the HIDDEN TRUTH.
      2. If the question is not mentioned in or not logically deducible from the HIDDEN TRUTH, answer 'irrelevant'.
      3. If the question correctly identifies a major part of the HIDDEN TRUTH, answer 'close'.

      ${gmRule}

      Output ONLY valid JSON in this exact format:
      {
        "status": "yes" | "no" | "irrelevant" | "close",
        "message": "A short Korean response fitting the status and difficulty tone."
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      return JSON.parse(response.text);
    });
  }

  async askQuickModeHint(surfaceStory: string, hiddenTruth: string, chatHistory: string): Promise<{ status: 'hint', message: string }> {
    return this.callWithRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: AIManager.getGoogleKey() });
      const prompt = `You are a helpful but mysterious Game Master for a "Turtle Soup" puzzle.
      
      SURFACE STORY (Player knows this): "${surfaceStory}"
      HIDDEN TRUTH (Player must guess this): "${hiddenTruth}"
      
      QUESTIONS ASKED SO FAR: 
      ${chatHistory || "None"}
      
      The player is stuck and requested a hint.
      Provide ONE subtle, mysterious clue in Korean that nudges them toward the HIDDEN TRUTH without giving away the direct answer.
      If they haven't asked many questions, give a very broad hint. If they've asked a lot, give a more specific hint.
      
      Output ONLY valid JSON in this exact format:
      {
        "status": "hint",
        "message": "The text of your hint in Korean."
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      return JSON.parse(response.text);
    });
  }

  async evaluateQuickModeSolution(surfaceStory: string, hiddenTruth: string, playerSolution: string): Promise<{ isCorrect: boolean, feedback: string }> {
    return this.callWithRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: AIManager.getGoogleKey() });
      const prompt = `You are the ultimate judge for a "Turtle Soup" mystery.
      
      SURFACE STORY (What the player saw originally): "${surfaceStory}"
      HIDDEN TRUTH (The actual full answer): "${hiddenTruth}"
      
      PLAYER'S FINAL DEDUCTION: "${playerSolution}"
      
      CRITICAL INSTRUCTION:
      Compare the PLAYER'S FINAL DEDUCTION against the HIDDEN TRUTH.
      Determine if the player has successfully deduced the core, crucial elements of the hidden truth. 
      They do not need to have every single minor detail perfect, but the absolute main twist/motive/cause must be present.
      
      Output ONLY valid JSON in this exact format:
      {
        "isCorrect": true | false,
        "feedback": "A short, atmospheric Korean message. If correct, confirm their brilliance and briefly restate the tragedy. If wrong, give a chilling warning that they missed the mark (e.g., '당신의 추리는 표면만 핥고 있습니다...')."
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      return JSON.parse(response.text);
    });
  }
}

export const gemini = new GeminiService();
