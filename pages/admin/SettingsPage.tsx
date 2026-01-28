
import React, { useState, useEffect } from 'react';
import { AIManager, AI_MODELS, GlobalAIConfig } from '../../services/aiManager';

const SettingsPage: React.FC = () => {
    const [config, setConfig] = useState<GlobalAIConfig>({
        keys: {},
        activeModel: { provider: 'google', modelId: 'gemini-3-flash-preview' }
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const loaded = AIManager.getConfig();
        setConfig(loaded);
    }, []);

    const handleSave = () => {
        AIManager.saveConfig(config);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleKeyChange = (provider: 'google' | 'openai' | 'anthropic', value: string) => {
        setConfig(prev => ({
            ...prev,
            keys: { ...prev.keys, [provider]: value }
        }));
    };

    return (
        <div className="max-w-4xl mx-auto text-white p-6 font-sans">
            <h2 className="text-3xl font-bold mb-8 font-mystery text-red-600">AI 설정</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* API Keys Section */}
                <section className="space-y-6">
                    <h3 className="text-xl font-bold border-b border-gray-700 pb-2">API 키</h3>
                    <p className="text-sm text-gray-500">키는 브라우저에 안전하게 로컬로 저장되며 API 요청에만 사용됩니다.</p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Google Gemini API 키</label>
                            <input
                                type="password"
                                value={config.keys.google || ''}
                                onChange={(e) => handleKeyChange('google', e.target.value)}
                                className="w-full bg-zinc-900 border border-gray-700 rounded-lg p-3 focus:border-red-600 focus:outline-none transition"
                                placeholder="AIza..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">OpenAI API 키</label>
                            <input
                                type="password"
                                value={config.keys.openai || ''}
                                onChange={(e) => handleKeyChange('openai', e.target.value)}
                                className="w-full bg-zinc-900 border border-gray-700 rounded-lg p-3 focus:border-green-600 focus:outline-none transition"
                                placeholder="sk-..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Anthropic API 키</label>
                            <input
                                type="password"
                                value={config.keys.anthropic || ''}
                                onChange={(e) => handleKeyChange('anthropic', e.target.value)}
                                className="w-full bg-zinc-900 border border-gray-700 rounded-lg p-3 focus:border-purple-600 focus:outline-none transition"
                                placeholder="sk-ant-..."
                            />
                        </div>
                    </div>
                </section>

                {/* Model Selection Section */}
                <section className="space-y-6">
                    <h3 className="text-xl font-bold border-b border-gray-700 pb-2">기본 모델 설정</h3>
                    <p className="text-sm text-gray-500">미스터리 생성에 사용할 주 모델을 선택하세요.</p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">제공자(Provider)</label>
                            <div className="flex bg-zinc-900 rounded-lg p-1 border border-gray-700">
                                {(['google', 'openai', 'anthropic'] as const).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setConfig(prev => ({ ...prev, activeModel: { provider: p, modelId: AI_MODELS[p][0].id } }))}
                                        className={`flex-1 py-2 text-sm font-bold uppercase rounded-md transition ${config.activeModel.provider === p ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">모델</label>
                            <select
                                value={config.activeModel.modelId}
                                onChange={(e) => setConfig(prev => ({ ...prev, activeModel: { ...prev.activeModel, modelId: e.target.value } }))}
                                className="w-full bg-zinc-900 border border-gray-700 rounded-lg p-3 focus:border-red-600 focus:outline-none"
                            >
                                {AI_MODELS[config.activeModel.provider].map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>
            </div>

            <div className="mt-12 flex justify-end">
                <button
                    onClick={handleSave}
                    className={`px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm transition-all shadow-xl ${saved ? 'bg-green-600 text-white scale-105' : 'bg-red-700 text-white hover:bg-red-600'}`}
                >
                    {saved ? '설정 저장 완료!' : '설정 저장하기'}
                </button>
            </div>
        </div>
    );
};

export default SettingsPage;
