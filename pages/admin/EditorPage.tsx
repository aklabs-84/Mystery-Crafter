
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DataManager } from '../../services/dataManager';
import { GameData } from '../../types';
import GameEditor from '../../components/Editor/GameEditor';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';
import { supabase } from '../../services/supabase';
import StudioTutorialOverlay from '../../components/Editor/StudioTutorialOverlay';
import MessageModal from '../../components/UI/MessageModal';

const EditorPage: React.FC = () => {
    const { gameId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [gameData, setGameData] = useState<GameData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isPublic, setIsPublic] = useState(false);

    const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'ALERT' | 'CONFIRM';
        title: string;
        message: string;
        onConfirm: () => void;
    } | null>(null);

    const showAlert = (title: string, message: string) => {
        setModalConfig({
            isOpen: true,
            type: 'ALERT',
            title,
            message,
            onConfirm: () => setModalConfig(null)
        });
    };

    useEffect(() => {
        if (gameId && user) {
            loadGame(gameId);
        }
    }, [gameId, user]);

    const loadGame = async (id: string) => {
        try {
            const [data, { data: meta }] = await Promise.all([
                DataManager.loadGame(id),
                supabase.from('games').select('is_public').eq('id', id).single()
            ]);

            if (data) {
                setGameData(data);
                if (meta) setIsPublic(meta.is_public);
            } else {
                showAlert('Error', 'Game not found');
                navigate('/admin/studio');
            }
        } catch (e) {
            console.error(e);
            showAlert('Error', 'Error loading game');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = (updatedData: GameData) => {
        if (!user || !gameId) return;

        // 1. Immediate UI Update
        setGameData(updatedData);

        // 2. Clear existing timer
        if (timer) clearTimeout(timer);

        // 3. Debounce DB Save
        setSaving(true);
        const newTimer = setTimeout(async () => {
            try {
                await DataManager.saveGame(gameId, updatedData, user.id, isPublic);
            } catch (e) {
                console.error("Auto-save failed", e);
                // Optional: alert('Failed to save'); // Silent fail is often better for auto-save
            } finally {
                setSaving(false);
            }
        }, 2000); // 2 second delay

        setTimer(newTimer);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [timer]);

    const [showTutorial, setShowTutorial] = useState(() => {
        const skip = localStorage.getItem('skip-studio-tutorial');
        return !skip;
    });

    const finishTutorial = () => {
        setShowTutorial(false);
        localStorage.setItem('skip-studio-tutorial', 'true');
    };

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-black gap-4">
            <Spinner className="w-12 h-12 border-4 border-zinc-800 border-t-red-600" />
            <div className="text-zinc-500 text-sm animate-pulse tracking-widest uppercase font-bold">Loading Editor...</div>
        </div>
    );
    if (!gameData) return null;

    return (
        <div className="h-full flex flex-col">
            {showTutorial && <StudioTutorialOverlay lang="KO" onFinish={finishTutorial} />}
            <GameEditor
                gameData={gameData}
                onSave={handleSave}
                isSaving={saving}
                isPublic={isPublic}
                onTogglePublish={async () => {
                    const newState = !isPublic;
                    setIsPublic(newState);
                    if (gameData && user && gameId) {
                        try {
                            // Save immediately to persist public state
                            await DataManager.saveGame(gameId, gameData, user.id, newState);
                        } catch (e) {
                            console.error('Failed to toggle visibility', e);
                            setIsPublic(!newState); // Revert on fail
                            showAlert('Error', 'Failed to change visibility');
                        }
                    }
                }}
            />
            {modalConfig && (
                <MessageModal
                    isOpen={modalConfig.isOpen}
                    type={modalConfig.type}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    onConfirm={modalConfig.onConfirm}
                    onCancel={() => setModalConfig(null)}
                />
            )}
        </div>
    );
};

export default EditorPage;
