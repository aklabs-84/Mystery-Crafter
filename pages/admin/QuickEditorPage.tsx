import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DataManager } from '../../services/dataManager';
import { GameData } from '../../types';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';

// Placeholder for the upcoming QuickModeEditor component
const QuickModeEditor = React.lazy(() => import('../../components/Editor/QuickModeEditor'));

const QuickEditorPage: React.FC = () => {
    const { gameId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [gameData, setGameData] = useState<GameData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (gameId && user) {
            loadGame(gameId);
        }
    }, [gameId, user]);

    const loadGame = async (id: string) => {
        try {
            const data = await DataManager.loadGame(id);
            if (data) {
                setGameData(data);
            } else {
                navigate('/admin/studio');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (updatedData: GameData) => {
        if (!user || !gameId) return;
        setGameData(updatedData);
        await DataManager.saveGame(gameId, updatedData, user.id, false); // Quick save
    };

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-black gap-4">
            <Spinner className="w-12 h-12 border-4 border-zinc-800 border-t-red-600" />
            <div className="text-zinc-500 text-sm animate-pulse tracking-widest uppercase font-bold">Loading Quick Editor...</div>
        </div>
    );
    if (!gameData) return null;

    return (
        <React.Suspense fallback={<Spinner className="w-8 h-8" />}>
            <QuickModeEditor
                gameData={gameData}
                onSave={handleSave}
            />
        </React.Suspense>
    );
};

export default QuickEditorPage;
