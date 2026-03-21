
import { supabase } from './supabase';
import imageCompression from 'browser-image-compression';
import { GameData, VisualStyle } from '../types';

export class DataManager {
    static async compressImage(file: File): Promise<File> {
        const options = {
            maxSizeMB: 1, // Max 1MB
            maxWidthOrHeight: 1920, // FHD max
            useWebWorker: true,
            fileType: 'image/webp'
        };
        try {
            return await imageCompression(file, options);
        } catch (error) {
            console.error('Image compression failed:', error);
            return file; // Fallback to original
        }
    }

    static async uploadImage(file: File, path: string): Promise<string> {
        const compressed = await this.compressImage(file);
        const { data, error } = await supabase.storage
            .from('game-assets')
            .upload(path, compressed, { upsert: true });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('game-assets')
            .getPublicUrl(path);

        return publicUrl;
    }

    private static base64ToBlob(base64: string): Blob {
        const parts = base64.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);

        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }

        return new Blob([uInt8Array], { type: contentType });
    }

    static async processGameDataImages(gameData: any, gameId: string, onProgress?: (msg: string) => void): Promise<any> {
        // Deep clone to avoid mutating original mid-process
        const newData = JSON.parse(JSON.stringify(gameData));
        const imageKeys = ['imageUrl', 'detailImageUrl', 'thumbnail_url', 'portraitUrl', 'iconUrl'];

        const processNode = async (node: any, pathContext: string) => {
            if (!node || typeof node !== 'object') return;

            for (const key of Object.keys(node)) {
                const value = node[key];

                // If it's an image key and has base64 content
                if (imageKeys.includes(key) && typeof value === 'string' && value.startsWith('data:image')) {
                    if (onProgress) onProgress(`Optimizing image at ${pathContext}.${key}...`);
                    try {
                        const blob = this.base64ToBlob(value);
                        const file = new File([blob], 'image.png', { type: blob.type });
                        const storagePath = `games/${gameId}/optimized/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.webp`;

                        const url = await this.uploadImage(file, storagePath);
                        node[key] = url;
                        console.log(`Optimized ${key} to ${url}`);
                    } catch (e) {
                        console.error(`Failed to optimize image at ${key}`, e);
                    }
                } else if (typeof value === 'object') {
                    await processNode(value, `${pathContext}.${key}`);
                }
            }
        };

        await processNode(newData, 'root');
        return newData;
    }

    static async saveGame(gameId: string | null, gameData: GameData, ownerId: string, isPublic: boolean = false): Promise<string> {
        // 1. Extract Metadata for 'games' table
        const title = gameData.title;
        const description = gameData.description || { KO: '설명 없음', EN: 'No description' };

        let targetGameId = gameId;

        // 2. Create New Row if no ID to get the real DB UUID for Storage Path
        if (!targetGameId) {
            const { data, error } = await supabase
                .from('games')
                .insert({
                    owner_id: ownerId,
                    title,
                    description,
                    is_public: isPublic,
                    thumbnail_url: null 
                })
                .select()
                .single();

            if (error) throw error;
            targetGameId = data.id;
            gameData.id = targetGameId; 
        }

        // 3. Recursively Process & Upload Any Base64 Images
        const processedGameData = await this.processGameDataImages(gameData, targetGameId);

        // 4. Extract Thumbnail URL (Primary: gameData.thumbnail_url, Secondary: startScene.imageUrl)
        let thumbnailUrl = null;
        if ((processedGameData as any).thumbnail_url) {
            thumbnailUrl = (processedGameData as any).thumbnail_url;
        } else if (processedGameData.startSceneId && processedGameData.scenes[processedGameData.startSceneId]?.imageUrl) {
            thumbnailUrl = processedGameData.scenes[processedGameData.startSceneId].imageUrl;
        }

        // 5. Update Metadata & Thumbnail
        await supabase
            .from('games')
            .update({
                title,
                description,
                is_public: isPublic,
                thumbnail_url: thumbnailUrl
            })
            .eq('id', targetGameId);
            
        processedGameData.id = targetGameId; 

        // 6. Save Processed Game Data JSON
        const { error: dataError } = await supabase
            .from('game_data')
            .upsert({
                game_id: targetGameId,
                data: processedGameData
            }, { onConflict: 'game_id' });

        if (dataError) throw dataError;

        return targetGameId;
    }

    static async deleteGame(gameId: string): Promise<void> {
        // 1. Delete Database Record (Cascades to game_data, saves)
        const { error } = await supabase
            .from('games')
            .delete()
            .eq('id', gameId);

        if (error) throw error;

        // 2. Storage cleanup (Optional/Background) - TODO: Implement folder deletion
        // supabase.storage.from('game-assets').remove(...)
    }

    static async loadGame(gameId: string): Promise<GameData | null> {
        const { data, error } = await supabase
            .from('game_data')
            .select('data')
            .eq('game_id', gameId)
            .single();

        if (error) return null;
        return data.data as GameData;
    }

    static async importGameFromJson(json: any, ownerId: string): Promise<string> {
        // Validation (Basic)
        if (!json.game || !json.scenes || !json.items || !json.npcs) {
            throw new Error('Invalid JSON structure: Missing required root properties.');
        }

        const gameMetadata = json.game;

        // arrays to records
        const scenes: Record<string, any> = {};
        json.scenes.forEach((s: any) => {
            // Map snake_case to camelCase where necessary or keep as is if compatible
            const scene: any = {
                ...s,
                visualStyle: s.visual_style || VisualStyle.LIGNE_CLAIRE, // Default
                imagePrompt: s.image_prompt,
                descriptionText: s.description,
                hotspots: s.hotspots.map((h: any, index: number) => {
                    // Default spacing logic to avoid overlap
                    // 3 columns grid: (20, 20), (50, 20), (80, 20), (20, 50)...
                    const col = index % 3;
                    const row = Math.floor(index / 3);
                    const defaultX = 20 + (col * 30);
                    const defaultY = 20 + (row * 30);

                    return {
                        ...h,
                        label: h.label || h.name, // Map name to label
                        descriptionText: h.description,
                        puzzlePrompt: h.locked_message,
                        locked_message: h.locked_message,
                        unlock_keyword: h.unlock_keyword,
                        targetId: h.target_id,
                        requiredItemId: h.required_item_id,
                        examineText: h.examine_text,
                        actionType: h.action,
                        // Assign default coordinates if missing
                        x: h.x !== undefined ? h.x : defaultX,
                        y: h.y !== undefined ? h.y : defaultY,
                        width: h.width || 10,
                        height: h.height || 10
                    };
                }),
                npcIds: [] // Will populate
            };
            scenes[s.id] = scene;
        });

        const items: Record<string, any> = {};
        json.items.forEach((i: any) => {
            items[i.id] = {
                ...i,
                imagePrompt: i.image_prompt,
                isCrucialEvidence: i.is_crucial_evidence,
                resultItemId: i.combination?.result_item_id,
                combinableWith: i.combination?.combinable_with
            };
        });

        const npcs: Record<string, any> = {};

        json.npcs.forEach((n: any) => {
            const dialogueNodes: Record<string, any> = {};
            n.dialogue_tree.nodes.forEach((node: any) => {
                dialogueNodes[node.id] = {
                    ...node,
                    options: node.options.map((o: any) => ({
                        ...o,
                        nextNodeId: o.next_node_id,
                        requiredItems: o.requires_item ? [o.requires_item] : [],
                        rewardItemId: o.reward_item
                    })),
                    isEnding: node.is_ending_node
                };
            });

            // Handle secretPersona if it's a string
            const secretPersona = typeof n.secret_persona === 'string'
                ? { KO: n.secret_persona, EN: n.secret_persona }
                : n.secret_persona;

            npcs[n.id] = {
                ...n,
                imagePrompt: n.image_prompt,
                secretPersona,
                initialDialogueId: n.dialogue_tree.initial_dialogue_id,
                dialogueTree: dialogueNodes,
                isKiller: n.is_killer
            };
        });

        // Populate NPC IDs in Scenes
        Object.values(scenes).forEach((scene: any) => {
            scene.hotspots.forEach((h: any) => {
                if (h.action === 'TALK' && h.target_id) {
                    if (!scene.npcIds.includes(h.target_id)) {
                        scene.npcIds.push(h.target_id);
                    }
                }
            });
        });

        const conclusion = {
            mysterySolution: gameMetadata.mystery_solution,
            successTitle: json.endings?.success?.title || { KO: '성공', EN: 'Success' },
            successBody: json.endings?.success?.body || { KO: '성공했습니다.', EN: 'You succeeded.' },
            failureTitle: json.endings?.failure?.title || { KO: '실패', EN: 'Failure' },
            failureBody: json.endings?.failure?.body || { KO: '실패했습니다.', EN: 'You failed.' }
        };

        const newGameData: GameData = {
            id: `game_${Date.now()}`,
            title: gameMetadata.title,
            description: { KO: gameMetadata.mystery_solution?.KO?.substring(0, 50) + '...' || 'Imported', EN: 'Imported Mystery' },
            visualStyle: VisualStyle.LIGNE_CLAIRE,
            startSceneId: json.scenes[0]?.id || 'scene_1',
            scenes,
            items,
            npcs,
            initialFlags: {},
            conclusion,
            author: gameMetadata.author,
            version: gameMetadata.version,
            playtime_minutes: gameMetadata.playtime_minutes,
            sns_keywords: gameMetadata.sns_keywords
        };

        return await this.saveGame(null, newGameData, ownerId, false);
    }
}
