
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { Link, useNavigate } from 'react-router-dom';

import { DataManager } from '../../services/dataManager';
// Removed static import of gameSample (44MB)

import ImageUploader from '../../components/Editor/ImageUploader';
import Spinner from '../../components/Spinner';
import MessageModal from '../../components/UI/MessageModal';

interface StudioPageProps {
    isAdmin?: boolean;
}

const StudioPage: React.FC<StudioPageProps> = ({ isAdmin = false }) => {
    const { user, signInWithGoogle, signInWithKakao } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);

    // Metadata Editing State
    const [editingGame, setEditingGame] = useState<any>(null);
    const [editTitle, setEditTitle] = useState({ KO: '', EN: '' });
    const [editDesc, setEditDesc] = useState({ KO: '', EN: '' });
    const [editThumbnail, setEditThumbnail] = useState('');
    const [editIsPublic, setEditIsPublic] = useState(false);
    const [savingMeta, setSavingMeta] = useState(false);

    // Creation Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);

    // Asset Picker State
    const [assetPickerOpen, setAssetPickerOpen] = useState(false);
    const [assetImages, setAssetImages] = useState<string[]>([]);
    const [loadingAssets, setLoadingAssets] = useState(false);

    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'ALERT' | 'CONFIRM';
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
    } | null>(null);

    const showAlert = (title: string, message: string) => {
        setModalConfig({
            isOpen: true,
            type: 'ALERT',
            title,
            message,
            onConfirm: () => setModalConfig(null)
        });
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void, isDestructive = false) => {
        setModalConfig({
            isOpen: true,
            type: 'CONFIRM',
            title,
            message,
            onConfirm: () => {
                onConfirm();
                setModalConfig(null);
            },
            isDestructive
        });
    };

    useEffect(() => {
        if (user) fetchProjects();
    }, [user]);

    const fetchProjects = async () => {
        const { data, error } = await supabase
            .from('games')
            .select('id, title, description, thumbnail_url, is_public, created_at')
            .eq('owner_id', user?.id)
            .order('created_at', { ascending: false });

        if (!error) setProjects(data || []);
        setLoading(false);
    };

    const handleImportSample = async () => {
        if (!user) return;
        setImporting(true);
        try {
            // 1. Fetch Sample JSON dynamically to keep bundle size small
            const response = await fetch('/game_sample.json');
            const gameSample = await response.json();

            // 2. Create a skeleton game first to get the real UUID from Supabase
            const skeletonData = {
                ...gameSample,
                scenes: {},
                items: {},
                npcs: {}
            };

            const newId = await DataManager.saveGame(null, skeletonData as any, user.id, false);

            // 3. Process and optimize images using the REAL UUID for storage path
            console.log(`Starting optimization for game: ${newId}`);
            let gameData = { ...gameSample, id: newId };
            gameData = await DataManager.processGameDataImages(gameData, newId, (msg) => console.log(msg));

            // 4. Update the game with the full optimized data
            await DataManager.saveGame(newId, gameData as any, user.id, false);

            await fetchProjects();
            showAlert('Success', 'Sample game imported successfully!');
        } catch (e) {
            console.error(e);
            showAlert('Error', 'Failed to import sample.');
        } finally {
            setImporting(false);
        }
    };

    // Manual Creation Handler
    const handleManualCreate = async () => {
        if (!user) return;
        setCreating(true);
        try {
            const newId = `game_${Date.now()}`;
            const emptyGame = {
                id: newId,
                title: { KO: '제목 없는 미스터리', EN: 'Untitled Mystery' },
                description: { KO: '설명을 입력하세요.', EN: 'Enter description.' },
                startSceneId: 'scene_1',
                scenes: {
                    'scene_1': {
                        id: 'scene_1',
                        name: { KO: '시작 지점', EN: 'Start Point' },
                        visualStyle: 'ligne_claire',
                        imagePrompt: 'A mysterious room',
                        descriptionText: { KO: '게임이 시작되는 곳입니다.', EN: 'This is where the game begins.' },
                        hotspots: [],
                        npcIds: []
                    }
                },
                items: {},
                npcs: {},
                initialFlags: {}
            };

            await DataManager.saveGame(null, emptyGame as any, user.id, false);
            await fetchProjects();
            // Open in current tab
            const studioBase = isAdmin ? '/admin/studio' : '/user/studio';
            navigate(`${studioBase}/${newId}`);
            setShowCreateModal(false);
        } catch (e) {
            console.error(e);
            showAlert('Error', 'Failed to create game.');
        } finally {
            setCreating(false);
        }
    };

    const handleAiCreate = () => {
        navigate('/admin/wizard');
        setShowCreateModal(false);
    };

    const handleEditClick = (e: React.MouseEvent, game: any) => {
        e.preventDefault();
        e.stopPropagation(); // Stop propagation to prevent card click
        setEditingGame(game);
        setEditTitle(game.title || { KO: '', EN: '' });
        setEditDesc(game.description || { KO: '', EN: '' });
        setEditThumbnail(game.thumbnail_url || '');
        setEditIsPublic(game.is_public || false);
    };

    const handleSaveMetadata = async () => {
        if (!editingGame || !user) return;
        setSavingMeta(true);
        try {
            const { error } = await supabase
                .from('games')
                .update({
                    title: editTitle,
                    description: editDesc,
                    thumbnail_url: editThumbnail,
                    is_public: editIsPublic
                })
                .eq('id', editingGame.id);

            if (error) throw error;

            // Initial optimistic update or re-fetch
            await fetchProjects();
            setEditingGame(null); // Close modal
        } catch (e) {
            console.error(e);
            showAlert('Error', 'Failed to update game details.');
        } finally {
            setSavingMeta(false);
        }
    };

    const l = (val: any) => val?.['KO'] || val?.['EN'] || 'Untitled';

    const fetchAssets = async (gameId: string) => {
        setLoadingAssets(true);
        console.log(`Fetching assets for gameId: ${gameId}, path: games/${gameId}/optimized`);
        try {
            // List files in the optimized folder
            const { data, error } = await supabase.storage
                .from('game-assets')
                .list(`games/${gameId}/optimized`, {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'created_at', order: 'desc' },
                });

            if (error) {
                console.error('Supabase list error:', error);
                throw error;
            }

            console.log('Assets found:', data);

            if (data) {
                const filtered = data.filter(item => item.name !== '.emptyFolderPlaceholder' && (!item.metadata || item.metadata.mimetype?.startsWith('image/')));
                const urls = filtered.map(item => {
                    const { data: { publicUrl } } = supabase.storage
                        .from('game-assets')
                        .getPublicUrl(`games/${gameId}/optimized/${item.name}`);
                    return publicUrl;
                });
                setAssetImages(urls);
            }
        } catch (error) {
            console.error('Error fetching assets:', error);
            showAlert('Error', 'Failed to load assets. Check console for details.');
        } finally {
            setLoadingAssets(false);
        }
    };

    const handleOpenAssetPicker = () => {
        if (!editingGame) return;
        setAssetPickerOpen(true);
        fetchAssets(editingGame.id);
    };

    const [optimizingId, setOptimizingId] = useState<string | null>(null);

    const handleOptimize = async (e: React.MouseEvent, game: any) => {
        e.preventDefault();
        e.stopPropagation();

        const proceed = async () => {
            const gameId = game.id;
            setOptimizingId(gameId);
            try {
                const data = await DataManager.loadGame(gameId);
                if (!data) throw new Error('Game data not found');

                const optimizedData = await DataManager.processGameDataImages(data, gameId);
                await DataManager.saveGame(gameId, optimizedData, user!.id, game.is_public);

                showAlert('Success', 'Optimization complete!');
            } catch (e) {
                console.error(e);
                showAlert('Error', 'Optimization failed.');
            } finally {
                setOptimizingId(null);
            }
        };

        showConfirm('이미지 최적화', '대용량 내장 이미지를 최적화된 URL로 변환하시겠습니까?', proceed);
    };

    return (
        <div className="relative min-h-full">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold font-mystery text-red-600">내 스튜디오</h2>
                {isAdmin && (
                    <button
                        onClick={handleImportSample}
                        disabled={importing}
                        className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition"
                    >
                        {importing ? '가져오는 중...' : '샘플 게임 가져오기'}
                    </button>
                )}
            </div>

            {!user && !loading ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                    <div className="w-20 h-20 bg-red-900/10 border border-red-600/20 rounded-full flex items-center justify-center mb-8">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                    </div>
                    <h3 className="text-3xl font-bold font-mystery text-white mb-4">로그인이 필요합니다</h3>
                    <p className="text-zinc-500 max-w-md mx-auto mb-10 break-keep">
                        내 스튜디오에 접근하고 사건을 창조하시려면 로그인이 필요합니다.<br />
                        상단의 로그인 버튼을 이용해 주세요.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={signInWithGoogle}
                            className="flex items-center justify-center gap-3 px-8 py-3.5 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-all shadow-lg"
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-5.38z" fill="#EA4335" /></svg>
                            Google로 로그인
                        </button>
                        <button
                            onClick={signInWithKakao}
                            className="flex items-center justify-center gap-3 px-8 py-3.5 bg-[#FEE500] text-[#3C1E1E] rounded-xl font-bold hover:bg-[#FDD100] transition-all shadow-lg"
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.707 4.8 4.27 6.054l-.841 3.08c-.05.187.05.38.225.465a.434.434 0 00.187.042c.123 0 .242-.05.32-.143l3.64-2.47c.39.052.79.087 1.2.087 4.97 0 9-3.185 9-7.115S16.97 3 12 3z" fill="#3C1E1E" /></svg>
                            카카오로 로그인
                        </button>
                    </div>
                </div>
            ) : loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">Profiling Projects...</div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Create New Card */}
                    <div
                        onClick={() => setShowCreateModal(true)}
                        className="border border-dashed border-gray-700 rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer hover:border-red-600 hover:bg-zinc-900/50 transition group"
                    >
                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-red-600 transition mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 group-hover:text-white"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </div>
                        <span className="text-gray-400 group-hover:text-white font-bold uppercase tracking-widest text-sm text-center">새로운 미스터리 생성</span>
                    </div>

                    {/* Project List */}
                    {projects.map(p => (
                        <Link
                            to={`${isAdmin ? '/admin/studio' : '/user/studio'}/${p.id}`}
                            key={p.id}
                            className="border border-gray-800 bg-zinc-900/30 rounded-2xl p-6 hover:border-red-600/50 hover:bg-zinc-900 transition flex flex-col group relative"
                        >
                            {/* Edit Button - Z-Index Fixed */}
                            <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                <button
                                    onClick={(e) => handleOptimize(e, p)}
                                    className="p-2 bg-black/60 hover:bg-yellow-600 rounded-full text-zinc-300 hover:text-white transition backdrop-blur-sm"
                                    title="Optimize Images"
                                >
                                    {optimizingId === p.id ? (
                                        <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                                    )}
                                </button>
                                <button
                                    onClick={(e) => handleEditClick(e, p)}
                                    className="p-2 bg-black/60 hover:bg-red-600 rounded-full text-zinc-300 hover:text-white transition backdrop-blur-sm"
                                    title="Edit Details"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                </button>
                            </div>

                            <div className="flex bg-zinc-950 aspect-video mb-4 rounded-lg overflow-hidden relative z-10">
                                {p.thumbnail_url ? (
                                    <img src={p.thumbnail_url} className="w-full h-full object-cover" alt="Thumbnail" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-800 font-bold uppercase text-[10px] tracking-widest">No Image</div>
                                )}
                            </div>

                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white mb-2 truncate group-hover:text-red-500 transition">{l(p.title)}</h3>
                                <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5em]">{l(p.description) || 'No description...'}</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                                <span className={`px-2 py-1 rounded bg-black border ${p.is_public ? 'border-green-900 text-green-500' : 'border-zinc-800 text-zinc-500'}`}>
                                    {p.is_public ? 'PUBLIC' : 'DRAFT'}
                                </span>
                                <span className="text-zinc-600">{new Date(p.created_at).toLocaleDateString()}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Create New Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setShowCreateModal(false)}>
                    <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-2xl p-8 shadow-2xl space-y-8" onClick={e => e.stopPropagation()}>
                        <div className="text-center space-y-2">
                            <h3 className="text-3xl font-bold font-mystery text-white">새로운 미스터리 생성</h3>
                            <p className="text-zinc-500">새로운 사건을 생성할 방법을 선택하세요.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* AI Wizard Option */}
                            <button
                                onClick={handleAiCreate}
                                className="group relative h-64 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-red-600/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-6 transition-all"
                            >
                                <div className="p-4 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 group-hover:scale-110 transition-transform duration-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400"><path d="M12 2a10 10 0 1 0 10 10H12V2z" /><path d="M12 12 2.1 10.5M22 22l-10-10" /></svg>
                                </div>
                                <div className="text-center space-y-2">
                                    <h4 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">AI 어시스턴트</h4>
                                    <p className="text-sm text-zinc-500 break-keep">AI를 사용하여 전체 미스터리 구조를 생성합니다. 빠른 시작에 적합합니다.</p>
                                </div>
                            </button>

                            {/* Manual Option */}
                            <button
                                onClick={handleManualCreate}
                                disabled={creating}
                                className="group relative h-64 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-red-600/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-6 transition-all"
                            >
                                <div className="p-4 rounded-full bg-zinc-800 border border-zinc-700 group-hover:scale-110 transition-transform duration-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400 group-hover:text-white"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                </div>
                                <div className="text-center space-y-2">
                                    <h4 className="text-xl font-bold text-white group-hover:text-white transition-colors">직접 만들기</h4>
                                    <p className="text-sm text-zinc-500 break-keep">모든 디테일을 직접 구성합니다. 완벽한 제어를 원할 때 적합합니다.</p>
                                </div>
                            </button>
                        </div>

                        <div className="flex justify-center pt-4">
                            <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white text-sm font-bold uppercase tracking-widest">취소</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingGame && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <h3 className="text-xl font-bold text-white">게임 정보 수정</h3>
                            <button onClick={() => setEditingGame(null)} className="text-zinc-500 hover:text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Public/Private Toggle */}
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setEditIsPublic(!editIsPublic)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-[10px] font-bold uppercase tracking-widest ${editIsPublic
                                        ? 'bg-green-950/30 border-green-600/50 text-green-500 hover:bg-green-900/50'
                                        : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                                        }`}
                                >
                                    <div className={`w-2 h-2 rounded-full transition-colors ${editIsPublic ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-zinc-600'}`} />
                                    {editIsPublic ? 'Public' : 'Draft'}
                                </button>
                            </div>
                            {/* Thumbnail */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">썸네일</label>
                                <div className="h-40 bg-black rounded-xl border border-dashed border-zinc-800 overflow-hidden relative group">
                                    {editThumbnail ? (
                                        <img src={editThumbnail} className="w-full h-full object-cover opacity-50 group-hover:opacity-20 transition-opacity" alt="Preview" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">이미지 없음</div>
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ImageUploader onUpload={setEditThumbnail} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg" label="업로드" />
                                        <button
                                            onClick={handleOpenAssetPicker}
                                            className="bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                            에셋 선택
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">제목 (한글)</label>
                                    <input value={editTitle.KO} onChange={e => setEditTitle({ ...editTitle, KO: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-red-600 outline-none" placeholder="제목을 입력하세요..." />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">제목 (영어)</label>
                                    <input value={editTitle.EN} onChange={e => setEditTitle({ ...editTitle, EN: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-red-600 outline-none" placeholder="Title..." />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">설명 (한글)</label>
                                <textarea value={editDesc.KO} onChange={e => setEditDesc({ ...editDesc, KO: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-red-600 outline-none h-20 resize-none" placeholder="게임 설명을 입력하세요..." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">설명 (영어)</label>
                                <textarea value={editDesc.EN} onChange={e => setEditDesc({ ...editDesc, EN: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-red-600 outline-none h-20 resize-none" placeholder="Description..." />
                            </div>
                        </div>

                        <div className="flex justify-between gap-3 pt-4 border-t border-white/5 items-center">
                            <button
                                onClick={async () => {
                                    showConfirm(
                                        '게임 삭제',
                                        '정말 이 게임을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
                                        async () => {
                                            setSavingMeta(true);
                                            try {
                                                await DataManager.deleteGame(editingGame.id);
                                                await fetchProjects();
                                                setEditingGame(null);
                                            } catch (e) {
                                                showAlert('Error', '삭제에 실패했습니다.');
                                            } finally {
                                                setSavingMeta(false);
                                            }
                                        },
                                        true
                                    );
                                }}
                                className="px-4 py-2 rounded-lg text-xs font-bold bg-zinc-900 border border-zinc-800 text-red-700 hover:bg-red-950/30 hover:border-red-900 transition flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                삭제
                            </button>
                            <div className="flex gap-3">
                                <button onClick={() => setEditingGame(null)} className="px-5 py-2 rounded-lg text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition">취소</button>
                                <button onClick={handleSaveMetadata} disabled={savingMeta} className="px-5 py-2 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-500 shadow-lg">{savingMeta ? '저장 중...' : '변경사항 저장'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Asset Picker Modal */}
            {assetPickerOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setAssetPickerOpen(false)}>
                    <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">이미지 에셋 선택</h3>
                            <button onClick={() => setAssetPickerOpen(false)} className="text-zinc-500 hover:text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                            {loadingAssets ? (
                                <div className="flex justify-center py-20">
                                    <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : assetImages.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {assetImages.map((url, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setEditThumbnail(url);
                                                setAssetPickerOpen(false);
                                            }}
                                            className="group relative aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-white/5 hover:border-red-600 transition-colors"
                                        >
                                            <img src={url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Asset" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <span className="text-white text-xs font-bold uppercase tracking-widest border border-white px-3 py-1 rounded-full">Select</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 text-zinc-600">
                                    <p className="mb-2 text-4xl">📂</p>
                                    <p className="text-sm font-bold uppercase tracking-widest">No assets found</p>
                                    <p className="text-xs mt-2">Try importing a game or optimizing images first.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Importing Loading Overlay */}
            {importing && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <Spinner className="w-16 h-16 border-4 border-red-600 border-t-transparent" />
                    <h3 className="mt-8 text-2xl font-bold font-mystery text-white animate-pulse">Importing Mystery...</h3>
                    <p className="text-zinc-500 mt-2 text-sm uppercase tracking-widest">Optimizing assets and generating database...</p>
                </div>
            )}
            {modalConfig && (
                <MessageModal
                    isOpen={modalConfig.isOpen}
                    type={modalConfig.type}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    onConfirm={modalConfig.onConfirm}
                    onCancel={() => setModalConfig(null)}
                    isDestructive={modalConfig.isDestructive}
                />
            )}
        </div>
    );
};

export default StudioPage;
