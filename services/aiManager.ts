import { VisualStyle } from '../types';
import { STYLE_PRESETS } from '../constants';

// Interfaces
export interface AIModelConfig {
    provider: 'google' | 'openai' | 'anthropic';
    modelId: string;
    apiKey: string;
}

export interface AIServiceResponse {
    text: string;
}

export interface GlobalAIConfig {
    keys: {
        google?: string;
        openai?: string;
        anthropic?: string;
    };
    activeModel: {
        provider: 'google' | 'openai' | 'anthropic';
        modelId: string;
    };
}

export const AI_MODELS = {
    google: [
        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
        { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
        { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' },
    ],
    openai: [
        { id: 'gpt-5.2', name: 'GPT-5.2' },
        { id: 'gpt-5.0-mini', name: 'GPT-5.0 Mini' },
    ],
    anthropic: [
        { id: 'claude-4-5-opus', name: 'Claude 4.5 Opus' },
        { id: 'claude-4-5-sonnet', name: 'Claude 4.5 Sonnet' },
    ]
};

export class AIManager {
    private static CONFIG_KEY = 'mc_ai_config';

    static getConfig(): GlobalAIConfig {
        const defaultModel = { provider: 'google' as const, modelId: 'gemini-3-flash-preview' };

        try {
            const saved = localStorage.getItem(this.CONFIG_KEY);
            if (!saved) return { keys: {}, activeModel: defaultModel };

            const config = JSON.parse(saved);

            // Validation: Ensure the provider and modelId exist in our allowed lists
            const { provider, modelId } = config.activeModel;
            const isValidProvider = provider in AI_MODELS;
            const isValidModel = isValidProvider && (AI_MODELS as any)[provider].some((m: any) => m.id === modelId);

            if (!isValidProvider || !isValidModel) {
                console.warn(`Invalid AI model configuration detected (${provider}/${modelId}). Resetting to default.`);
                return { ...config, activeModel: defaultModel };
            }

            return config;
        } catch (e) {
            console.error("Failed to load AI config:", e);
            return { keys: {}, activeModel: defaultModel };
        }
    }

    static saveConfig(config: GlobalAIConfig) {
        localStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
    }

    static getActiveKey(): string | null {
        const config = this.getConfig();
        const key = config.keys[config.activeModel.provider];
        // Fallback to env for google if not set in localStorage
        if (!key && config.activeModel.provider === 'google') {
            return (import.meta as any).env.VITE_GEMINI_API_KEY;
        }
        return key || null;
    }

    static async generateStoryConcepts(theme: string): Promise<string[]> {
        const prompt = `Based on the user's interest in "${theme}", first research the context, plot, or specific motifs related to this topic on the web. 
        Then, suggest 3 distinct, intriguing, and sophisticated mystery game concepts that are deeply inspired by the research.
        Each concept should have a unique setting, a core mystery hook, and a specific "vibe" (e.g., Cyberpunk Noir, Victorian Gothic, Modern Thriller).
        Ensure the concepts are high-quality and directly relevant to "${theme}".
        Output ONLY a JSON array of 3 strings. Each string should be a short paragraph describing the concept in KOREAN language.
        Do NOT include any English translations. Use the term "스토리보드" if referring to the plan.`;

        const response = await this.generateText(
            prompt,
            "You are a creative director for a top-tier mystery game studio. You specialize in web research to ground your ideas in reality or literature. You communicate strictly in Korean. 2026 version. No English allowed in output.",
            true,
            [{ google_search: {} }]
        );
        try {
            const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(clean);
        } catch (e) {
            console.error("Failed to parse concepts:", e);
            return [response];
        }
    }

    static async generateGameBlueprint(concept: string, style: VisualStyle): Promise<any> {
        const styleInstruction = STYLE_PRESETS[style] || "";
        const systemInstruction = `당신은 "Mystery Crafter" 프로젝트의 마스터 게임 디자이너입니다. (2026 Engine)
        사용자의 컨셉에 기반하여 포인트 앤 클릭 미스터리 게임의 "스토리보드"를 위한 완벽한 JSON 구조를 생성하세요.
        이 단계는 "개념 설계" 단계로, 전체적인 줄거리, 인물, 장소의 개요를 잡는 데 집중합니다.

        [비주얼 스타일 지정]
        핵심 비주얼 테마: "${styleInstruction}"

        [중요 지침]
        1. 모든 텍스트 필드는 반드시 다국어(KO, EN) 객체로 작성하세요. (예: "name": { "KO": "이름", "EN": "Name" })
        2. "스토리보드"라는 용어 사용.
        3. RAW JSON 결과만 출력. 마크다운 기호 금지.
        4. 이 단계에서는 구체적인 핫스팟은 빈 배열로 두고, 기본 구조에 집중하세요.
        5. 결과는 반드시 아래의 JSON 포맷을 정확히 지켜야 합니다.

        [JSON 구조 규칙]
        1. 모든 문자열 값 주변의 따옴표(")와 쉼표(,)를 문법적으로 완벽히 지키세요.
        2. 이외의 설명이나 불필요한 마크다운 백틱(\`\`\`)은 절대로 포함하지 마세요.
        3. 반환값은 순도 100%의 단일 JSON 객체여야 합니다.

        {
          "title": { "KO": "게임 제목", "EN": "Game Title" },
          "description": { "KO": "스토리 내용", "EN": "Story description" },
          "startSceneId": "scene_1",
          "scenes": {
            "scene_1": {
              "id": "scene_1",
              "name": { "KO": "거실", "EN": "Living Room" },
              "descriptionText": { "KO": "안락한 거실", "EN": "Cozy living room" },
              "hotspots": [],
              "npcIds": ["npc_1"]
            }
          },
          "npcs": {
            "npc_1": {
              "id": "npc_1",
              "name": { "KO": "김도진", "EN": "Dojin Kim" },
              "secretPersona": { "KO": "비밀...", "EN": "Secret..." },
              "isKiller": true
            }
          },
          "items": {
            "item_1": {
              "id": "item_1",
              "name": { "KO": "열쇠", "EN": "Key" },
              "description": { "KO": "설명...", "EN": "Description..." }
            }
          },
          "conclusion": {
            "mysterySolution": { "KO": "진상", "EN": "Truth" },
            "successBody": { "KO": "성공", "EN": "Success" },
            "failureBody": { "KO": "실패", "EN": "Fail" }
          }
        }
        (최소 장소 5개, 인물 4명(1명은 isKiller:true), 아이템 6개를 위 구조대로 생성하세요.)
        `;

        const response = await this.generateText(concept, systemInstruction, true);
        try {
            // 1차 추출: 백틱 및 양끝 공백 제거, 중첩 중괄호 추출
            let clean = response.replace(/^```(json)?|```$/gm, '').trim();
            const firstBrace = clean.indexOf('{');
            const lastBrace = clean.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                clean = clean.substring(firstBrace, lastBrace + 1);
            }

            // 2차 정제: 알려진 AI의 흔한 JSON 생성 오류(SyntaxError)를 정규식으로 복구
            // 오류 유형 1: "id": "scene_dock": "한강 지하 선착장" (연쇄 할당) -> "id": "scene_dock" 으로 자르기
            clean = clean.replace(/"id":\s*"([^"]+)"\s*:\s*"[^"]+"/g, '"id": "$1"');

            // 오류 유형 2: "id": "item_admin": { "KO": ... } ("name": 키 누락 후 객체 연달아 나옴) 
            // -> "id": "item_admin", "name": { "KO": ... } 로 삽입
            clean = clean.replace(/"id"\s*:\s*"([^"]+)"\s*:\s*\{/g, '"id": "$1",\n"name": {');

            // 예시 오류: 배열이나 객체 마지막 요소 뒤에 불필요한 쉼표
            clean = clean.replace(/,\s*([}\]])/g, '$1');

            return JSON.parse(clean);
        } catch (e: any) {
            console.error("Failed to parse storyboard blueprint:", e);
            console.error("RAW AI OUTPUT:", response);

            // 최후의 수단: 실패한 데이터라도 파싱을 시도할 수 있도록 가장 단순하게 재처리 시도
            try {
                // 따옴표 빠진 키 복구 시도 (매우 위험하지만 파싱 시도를 위해)
                let ultraClean = response.replace(/^```(json)?|```$/gm, '').trim();
                const firstBrace = ultraClean.indexOf('{');
                const lastBrace = ultraClean.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    ultraClean = ultraClean.substring(firstBrace, lastBrace + 1);
                }
                ultraClean = ultraClean.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":');
                ultraClean = ultraClean.replace(/,\s*([}\]])/g, '$1'); // trailing comma 제거

                // 오류 1 제거
                ultraClean = ultraClean.replace(/"id"\s*:\s*"([^"]+)"\s*:\s*"[^"]+"/g, '"id": "$1"');
                // 오류 2 ("name" 키 누락 복구)
                ultraClean = ultraClean.replace(/"id"\s*:\s*"([^"]+)"\s*:\s*\{/g, '"id": "$1",\n"name": {');

                return JSON.parse(ultraClean);
            } catch (fallbackError) {
                console.error("Fallback parsing also failed.");
                throw new Error(`AI가 생성한 데이터의 형식이 심하게 파손되었습니다 (Syntax Error). 다시 시도해주세요.\n상세 에러: ${e.message}`);
            }
        }
    }

    /**
     * 단계별 생성: 특정 장소의 핫스팟과 상호작용을 심층 생성합니다.
     */
    static async generateSceneDetails(scene: any, gameContext: any): Promise<any> {
        const styleInstruction = STYLE_PRESETS[gameContext.visualStyle] || "";
        const systemInstruction = `당신은 미스터리 게임의 레벨 디자이너입니다.
        주어진 장소(${scene.name.KO})를 심층적으로 설계하세요. 
        사용자가 "입력할 것이 너무 많다"고 느끼지 않도록, AI가 모든 세부 사항을 완벽하게 채워야 합니다.

        [상세 설계 요구사항]
        1. 핫스팟(hotspots): 최소 4개 이상 생성.
           - x, y 좌표 (0~100)를 논리적으로 배치.
           - actionType (GOTO, GET_ITEM, TALK, EXAMINE, PUZZLE)을 다양하게 활용.
           - label, successMessage 등을 흥미롭게 작성.
        2. 서브 액션(revealsHotspotIds): 조사를 통해 다른 조사 지점이 드러나는 복합 인터랙션을 포함하세요.
        3. 아이템 획득 및 필요 조건: 특정 아이템이 있어야 조사가 가능하거나, 조사를 통해 아이템을 획득하는 연결 고리를 만드세요.
        4. 비주얼 효과(visualEffect): 상황에 맞는 효과(SHAKE, FLASH 등)를 지정하세요.

        [JSON 구조 규칙]
        1. 모든 문자열 값 주변의 따옴표(")와 쉼표(,)를 문법적으로 완벽히 지키세요.
        2. 이외의 설명이나 불필요한 마크다운 백틱(\`\`\`)은 절대로 포함하지 마세요.
        3. 반환값은 순도 100%의 단일 JSON 객체여야 합니다. 
        4. 아래 JSON 포맷을 정확히 유지하세요. (반드시 핫스팟 최소 4개 포함)

        {
            "id": "해당_장소_아이디",
            "name": { "KO": "장소 이름", "EN": "Name" },
            "descriptionText": { "KO": "설명", "EN": "Description" },
            "hotspots": [
                {
                    "id": "hs_1",
                    "x": 20,
                    "y": 50,
                    "actionType": "TALK",
                    "label": { "KO": "대화하기", "EN": "Talk" },
                    "targetId": "npc_1",
                    "successMessage": { "KO": "NPC와 대화를 시작합니다.", "EN": "Talk started" },
                    "visualEffect": "NONE"
                }
            ],
            "npcIds": ["현재_장소의_기존_NPC배열_유지"]
        }

        [출력]
        수정된 scene 객체 하나만 JSON으로 반환하세요.
        `;

        const prompt = `
        게임 제목: ${gameContext.title.KO}
        전체 줄거리: ${gameContext.description.KO}
        현재 장소 정보: ${JSON.stringify(scene)}
        사용 가능한 전체 아이템 리스트: ${JSON.stringify(Object.keys(gameContext.items))}
        `;

        const response = await this.generateText(prompt, systemInstruction, true);
        try {
            let clean = response.replace(/^```(json)?|```$/gm, '').trim();
            const firstBrace = clean.indexOf('{');
            const lastBrace = clean.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                clean = clean.substring(firstBrace, lastBrace + 1);
            }

            // 알려진 JSON 흔한 오류 정제
            clean = clean.replace(/"id":\s*"([^"]+)"\s*:\s*"[^"]+"/g, '"id": "$1"');
            clean = clean.replace(/"id"\s*:\s*"([^"]+)"\s*:\s*\{/g, '"id": "$1",\n"name": {');
            clean = clean.replace(/,\s*([}\]])/g, '$1');

            return JSON.parse(clean);
        } catch (e: any) {
            console.error("Failed to parse scene details:", e);
            console.error("RAW AI OUTPUT (Scene):", response);

            // 최후 Fallback
            try {
                let ultraClean = response.replace(/^```(json)?|```$/gm, '').trim();
                const firstBrace = ultraClean.indexOf('{');
                const lastBrace = ultraClean.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    ultraClean = ultraClean.substring(firstBrace, lastBrace + 1);
                }
                ultraClean = ultraClean.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":');
                ultraClean = ultraClean.replace(/,\s*([}\]])/g, '$1');
                ultraClean = ultraClean.replace(/"id"\s*:\s*"([^"]+)"\s*:\s*"[^"]+"/g, '"id": "$1"');
                ultraClean = ultraClean.replace(/"id"\s*:\s*"([^"]+)"\s*:\s*\{/g, '"id": "$1",\n"name": {');
                return JSON.parse(ultraClean);
            } catch (fallbackError) {
                throw new Error(`장소 상세 설정 응답 포맷 오류(Syntax Error) 상세 에러: ${e.message}`);
            }
        }
    }

    /**
     * 단계별 생성: NPC와의 심층 대화 트리를 생성합니다.
     */
    static async generateNPCDialogue(npc: any, gameContext: any): Promise<any> {
        const systemInstruction = `당신은 시나리오 작가입니다. NPC(${npc.name.KO})와의 대화 트리를 정교하게 구축하세요.
        사용자가 선택지의 텍스트부터 다음 대화, 지급 아이템 등을 일일이 입력하지 않아도 되도록 상세하게 작성합니다.

        [대화 설계 요구사항]
        1. 다차원 트리: 최소 3단계 이상의 깊이를 가진 대화 흐름.
        2. 선택지(options): 각 노드마다 플레이어의 호기심을 자극하는 최소 3개의 선택지.
        3. 로직 연결:
           - nextNodeId: 대화 진행 연결.
           - rewardItemId: 특정 대화 후 아이템 지급.
           - requiredItems: 특정 아이템을 가지고 있어야 활성화되는 질문.
        4. 살인마 여부 및 비밀: NPC의 성격과 비밀을 대화 속에 은연중에 녹여내세요.

        [JSON 구조 규칙]
        1. 모든 문자열 값 주변의 따옴표(")와 쉼표(,)를 문법적으로 완벽히 지키세요.
        2. 이외의 설명이나 불필요한 마크다운 백틱(\`\`\`)은 절대로 포함하지 마세요.
        3. 반환값은 순도 100%의 단일 JSON 객체여야 합니다. 
        4. 아래 JSON 포맷을 정확히 유지하세요.

        {
            "id": "해당_npc_아이디",
            "name": { "KO": "이름", "EN": "Name" },
            "secretPersona": { "KO": "비밀", "EN": "Secret" },
            "isKiller": false,
            "dialogueTree": {
                "start": {
                    "id": "start",
                    "text": { "KO": "첫 대사", "EN": "First line" },
                    "options": [
                        {
                            "id": "opt_1",
                            "text": { "KO": "질문 1", "EN": "Question 1" },
                            "nextNodeId": "node_1"
                        }
                    ]
                },
                "node_1": {
                    "id": "node_1",
                    "text": { "KO": "답변 1", "EN": "Answer 1" },
                    "options": []
                }
            }
        }

        [출력]
        수정된 npc 객체 하나만 JSON으로 반환하세요.
        `;

        const prompt = `
        게임 배경: ${gameContext.description.KO}
        NPC 정보: ${JSON.stringify(npc)}
        전체 아이템 리스트: ${JSON.stringify(Object.keys(gameContext.items))}
        `;

        const response = await this.generateText(prompt, systemInstruction, true);
        try {
            let clean = response.replace(/^```(json)?|```$/gm, '').trim();
            const firstBrace = clean.indexOf('{');
            const lastBrace = clean.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                clean = clean.substring(firstBrace, lastBrace + 1);
            }

            clean = clean.replace(/"id":\s*"([^"]+)"\s*:\s*"[^"]+"/g, '"id": "$1"');
            clean = clean.replace(/"id"\s*:\s*"([^"]+)"\s*:\s*\{/g, '"id": "$1",\n"name": {');
            clean = clean.replace(/,\s*([}\]])/g, '$1');

            return JSON.parse(clean);
        } catch (e: any) {
            console.error("Failed to parse NPC dialogue:", e);
            console.error("RAW AI OUTPUT (NPC):", response);

            // 최후 Fallback
            try {
                let ultraClean = response.replace(/^```(json)?|```$/gm, '').trim();
                const firstBrace = ultraClean.indexOf('{');
                const lastBrace = ultraClean.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    ultraClean = ultraClean.substring(firstBrace, lastBrace + 1);
                }
                ultraClean = ultraClean.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":');
                ultraClean = ultraClean.replace(/,\s*([}\]])/g, '$1');
                ultraClean = ultraClean.replace(/"id"\s*:\s*"([^"]+)"\s*:\s*"[^"]+"/g, '"id": "$1"');
                ultraClean = ultraClean.replace(/"id"\s*:\s*"([^"]+)"\s*:\s*\{/g, '"id": "$1",\n"name": {');
                return JSON.parse(ultraClean);
            } catch (fallbackError) {
                throw new Error(`대화 생성 중 응답 포맷 오류(Syntax Error) 상세 에러: ${e.message}`);
            }
        }
    }

    /**
     * 자산(아이템, 장소)의 상세 설명을 AI가 생성합니다.
     */
    static async generateDescription(name: string, type: 'ITEM' | 'SCENE' | 'NPC', context: string): Promise<string> {
        const prompt = `이름: ${name}\n유형: ${type}\n게임 배경: ${context}\n위 정보를 바탕으로 이 ${type}에 대한 흥미롭고 미스테리한 상세 설명을 한국어로 1~2문장 작성하세요.`;
        const systemInstruction = "당신은 미스터리 게임 작가입니다. 짧고 강렬한 설명을 작성하세요. 마크다운 없이 순수 텍스트만 출력하세요.";
        return await this.generateText(prompt, systemInstruction, false);
    }

    /**
     * 자산의 이미지 생성을 위한 고해상도 프롬프트를 AI가 작성합니다.
     */
    static async generateImagePrompt(name: string, description: string, style: VisualStyle): Promise<string> {
        const styleInstruction = STYLE_PRESETS[style] || "";
        const prompt = `이름: ${name}\n설명: ${description}\n스타일: ${styleInstruction}\n위 내용을 바탕으로 이미지 생성을 위한 상세한 영어 프롬프트를 작성하세요. 비주얼적인 특징과 분위기 묘사에 집중하세요. 영어로만 출력하세요.`;
        const systemInstruction = "당신은 AI 이미지 프롬프트 엔지니어입니다. 예술적이고 구체적인 영문 프롬프트만 출력하세요.";
        return await this.generateText(prompt, systemInstruction, false);
    }

    static async refineGameBlueprint(originalData: any, refinementRequest: string): Promise<any> {
        const systemInstruction = `당신은 "Mystery Crafter"의 마스터 게임 디자이너입니다.
        기존의 스토리보드 데이터를 사용자의 요청에 따라 수정 및 발전시키세요.
        
        [수정 지침]
        1. 기존 JSON 구조를 유지하면서 내용을 확장하거나 수정하세요.
        2. 사용자의 요청 사항을 최우선으로 반영하세요 (예: 더 길게, 더 복잡하게, 더 많은 인원 추가 등).
        3. 모든 한국어 필드의 퀄리티를 유지하거나 더 높이세요.
        4. RAW JSON 결과만 출력하세요. 마크다운 기호를 포함하지 마세요.
        `;

        const prompt = `
        [기존 스토리보드 데이터]
        ${JSON.stringify(originalData, null, 2)}

        [사용자 수정 요청]
        "${refinementRequest}"

        위 요청사항을 기반으로 개선된 스토리보드 JSON을 생성해주세요.
        `;

        const response = await this.generateText(prompt, systemInstruction, true);
        try {
            const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(clean);
        } catch (e) {
            console.error("Failed to parse refined storyboard:", e);
            throw new Error("Failed to refine storyboard data. Please try again.");
        }
    }

    static async generateText(prompt: string, systemInstruction?: string, jsonMode: boolean = false, tools?: any[]): Promise<string> {
        const config = this.getConfig();
        const { provider, modelId } = config.activeModel;
        const apiKey = this.getActiveKey();

        if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
            throw new Error(`API Key for ${provider} is missing. Please configure it in Settings.`);
        }

        try {
            if (provider === 'google') {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                        tools: tools,
                        generationConfig: { responseMimeType: jsonMode ? "application/json" : "text/plain" }
                    })
                });
                const data = await response.json();
                if (data.error) {
                    if (data.error.code === 429) {
                        throw new Error("AI 요청 한도가 초과되었습니다. (Rate Limit)\n잠시(약 10~30초) 후에 다시 시도하거나, 설정에서 다른 모델로 변경해 보세요.");
                    }
                    throw new Error(data.error.message);
                }
                return data.candidates[0].content.parts[0].text;
            }

            if (provider === 'openai') {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: modelId,
                        messages: [
                            ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
                            { role: 'user', content: prompt }
                        ],
                        response_format: jsonMode ? { type: "json_object" } : undefined
                    })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                return data.choices[0].message.content;
            }

            if (provider === 'anthropic') {
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'anthropic-dangerous-direct-browser-access': 'true'
                    },
                    body: JSON.stringify({
                        model: modelId,
                        system: systemInstruction,
                        messages: [{ role: 'user', content: prompt }],
                        max_tokens: 4096
                    })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                return data.content[0].text;
            }

            throw new Error(`Provider ${provider} not implemented`);
        } catch (e: any) {
            console.error("AI Generation Failed:", e);
            throw new Error(e.message || "AI Generation Failed");
        }
    }

    static async validateAPIKey(provider: 'google' | 'openai' | 'anthropic', apiKey: string, modelId: string): Promise<boolean> {
        if (!apiKey) throw new Error("API Key is required for validation.");

        try {
            if (provider === 'google') {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: "Hello, validate this key." }] }],
                        generationConfig: { maxOutputTokens: 1 }
                    })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                return true;
            }

            if (provider === 'openai') {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: modelId,
                        messages: [{ role: 'user', content: 'Say hi' }],
                        max_tokens: 1
                    })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                return true;
            }

            if (provider === 'anthropic') {
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'anthropic-dangerous-direct-browser-access': 'true'
                    },
                    body: JSON.stringify({
                        model: modelId,
                        messages: [{ role: 'user', content: 'Hi' }],
                        max_tokens: 1
                    })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                return true;
            }

            return false;
        } catch (e: any) {
            console.error(`${provider} API Key validation failed:`, e);
            throw e;
        }
    }
}
