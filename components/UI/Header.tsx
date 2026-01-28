
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Header: React.FC = () => {
    const { user, userType, signInWithGoogle, signInWithKakao, signOut } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);

    const studioPath = userType === 'admin' ? '/admin/studio' : '/user/studio';

    const navItems = [
        { path: '/', label: '홈' },
        { path: studioPath, label: '스튜디오', protected: true },
        { path: '/games', label: '게임 둘러보기' },
    ];

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const handleNavClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
        if (item.protected && !user) {
            e.preventDefault();
            setShowLoginPrompt(true);
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex justify-between items-center">
                <Link to="/" className="text-xl md:text-2xl font-mystery font-bold text-red-600 tracking-tighter cursor-pointer">
                    Mystery Crafter
                </Link>

                <div className="flex items-center gap-2 md:gap-4">
                    <div className="hidden md:flex items-center gap-2 bg-zinc-900/50 p-1 rounded-full border border-white/5 mr-4">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={(e) => handleNavClick(e, item)}
                                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${isActive(item.path)
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                                    : 'text-zinc-400 hover:text-white'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {user ? (
                        <div className="flex items-center gap-3 md:gap-6">
                            <span className="text-zinc-500 text-xs hidden sm:block">{user.email?.split('@')[0]}님</span>
                            <button onClick={signOut} className="text-zinc-400 hover:text-white text-xs md:text-sm font-medium transition">
                                로그아웃
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button onClick={signInWithGoogle} className="px-3 py-2 md:px-4 md:py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition text-xs md:text-sm font-bold flex items-center gap-2.5">
                                <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-5.38z" fill="#EA4335" /></svg>
                                <span className="hidden xs:inline">Google</span>
                            </button>
                            <button onClick={signInWithKakao} className="px-3 py-2 md:px-4 md:py-2.5 bg-[#FEE500] text-black border border-[#FEE500] rounded-xl hover:bg-[#FDD100] transition text-xs md:text-sm font-bold flex items-center gap-2.5 shadow-lg shadow-[#FEE500]/10">
                                <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.707 4.8 4.27 6.054l-.841 3.08c-.05.187.05.38.225.465a.434.434 0 00.187.042c.123 0 .242-.05.32-.143l3.64-2.47c.39.052.79.087 1.2.087 4.97 0 9-3.185 9-7.115S16.97 3 12 3z" fill="#3C1E1E" /></svg>
                                <span className="hidden xs:inline">Kakao</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Login Prompt Modal */}
            {showLoginPrompt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowLoginPrompt(false)}>
                    <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-md p-8 shadow-2xl space-y-8 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="text-center space-y-3">
                            <div className="w-16 h-16 bg-red-900/20 border border-red-600/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                            </div>
                            <h3 className="text-2xl font-bold font-mystery text-white">로그인이 필요합니다</h3>
                            <p className="text-zinc-500 text-sm break-keep">내 스튜디오를 이용하시려면 구글 또는 카카오 계정으로 로그인이 필요합니다.</p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={signInWithGoogle}
                                className="w-full flex items-center justify-center gap-3 py-3.5 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-all shadow-lg"
                            >
                                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-5.38z" fill="#EA4335" /></svg>
                                Google로 시작하기
                            </button>
                            <button
                                onClick={signInWithKakao}
                                className="w-full flex items-center justify-center gap-3 py-3.5 bg-[#FEE500] text-[#3C1E1E] rounded-xl font-bold hover:bg-[#FDD100] transition-all shadow-lg"
                            >
                                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.707 4.8 4.27 6.054l-.841 3.08c-.05.187.05.38.225.465a.434.434 0 00.187.042c.123 0 .242-.05.32-.143l3.64-2.47c.39.052.79.087 1.2.087 4.97 0 9-3.185 9-7.115S16.97 3 12 3z" fill="#3C1E1E" /></svg>
                                카카오로 시작하기
                            </button>
                        </div>

                        <div className="flex justify-center">
                            <button
                                onClick={() => setShowLoginPrompt(false)}
                                className="text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-widest transition"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Header;
