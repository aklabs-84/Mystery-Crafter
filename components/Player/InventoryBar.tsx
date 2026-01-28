
import React, { useState } from 'react';
import { Item } from '../../types';
import { translations, Language } from '../../translations';
import { useDrag, useDrop } from 'react-dnd';

interface InventoryBarProps {
  items: Item[];
  onCombine: (id1: string, id2: string) => void;
  onInspect: (id: string) => void;
  lang: Language;
  vertical?: boolean;
}

const DraggableItem: React.FC<{
  item: Item;
  isSelected: boolean;
  onInteraction: (e: any) => void;
  onCombine: (id1: string, id2: string) => void;
  l: (val: any) => string;
}> = ({ item, isSelected, onInteraction, onCombine, l }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'ITEM',
    item: { id: item.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'ITEM',
    drop: (draggedItem: { id: string }) => {
      if (draggedItem.id !== item.id) {
        onCombine(draggedItem.id, item.id);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  // Combine refs (drag and drop)
  const attachRef = (el: HTMLDivElement | null) => {
    drag(drop(el));
  };

  return (
    <div
      ref={attachRef}
      onPointerDown={onInteraction}
      className={`relative aspect-square bg-zinc-900 rounded-xl border flex-shrink-0 cursor-pointer transition-all duration-300 group overflow-hidden shadow-lg ${isSelected
          ? 'border-red-500 ring-2 ring-red-500/40 scale-105 z-20 shadow-[0_0_25px_rgba(220,38,38,0.5)]'
          : isOver
            ? 'border-red-500 ring-2 ring-red-500/80 scale-110 z-30'
            : 'border-white/5 hover:border-white/20'
        } ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      {item.iconUrl ? (
        <img
          src={item.iconUrl}
          alt={l(item.name)}
          className={`w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500 pointer-events-none ${isSelected ? 'animate-pulse' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-zinc-700 font-bold uppercase tracking-tighter text-[8px] text-center p-1 pointer-events-none">
          {l(item.name)}
        </div>
      )}

      {/* Overlay for selection state */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${isSelected ? 'bg-red-600/10 opacity-100' : 'bg-white/0 group-hover:bg-white/5 opacity-0 group-hover:opacity-100'}`}></div>

      {isSelected && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-full border-2 border-red-500 rounded-xl animate-ping opacity-20"></div>
        </div>
      )}
    </div>
  );
};

const InventoryBar: React.FC<InventoryBarProps> = ({ items, onCombine, onInspect, lang, vertical }) => {
  const t = translations[lang];
  const [selectedCombineId, setSelectedCombineId] = useState<string | null>(null);

  const l = (val: any) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val[lang] || val['EN'] || val['KO'] || '';
  };

  // 모바일 터치 대응을 위해 onPointerDown으로 즉각 반응 유도 (Click/Tap Fallback)
  const handleInteraction = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;

    if (!selectedCombineId) {
      // 1. 첫 선택
      setSelectedCombineId(id);
    } else if (selectedCombineId === id) {
      // 2. 같은 아이템 클릭: 상세 정보 및 선택 해제
      onInspect(id);
      setSelectedCombineId(null);
    } else {
      // 3. 다른 아이템 클릭: 조합 시도
      onCombine(selectedCombineId, id);
      setSelectedCombineId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex-1 min-h-[120px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl bg-zinc-950/50">
        <span className="text-zinc-800 text-[10px] font-bold uppercase tracking-widest px-4 text-center">{t.noClues}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {selectedCombineId && (
        <div className="bg-red-600/10 border border-red-500/20 rounded-lg p-2 animate-in fade-in slide-in-from-top-1 duration-300">
          <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest text-center leading-tight">
            {lang === 'KO' ? '조합할 대상을 선택하세요' : 'Select Target to Combine'}
            <br />
            <span className="text-[7px] opacity-60 normal-case">
              {lang === 'KO' ? '(다시 누르면 상세 보기)' : '(Tap again to inspect)'}
            </span>
          </p>
        </div>
      )}
      <div className={`grid ${vertical ? 'grid-cols-3 gap-3' : 'flex gap-2'}`}>
        {items.map(item => (
          <DraggableItem
            key={item.id}
            item={item}
            isSelected={selectedCombineId === item.id}
            onInteraction={(e) => handleInteraction(e, item.id)}
            onCombine={onCombine}
            l={l}
          />
        ))}
      </div>
    </div>
  );
};

export default InventoryBar;
