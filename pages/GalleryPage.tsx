import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/UI/Header';

const GalleryPage: React.FC = () => {
    const { user, userType, signInWithKakao } = useAuth();

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-red-900 selection:text-white break-keep">
            <Header />

            {/* ── Hero ── */}
            <section className="relative pt-28 pb-20 md:pt-40 md:pb-32 px-6 overflow-hidden min-h-[90vh] flex flex-col justify-center">
                {/* Background glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-red-900/10 blur-[120px]" />
                    <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full bg-red-950/10 blur-[80px]" />
                </div>

                <div className="max-w-6xl mx-auto relative z-10 text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-red-900/40 bg-red-950/20 rounded-full text-red-400 text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] mb-8">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        AI Powered Mystery Platform · 실시간 멀티플레이 지원
                    </div>

                    <h1 className="text-5xl sm:text-7xl md:text-[7rem] font-mystery font-black mb-6 md:mb-8 leading-[1.05] tracking-tight">
                        상상하는 모든<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-amber-400">
                            사건을 창조하세요
                        </span>
                    </h1>
                    <p className="text-zinc-400 text-base md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
                        솔로 탐정으로 사건을 파헤치거나, 친구들과 실시간으로 함께 수사하세요.<br className="hidden md:block" />
                        AI가 단 몇 분 만에 완벽한 미스터리 세계를 구축합니다.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center">
                        <Link
                            to="/games"
                            className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] text-sm md:text-base flex items-center justify-center gap-2"
                        >
                            🔍 게임 둘러보기
                        </Link>

                        <Link
                            to="/games?mode=multiplayer"
                            className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full hover:scale-105 transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)] text-sm md:text-base flex items-center justify-center gap-2"
                        >
                            👥 실시간 멀티플레이
                        </Link>

                        {user ? (
                            <Link
                                to={userType === 'admin' ? '/admin/studio' : '/user/studio'}
                                className="w-full sm:w-auto px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full hover:scale-105 transition-all shadow-[0_0_30px_rgba(220,38,38,0.2)] text-sm md:text-base flex items-center justify-center gap-2"
                            >
                                ⚡ 나만의 사건 만들기
                            </Link>
                        ) : (
                            <button
                                onClick={signInWithKakao}
                                className="w-full sm:w-auto px-8 py-4 bg-zinc-900 border border-white/10 text-zinc-300 font-bold rounded-full hover:bg-zinc-800 transition-colors text-sm md:text-base flex items-center justify-center gap-2"
                            >
                                ✏️ 계정 만들고 창작하기
                            </button>
                        )}
                    </div>
                </div>

                {/* Scroll hint */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-20 animate-bounce">
                    <div className="w-px h-8 bg-white" />
                    <div className="w-1 h-1 bg-white rounded-full" />
                </div>
            </section>

            {/* ── Feature Cards ── */}
            <section className="py-20 md:py-32 bg-zinc-950/60 border-y border-white/5 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12 md:mb-16">
                        <p className="text-xs text-zinc-500 uppercase tracking-[0.3em] mb-3">모든 경험을 하나로</p>
                        <h2 className="text-2xl md:text-4xl font-mystery font-bold">Mystery Crafter가 제공하는 것</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                        {/* 솔로 플레이 */}
                        <Link to="/games" className="block p-7 md:p-9 rounded-[2rem] bg-black border border-white/5 hover:border-white/20 transition-all duration-500 group">
                            <div className="text-3xl mb-6 group-hover:scale-110 transition-transform origin-left">🔍</div>
                            <h3 className="text-lg md:text-xl font-bold mb-2 text-white group-hover:text-red-400 transition-colors">솔로 탐정 플레이</h3>
                            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4 font-mono">회원가입 없이 즉시</p>
                            <p className="text-zinc-500 text-sm md:text-base leading-relaxed break-keep">
                                다른 창작자들이 제작한 사건 현장을 방문하세요. 증거를 분석하고 용의자를 취조해 진실에 다가갑니다.
                            </p>
                        </Link>

                        {/* 멀티플레이어 - Highlighted */}
                        <Link to="/games?mode=multiplayer" className="block p-7 md:p-9 rounded-[2rem] bg-emerald-950/20 border border-emerald-900/40 hover:border-emerald-500/50 hover:bg-emerald-950/30 transition-all duration-500 group relative overflow-hidden">
                            <div className="absolute top-4 right-4 px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-[9px] font-bold text-emerald-400 uppercase tracking-widest">New</div>
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 to-transparent pointer-events-none" />
                            <div className="relative z-10">
                                <div className="text-3xl mb-6 group-hover:scale-110 transition-transform origin-left">👥</div>
                                <h3 className="text-lg md:text-xl font-bold mb-2 text-white group-hover:text-emerald-400 transition-colors">실시간 멀티플레이</h3>
                                <p className="text-xs text-emerald-600 uppercase tracking-widest mb-4 font-mono">친구와 함께 수사</p>
                                <p className="text-zinc-400 text-sm md:text-base leading-relaxed break-keep">
                                    6자리 코드로 방을 만들고 친구를 초대하세요. 턴제 수사로 함께 진실을 밝혀내는 실시간 바다거북스프.
                                </p>
                            </div>
                        </Link>

                        {/* AI 창작 */}
                        <div className="p-7 md:p-9 rounded-[2rem] bg-black border border-white/5 hover:border-red-600/30 transition-all duration-500 group">
                            <div className="text-3xl mb-6 group-hover:scale-110 transition-transform origin-left">🤖</div>
                            <h3 className="text-lg md:text-xl font-bold mb-2 text-white group-hover:text-red-400 transition-colors">AI 스튜디오 창작</h3>
                            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4 font-mono">단 몇 분 만에 완성</p>
                            <p className="text-zinc-500 text-sm md:text-base leading-relaxed break-keep">
                                키워드 하나로 시작해 완벽한 스토리보드를 생성합니다. AI가 만든 기초 위에 세밀한 커스터마이징까지.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Multiplayer Showcase ── */}
            <section className="py-20 md:py-32 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="rounded-[2.5rem] bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/5 overflow-hidden">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                            {/* Text */}
                            <div className="p-10 md:p-16 flex flex-col justify-center">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-950/40 border border-emerald-900/50 rounded-full text-emerald-400 text-[10px] uppercase tracking-widest font-bold mb-8 w-fit">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    실시간 멀티플레이어
                                </div>
                                <h2 className="text-3xl md:text-5xl font-mystery font-black mb-6 leading-tight">
                                    친구들과 함께<br />
                                    <span className="text-emerald-400">수사본부를 열어보세요</span>
                                </h2>
                                <p className="text-zinc-400 text-base md:text-lg leading-relaxed mb-8 break-keep">
                                    방장이 6자리 코드를 공유하면 누구나 입장 가능. 턴제로 돌아가며 AI 심문관에게 질문을 던지고, 팀원들과 단서를 공유해 진범을 찾아내세요.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Link
                                        to="/games?mode=multiplayer"
                                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full transition-all text-sm flex items-center justify-center gap-2"
                                    >
                                        👥 지금 방 만들기
                                    </Link>
                                    <Link
                                        to="/games"
                                        className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-full transition-all text-sm flex items-center justify-center gap-2"
                                    >
                                        게임 목록 보기
                                    </Link>
                                </div>
                            </div>

                            {/* Visual */}
                            <div className="relative p-10 md:p-16 flex items-center justify-center bg-zinc-950/50 border-t lg:border-t-0 lg:border-l border-white/5 min-h-[300px]">
                                <div className="w-full max-w-xs space-y-3">
                                    {/* Fake chat UI */}
                                    <div className="flex items-center gap-2 mb-5">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                        <span className="text-xs text-zinc-400 font-mono">CODE: AB12CD · 탐정 3명 접속 중</span>
                                    </div>
                                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-300 self-end w-fit ml-auto">
                                        피해자는 독살당했나요?
                                    </div>
                                    <div className="bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-2.5 text-sm text-red-300 w-fit">
                                        <div className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5">NO</div>
                                        아닙니다. 독은 사용되지 않았습니다.
                                    </div>
                                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-300 self-end w-fit ml-auto">
                                        현장에 두 번째 사람이 있었나요?
                                    </div>
                                    <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl px-4 py-2.5 text-sm text-emerald-300 w-fit">
                                        <div className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5">YES</div>
                                        맞습니다. 현장에는 두 번째 인물이 있었습니다.
                                    </div>
                                    <div className="text-center py-2">
                                        <span className="text-[10px] text-zinc-600 font-mono">📢 턴이 홍길동 탐정에게 넘어갔습니다.</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-3 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2">
                                        <div className="flex-1 text-xs text-zinc-600">질문을 입력하세요...</div>
                                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs">➡️</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── How to Create ── */}
            <section className="py-20 md:py-32 px-6 bg-zinc-950/40 border-y border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16 md:mb-24">
                        <p className="text-xs text-zinc-500 uppercase tracking-[0.3em] mb-3">창작 가이드</p>
                        <h2 className="text-3xl md:text-5xl font-mystery font-bold">어떻게 만드나요?</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                        {[
                            {
                                num: '01',
                                emoji: '✍️',
                                title: '주제와 컨셉 입력',
                                desc: '"안개 자욱한 런던의 은행 강도 사건"처럼 원하는 테마를 입력하면 AI가 3가지 시나리오를 제안합니다.',
                            },
                            {
                                num: '02',
                                emoji: '🎨',
                                title: 'AI 스토리보드 생성',
                                desc: '장소, NPC, 대사, 아이템, 엔딩까지 포함된 완전한 게임 스토리보드가 자동으로 만들어집니다.',
                            },
                            {
                                num: '03',
                                emoji: '🚀',
                                title: '발행 및 공유',
                                desc: '스튜디오에서 세밀하게 편집하고 발행하세요. 혼자 즐기거나 멀티로 친구를 초대할 수 있습니다.',
                            },
                        ].map((step) => (
                            <div key={step.num} className="group relative p-8 rounded-[2rem] bg-black border border-white/5 hover:border-red-600/20 transition-all duration-500">
                                <div className="absolute top-6 right-6 text-red-600 font-mystery text-5xl font-black opacity-5 group-hover:opacity-20 transition-opacity select-none">{step.num}</div>
                                <div className="text-4xl mb-6 group-hover:scale-110 transition-transform origin-left">{step.emoji}</div>
                                <h3 className="text-lg font-bold mb-3 text-white group-hover:text-red-400 transition-colors">{step.title}</h3>
                                <p className="text-zinc-500 text-sm leading-relaxed break-keep">{step.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 md:mt-16 text-center">
                        {user ? (
                            <Link
                                to={userType === 'admin' ? '/admin/studio' : '/user/studio'}
                                className="inline-flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full hover:scale-105 transition-all shadow-[0_0_30px_rgba(220,38,38,0.2)] text-sm md:text-base"
                            >
                                지금 나만의 사건 만들기
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </Link>
                        ) : (
                            <button
                                onClick={signInWithKakao}
                                className="inline-flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full hover:scale-105 transition-all text-sm md:text-base"
                            >
                                로그인하고 창작 시작하기
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="border-t border-white/5 py-16 md:py-24 px-6 bg-black/60">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-12 md:mb-16">
                        <h2 className="text-xl md:text-2xl font-mystery font-bold text-red-600 tracking-tighter mb-2">Mystery Crafter</h2>
                        <p className="text-zinc-600 text-sm max-w-xl">Where AI meets noir storytelling. 경험해본 적 없는 새로운 추리의 세계.</p>
                    </div>

                    {/* AKLABS Promo */}
                    <div className="w-full bg-white/4 border border-white/8 rounded-[2rem] p-8 md:p-12 hover:border-red-600/20 transition-all duration-500 group relative overflow-hidden mb-12">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-15 transition-opacity pointer-events-none">
                            <span className="text-[100px] md:text-[130px] leading-none">🚀</span>
                        </div>
                        <div className="relative z-10 max-w-2xl">
                            <h3 className="text-white text-lg md:text-xl font-bold mb-4 font-mystery">더 많은 혁신을 만나보세요</h3>
                            <p className="text-zinc-400 text-sm md:text-base mb-8 leading-relaxed break-keep">
                                Mystery Crafter는 <strong className="text-white">AKLABS</strong>의 실험적인 프로젝트 중 하나입니다. 인공지능과 창의성이 만나는 지점에 관심이 있다면, 저희의 다른 프로젝트들도 확인해보세요.
                            </p>
                            <a
                                href="https://litt.ly/aklabs"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-3 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-full font-bold transition-all text-sm hover:scale-105"
                            >
                                AKLABS 홈페이지 방문하기
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </a>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5 gap-6">
                        <div className="flex gap-8 text-zinc-700 text-[10px] font-black uppercase tracking-[0.3em]">
                            <a href="#" className="hover:text-white transition-colors">Terms</a>
                            <a href="#" className="hover:text-white transition-colors">Privacy</a>
                            <a href="#" className="hover:text-white transition-colors">Support</a>
                        </div>
                        <div className="text-zinc-800 text-[9px] uppercase font-black tracking-[0.4em]">
                            &copy; 2026 Mystery Crafter AI Network. Established by AKLABS.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default GalleryPage;
