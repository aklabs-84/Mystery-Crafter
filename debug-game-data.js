
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rnakjrutoutrchmatleu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuYWtqcnV0b3V0cmNobWF0bGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0ODQ4MzYsImV4cCI6MjA4NTA2MDgzNn0.zIhq9gRDIvtWhQHKIMeLZ4Ln8o1GZZLExlZ559jrjek';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGameData() {
    console.log('--- Checking Latest Game Data ---');
    
    // 1. Get the latest public game
    const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(1);

    if (gamesError) { console.error('Error fetching game:', gamesError); return; }
    if (!games || games.length === 0) { console.log('No public games found.'); return; }

    const game = games[0];
    console.log(`Found Game: [${game.id}] ${game.title?.KO || 'Untitled'}`);

    // 2. Fetch its game_data
    const { data: gameData, error: dataError } = await supabase
        .from('game_data')
        .select('data')
        .eq('game_id', game.id)
        .single();

    if (dataError) {
        console.error('Error fetching game_data:', dataError);
        console.log('Possibility: RLS might be blocking access, or row missing.');
    } else {
        if (!gameData) {
            console.log('Row found but object is null?');
        } else if (!gameData.data) {
            console.log('WARNING: game_data.data column is NULL or EMPTY!');
        } else {
            console.log('SUCCESS: Game data exists.');
            console.log('Data keys:', Object.keys(gameData.data));
            console.log('Scenes count:', Object.keys(gameData.data.scenes || {}).length);
        }
    }
}

checkGameData();
