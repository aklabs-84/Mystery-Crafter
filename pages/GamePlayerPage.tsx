
import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import GamePlayer from '../components/Player/GamePlayer';

const GamePlayerPage: React.FC = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();

    const [gameData, setGameData] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [savedState, setSavedState] = React.useState<any>(null);
    const viewIncremented = React.useRef(false);

    React.useEffect(() => {
        const fetchGame = async () => {
            if (!gameId) return;
            try {
                // 1. Fetch game data (content)
                console.log('Fetching game data for:', gameId);
                const { data: fetchedData, error: gameError } = await supabase
                    .from('game_data')
                    .select('data')
                    .eq('game_id', gameId)
                    .single();

                if (gameError) {
                    console.error('Supabase Error:', gameError);
                    throw gameError;
                }

                console.log('Fetched Data:', fetchedData);

                if (!fetchedData) throw new Error('Game data not found');
                if (!fetchedData.data) throw new Error('Game content is empty');

                setGameData(fetchedData.data);

                // 2. Increment view count (Best effort, once per mount)
                if (!viewIncremented.current) {
                    viewIncremented.current = true;
                    supabase.rpc('increment_views', { row_id: gameId })
                        .then(({ error }) => {
                            if (error) console.error('View increment failed:', error);
                            else console.log('View count incremented via RPC');
                        });
                }

                // 3. Fetch Save Data (if user is logged in) - Basic check, assuming public for now or user context
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: saveData, error: saveError } = await supabase
                        .from('saves')
                        .select('state')
                        .eq('user_id', user.id)
                        .eq('game_id', gameId)
                        .maybeSingle();

                    if (saveData) {
                        setSavedState(saveData.state);
                    }
                }

            } catch (err: any) {
                console.error('Failed to load game:', err);
                setError(err.message || 'Failed to load game');
            } finally {
                setLoading(false);
            }
        };

        fetchGame();
    }, [gameId]); // Removed user dependency to avoid double fetch, fetching user inside

    if (loading) {
        return (
            <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white">
                <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Loading Mystery...</p>
            </div>
        );
    }

    if (error || !gameData) {
        return (
            <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white p-8 text-center">
                <div className="text-red-500 text-6xl mb-4">⚠️</div>
                <h1 className="text-2xl font-bold mb-2">Failed to Load Game</h1>
                <p className="text-zinc-500 mb-8">{error || 'Unknown error occurred'}</p>
                <Link to="/games" className="px-6 py-3 bg-zinc-900 border border-white/10 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                    Return to Gallery
                </Link>
            </div>
        );
    }

    return (
        <GamePlayer
            gameData={gameData}
            initialState={savedState}
            gameId={gameId} // Pass gameId for saving
            lang="KO"
            onBackToHome={() => navigate('/games')}
        />
    );
};

export default GamePlayerPage;
