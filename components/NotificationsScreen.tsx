import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, Heart, MessageCircle, Check, X, ShieldAlert, Loader2, Clock } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface NotificationsScreenProps {
    onBack: () => void;
    onUserClick: (username: string) => void;
}

interface Notification {
    id: string;
    type: string;
    is_read: boolean;
    created_at: string;
    target_id: string;
    actor: {
        username: string;
        full_name: string;
        avatar_url: string;
    };
    post: {
        id: string;
        image_url: string;
        caption: string;
    };
}

interface FollowRequest {
    id: string;
    follower_id: string;
    created_at: string;
    profiles: {
        username: string;
        full_name: string;
        avatar_url: string;
    };
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onBack, onUserClick }) => {
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<FollowRequest[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const aggregateNotifications = (rawNotifs: Notification[]): any[] => {
        // Separate notifications that should be aggregated (likes, comments) from others
        const toAggregate = rawNotifs.filter(n => n.type === 'like' || n.type === 'comment');
        const others = rawNotifs.filter(n => n.type !== 'like' && n.type !== 'comment');

        // Group by type + target_id (post)
        const groups: { [key: string]: Notification[] } = {};
        for (const notif of toAggregate) {
            const key = `${notif.type}_${notif.target_id}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(notif);
        }

        // Convert groups to aggregated notifications
        const aggregated = Object.values(groups).map(group => {
            // Sort by created_at descending to get latest first
            group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            const latest = group[0];
            return {
                ...latest,
                count: group.length,
                allActors: group.map(g => g.actor)
            };
        });

        // Combine and sort all by date
        const all = [...aggregated, ...others];
        all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return all;
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            setCurrentUserId(session.user.id);

            // 1. Fetch Follow Requests (Pending follows targeting me)
            const { data: requestData, error: reqError } = await supabase
                .from('follows')
                .select(`
          id,
          follower_id,
          created_at,
          profiles:follower_id (username, full_name, avatar_url)
        `)
                .eq('following_id', session.user.id)
                .eq('status', 'pending');

            if (reqError) throw reqError;
            setRequests((requestData as any) || []);

            // 2. Fetch General Notifications
            const { data: notifData, error: notifError } = await supabase
                .from('notifications')
                .select(`
          id,
          type,
          is_read,
          created_at,
          target_id,
          actor:actor_id (username, full_name, avatar_url),
          post:target_id (id, image_url, caption)
        `)
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (notifError) throw notifError;

            // Aggregate notifications
            const aggregated = aggregateNotifications((notifData as any) || []);
            setNotifications(aggregated);

        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestAction = async (requestId: string, actorId: string, action: 'confirm' | 'delete') => {
        if (!currentUserId) return;

        try {
            if (action === 'confirm') {
                const { error: followError } = await supabase
                    .from('follows')
                    .update({ status: 'accepted' })
                    .eq('id', requestId);

                if (followError) throw followError;

                await supabase
                    .from('notifications')
                    .delete()
                    .match({ user_id: currentUserId, actor_id: actorId, type: 'follow_request' });

                await supabase.from('notifications').insert({
                    user_id: actorId,
                    actor_id: currentUserId,
                    type: 'follow_accept'
                });

            } else {
                await supabase.from('follows').delete().eq('id', requestId);
                await supabase
                    .from('notifications')
                    .delete()
                    .match({ user_id: currentUserId, actor_id: actorId, type: 'follow_request' });
            }

            fetchData();
        } catch (error) {
            console.error('Error handling request:', error);
        }
    };

    const formatTime = (dateStr: string) => {
        const now = new Date();
        const past = new Date(dateStr);
        const diffInMs = now.getTime() - past.getTime();
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Agora';
        if (diffInHours < 24) return `${diffInHours}h`;
        return `${Math.floor(diffInHours / 24)}d`;
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-slate-50 items-center justify-center">
                <Loader2 className="animate-spin text-cyan-600 mb-2" size={32} />
                <p className="text-slate-500 font-medium">Carregando notificações...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 relative animate-in slide-in-from-right duration-300">

            {/* Header */}
            <div className="bg-white px-5 pt-6 pb-4 border-b border-slate-100 sticky top-0 z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="bg-slate-50 p-2 rounded-full hover:bg-slate-100 transition-colors">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <h1 className="text-2xl font-bold italic tracking-tight text-slate-900">Notificações</h1>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-24">

                {/* === SECTION 1: FOLLOW REQUESTS === */}
                {requests.length > 0 && (
                    <div className="border-b border-slate-200/60 pb-2">
                        <div className="px-6 py-4 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-900">Solicitações de Seguidores</h3>
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">{requests.length}</span>
                        </div>

                        <div className="space-y-1 px-2">
                            {requests.map((req) => (
                                <div key={req.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white transition-colors animate-in fade-in slide-in-from-bottom-2">
                                    <div
                                        className="flex items-center gap-3 flex-1 cursor-pointer"
                                        onClick={() => onUserClick(req.profiles?.username)}
                                    >
                                        <img
                                            src={req.profiles?.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop'}
                                            alt={req.profiles?.username}
                                            className="w-12 h-12 rounded-full object-cover border border-slate-100"
                                        />
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-slate-900 hover:text-cyan-600 transition-colors">@{req.profiles?.username}</span>
                                            <span className="text-xs text-slate-500">{req.profiles?.full_name}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRequestAction(req.id, req.follower_id, 'confirm'); }}
                                            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            Confirmar
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRequestAction(req.id, req.follower_id, 'delete'); }}
                                            className="bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-300 active:scale-95 transition-all"
                                        >
                                            Excluir
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* === SECTION 2: GENERAL ACTIVITY === */}
                <div className="pt-2 px-2 pb-4">
                    {notifications.length > 0 ? (
                        notifications.map((notif) => (
                            <NotificationItem
                                key={notif.id}
                                notif={notif}
                                formatTime={formatTime}
                                onUserClick={onUserClick}
                            />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Clock size={48} className="mb-4 opacity-20" />
                            <p className="text-sm font-medium">Nenhuma outra notificação.</p>
                        </div>
                    )}
                </div>

                {notifications.length > 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 opacity-50">
                        <Check size={24} className="mb-2" />
                        <p className="text-xs font-medium">Isso é tudo por enquanto</p>
                    </div>
                )}

            </div>
        </div>
    );
};

// Helper Component for Notification Row
const NotificationItem: React.FC<{ notif: any, formatTime: (d: string) => string, onUserClick: (u: string) => void }> = ({ notif, formatTime, onUserClick }) => {

    const getIcon = () => {
        switch (notif.type) {
            case 'like': return <Heart size={8} fill="currentColor" />;
            case 'comment': return <MessageCircle size={8} fill="currentColor" />;
            case 'new_follower':
            case 'follow_request':
            case 'follow_accept': return <UserPlus size={8} fill="currentColor" />;
            default: return <ShieldAlert size={8} />;
        }
    };

    const getBadgeColor = () => {
        switch (notif.type) {
            case 'like': return 'bg-red-500';
            case 'comment': return 'bg-cyan-500';
            case 'new_follower':
            case 'follow_request':
            case 'follow_accept': return 'bg-purple-500';
            default: return 'bg-orange-500';
        }
    };

    const getMessage = () => {
        const count = notif.count || 1;
        const otherCount = count - 1;

        switch (notif.type) {
            case 'new_follower': return 'começou a seguir você.';
            case 'follow_request': return 'enviou uma solicitação para seguir você.';
            case 'follow_accept': return 'aceitou sua solicitação para seguir.';
            case 'like':
                if (count === 1) return 'aplaudiu sua publicação.';
                return `e mais ${otherCount} pessoa${otherCount > 1 ? 's' : ''} aplaudiram sua publicação.`;
            case 'comment':
                if (count === 1) return 'comentou na sua publicação.';
                return `e mais ${otherCount} pessoa${otherCount > 1 ? 's' : ''} comentaram na sua publicação.`;
            default: return 'enviou um alerta.';
        }
    };

    return (
        <div
            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white transition-colors cursor-pointer active:scale-[0.99]"
            onClick={() => onUserClick(notif.actor?.username)}
        >
            <div className="relative flex-shrink-0">
                <img
                    src={notif.actor?.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop'}
                    alt="Actor"
                    className="w-12 h-12 rounded-full object-cover border border-slate-100"
                />
                {/* Show count badge for aggregated notifications */}
                {notif.count > 1 && (
                    <div className="absolute -top-1 -right-1 bg-cyan-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm">
                        {notif.count}
                    </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full">
                    <div className={`${getBadgeColor()} p-1 rounded-full text-white`}>
                        {getIcon()}
                    </div>
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 leading-snug">
                    <span className="font-bold hover:text-cyan-600 transition-colors">@{notif.actor?.username || 'usuário'}</span> {getMessage()}
                    <span className="text-slate-400 text-xs font-normal ml-1">{formatTime(notif.created_at)}</span>
                </p>
            </div>

            {/* Right Side: Post Image Preview */}
            {notif.post?.image_url && (
                <img src={notif.post.image_url} alt="Post preview" className="w-12 h-12 rounded-lg object-cover border border-slate-100 flex-shrink-0" />
            )}
        </div>
    );
};

export default NotificationsScreen;