
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rnakjrutoutrchmatleu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuYWtqcnV0b3V0cmNobWF0bGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0ODQ4MzYsImV4cCI6MjA4NTA2MDgzNn0.zIhq9gRDIvtWhQHKIMeLZ4Ln8o1GZZLExlZ559jrjek';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
    console.log('Testing increment_views RPC...');
    const { data: games } = await supabase.from('games').select('id').limit(1);
    if (!games || games.length === 0) {
        console.log('No games found to test with.');
        return;
    }

    const gameId = games[0].id;
    console.log(`Trying to increment views for game: ${gameId}`);

    const { data, error } = await supabase.rpc('increment_views', { row_id: gameId });

    if (error) {
        console.error('RPC Failed:', error);
    } else {
        console.log('RPC Success:', data);
    }
}

testRpc();
