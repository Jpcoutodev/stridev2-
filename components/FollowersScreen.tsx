import React, { useState, useEffect } from 'react';
import { Search, ArrowLeft, UserPlus, UserCheck, Clock, Loader2, Users, UserMinus } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface UserProfile {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string;
}

interface FollowersScreenProps {
    onBack: () => void;
    onUserClick: (username: string) => void;
    initialTab?: 'followers' | 'following';
    targetUserId?: string | null;  // ID of user whose connections to view (null = current user)
    targetUsername?: string | null; // Username for display
}

const FollowersScreen: React.FC<FollowersScreenProps> = ({
    onBack,
    onUserClick,
    initialTab = 'followers',
    targetUserId = null,
    targetUsername = null
}) => {
    const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [viewingUserId, setViewingUserId] = useState<string | null>(null);
    const isViewingOwnProfile = !targetUserId || targetUserId === currentUserId;

    // Data
    const [followers, setFollowers] = useState<UserProfile[]>([]);
    const [following, setFollowing] = useState<UserProfile[]>([]);

    // Follow status for button states
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [pendingFollowingIds, setPendingFollowingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setCurrentUserId(session.user.id);
                const userIdToFetch = targetUserId || session.user.id;
                setViewingUserId(userIdToFetch);
                fetchData(userIdToFetch, session.user.id);
            }
        });
    }, [targetUserId]);

    const fetchData = async (userIdToView: string, currentUser: string) => {
        setLoading(true);
        try {
            // Fetch followers (people who follow the target user)
            const { data: followersData } = await supabase
                .from('follows')
                .select(`
                    follower_id,
                    status,
                    profiles:follower_id (id, full_name, username, avatar_url)
                `)
                .eq('following_id', userIdToView)
                .eq('status', 'accepted');

            if (followersData) {
                const mappedFollowers = followersData
                    .filter((f: any) => f.profiles)
                    .map((f: any) => ({
                        id: f.profiles.id,
                        full_name: f.profiles.full_name || '',
                        username: f.profiles.username || '',
                        avatar_url: f.profiles.avatar_url || ''
                    }));
                setFollowers(mappedFollowers);
            }

            // Fetch following (people the target user follows)
            const { data: followingData } = await supabase
                .from('follows')
                .select(`
                    following_id,
                    status,
                    profiles:following_id (id, full_name, username, avatar_url)
                `)
                .eq('follower_id', userIdToView)
                .eq('status', 'accepted');

            if (followingData) {
                const mappedFollowing = followingData
                    .filter((f: any) => f.profiles)
                    .map((f: any) => ({
                        id: f.profiles.id,
                        full_name: f.profiles.full_name || '',
                        username: f.profiles.username || '',
                        avatar_url: f.profiles.avatar_url || ''
                    }));
                setFollowing(mappedFollowing);
            }

            // Fetch current user's following status (for button states)
            const { data: myFollowingData } = await supabase
                .from('follows')
                .select('following_id, status')
                .eq('follower_id', currentUser);

            if (myFollowingData) {
                setFollowingIds(new Set(myFollowingData.filter((f: any) => f.status === 'accepted').map((f: any) => f.following_id)));
                setPendingFollowingIds(new Set(myFollowingData.filter((f: any) => f.status === 'pending').map((f: any) => f.following_id)));
            }

        } catch (error) {
            console.error('Error fetching followers/following:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFollowAction = async (targetUserId: string, isPrivate: boolean = false) => {
        if (!currentUserId) return;

        const isFollowing = followingIds.has(targetUserId);
        const isPending = pendingFollowingIds.has(targetUserId);

        if (isFollowing || isPending) {
            // Unfollow
            await supabase
                .from('follows')
                .delete()
                .match({ follower_id: currentUserId, following_id: targetUserId });

            const newFollowing = new Set(followingIds);
            newFollowing.delete(targetUserId);
            setFollowingIds(newFollowing);

            const newPending = new Set(pendingFollowingIds);
            newPending.delete(targetUserId);
            setPendingFollowingIds(newPending);

            // Update following list UI
            setFollowing(prev => prev.filter(u => u.id !== targetUserId));
        } else {
            // Follow
            const status = isPrivate ? 'pending' : 'accepted';
            await supabase
                .from('follows')
                .insert({ follower_id: currentUserId, following_id: targetUserId, status });

            if (status === 'accepted') {
                const newSet = new Set(followingIds);
                newSet.add(targetUserId);
                setFollowingIds(newSet);
            } else {
                const newSet = new Set(pendingFollowingIds);
                newSet.add(targetUserId);
                setPendingFollowingIds(newSet);
            }
        }
    };

    const handleUnfollow = async (targetUserId: string) => {
        if (!currentUserId) return;

        await supabase
            .from('follows')
            .delete()
            .match({ follower_id: currentUserId, following_id: targetUserId });

        const newFollowing = new Set(followingIds);
        newFollowing.delete(targetUserId);
        setFollowingIds(newFollowing);

        // Update following list UI
        setFollowing(prev => prev.filter(u => u.id !== targetUserId));
    };

    const handleRemoveFollower = async (followerId: string) => {
        if (!currentUserId) return;

        await supabase
            .from('follows')
            .delete()
            .match({ follower_id: followerId, following_id: currentUserId });

        // Update followers list UI
        setFollowers(prev => prev.filter(u => u.id !== followerId));
    };

    const getButtonConfig = (userId: string) => {
        const isFollowing = followingIds.has(userId);
        const isPending = pendingFollowingIds.has(userId);

        if (isFollowing) {
            return {
                text: 'Seguindo',
                icon: <UserCheck size={16} />,
                style: 'bg-slate-100 text-slate-600 border border-slate-200'
            };
        }
        if (isPending) {
            return {
                text: 'Solicitado',
                icon: <Clock size={16} />,
                style: 'bg-slate-100 text-slate-400 border border-slate-200'
            };
        }
        return {
            text: 'Seguir',
            icon: <UserPlus size={16} />,
            style: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
        };
    };

    // Filter users based on search
    const displayList = activeTab === 'followers' ? followers : following;
    const filteredList = searchTerm
        ? displayList.filter(u =>
            u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : displayList;

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-slate-50 items-center justify-center">
                <Loader2 className="animate-spin text-cyan-600 mb-2" size={32} />
                <p className="text-slate-500 font-medium">Carregando...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 relative animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white px-5 pt-6 pb-4 border-b border-slate-100 sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-4">
                    <button onClick={onBack} className="bg-slate-50 p-2 rounded-full hover:bg-slate-100 transition-colors">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <h1 className="text-2xl font-bold italic tracking-tight text-slate-900">
                        {isViewingOwnProfile ? 'Conexões' : `@${targetUsername || 'usuário'}`}
                    </h1>
                </div>

                {/* Tabs */}
                <div className="flex w-full mb-4">
                    <button
                        onClick={() => setActiveTab('followers')}
                        className="flex-1 relative pb-3 text-center focus:outline-none transition-colors"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <span className={`text-sm font-bold tracking-wide ${activeTab === 'followers' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                                Seguidores
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === 'followers' ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-400'}`}>
                                {followers.length}
                            </span>
                        </div>
                        {activeTab === 'followers' && (
                            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-cyan-500 rounded-t-full mx-8 animate-in fade-in duration-300" />
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('following')}
                        className="flex-1 relative pb-3 text-center focus:outline-none transition-colors"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <span className={`text-sm font-bold tracking-wide ${activeTab === 'following' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                                Seguindo
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === 'following' ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-400'}`}>
                                {following.length}
                            </span>
                        </div>
                        {activeTab === 'following' && (
                            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-cyan-500 rounded-t-full mx-8 animate-in fade-in duration-300" />
                        )}
                    </button>
                </div>

                {/* Search */}
                <div className="relative group">
                    <Search className="absolute left-4 top-3 text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder={`Buscar ${activeTab === 'followers' ? 'seguidores' : 'seguindo'}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-100 border border-transparent focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 rounded-xl py-2.5 pl-11 pr-4 text-slate-800 font-medium outline-none transition-all placeholder-slate-400 text-sm"
                    />
                </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2 pb-24">
                {filteredList.length > 0 ? (
                    filteredList.map((user) => {
                        const btnConfig = getButtonConfig(user.id);
                        const isFollowingUser = followingIds.has(user.id);

                        return (
                            <div
                                key={user.id}
                                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
                            >
                                <div
                                    className="flex items-center gap-3 flex-1 cursor-pointer"
                                    onClick={() => onUserClick(user.username)}
                                >
                                    <img
                                        src={user.avatar_url || 'https://via.placeholder.com/150'}
                                        alt={user.full_name}
                                        className="w-12 h-12 rounded-full object-cover border border-slate-100"
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900">{user.full_name || user.username}</span>
                                        <span className="text-xs text-slate-500 font-medium">@{user.username}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Don't show my own user in the list */}
                                    {user.id !== currentUserId && (
                                        <>
                                            {isViewingOwnProfile ? (
                                                // Viewing own profile - full control
                                                activeTab === 'following' ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleUnfollow(user.id); }}
                                                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center gap-1.5"
                                                    >
                                                        <UserCheck size={14} />
                                                        Seguindo
                                                    </button>
                                                ) : (
                                                    <>
                                                        {!isFollowingUser && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleFollowAction(user.id); }}
                                                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${btnConfig.style}`}
                                                            >
                                                                {btnConfig.icon}
                                                                {btnConfig.text}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleRemoveFollower(user.id); }}
                                                            className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                                                            title="Remover seguidor"
                                                        >
                                                            <UserMinus size={16} />
                                                        </button>
                                                    </>
                                                )
                                            ) : (
                                                // Viewing someone else's profile - only show follow button
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleFollowAction(user.id); }}
                                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${btnConfig.style}`}
                                                >
                                                    {btnConfig.icon}
                                                    {btnConfig.text}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Users size={48} className="mb-4 opacity-30" />
                        <p className="text-sm font-medium">
                            {searchTerm
                                ? 'Nenhum usuário encontrado.'
                                : activeTab === 'followers'
                                    ? isViewingOwnProfile ? 'Você ainda não tem seguidores.' : 'Este usuário ainda não tem seguidores.'
                                    : isViewingOwnProfile ? 'Você ainda não segue ninguém.' : 'Este usuário ainda não segue ninguém.'
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FollowersScreen;
