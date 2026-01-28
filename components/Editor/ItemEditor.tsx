
import React, { useState } from 'react';
import { Item, VisualStyle, GameData } from '../../types';
import { translations, Language } from '../../translations';
import { gemini } from '../../services/geminiService';
import LocalizedInput from './LocalizedInput';
import ImageUploader from './ImageUploader';

interface ItemEditorProps {
  item: Item;
  onUpdate: (updates: Partial<Item>) => void;
  lang: Language;
  allAssets: GameData;
}

const ItemEditor: React.FC<ItemEditorProps> = ({ item, onUpdate, lang, allAssets }) => {
  const t = translations[lang];
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDetail, setIsGeneratingDetail] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [detailImageError, setDetailImageError] = useState(false);

  const l = (val: any) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val[lang] || val['EN'] || val['KO'] || '';
  };

  const handleGenerateIcon = async () => {
    setIsGenerating(true);
    setImageError(false);
    const url = await gemini.generateImage(l(item.imagePrompt) || l(item.name), allAssets.visualStyle || VisualStyle.LIGNE_CLAIRE, 'ITEM');
    if (url) onUpdate({ iconUrl: url });
    setIsGenerating(false);
  };

  const handleGenerateDetail = async () => {
    setIsGeneratingDetail(true);
    setDetailImageError(false);
    const url = await gemini.generateImage(l(item.detailImagePrompt) || `Detailed view of ${l(item.name)}`, allAssets.visualStyle || VisualStyle.LIGNE_CLAIRE, 'SCENE');
    if (url) onUpdate({ detailImageUrl: url });
    setIsGeneratingDetail(false);
  };

  const otherItems = (Object.values(allAssets.items) as Item[]).filter(i => i.id !== item.id);
  const showPlaceholder = !item.iconUrl || imageError;
  const showDetailPlaceholder = !item.detailImageUrl || detailImageError;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10 pb-20">
      <header className="flex justify-between items-end border-b border-white/5 pb-6">
        <div className="flex-1 mr-10">
          <span className="text-[10px] font-bold text-blue-500 tracking-[0.2em] uppercase">{t.editingItem}</span>
          <LocalizedInput
            label=""
            value={item.name}
            onChange={(v) => onUpdate({ name: v })}
            lang={lang}
            className="mt-1"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-lg">
            <input
              type="checkbox"
              id="isCrucialEvidence"
              checked={item.isCrucialEvidence || false}
              onChange={(e) => onUpdate({ isCrucialEvidence: e.target.checked })}
              className="accent-blue-600"
            />
            <label htmlFor="isCrucialEvidence" className="text-[10px] font-bold text-blue-500 uppercase tracking-widest cursor-pointer">{t.isCrucialEvidence}</label>
          </div>
          <button
            onClick={handleGenerateIcon}
            disabled={isGenerating}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs uppercase tracking-widest disabled:opacity-50 transition-all shadow-lg shadow-blue-600/20"
          >
            {isGenerating ? t.working : t.generateIcon}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <section className="space-y-6">
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">{t.aiPrompt}</label>
            <textarea
              value={l(item.imagePrompt) || ''}
              onChange={(e) => onUpdate({ imagePrompt: e.target.value })}
              className="w-full h-24 bg-zinc-800 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-blue-500 transition-all resize-none text-white"
              placeholder="..."
            />
          </div>

          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
            <LocalizedInput
              label={t.description}
              value={item.description}
              onChange={(v) => onUpdate({ description: v })}
              lang={lang}
              multiline
            />
          </div>

          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t.detailImage}</h3>
              <button
                onClick={handleGenerateDetail}
                disabled={isGeneratingDetail}
                className="text-[9px] font-bold text-blue-500 hover:text-white transition-all uppercase tracking-widest"
              >
                {isGeneratingDetail ? t.working : t.generateDetailImage}
              </button>
            </div>
            <textarea
              value={l(item.detailImagePrompt) || ''}
              onChange={(e) => onUpdate({ detailImagePrompt: e.target.value })}
              className="w-full h-20 bg-zinc-800 border border-white/10 rounded-lg p-3 text-xs outline-none focus:border-blue-500 transition-all resize-none text-white"
              placeholder={t.detailImagePrompt}
            />
            <div className="flex gap-2">
              <input
                value={item.detailImageUrl || ''}
                onChange={(e) => { setDetailImageError(false); onUpdate({ detailImageUrl: e.target.value }); }}
                className="flex-1 bg-zinc-800 border border-white/5 rounded-lg p-2 text-[10px] outline-none text-zinc-500 focus:border-blue-500"
                placeholder={t.detailImageUrl}
              />
              <ImageUploader
                onUpload={(url) => { setDetailImageError(false); onUpdate({ detailImageUrl: url }); }}
                storagePath={`games/${allAssets.id}/items/${item.id}_detail_${Date.now()}.webp`}
                className="w-20"
                label="Up"
              />
            </div>
          </div>

          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2">Interaction Logic</h3>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{t.combineWith}</label>
              <select
                value={item.combinableWith || ''}
                onChange={(e) => onUpdate({ combinableWith: e.target.value || undefined })}
                className="w-full bg-zinc-800 border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-blue-500 transition-all text-white"
              >
                <option value="">{t.none}</option>
                {otherItems.map(i => (
                  <option key={i.id} value={i.id}>{l(i.name)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{t.resultItem}</label>
              <select
                value={item.resultItemId || ''}
                onChange={(e) => onUpdate({ resultItemId: e.target.value || undefined })}
                className="w-full bg-zinc-800 border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-blue-500 transition-all text-white"
              >
                <option value="">{t.none}</option>
                {(Object.values(allAssets.items) as Item[]).map(i => (
                  <option key={i.id} value={i.id}>{l(i.name)}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          {/* Icon Preview */}
          <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 rounded-2xl border border-white/5 relative overflow-hidden min-h-[300px]">
            <div className="w-40 h-40 rounded-3xl bg-[#0a0a0a] border border-dashed border-white/5 overflow-hidden flex flex-col items-center justify-center relative">
              {!showPlaceholder ? (
                <img src={item.iconUrl} className="w-full h-full object-contain p-4 relative z-10" onError={() => setImageError(true)} alt="Icon" />
              ) : (
                <div className="text-[10px] text-zinc-800 font-bold uppercase tracking-widest">No Icon</div>
              )}
            </div>
            <label className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-4 mb-2">{t.iconUrl}</label>
            <div className="flex gap-2 w-full mt-2">
              <input
                value={item.iconUrl || ''}
                onChange={(e) => { setImageError(false); onUpdate({ iconUrl: e.target.value }); }}
                className="flex-1 bg-zinc-900 border border-white/5 rounded-lg p-2 text-[10px] outline-none text-zinc-500"
                placeholder="https://..."
              />
              <ImageUploader
                onUpload={(url) => { setImageError(false); onUpdate({ iconUrl: url }); }}
                storagePath={`games/${allAssets.id}/items/${item.id}_icon_${Date.now()}.webp`}
                className="w-16"
                label="Up"
              />
            </div>
          </div>

          {/* Detail Preview */}
          <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 rounded-2xl border border-white/5 relative overflow-hidden min-h-[300px]">
            <div className="w-full aspect-video rounded-xl bg-[#0a0a0a] border border-dashed border-white/5 overflow-hidden flex flex-col items-center justify-center relative">
              {!showDetailPlaceholder ? (
                <img src={item.detailImageUrl} className="w-full h-full object-cover relative z-10" onError={() => setDetailImageError(true)} alt="Detail" />
              ) : (
                <div className="text-[10px] text-zinc-800 font-bold uppercase tracking-widest">No Detail Image</div>
              )}
            </div>
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-4">{t.detailImage}</span>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ItemEditor;
