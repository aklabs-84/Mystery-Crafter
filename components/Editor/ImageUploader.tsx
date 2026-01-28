
import React, { useRef, useState } from 'react';
import { DataManager } from '../../services/dataManager';

interface ImageUploaderProps {
    onUpload: (url: string) => void;
    storagePath: string; // e.g. "games/123/scenes/scene1.webp"
    className?: string;
    label?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onUpload, storagePath, className, label }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const url = await DataManager.uploadImage(file, storagePath);
            onUpload(url);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Image upload failed.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className={className}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full h-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-all border border-white/5"
            >
                {uploading ? (
                    <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Uploading...
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        {label || "Upload"}
                    </>
                )}
            </button>
        </div>
    );
};

export default ImageUploader;
