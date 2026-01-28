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
        { id: 'gemini-3.0-flash', name: 'Gemini 3.0 Flash (2026 Standard)' },
        { id: 'gemini-3.0-pro', name: 'Gemini 3.0 Pro (2026 Standard)' },
        { id: 'gemini-3.0-ultra', name: 'Gemini 3.0 Ultra (High Precision)' },
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
        const defaultModel = { provider: 'google' as const, modelId: 'gemini-3.0-flash' };

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

        [비주얼 스타일 지정]
        이번 게임의 핵심 비주얼 테마는 다음과 같습니다: "${styleInstruction}"
        모든 장소(scenes), 아이템(items), 인물(npcs)의 "imagePrompt" 필드를 작성할 때 이 스타일을 최우선으로 반영하여 상세하게 묘사하세요.

        [중요 지침]
        1. 모든 텍스트 필드(KO)는 반드시 한국어로 작성해야 합니다.
        2. "EN" 필드는 영문 번역을 제공합니다.
        3. "Blueprint" 또는 "청사진"이라는 단어 대신 "스토리보드"를 사용하세요.
        4. 미스터리의 품질과 문학적 수준을 고려하여 한국어 텍스트를 정교하게 작성하세요.
        5. RAW JSON 결과만 출력하세요. 마크다운 기호(예: \`\`\`json)를 절대 포함하지 마세요.

        [스토리보드 구성 요구사항]
        - 장소(scenes): 최소 6개 이상. 각 장소는 서로 유기적으로 연결되어야 합니다.
        - 장면당 상호작용: 각 장면은 반드시 다음을 포함해야 합니다.
            - 최소 3개 이상의 핫스팟 (조사, 퍼즐, 액션 포함).
            - 해당 장소에 등장하는 NPC 목록 (npcIds).
            - 다른 장소로 이어지는 이동 경로 (NAVIGATE 타입의 핫스팟).
        - 인물(npcs): 최소 5명 이상. 각 인물은 고유한 비밀 페르소나와 알리바이를 가져야 합니다.
        - 다차원 대화 시스템: 각 NPC의 dialogueTree는 다음을 준수해야 합니다.
            - 최소 3개 이상의 대화 노드 (서로 다른 질문/답변 흐름).
            - 각 노드당 최소 3개 이상의 플레이어 선택지(options).
        - 아이템(items): 최소 10개 이상 (핵심 단서, 방해 아이템, 조합 아이템 포함).

        [JSON 구조 예시]
        {
            "id": "game_<timestamp>",
            "title": { "KO": "제목", "EN": "Title" },
            "description": { "KO": "설명", "EN": "Description" },
            "visualStyle": "${style}",
            "startSceneId": "scene_1",
            "scenes": {
                "scene_1": {
                    "id": "scene_1",
                    "name": { "KO": "장소 이름", "EN": "Name" },
                    "imagePrompt": "Style: ${styleInstruction}. Detailed scene description...",
                    "descriptionText": { "KO": "설명", "EN": "Desc" },
                    "hotspots": [
                        { "id": "hs_1", "x": 20, "y": 30, "label": { "KO": "조사", "EN": "Examine" }, "actionType": "EXAMINE" },
                        { "id": "hs_2", "x": 50, "y": 50, "label": { "KO": "퍼즐", "EN": "Puzzle" }, "actionType": "PUZZLE" },
                        { "id": "hs_3", "x": 80, "y": 70, "label": { "KO": "이동", "EN": "Move" }, "actionType": "NAVIGATE", "nextNodeId": "scene_2" }
                    ],
                    "npcIds": ["npc_1"]
                }
            },
            "npcs": {
                "npc_1": {
                    "id": "npc_1",
                    "name": { "KO": "이름", "EN": "Name" },
                    "dialogueTree": {
                        "start": { 
                            "id": "start", "text": {"KO": "인사", "EN": "Hi"}, 
                            "options": [
                                { "text": {"KO": "질문 1", "EN": "Ask 1"}, "nextNodeId": "node_2" },
                                { "text": {"KO": "질문 2", "EN": "Ask 2"}, "nextNodeId": "node_3" },
                                { "text": {"KO": "질문 3", "EN": "Ask 3"}, "nextNodeId": "node_4" }
                            ] 
                        },
                        "node_2": { "id": "node_2", "text": {"KO": "답변 1", "EN": "Ans 1"}, "options": [...] },
                        "node_3": { "id": "node_3", "text": {"KO": "답변 2", "EN": "Ans 2"}, "options": [...] }
                    }
                }
            },
            "items": { ... },
            "conclusion": { ... }
        }
        `;

        const response = await this.generateText(concept, systemInstruction, true);
        try {
            const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(clean);
        } catch (e) {
            console.error("Failed to parse storyboard:", e);
            throw new Error("Failed to generate valid storyboard data. Please try again.");
        }
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
}
