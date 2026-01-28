import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/UI/Header';

const GalleryPage: React.FC = () => {
    const { user, signInWithGoogle, signInWithKakao, signOut } = useAuth();


    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-red-900 selection:text-white break-keep">
            <Header />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pb-32 px-6 overflow-hidden min-h-[70vh] md:min-h-[80vh] flex flex-col justify-center">
                <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 via-black to-black opacity-80 z-0 pointer-events-none" />
                <div className="max-w-7xl mx-auto relative z-10 text-center">
                    <div className="inline-block px-4 py-1.5 border border-red-900/30 bg-red-950/10 rounded-full text-red-500 text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] mb-8 animate-fade-in">
                        AI Powered Mystery Platform
                    </div>
                    <h2 className="text-4xl sm:text-6xl md:text-8xl font-mystery font-bold mb-8 md:mb-10 leading-[1.1] animate-slide-up">
                        상상하는 모든<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-amber-500">사건을 창조하세요</span>
                    </h2>
                    <p className="text-zinc-400 text-base md:text-2xl max-w-3xl mx-auto mb-12 md:mb-16 leading-relaxed animate-slide-up [animation-delay:200ms] break-keep px-4">
                        누구나 탐정이 되어 미스터리를 해결하거나,<br className="hidden md:block" />
                        AI의 도움을 받아 단 몇 분 만에 완벽한 범죄와 트릭을 설계할 수 있습니다.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center items-center animate-slide-up [animation-delay:400ms]">
                        <Link
                            to="/games"
                            className="w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 bg-white text-black font-bold rounded-full hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] text-sm md:text-base flex items-center justify-center"
                        >
                            미스터리 해결하기
                        </Link>
                        {user ? (
                            <Link
                                to="/admin/wizard"
                                className="w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 bg-red-600 text-white font-bold rounded-full hover:bg-red-500 hover:scale-105 transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)] min-w-[200px] flex items-center justify-center gap-3 text-sm md:text-base"
                            >
                                <span>나만의 사건 만들기</span>
                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </Link>
                        ) : (
                            <div className="group relative w-full sm:w-auto">
                                <button
                                    className="w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 bg-zinc-900/50 border border-white/5 text-zinc-500 font-bold rounded-full cursor-pointer hover:bg-zinc-900 transition-colors text-sm md:text-base"
                                    onClick={signInWithKakao}
                                >
                                    계정 만들고 창작하기
                                </button>
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-zinc-600 pointer-events-none whitespace-nowrap font-medium hidden sm:block">
                                    창작은 로그인이 필요합니다
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Feature Section */}
            <section className="py-20 md:py-32 bg-zinc-950/50 relative border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                        <div className="p-8 md:p-10 rounded-[2rem] md:rounded-[2.5rem] bg-black border border-white/5 hover:border-red-600/30 transition-all duration-500 group">
                            <div className="text-3xl md:text-4xl mb-6 md:mb-8 group-hover:scale-110 transition-transform origin-left">🔍</div>
                            <h3 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-white group-hover:text-red-500 transition-colors">플레이어 모드</h3>
                            <p className="text-zinc-400 leading-relaxed text-base md:text-lg italic font-mystery mb-4 break-keep">
                                "회원가입 없이 즉시 참여"
                            </p>
                            <p className="text-zinc-500 leading-relaxed font-sans text-sm md:text-base break-keep">
                                다른 창작자들이 직조한 사건 현장을 방문하세요. 증거를 클릭하고 용의자를 취조하여 미스터리를 해결합니다.
                            </p>
                        </div>
                        <div className="p-8 md:p-10 rounded-[2rem] md:rounded-[2.5rem] bg-black border border-white/5 hover:border-red-600/30 transition-all duration-500 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity hidden sm:block">
                                <svg className="w-16 h-16 md:w-20 md:h-20 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" /></svg>
                            </div>
                            <div className="text-3xl md:text-4xl mb-6 md:mb-8 group-hover:scale-110 transition-transform origin-left">🤖</div>
                            <h3 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-white group-hover:text-red-500 transition-colors">AI 기반 마법사</h3>
                            <p className="text-zinc-400 leading-relaxed text-base md:text-lg italic font-mystery mb-4 break-keep">
                                "단 몇 번의 선택으로 완성"
                            </p>
                            <p className="text-zinc-500 leading-relaxed font-sans text-sm md:text-base break-keep">
                                복잡한 설정은 AI에게 맡기세요. 간단한 주제 키워드만으로도 완벽한 게임 스토리보드가 생성됩니다.
                            </p>
                        </div>
                        <div className="p-8 md:p-10 rounded-[2rem] md:rounded-[2.5rem] bg-black border border-white/5 hover:border-red-600/30 transition-all duration-500 group">
                            <div className="text-3xl md:text-4xl mb-6 md:mb-8 group-hover:scale-110 transition-transform origin-left">🛠️</div>
                            <h3 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-white group-hover:text-red-500 transition-colors">프로페셔널 스캔</h3>
                            <p className="text-zinc-400 leading-relaxed text-base md:text-lg italic font-mystery mb-4 break-keep">
                                "세밀한 커스터마이징"
                            </p>
                            <p className="text-zinc-500 leading-relaxed font-sans text-sm md:text-base break-keep">
                                AI가 기초를 만들면, 당신은 디테일을 다듬습니다. 대사, 이미지 프롬프트, 증거 유기 등 모든 것을 직접 통제하세요.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Creation Guide Section */}
            <section className="py-24 md:py-40 px-6">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl md:text-6xl font-mystery font-bold text-center mb-16 md:mb-32">어떻게 만드나요?</h2>
                    <div className="space-y-24 md:space-y-40">
                        {/* Step 1 */}
                        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 group">
                            <div className="flex-1 text-center md:text-right order-2 md:order-1">
                                <span className="text-red-600 font-mystery text-6xl md:text-[10rem] leading-none font-black opacity-10 block mb-2 md:mb-4 group-hover:opacity-30 transition-opacity">01</span>
                                <h4 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">주제와 핵심 컨셉 입력</h4>
                                <p className="text-zinc-500 text-base md:text-xl leading-relaxed break-keep">
                                    "안개 자욱한 런던의 은행 강도 사건"처럼 원하는 테마를 입력하세요.<br className="hidden md:block" />
                                    AI가 3가지의 흥미로운 시나리오 아이디어를 제안합니다.
                                </p>
                            </div>
                            <div className="w-full md:w-[450px] aspect-[4/3] bg-zinc-900/40 rounded-[2rem] md:rounded-[4rem] border border-white/5 order-1 md:order-2 flex items-center justify-center overflow-hidden">
                                <div className="text-6xl md:text-8xl group-hover:scale-125 transition-transform duration-1000">✍️</div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 group">
                            <div className="w-full md:w-[450px] aspect-[4/3] bg-zinc-900/40 rounded-[2rem] md:rounded-[4rem] border border-white/5 flex items-center justify-center overflow-hidden">
                                <div className="text-6xl md:text-8xl group-hover:scale-125 transition-transform duration-1000">🎨</div>
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <span className="text-red-600 font-mystery text-6xl md:text-[10rem] leading-none font-black opacity-10 block mb-2 md:mb-4 group-hover:opacity-30 transition-opacity">02</span>
                                <h4 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">AI 스토리보드 생성</h4>
                                <p className="text-zinc-500 text-base md:text-xl leading-relaxed break-keep">
                                    선택한 아이디어를 기반으로 장소, NPC, 대사, 아이템,<br className="hidden md:block" />
                                    그리고 게임의 엔딩까지 포함된 완벽한 스토리보드가 자동으로 구축됩니다.
                                </p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 group">
                            <div className="flex-1 text-center md:text-right order-2 md:order-1">
                                <span className="text-red-600 font-mystery text-6xl md:text-[10rem] leading-none font-black opacity-10 block mb-2 md:mb-4 group-hover:opacity-30 transition-opacity">03</span>
                                <h4 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">발행 및 플레이</h4>
                                <p className="text-zinc-500 text-base md:text-xl leading-relaxed break-keep">
                                    스튜디오에서 최종 검토를 마친 후 세상을 향해 당신의 작품을 공개하세요.<br className="hidden md:block" />
                                    다른 유저들의 해결 과정과 조회수를 실시간으로 확인할 수 있습니다.
                                </p>
                            </div>
                            <div className="w-full md:w-[450px] aspect-[4/3] bg-zinc-900/40 rounded-[2rem] md:rounded-[4rem] border border-white/5 order-1 md:order-2 flex items-center justify-center overflow-hidden">
                                <div className="text-6xl md:text-8xl group-hover:scale-125 transition-transform duration-1000">🚀</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>



            {/* Extended Footer */}
            <footer className="border-t border-white/5 py-20 md:py-32 px-6 relative bg-zinc-950/80">
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

export default GalleryPage;
