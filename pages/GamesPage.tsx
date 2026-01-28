
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

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

    useEffect(() => {
        fetchGames();
    }, []);

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
        <div className="min-h-screen bg-black text-white font-sans selection:bg-red-900 selection:text-white break-keep pb-20">
            <Header />

            {/* Page Header */}
            <header className="pt-32 md:pt-48 pb-12 md:pb-24 px-6 max-w-7xl mx-auto">
                <div className="space-y-4 md:space-y-6 text-center md:text-left">
                    <div className="text-red-600 font-bold uppercase tracking-[0.4em] text-[10px] md:text-xs animate-fade-in">Gallery</div>
                    <h1 className="text-4xl md:text-7xl font-bold font-mystery animate-slide-up">모든 미스터리<br className="md:hidden" /> 사건 현장</h1>
                    <p className="text-zinc-500 text-sm md:text-xl max-w-2xl animate-slide-up [animation-delay:200ms]">
                        전 세계 창작자들이 설계한 정교한 트릭과 이야기를 탐험하세요. 당신의 추리력이 필요합니다.
                    </p>
                </div>
            </header>

            {/* Gallery Grid */}
            <main className="px-6 max-w-7xl mx-auto min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">Profiling Cases...</span>
                    </div>
                ) : games.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        {games.map((game) => (
                            <Link to={`/play/${game.id}`} key={game.id} className="block group h-full">
                                <div className="h-full border border-white/5 rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-7 hover:border-red-600/30 hover:bg-zinc-900/40 transition-all duration-700 cursor-pointer relative overflow-hidden bg-zinc-950/30 flex flex-col">
                                    <div className="aspect-[16/10] bg-zinc-900 rounded-[1.5rem] md:rounded-[2rem] mb-6 md:mb-8 overflow-hidden relative shrink-0">
                                        {game.thumbnail_url ? (
                                            <img src={game.thumbnail_url} alt={l(game.title)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 opacity-60 group-hover:opacity-90 grayscale-[0.3] group-hover:grayscale-0" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-zinc-900/50">
                                                <span className="text-zinc-700 font-bold uppercase tracking-widest text-[10px]">Uncharted Territory</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                        <div className="absolute inset-0 bg-red-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                            <div className="bg-white text-black text-[10px] md:text-xs font-black uppercase tracking-[0.3em] px-8 md:px-10 py-3 md:py-4 rounded-full translate-y-6 group-hover:translate-y-0 transition-transform duration-700 ease-out">
                                                Solve Case
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col px-1 md:px-2">
                                        <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-5 group-hover:text-red-500 transition-colors line-clamp-1">{l(game.title)}</h2>
                                        <p className="text-zinc-500 text-sm md:text-base line-clamp-2 font-sans mb-6 md:mb-8 flex-1 leading-relaxed italic break-keep">{l(game.description)}</p>

                                        <div className="pt-6 md:pt-8 border-t border-white/5 flex justify-between items-center text-[10px] md:text-[11px] text-zinc-600 font-black tracking-[0.2em] uppercase mt-auto">
                                            <div className="flex items-center gap-2 md:gap-3">
                                                <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_#dc2626]"></span>
                                                VIEWS {game.views}
                                            </div>
                                            <span className="text-red-900 group-hover:text-red-600 transition-colors">INVESTIGATING...</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] text-zinc-700 space-y-4">
                        <span className="text-5xl">🌑</span>
                        <p className="font-mystery italic text-lg tracking-widest">사건이 아직 보고되지 않았습니다.</p>
                    </div>
                )}
            </main>

            {/* Extended Footer */}
            <footer className="border-t border-white/5 py-20 md:py-32 px-6 relative bg-zinc-950/80 mt-12 md:mt-24">
                <div className="max-w-7xl mx-auto">
                    <div className="space-y-12 md:space-y-16 mb-16 md:mb-24 text-left">
                        <div className="space-y-4">
                            <h2 className="text-2xl md:text-3xl font-mystery font-bold text-red-600 tracking-tighter">Mystery Crafter</h2>
                            <p className="text-zinc-500 text-sm md:text-base max-w-xl">Where AI meets noir storytelling. 경험해본 적 없는 새로운 추리의 세계.</p>
                        </div>

                        {/* AKLABS Promotion - Full Width Below */}
                        <div className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-8 md:p-12 hover:border-red-600/30 transition-all duration-500 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="text-8xl md:text-9xl text-white">🚀</span>
                            </div>
                            <div className="relative z-10 max-w-2xl text-left">
                                <h3 className="text-white text-xl md:text-2xl font-bold mb-6 flex items-center gap-3 font-mystery">
                                    더 많은 혁신을 만나보세요
                                </h3>
                                <p className="text-zinc-400 text-base md:text-lg mb-8 leading-relaxed break-keep">
                                    Mystery Crafter는 <strong className="text-white">AKLABS</strong>의 실험적인 프로젝트 중 하나입니다. 인공지능과 창의성이 만나는 지점에 관심이 있다면, 저희의 다른 프로젝트들도 확인해보세요.
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

                    <div className="flex flex-col md:flex-row justify-between items-center pt-12 border-t border-white/5 gap-8">
                        <div className="flex gap-8 md:gap-12 text-zinc-600 text-[10px] md:text-xs font-black uppercase tracking-[0.3em]">
                            <a href="#" className="hover:text-white transition-colors whitespace-nowrap">Terms</a>
                            <a href="#" className="hover:text-white transition-colors whitespace-nowrap">Privacy</a>
                            <a href="#" className="hover:text-white transition-colors whitespace-nowrap">Support</a>
                        </div>
                        <div className="text-center text-zinc-800 text-[8px] md:text-[10px] uppercase font-black tracking-[0.5em]">
                            &copy; 2026 Mystery Crafter AI Network. Established by AKLABS.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default GamesPage;
