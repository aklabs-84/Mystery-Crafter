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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6 scale-100 animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="space-y-2 text-center font-pretendard">
                    <h3 className="text-xl font-bold text-foreground font-mystery">{title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>
                </div>

                <div className="flex justify-center gap-3 pt-2">
                    {type === 'CONFIRM' && (
                        <button
                            onClick={onCancel}
                            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition uppercase tracking-widest font-pretendard shadow-sm"
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className={`px-8 py-2.5 rounded-xl text-xs font-bold transition uppercase tracking-widest shadow-lg font-pretendard ${isDestructive
                            ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20'
                            : 'bg-foreground text-background hover:opacity-90 shadow-foreground/10'
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
