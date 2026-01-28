import React from 'react';
import { useNavigate } from 'react-router-dom';

interface WizardLayoutProps {
    children: React.ReactNode;
}

export const WizardLayout: React.FC<WizardLayoutProps> = ({ children }) => {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-screen bg-black text-white font-sans overflow-y-auto">
            {/* Reusing EditorSidebar for consistency, or we can make a WizardSidebar */}
            <div className="w-64 border-r border-white/10 flex-shrink-0 bg-black flex flex-col">
                <div className="p-4 border-b border-white/10">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-red-500 to-orange-600 bg-clip-text text-transparent">
                        Mystery<br /><span className="text-white font-light">Crafter AI</span>
                    </h1>
                </div>
                <div className="p-4 text-sm text-zinc-500">
                    AI Case Generator
                </div>
                <div className="flex-1" />
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={() => navigate('/admin/studio')}
                        className="w-full py-2 text-zinc-400 hover:text-white text-xs uppercase tracking-widest text-left pl-4 hover:bg-zinc-900 rounded transition"
                    >
                        ← Exit to Studio
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col relative bg-[#0a0a0a] overflow-y-auto">
                {children}
            </div>
        </div>
    );
};
