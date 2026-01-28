
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Language, translations } from '../../translations';

interface BgmPlayerProps {
  url?: string;
  lang: Language;
}

const BgmPlayer: React.FC<BgmPlayerProps> = ({ url, lang }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [audioError, setAudioError] = useState<string | null>(null);
  const t = translations[lang];

  // Advanced Sanitize for various cloud storage links
  const sanitizedUrl = useMemo(() => {
    if (!url) return '';
    let processed = url.trim();
    
    // 1. Handle Google Drive
    const driveRegex = /\/(?:file\/d\/|open\?id=|uc\?id=|file\/u\/\d+\/d\/)([^/?&]+)/;
    const driveMatch = processed.match(driveRegex);
    
    if (driveMatch && driveMatch[1]) {
      return `https://docs.google.com/uc?id=${driveMatch[1]}&export=download`;
    }

    // 2. Handle Dropbox
    if (processed.includes('dropbox.com')) {
      // Replace dl=0 or dl=1 with raw=1 for direct streaming
      if (processed.includes('dl=0') || processed.includes('dl=1')) {
        processed = processed.replace(/dl=[01]/, 'raw=1');
      } else if (!processed.includes('raw=1')) {
        processed += (processed.includes('?') ? '&' : '?') + 'raw=1';
      }
      return processed;
    }

    return processed;
  }, [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setAudioError(null);
    
    if (sanitizedUrl) {
      // STOP previous playback immediately
      audio.pause();
      
      /**
       * CRITICAL FIX: To prevent "no supported source" errors, we must set CORS 
       * attributes BEFORE assigning the src. 
       * Cloud services like Dropbox and Google Drive often don't provide 
       * the necessary Access-Control-Allow-Origin headers for anonymous requests.
       */
      const isCorsUnfriendly = 
        sanitizedUrl.includes('google.com') || 
        sanitizedUrl.includes('dropbox.com');

      if (isCorsUnfriendly) {
        audio.removeAttribute('crossorigin');
      } else {
        // For other sources, anonymous is usually safer to avoid tainting
        audio.crossOrigin = "anonymous";
      }

      // Assign src manually to control sequence
      audio.src = sanitizedUrl;
      audio.load();
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setAudioError(null);
          })
          .catch((e) => {
            if (e.name !== 'NotAllowedError') {
              console.warn("BGM load issue:", e);
            }
            setIsPlaying(false);
          });
      }
    } else {
      audio.src = '';
      setIsPlaying(false);
    }
  }, [sanitizedUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setAudioError(null);
        })
        .catch((e) => {
          console.error("Manual play error:", e);
          setAudioError(lang === 'KO' ? "재생 불가" : "Cannot Play");
          setIsPlaying(false);
        });
    }
  };

  const handleAudioError = (e: any) => {
    console.error("Audio element error event:", e);
    setAudioError(lang === 'KO' ? "소스 오류" : "Src error");
    setIsPlaying(false);
  };

  if (!url) return null;

  return (
    <div className={`flex items-center gap-3 px-3 py-1 bg-white/5 rounded-full border transition-all hover:bg-white/10 group ${audioError ? 'border-red-500/50' : 'border-white/10'}`}>
      <audio 
        ref={audioRef} 
        loop 
        onError={handleAudioError}
        onCanPlay={() => {
          if (audioError) setAudioError(null);
        }}
      />
      
      <button 
        onClick={togglePlay} 
        className={`w-6 h-6 flex items-center justify-center rounded-full transition-all ${audioError ? 'text-red-500' : isPlaying ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
        title={audioError || (isPlaying ? "Pause BGM" : "Play BGM")}
      >
        {audioError ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        ) : isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        )}
      </button>

      <div className="flex items-center gap-2 overflow-hidden w-0 group-hover:w-20 transition-all duration-500 opacity-0 group-hover:opacity-100">
        <input 
          type="range" min="0" max="1" step="0.01" value={volume} 
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setVolume(v);
            if (audioRef.current) audioRef.current.volume = v;
          }}
          className="w-full accent-red-600 h-1 bg-zinc-800 rounded-lg cursor-pointer"
        />
      </div>

      {audioError && <span className="text-[8px] font-bold text-red-500 uppercase tracking-tighter whitespace-nowrap">{audioError}</span>}
      {!audioError && isPlaying && <div className="flex gap-0.5 items-end h-3 mb-0.5">
        <div className="w-0.5 bg-red-500 animate-[bounce_1s_infinite_0.1s] h-1"></div>
        <div className="w-0.5 bg-red-500 animate-[bounce_1s_infinite_0.3s] h-2"></div>
        <div className="w-0.5 bg-red-500 animate-[bounce_1s_infinite_0.5s] h-1.5"></div>
      </div>}
    </div>
  );
};

export default BgmPlayer;
