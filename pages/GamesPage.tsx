
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { translations, Language } from '../translations';

import Header from '../components/UI/Header';

// Reuse metadata from GalleryPage
interface GameMetadata {
    id: string;
    title: { KO: string; EN: string };
    description: { KO: string; EN: string };
    thumbnail_url: string;
    views: number;
}

const GamesPage: React.FC = () => {
    const { user, signInWithGoogle, signInWithKakao, signOut } = useAuth();
    const [games, setGames] = useState<GameMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const [lang, setLang] = useState<Language>('KO');
    const [userSaves, setUserSaves] = useState<Set<string>>(new Set());
    const navigate = useNavigate();
    const isMultiplayerMode = searchParams.get('mode') === 'multiplayer';

    const t = translations[lang];

    useEffect(() => {
        fetchGames();
    }, []);

    useEffect(() => {
        if (user) {
            fetchUserSaves();
        }
    }, [user]);

    const fetchUserSaves = async () => {
        try {
            const { data, error } = await supabase
                .from('saves')
                .select('game_id')
                .eq('user_id', user?.id);
            
            if (error) throw error;
            if (data) {
                setUserSaves(new Set(data.map(s => s.game_id)));
            }
        } catch (error) {
            console.error('Error fetching user saves:', error);
        }
    };

    const fetchGames = async () => {
        try {
            const { data, error } = await supabase
                .from('games')
                .select('id, title, description, thumbnail_url, views')
                .eq('is_public', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setGames(data || []);
        } catch (error) {
            console.error('Error fetching games:', error);
        } finally {
            setLoading(false);
        }
    };

    const l = (val: any) => {
        if (!val) return '';
        return val['KO'] || val['EN'] || '';
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-red-900 selection:text-white break-keep pb-20 transition-colors duration-300">
            <Header />

            {/* Page Header */}
            <header className="pt-32 md:pt-48 pb-12 md:pb-24 px-6 max-w-7xl mx-auto">
                <div className="space-y-4 md:space-y-6 text-center md:text-left">
                    {isMultiplayerMode ? (
                        <>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-600 dark:text-emerald-400 text-[10px] uppercase tracking-widest font-bold animate-fade-in">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                멀티플레이어 · 게임 선택
                            </div>
                             <h1 className="text-4xl md:text-7xl font-bold font-mystery animate-slide-up text-foreground">함께 수사할<br className="md:hidden" /> 사건을 고르세요</h1>
                            <p className="text-muted-foreground text-sm md:text-xl max-w-2xl animate-slide-up [animation-delay:200ms] font-pretendard">
                                게임을 선택해 방을 만들거나, 받은 코드로 바로 입장하세요.
                            </p>

                            {/* 코드로 바로 입장 */}
                             <div className="mt-2 text-center md:text-left">
                                <button
                                    onClick={() => navigate('/play/multiplayer')}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold rounded-xl transition shadow-sm"
                                >
                                    🚪 참여코드로 바로 입장하기
                                </button>
                            </div>
                        </>
                    ) : (
                         <>
                            <div className="text-red-600 font-bold uppercase tracking-[0.4em] text-[10px] md:text-xs animate-fade-in">Gallery</div>
                            <h1 className="text-4xl md:text-7xl font-bold font-mystery animate-slide-up text-foreground">모든 미스터리<br className="md:hidden" /> 사건 현장</h1>
                            <p className="text-muted-foreground text-sm md:text-xl max-w-2xl animate-slide-up [animation-delay:200ms] font-pretendard">
                                전 세계 창작자들이 설계한 정교한 트릭과 이야기를 탐험하세요. 당신의 추리력이 필요합니다.
                            </p>
                        </>
                    )}
                </div>
            </header>

            {/* Gallery Grid */}
            <main className="px-6 max-w-7xl mx-auto min-h-[400px]">
                 {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Profiling Cases...</span>
                    </div>
                ) : games.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        {games.map((game) => (
                             <div key={game.id} className="group h-full">
                                <div className={`h-full border rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-7 transition-all duration-500 relative overflow-hidden bg-card flex flex-col shadow-sm ${
                                    isMultiplayerMode
                                        ? 'border-emerald-500/10 hover:border-emerald-500/40 hover:bg-emerald-500/5'
                                        : 'border-border hover:border-red-600/30 hover:bg-muted/5'
                                }`}>
                                    {/* 썸네일 */}
                                     <div className="aspect-[16/10] bg-muted rounded-[1.5rem] md:rounded-[2rem] mb-6 md:mb-8 overflow-hidden relative shrink-0">
                                        {game.thumbnail_url ? (
                                            <img src={game.thumbnail_url} alt={l(game.title)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 opacity-80 group-hover:opacity-100 grayscale-[0.3] group-hover:grayscale-0" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-muted/50">
                                                <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Uncharted Territory</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/20 to-transparent" />
                                    </div>

                                     <div className="flex-1 flex flex-col px-1 md:px-2">
                                        <h2 className={`text-xl md:text-2xl font-bold mb-3 md:mb-5 line-clamp-1 transition-colors text-foreground ${isMultiplayerMode ? 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400' : 'group-hover:text-red-600'}`}>{l(game.title)}</h2>
                                        <p className="text-muted-foreground text-sm md:text-base line-clamp-2 font-pretendard mb-6 md:mb-8 flex-1 leading-relaxed italic break-keep">{l(game.description)}</p>
                                        <div className="pt-4 border-t border-border mt-auto">
                                            {isMultiplayerMode ? (
                                                /* 멀티 모드: 방 만들기 버튼 */
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => navigate(`/play/multiplayer/host/${game.id}`)}
                                                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                                                    >
                                                        👥 멀티 방 만들기
                                                    </button>
                                                    <Link
                                                        to={`/play/${game.id}`}
                                                        className="px-4 py-3 bg-card border border-border hover:bg-muted/10 text-muted-foreground text-xs font-bold rounded-xl transition-all flex items-center justify-center shadow-sm"
                                                        title="솔로 플레이"
                                                    >
                                                        🔍
                                                    </Link>
                                                </div>
                                             ) : (
                                                 /* 일반 모드: 기존 스타일 */
                                                <Link to={`/play/${game.id}`} className="flex justify-between items-center text-[10px] md:text-[11px] font-black tracking-[0.2em] uppercase font-pretendard">
                                                    <div className="flex items-center gap-2 md:gap-3">
                                                        <span className={`w-1.5 h-1.5 rounded-full shadow-sm ${userSaves.has(game.id) ? 'bg-amber-500 animate-pulse shadow-amber-500/50' : 'bg-red-600 animate-pulse shadow-red-600/50'}`}></span>
                                                        <span className="text-muted-foreground">VIEWS {game.views}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {userSaves.has(game.id) && (
                                                            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded text-[9px] font-bold lowercase tracking-normal flex items-center gap-1">
                                                                <span className="mb-0.5">💾</span> {t.resumeInvestigation}
                                                            </span>
                                                        )}
                                                        <span className={`${userSaves.has(game.id) ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground group-hover:text-red-600'} transition-colors`}>
                                                            {userSaves.has(game.id) ? t.continue : t.startInvestigation}
                                                        </span>
                                                    </div>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[3rem] text-muted-foreground space-y-4">
                        <span className="text-5xl opacity-30">🌑</span>
                        <p className="font-mystery italic text-lg tracking-widest">사건이 아직 보고되지 않았습니다.</p>
                    </div>
                )}
            </main>

             {/* Extended Footer */}
            <footer className="border-t border-border py-20 md:py-32 px-6 relative bg-background mt-12 md:mt-24">
                <div className="max-w-7xl mx-auto">
                    <div className="space-y-12 md:space-y-16 mb-16 md:mb-24 text-left">
                        <div className="space-y-4">
                            <h2 className="text-2xl md:text-3xl font-mystery font-bold text-red-600 tracking-tighter">Mystery Crafter</h2>
                            <p className="text-muted-foreground text-sm md:text-base max-w-xl font-pretendard">Where AI meets noir storytelling. 경험해본 적 없는 새로운 추리의 세계.</p>
                        </div>

                         {/* AKLABS Promotion - Full Width Below */}
                        <div className="w-full bg-card border border-border rounded-[2.5rem] p-8 md:p-12 hover:border-red-600/30 transition-all duration-500 group relative overflow-hidden shadow-sm">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <span className="text-8xl md:text-9xl text-foreground">🚀</span>
                            </div>
                            <div className="relative z-10 max-w-2xl text-left">
                                <h3 className="text-foreground text-xl md:text-2xl font-bold mb-6 flex items-center gap-3 font-mystery">
                                    더 많은 혁신을 만나보세요
                                </h3>
                                <p className="text-muted-foreground text-base md:text-lg mb-8 leading-relaxed break-keep font-pretendard">
                                    Mystery Crafter는 <strong className="text-foreground">AKLABS</strong>의 실험적인 프로젝트 중 하나입니다. 인공지능과 창의성이 만나는 지점에 관심이 있다면, 저희의 다른 프로젝트들도 확인해보세요.
                                </p>
                                <div className="flex justify-start">
                                    <a
                                        href="https://litt.ly/aklabs"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-4 bg-white text-black px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-all text-sm md:text-base group-hover:bg-red-600 group-hover:text-white"
                                    >
                                        AKLABS 홈페이지 방문하기
                                        <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                     <div className="flex flex-col md:flex-row justify-between items-center pt-12 border-t border-border gap-8">
                        <div className="flex gap-8 md:gap-12 text-muted-foreground text-[10px] md:text-xs font-black uppercase tracking-[0.3em]">
                            <a href="#" className="hover:text-foreground transition-colors whitespace-nowrap">Terms</a>
                            <a href="#" className="hover:text-foreground transition-colors whitespace-nowrap">Privacy</a>
                            <a href="#" className="hover:text-foreground transition-colors whitespace-nowrap">Support</a>
                        </div>
                        <div className="text-center text-muted-foreground text-[8px] md:text-[10px] uppercase font-black tracking-[0.5em]">
                            &copy; 2026 Mystery Crafter AI Network. Established by AKLABS.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default GamesPage;
