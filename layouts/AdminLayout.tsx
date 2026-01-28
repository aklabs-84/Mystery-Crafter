import React from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/UI/Header';

const AdminLayout: React.FC = () => {
    const { user, userType, loading } = useAuth();
    const location = useLocation();

    if (loading) return <div className="h-screen bg-black flex items-center justify-center font-mystery text-red-600">로딩 중...</div>;
    if (!user) return <Navigate to="/" />;

    const isAdmin = userType === 'admin';
    const basePath = isAdmin ? '/admin' : '/user';

    const navItems = [
        { path: `${basePath}/studio`, label: '내 게임 목록' },
        { path: `${basePath}/settings`, label: '설정' },
    ];

    const isEditorPage = (location.pathname.includes('/admin/studio/') || location.pathname.includes('/user/studio/')) &&
        location.pathname.split('/').length > 3;

    return (
        <div className="flex flex-col h-screen bg-black text-white">
            <Header />

            <div className="flex flex-1 overflow-hidden pt-16 md:pt-20">
                {/* Sidebar - Hidden on Editor Page */}
                {!isEditorPage && (
                    <aside className="w-64 border-r border-gray-800 p-6 flex flex-col hidden md:flex">
                        <span className="text-xl font-mystery font-bold text-red-600 mb-10">스튜디오 도구</span>
                        <nav className="flex-1 space-y-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`block px-4 py-3 rounded transition ${location.pathname === item.path
                                        ? 'bg-red-900/40 text-white'
                                        : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                                        }`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                        <Link to="/" className="text-gray-500 hover:text-white mt-auto">메인으로 가기</Link>
                    </aside>
                )}

                {/* Content Area */}
                <main className={`flex-1 overflow-auto relative ${isEditorPage ? 'p-0' : 'p-8'}`}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
