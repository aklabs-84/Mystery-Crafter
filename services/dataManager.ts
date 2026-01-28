
import { supabase } from './supabase';
import imageCompression from 'browser-image-compression';
import { GameData } from '../types';

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

        // 2. Upload Thumbnail if it's a blob/base64 (simplification: assume currently handled or derived)
        // For now, let's assume gameData might contain temp blob URLs that need to be processed?
        // In a full implementation, we'd recursively scan gameData for Blob URLs, upload them, and replace with Storage URLs.
        // BUT for this step, let's focus on the Save Logic first. 
        // The Editor usually handles individual image uploads IMMEDIATELY when added? 
        // OR we do it at save time? doing it at save time is safer for "Cancel" operations, but slower.
        // Let's assume we do it at save time for now to ensure consistency.

        // TODO: Recursive image processing implementation

        let targetGameId = gameId;

        if (!targetGameId) {
            // Create New
            const { data, error } = await supabase
                .from('games')
                .insert({
                    owner_id: ownerId,
                    title,
                    description,
                    is_public: isPublic,
                    thumbnail_url: null // Todo
                })
                .select()
                .single();

            if (error) throw error;
            targetGameId = data.id;
        } else {
            // Update Metadata
            await supabase
                .from('games')
                .update({
                    title,
                    description,
                    is_public: isPublic
                })
                .eq('id', targetGameId);
        }

        // Save Game Data Blob
        const { error: dataError } = await supabase
            .from('game_data')
            .upsert({
                game_id: targetGameId,
                data: gameData
            }, { onConflict: 'game_id' });

        if (dataError) throw dataError;

        return targetGameId!;
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
}
