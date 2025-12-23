import React, { useState, useEffect } from 'react';
import { Search, UserPlus, UserCheck, ChevronLeft, MapPin, Grid, Users, ArrowLeft, Dumbbell, Lock, Clock, Loader2, MessageCircle } from 'lucide-react';
import { PostModel } from '../types';
import PostCard from './PostCard';
import { supabase } from '../supabaseClient';

interface UserProfile {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string;
    bio: string;
    location: string;
    followers: number;
    following: number;
    posts: number;
    is_private: boolean;
}

interface SearchScreenProps {
    targetUsername?: string | null;
    onBack?: () => void;
    onMessageClick?: (userId: string) => void;
}

const SearchScreen: React.FC<SearchScreenProps> = ({ targetUsername, onBack, onMessageClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);

    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [selectedUserPosts, setSelectedUserPosts] = useState<PostModel[]>([]);

    // State for Follow Status
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [pendingFollowingIds, setPendingFollowingIds] = useState<Set<string>>(new Set());
    const [pendingFollowerIds, setPendingFollowerIds] = useState<Set<string>>(new Set()); // Users who requested to follow ME
    const [acceptedFollowerIds, setAcceptedFollowerIds] = useState<Set<string>>(new Set()); // Users who follow ME (accepted)
    // Init
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setCurrentUserId(session.user.id);
                fetchFollowing(session.user.id);
            }
        });
    }, []);

    // Fetch Logic
    const fetchFollowing = async (userId: string) => {
        // 1. Who I follow
        const { data: followingData } = await supabase
            .from('follows')
            .select('following_id, status')
            .eq('follower_id', userId);

        if (followingData) {
            setFollowingIds(new Set(followingData.filter(f => f.status === 'accepted').map(f => f.following_id)));
            setPendingFollowingIds(new Set(followingData.filter(f => f.status === 'pending').map(f => f.following_id)));
        }

        // 2. Who followed ME
        const { data: followerData } = await supabase
            .from('follows')
            .select('follower_id, status')
            .eq('following_id', userId);

        if (followerData) {
            setPendingFollowerIds(new Set(followerData.filter(f => f.status === 'pending').map(f => f.follower_id)));
            setAcceptedFollowerIds(new Set(followerData.filter(f => f.status === 'accepted').map(f => f.follower_id)));
        }
    };

    const handleSearch = async (term: string) => {
        if (!term) {
            setUsers([]);
            return;
        }

        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .ilike('username', `%${term}%`)
            .limit(20);

        if (data) {
            setUsers(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchUserCounts = async (userId: string) => {
        const [postsCount, followersCount, followingCount] = await Promise.all([
            supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId).eq('status', 'accepted'),
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId).eq('status', 'accepted')
        ]);

        return {
            posts: postsCount.count || 0,
            followers: followersCount.count || 0,
            following: followingCount.count || 0
        };
    };

    const fetchUserPosts = async (userId: string) => {
        const { data } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (data) {
            const mappedPosts: PostModel[] = data.map((p: any) => ({
                id: p.id,
                userId: p.user_id,
                type: p.type,
                username: selectedUser?.username || '',
                userAvatar: selectedUser?.avatar_url || '',
                date: p.created_at,
                clapCount: p.clap_count || 0,
                caption: p.caption,
                imageUrl: p.image_url,
                weight: p.weight,
                measurements: p.measurements,
                workoutItems: p.workout_items
            }));
            setSelectedUserPosts(mappedPosts);
        }
    };

    useEffect(() => {
        const loadDeepLink = async () => {
            if (targetUsername) {
                const cleanTarget = targetUsername.replace('@', '');
                const { data } = await supabase.from('profiles').select('*').eq('username', cleanTarget).single();
                if (data) {
                    const counts = await fetchUserCounts(data.id);
                    setSelectedUser({ ...data, ...counts });
                    fetchUserPosts(data.id);
                }
            } else {
                setSelectedUser(null);
            }
        };
        loadDeepLink();
    }, [targetUsername]);

    const handleFollowAction = async (e: React.MouseEvent, user: UserProfile) => {
        e.stopPropagation();
        if (!currentUserId) return;

        const isFollowing = followingIds.has(user.id);
        const isPending = pendingFollowingIds.has(user.id);

        if (isFollowing || isPending) {
            const { error } = await supabase
                .from('follows')
                .delete()
                .match({ follower_id: currentUserId, following_id: user.id });

            if (!error) {
                const newFollowing = new Set(followingIds);
                newFollowing.delete(user.id);
                setFollowingIds(newFollowing);

                const newPending = new Set(pendingFollowingIds);
                newPending.delete(user.id);
                setPendingFollowingIds(newPending);

                if (isPending) {
                    await supabase.from('notifications').delete().match({
                        actor_id: currentUserId,
                        user_id: user.id,
                        type: 'follow_request'
                    });
                }
            }
        } else {
            const status = user.is_private ? 'pending' : 'accepted';
            const { error } = await supabase
                .from('follows')
                .insert({ follower_id: currentUserId, following_id: user.id, status });

            if (!error) {
                if (status === 'accepted') {
                    const newSet = new Set(followingIds);
                    newSet.add(user.id);
                    setFollowingIds(newSet);

                    await supabase.from('notifications').insert({
                        user_id: user.id,
                        actor_id: currentUserId,
                        type: 'new_follower'
                    });
                } else {
                    const newSet = new Set(pendingFollowingIds);
                    newSet.add(user.id);
                    setPendingFollowingIds(newSet);

                    await supabase.from('notifications').insert({
                        user_id: user.id,
                        actor_id: currentUserId,
                        type: 'follow_request'
                    });
                }
            }
        }
    };

    const getButtonConfig = (userId: string) => {
        const isFollowing = followingIds.has(userId);
        const isPending = pendingFollowingIds.has(userId);

        if (isFollowing) {
            return {
                text: 'Seguindo',
                icon: <UserCheck size={18} />,
                style: 'bg-slate-100 text-slate-600 border border-slate-200'
            };
        }
        if (isPending) {
            return {
                text: 'Solicitado',
                icon: <Clock size={18} />,
                style: 'bg-slate-100 text-slate-400 border border-slate-200 italic'
            };
        }
        return {
            text: 'Seguir',
            icon: <UserPlus size={18} />,
            style: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/30'
        };
    };

    const handleBack = () => {
        if (targetUsername && onBack) {
            onBack();
        } else {
            setSelectedUser(null);
        }
    };

    if (selectedUser) {
        const isFollowing = followingIds.has(selectedUser.id);
        const isRequester = pendingFollowerIds.has(selectedUser.id);
        const isFollower = acceptedFollowerIds.has(selectedUser.id);
        const canViewContent = !selectedUser.is_private || isFollowing || isRequester || isFollower;
        const btnConfig = getButtonConfig(selectedUser.id);

        return (
            <div className="flex flex-col h-full bg-slate-50 relative animate-in slide-in-from-right duration-300 overflow-y-auto no-scrollbar pb-24">
                <div className="absolute top-0 left-0 w-full p-4 z-20 flex justify-between items-center">
                    <button
                        onClick={handleBack}
                        className="bg-white/80 backdrop-blur-md p-2 rounded-full shadow-sm hover:bg-white text-slate-700 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    {currentUserId !== selectedUser.id && (
                        <button
                            onClick={() => onMessageClick?.(selectedUser.id)}
                            className="bg-white/80 backdrop-blur-md p-2 rounded-full shadow-sm hover:bg-white text-cyan-600 transition-colors"
                        >
                            <MessageCircle size={24} />
                        </button>
                    )}
                </div>

                <div className="bg-white pb-6 pt-16 px-6 rounded-b-[40px] shadow-sm mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-10"></div>
                    <div className="flex flex-col items-center relative z-10">
                        <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-cyan-400 to-blue-500 shadow-xl mb-3">
                            <img src={selectedUser.avatar_url || 'https://via.placeholder.com/150'} alt={selectedUser.full_name} className="w-full h-full rounded-full object-cover border-4 border-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">{selectedUser.full_name}</h1>
                        <p className="text-slate-500 font-medium mb-2">{selectedUser.username}</p>
                        <div className="flex items-center text-xs text-slate-400 font-semibold mb-4">
                            <MapPin size={12} className="mr-1" /> {selectedUser.location || 'Sem local'}
                        </div>
                        {currentUserId !== selectedUser.id && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => handleFollowAction(e, selectedUser)}
                                    className={`px-8 py-2.5 rounded-full font-bold text-sm transition-all shadow-lg active:scale-[0.98] flex items-center gap-2 ${btnConfig.style}`}
                                >
                                    {btnConfig.icon}
                                    {btnConfig.text}
                                </button>
                                <button
                                    onClick={() => onMessageClick?.(selectedUser.id)}
                                    className="p-2.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all active:scale-95"
                                >
                                    <MessageCircle size={20} />
                                </button>
                            </div>
                        )}
                        <div className="flex items-center gap-8 w-full justify-center mt-6">
                            <div className="flex flex-col items-center">
                                <span className="text-lg font-bold text-slate-800">{selectedUser.posts || 0}</span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Posts</span>
                            </div>
                            <div className="w-px h-6 bg-slate-200"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-lg font-bold text-slate-800">{selectedUser.followers || 0}</span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Seguidores</span>
                            </div>
                            <div className="w-px h-6 bg-slate-200"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-lg font-bold text-slate-800">{selectedUser.following || 0}</span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Seguindo</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-2 space-y-6">
                    {selectedUser.bio && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mx-4">
                            <p className="text-slate-600 text-sm leading-relaxed text-center italic">
                                "{selectedUser.bio}"
                            </p>
                        </div>
                    )}
                    <div className="pb-8">
                        <h3 className="px-4 text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Grid size={14} className="text-cyan-500" /> Publicações
                        </h3>
                        {canViewContent ? (
                            selectedUserPosts.length > 0 ? (
                                <div className="space-y-4">
                                    {selectedUserPosts.map(post => (
                                        <div key={post.id} className="animate-in slide-in-from-bottom-2 duration-500">
                                            <PostCard post={post} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                    <Dumbbell size={32} className="mb-2 opacity-30" />
                                    <p className="text-sm">Ainda sem publicações.</p>
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 px-8 text-center bg-white mx-4 rounded-3xl border border-slate-100 shadow-sm">
                                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                                    <Lock size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-1">Esta conta é privada</h3>
                                <p className="text-sm text-slate-500 leading-relaxed max-w-[200px]">
                                    Siga esta conta para ver suas fotos, vídeos e treinos.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 relative animate-in fade-in duration-300">
            <div className="px-6 pt-8 pb-4 bg-white/90 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-100">
                <h1 className="text-2xl font-bold italic tracking-tight text-slate-900 mb-4">Explorar</h1>
                <div className="relative group">
                    <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar usuários..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-100 border border-transparent focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 rounded-2xl py-3 pl-12 pr-4 text-slate-800 font-medium outline-none transition-all placeholder-slate-400"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4 pb-24">
                {loading && <div className="flex justify-center"><Loader2 className="animate-spin text-cyan-600" /></div>}
                {users.length > 0 ? (
                    users.map((user) => {
                        const btnConfig = getButtonConfig(user.id);
                        if (user.id === currentUserId) return null;

                        return (
                            <div
                                key={user.id}
                                onClick={async () => {
                                    const counts = await fetchUserCounts(user.id);
                                    setSelectedUser({ ...user, ...counts });
                                    fetchUserPosts(user.id);
                                }}
                                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <img src={user.avatar_url || 'https://via.placeholder.com/150'} alt={user.full_name} className="w-12 h-12 rounded-full object-cover border border-slate-100" />
                                        {user.is_private && (
                                            <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full">
                                                <div className="bg-slate-100 p-0.5 rounded-full">
                                                    <Lock size={10} className="text-slate-400" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900">{user.full_name}</span>
                                        <span className="text-xs text-slate-500 font-medium">{user.username}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => handleFollowAction(e, user)}
                                    className={`p-2.5 rounded-xl transition-all ${btnConfig.style}`}
                                >
                                    {btnConfig.icon}
                                </button>
                            </div>
                        );
                    })
                ) : (
                    !loading && (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <Users size={48} className="mb-4 opacity-30" />
                            <p className="text-sm font-medium">Digite para buscar.</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default SearchScreen;