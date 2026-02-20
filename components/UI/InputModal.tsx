import React, { useEffect, useState } from 'react';

interface InputModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
    placeholder?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    initialValue?: string;
    inputType?: 'text' | 'password';
}

const InputModal: React.FC<InputModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    placeholder = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    initialValue = '',
    inputType = 'text'
}) => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue, isOpen]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
            if (e.key === 'Enter') onConfirm(value);
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onCancel, onConfirm, value]);

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

                <div className="pt-2">
                    <input
                        type={inputType}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:border-red-500 outline-none transition-colors"
                        autoFocus
                    />
                </div>

                <div className="flex justify-center gap-3 pt-2">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition uppercase tracking-widest"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={() => onConfirm(value)}
                        disabled={!value.trim()}
                        className="px-8 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/10 transition uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InputModal;
