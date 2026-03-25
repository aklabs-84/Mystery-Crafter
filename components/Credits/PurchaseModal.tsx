import React, { useState } from 'react';
import { useCredits } from '../../hooks/useCredits';
import { useAuth } from '../../context/AuthContext';

interface Props {
    onClose: () => void;
}

const PACKAGES = [
    {
        id: 'starter' as const,
        credits: 20,
        price: '1,900원',
        label: '입문 탐정',
        desc: '게임 생성 1회 + 플레이 1회',
        badge: null,
    },
    {
        id: 'popular' as const,
        credits: 60,
        price: '4,900원',
        label: '베테랑 탐정',
        desc: '게임 생성 2회 + 플레이 8회',
        badge: '인기',
    },
    {
        id: 'pro' as const,
        credits: 200,
        price: '14,900원',
        label: '수석 탐정',
        desc: '게임 생성 8회 + 플레이 24회',
        badge: '최대 할인',
    },
];

const PurchaseModal: React.FC<Props> = ({ onClose }) => {
    const { credits } = useCredits();
    const { user, signInWithGoogle, signInWithKakao } = useAuth();
    const [showComingSoon, setShowComingSoon] = useState(false);

    const handlePurchase = () => {
        setShowComingSoon(true);
        setTimeout(() => setShowComingSoon(false), 3000);
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#0d0d0d] border border-zinc-800 rounded-3xl w-full max-w-lg p-8 shadow-2xl space-y-6"
                onClick={e => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black font-mystery text-white">크레딧 충전</h2>
                        <p className="text-zinc-500 text-sm mt-1">게임 생성 10⚡ · 게임 참여 5⚡</p>
                    </div>
                    {user && credits !== null && (
                        <div className="text-right">
                            <p className="text-xs text-zinc-500">현재 잔액</p>
                            <p className="text-2xl font-black text-emerald-400">{credits}<span className="text-sm font-normal text-zinc-500 ml-1">크레딧</span></p>
                        </div>
                    )}
                </div>

                {/* 비로그인 시 로그인 유도 */}
                {/* 준비중 토스트 */}
                {showComingSoon && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-sm font-bold animate-fade-in">
                        <span className="text-lg">🔧</span>
                        결제 시스템 준비중입니다. 곧 오픈 예정입니다!
                    </div>
                )}

                {!user ? (
                    <div className="space-y-3">
                        <p className="text-zinc-400 text-sm text-center">크레딧을 구매하려면 로그인이 필요합니다.<br/>신규 가입 시 <span className="text-emerald-400 font-bold">15 크레딧 무료</span> 제공!</p>
                        <button onClick={signInWithGoogle} className="w-full flex items-center justify-center gap-3 py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition">
                            Google로 로그인
                        </button>
                        <button onClick={signInWithKakao} className="w-full flex items-center justify-center gap-3 py-3 bg-[#FEE500] text-[#3C1E1E] rounded-xl font-bold hover:bg-[#FDD100] transition">
                            카카오로 로그인
                        </button>
                    </div>
                ) : (
                    /* 패키지 목록 */
                    <div className="space-y-3">
                        {PACKAGES.map(pkg => (
                            <button
                                key={pkg.id}
                                onClick={handlePurchase}
                                className="w-full flex items-center justify-between p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-2xl transition group"
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-12 h-12 bg-zinc-800 group-hover:bg-zinc-700 rounded-xl flex items-center justify-center text-xl font-black text-emerald-400 transition">
                                        {pkg.credits}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-bold">{pkg.label}</span>
                                            {pkg.badge && (
                                                <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                    {pkg.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-zinc-500 text-xs mt-0.5">{pkg.desc}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-white font-bold">{pkg.price}</span>
                                </div>
                            </button>
                        ))}
                        <p className="text-center text-zinc-600 text-xs pt-2">
                            토스페이먼츠 보안 결제 · 카드 정보는 저장되지 않습니다
                        </p>
                    </div>
                )}

                <button onClick={onClose} className="w-full text-zinc-600 hover:text-zinc-400 text-sm transition">
                    닫기
                </button>
            </div>
        </div>
    );
};

export default PurchaseModal;
