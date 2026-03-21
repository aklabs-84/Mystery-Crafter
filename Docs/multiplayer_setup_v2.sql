-- 🌐 바다거북스프 멀티플레이어 V2 서버 초기화 스크립트 (Supabase SQL Editor용)

-- 1. 게임 세션 (방) 테이블
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
    host_name TEXT NOT NULL,
    session_code VARCHAR(6) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    current_turn_player VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 참가 플레이어 테이블
CREATE TABLE IF NOT EXISTS public.session_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    is_ready BOOLEAN DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(session_id, player_name) -- 한 방에 중복된 닉네임 방지
);

-- 3. 실시간 대화 메시지 테이블
CREATE TABLE IF NOT EXISTS public.session_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('question', 'answer_ai', 'hint', 'system')),
    content TEXT NOT NULL,
    status TEXT CHECK (status IN ('yes', 'no', 'irrelevant', 'close', 'typing', 'hint', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 🔒 RLS (Row Level Security) 설정 - 누구나 읽고 쓸 수 있게 임시 개방 (테스트용)
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow everywhere" ON public.game_sessions FOR ALL USING (true);
CREATE POLICY "Allow everywhere" ON public.session_players FOR ALL USING (true);
CREATE POLICY "Allow everywhere" ON public.session_messages FOR ALL USING (true);

-- 📡 Supabase Realtime 트래킹 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_messages;

COMMENT ON TABLE public.game_sessions IS '바다거북스프 실시간 방 정보';
COMMENT ON TABLE public.session_players IS '게임 방 참가자 명단';
COMMENT ON TABLE public.session_messages IS '게임 방 내부 실시간 대화 히스토리';
