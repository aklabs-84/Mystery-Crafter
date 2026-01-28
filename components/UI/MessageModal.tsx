import React, { useEffect } from 'react';

interface MessageModalProps {
    isOpen: boolean;
    type: 'ALERT' | 'CONFIRM';
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean; // For red delete buttons
}

const MessageModal: React.FC<MessageModalProps> = ({
    isOpen,
    type,
    title,
    message,
    onConfirm,
    onCancel,
    confirmLabel = 'OK',
    cancelLabel = 'Cancel',
    isDestructive = false
}) => {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (type === 'CONFIRM' && onCancel) onCancel();
                if (type === 'ALERT') onConfirm();
            }
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onCancel, onConfirm, type]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6 scale-100 animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="space-y-2 text-center">
                    <h3 className="text-xl font-bold text-white font-mystery">{title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">{message}</p>
                </div>

                <div className="flex justify-center gap-3 pt-2">
                    {type === 'CONFIRM' && (
                        <button
                            onClick={onCancel}
                            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition uppercase tracking-widest"
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className={`px-8 py-2.5 rounded-xl text-xs font-bold transition uppercase tracking-widest shadow-lg ${isDestructive
                            ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20'
                            : 'bg-white text-black hover:bg-zinc-200 shadow-white/10'
                            }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MessageModal;
