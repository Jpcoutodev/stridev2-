import React, { useState, useEffect } from 'react';
import { Camera, User, Lock, Globe, Save, Ruler, Weight, MapPin, Loader2, LogOut, AtSign, AlertCircle, Target, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { compressImage, convertHeicToJpeg } from '../lib/imageUtils';
import { useToast } from './Toast';

interface ProfileScreenProps {
    onLogout: () => void;
    onUpdate?: () => void;
    onOpenFollowers?: (tab: 'followers' | 'following') => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogout, onUpdate, onOpenFollowers }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [initialUsername, setInitialUsername] = useState('');

    // Delete Account State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    const handleDeleteAccount = async () => {
        setIsDeletingAccount(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const userId = session.user.id;

            // 1. Delete Related Data (Best Effort)
            // Note: If RLS or FK constraints prevent this, we might need a backend edge function.
            // But we will try to clean up what we can from the client correctly.

            // Delete Posts (Cascade usually handles comments/likes, but we explicit just in case or if cascade missing)
            await supabase.from('posts').delete().eq('user_id', userId);

            // Delete Meals
            await supabase.from('meals').delete().eq('user_id', userId);

            // Delete Challenges (Creator)
            await supabase.from('challenges').delete().eq('user_id', userId);

            // Delete Participate/Checkins (Cascade should handle, but explicit if needed)
            await supabase.from('challenge_participants').delete().eq('user_id', userId);

            // Delete Messages/Conversations is tricky due to FKs. 
            // We usually let the database handle cascade for 'profiles' delete.
            // But let's try to delete the profile primarily.

            // 2. Delete Profile
            const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);

            if (profileError) {
                console.error("Profile delete error:", profileError);
                // If profile delete fails (e.g. FK constraint), we inform user to contact support
                // checking for specific FK codes could be good, but generic error also works.
                if (profileError.code?.startsWith('23')) { // FK violation
                    throw new Error('Não foi possível excluir todos os dados automaticamente devido a vínculos ativos. Por favor, contate o suporte para exclusão manual.');
                }
                throw profileError;
            }

            // 3. Sign Out (Use standard logout flow)
            showToast('Sua conta foi excluída permanentemente.', 'success');
            setTimeout(() => {
                onLogout(); // This triggers supabase.auth.signOut() in App.tsx
            }, 1000);

        } catch (error: any) {
            console.error('Error deleting account:', error);
            showToast(error.message || 'Erro ao excluir conta.', 'error');
            setIsDeletingAccount(false);
            setIsDeleteModalOpen(false); // Close modal on error to let user retry or see UI
        }
    };

    // State matches 'profiles' table columns
    const [profile, setProfile] = useState({
        id: '',
        full_name: '',
        username: '',
        bio: '',
        location: '',
        email: '',
        weight: '' as string | number,
        height: '' as string | number,
        goal: '',
        is_private: false,
        avatar_url: '',
        followers: 0,
        following: 0,
        posts: 0
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) return;

            // 1. Fetch Profile Data
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            // 2. Fetch Dynamic Counts using RPC (single query)
            const { data: stats } = await supabase.rpc('get_user_stats', { user_id_param: session.user.id });

            if (data) {
                setInitialUsername(data.username || '');
                setProfile({
                    ...data,
                    email: session.user.email || '',
                    weight: data.weight || '',
                    height: data.height || '',
                    goal: data.goal || '',
                    bio: data.bio || '',
                    location: data.location || '',
                    full_name: data.full_name || '',
                    username: data.username || '',
                    avatar_url: data.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
                    posts: stats?.posts || 0,
                    followers: stats?.followers || 0,
                    following: stats?.following || 0
                });
            }
        } catch (error: any) {
            console.error('Error loading profile:', error);
            setErrorMsg('Erro ao carregar perfil: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setProfile(prev => ({ ...prev, [field]: value }));
        if (errorMsg) setErrorMsg(null);
    };



    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const originalFile = e.target.files[0];

            try {
                // Step 1: Convert HEIC to JPEG if needed
                const convertedFile = await convertHeicToJpeg(originalFile);

                // Step 2: Compress (Profile pics can be smaller, e.g. 500px)
                const compressedFile = await compressImage(convertedFile, 500, 0.7);

                setSelectedImageFile(compressedFile);
                const url = URL.createObjectURL(compressedFile);
                setProfile(prev => ({ ...prev, avatar_url: url }));
            } catch (error) {
                console.error("Error compressing profile image:", error);
                showToast('Erro ao processar imagem de perfil.', 'error');
            }
        }
    };

    const parseNumber = (val: string | number) => {
        if (val === null || val === undefined || val === '') return null;
        if (typeof val === 'number') return val;
        const normalized = val.replace(',', '.');
        const num = parseFloat(normalized);
        return isNaN(num) ? null : num;
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            setErrorMsg(null);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // 1. Uniqueness check for username (only if it changed)
            if (profile.username !== initialUsername) {
                const cleanedUsername = profile.username.trim().replace('@', '');
                if (!cleanedUsername) {
                    setErrorMsg('O nome de usuário não pode estar vazio.');
                    setIsSaving(false);
                    return;
                }

                const { data: existingUser, error: checkError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', cleanedUsername)
                    .neq('id', session.user.id)
                    .single();

                if (existingUser) {
                    setErrorMsg('Este nome de usuário já está em uso.');
                    setIsSaving(false);
                    return;
                }
            }

            let finalAvatarUrl = profile.avatar_url;

            // 2. Upload Image Logic
            if (selectedImageFile) {
                const fileExt = selectedImageFile.name.split('.').pop();
                const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, selectedImageFile, {
                        cacheControl: '86400', // 24 hour cache for avatars
                        contentType: selectedImageFile.type || 'image/jpeg',
                        upsert: true // Allow overwriting avatar
                    });

                if (uploadError) {
                    throw new Error(`Erro no upload da imagem: ${uploadError.message}`);
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);

                finalAvatarUrl = publicUrl;
            }

            // 3. Update Profile Table
            const updates = {
                id: session.user.id,
                full_name: profile.full_name,
                username: profile.username.trim().replace('@', ''),
                bio: profile.bio,
                location: profile.location,
                weight: parseNumber(profile.weight),
                height: parseNumber(profile.height),
                goal: profile.goal,
                is_private: profile.is_private,
                avatar_url: finalAvatarUrl,
                updated_at: new Date(),
            };

            const { error } = await supabase.from('profiles').upsert(updates);

            if (error) {
                if (error.code === '23505') {
                    throw new Error('Este nome de usuário já está em uso.');
                }
                throw error;
            }

            setInitialUsername(updates.username);
            setProfile(prev => ({ ...prev, avatar_url: finalAvatarUrl, username: updates.username }));
            setSelectedImageFile(null);

            if (onUpdate) onUpdate();

            showToast('Perfil atualizado com sucesso!', 'success');
        } catch (error: any) {
            console.error(error);
            setErrorMsg(error.message || 'Ocorreu um erro ao salvar o perfil.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-slate-50 items-center justify-center">
                <Loader2 className="animate-spin text-cyan-600 mb-2" size={32} />
                <p className="text-slate-500 font-medium">Carregando seu perfil...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 relative animate-in fade-in duration-300 overflow-y-auto no-scrollbar pb-24">
            {/* Header / Cover Area */}
            <div className="bg-white pb-6 pt-8 px-6 rounded-b-[40px] shadow-sm mb-6 relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-gradient-to-br from-cyan-100 to-lime-100 rounded-full blur-3xl opacity-50"></div>
                <div className="absolute top-0 left-0 -mt-10 -ml-10 w-40 h-40 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full blur-3xl opacity-50"></div>

                <div className="flex flex-col items-center relative z-10">
                    {/* Avatar */}
                    <div className="relative group mb-4">
                        <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-cyan-400 to-lime-400 shadow-xl">
                            <div className="w-full h-full rounded-full border-4 border-white overflow-hidden bg-slate-200 relative">
                                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            </div>
                        </div>
                        <label className="absolute bottom-0 right-0 bg-slate-900 text-white p-2.5 rounded-full shadow-lg cursor-pointer hover:bg-cyan-600 transition-colors active:scale-95">
                            <Camera size={18} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        </label>
                    </div>

                    {/* Name & Username */}
                    <h1 className="text-2xl font-bold text-slate-900">{profile.full_name || 'Sem nome'}</h1>
                    <p className="text-slate-500 font-medium mb-6">@{profile.username || 'usuario'}</p>

                    {/* Stats Row */}
                    <div className="flex items-center gap-8 w-full justify-center">
                        <div className="flex flex-col items-center">
                            <span className="text-xl font-bold text-slate-800">{profile.posts || 0}</span>
                            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Treinos</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200"></div>
                        <div
                            className="flex flex-col items-center cursor-pointer hover:opacity-70 transition-opacity active:scale-95"
                            onClick={() => onOpenFollowers?.('followers')}
                        >
                            <span className="text-xl font-bold text-slate-800">{profile.followers || 0}</span>
                            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Seguidores</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200"></div>
                        <div
                            className="flex flex-col items-center cursor-pointer hover:opacity-70 transition-opacity active:scale-95"
                            onClick={() => onOpenFollowers?.('following')}
                        >
                            <span className="text-xl font-bold text-slate-800">{profile.following || 0}</span>
                            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Seguindo</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Form Content */}
            <div className="px-6 space-y-6">
                {errorMsg && (
                    <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl flex items-start gap-3 animate-in shake duration-300">
                        <AlertCircle size={20} className="shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">{errorMsg}</p>
                    </div>
                )}

                {/* Section: Basic Info */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <User size={16} className="text-cyan-500" /> Informações Básicas
                    </h3>

                    <div className="space-y-3">
                        <div className="relative">
                            <input
                                type="text"
                                value={profile.full_name}
                                onChange={(e) => handleChange('full_name', e.target.value)}
                                className="w-full bg-white border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 font-semibold"
                                placeholder="Nome Completo"
                            />
                            <span className="absolute right-4 top-3.5 text-slate-400 text-xs font-bold uppercase">Nome</span>
                        </div>

                        <div className="relative">
                            <AtSign size={16} className="absolute left-4 top-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={profile.username}
                                onChange={(e) => handleChange('username', e.target.value)}
                                className="w-full bg-white border border-slate-200 text-slate-800 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 font-semibold"
                                placeholder="nome_de_usuario"
                            />
                            <span className="absolute right-4 top-3.5 text-slate-400 text-xs font-bold uppercase">Arroba</span>
                        </div>

                        <div className="relative">
                            <textarea
                                value={profile.bio}
                                onChange={(e) => handleChange('bio', e.target.value)}
                                rows={3}
                                className="w-full bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 text-sm leading-relaxed resize-none"
                                placeholder="Escreva algo sobre seus objetivos fitness..."
                            ></textarea>
                        </div>

                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <MapPin size={16} className="absolute left-3 top-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={profile.location}
                                    onChange={(e) => handleChange('location', e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-600 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 text-sm"
                                    placeholder="Localização"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Physical Stats */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Ruler size={16} className="text-lime-500" /> Medidas
                    </h3>
                    <div className="flex gap-4">
                        <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-xs text-slate-400 font-bold uppercase">Peso</span>
                                <div className="flex items-baseline gap-1">
                                    <input
                                        type="text"
                                        value={profile.weight}
                                        onChange={(e) => handleChange('weight', e.target.value)}
                                        className="w-16 font-bold text-xl text-slate-800 bg-transparent focus:outline-none focus:border-b-2 focus:border-lime-400 p-0"
                                        placeholder="0"
                                    />
                                    <span className="text-sm text-slate-500 font-semibold">kg</span>
                                </div>
                            </div>
                            <div className="bg-lime-100 p-2 rounded-full text-lime-600">
                                <Weight size={20} />
                            </div>
                        </div>

                        <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-xs text-slate-400 font-bold uppercase">Altura</span>
                                <div className="flex items-baseline gap-1">
                                    <input
                                        type="text"
                                        value={profile.height}
                                        onChange={(e) => handleChange('height', e.target.value)}
                                        className="w-16 font-bold text-xl text-slate-800 bg-transparent focus:outline-none focus:border-b-2 focus:border-cyan-400 p-0"
                                        placeholder="0"
                                    />
                                    <span className="text-sm text-slate-500 font-semibold">cm</span>
                                </div>
                            </div>
                            <div className="bg-cyan-100 p-2 rounded-full text-cyan-600">
                                <Ruler size={20} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Fitness Goal */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Target size={16} className="text-orange-500" /> Objetivo Fitness
                    </h3>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-100 p-2.5 rounded-full text-orange-600 shrink-0">
                                <Target size={20} />
                            </div>
                            <div className="flex-1">
                                <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Minha Meta</span>
                                <input
                                    type="text"
                                    value={profile.goal}
                                    onChange={(e) => handleChange('goal', e.target.value)}
                                    className="w-full bg-transparent font-semibold text-slate-800 focus:outline-none focus:border-b-2 focus:border-orange-400 pb-1"
                                    placeholder="Ex: Ganhar 10kg de massa, Perder 20kg..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Privacy Settings */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Lock size={16} className="text-purple-500" /> Privacidade
                    </h3>

                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${profile.is_private ? 'bg-purple-100 text-purple-600' : 'bg-cyan-100 text-cyan-600'}`}>
                                    {profile.is_private ? <Lock size={20} /> : <Globe size={20} />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800">
                                        {profile.is_private ? 'Conta Privada' : 'Conta Pública'}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {profile.is_private ? 'Apenas seguidores podem ver seus posts' : 'Todos podem ver seus posts'}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => handleChange('is_private', !profile.is_private)}
                                className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${profile.is_private ? 'bg-purple-500' : 'bg-slate-200'}`}
                            >
                                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${profile.is_private ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`w-full py-4 ${isSaving ? 'bg-slate-400' : 'bg-slate-900'} text-white font-bold rounded-2xl shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4`}
                >
                    {isSaving ? (
                        <>
                            <Loader2 size={20} className="animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        <>
                            <Save size={20} />
                            Salvar Alterações
                        </>
                    )}
                </button>

                {/* Logout */}
                <button
                    onClick={onLogout}
                    className="w-full py-3 text-slate-500 font-semibold text-sm hover:bg-slate-100 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    <LogOut size={16} />
                    Sair da Conta
                </button>

                {/* Delete Account */}
                <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="w-full py-3 text-red-500 font-semibold text-sm hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    <Trash2 size={16} />
                    Excluir Conta e Dados
                </button>
            </div>

            {/* DELETE ACCOUNT CONFIRMATION MODAL */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6 border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
                        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle size={28} className="text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Excluir Conta Permanentemente?</h3>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            Essa ação é <strong>irreversível</strong>. Todos os seus posts, comentários, refeições, desafios e informações de perfil serão apagados para sempre.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleDeleteAccount}
                                disabled={isDeletingAccount}
                                className="w-full py-3.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {isDeletingAccount ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Apagando Dados...
                                    </>
                                ) : (
                                    'Sim, Excluir Tudo'
                                )}
                            </button>
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                disabled={isDeletingAccount}
                                className="w-full py-3.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-4">
                            Você será desconectado imediatamente após a exclusão.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileScreen;