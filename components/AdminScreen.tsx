import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
    Shield, AlertTriangle, Eye, RefreshCw, Trash2, Flag, MessageSquare, Bot,
    User, BarChart3, Menu, X, ChevronRight, Users, FileText, TrendingUp, Calendar,
    Activity, Clock
} from 'lucide-react';

// Types
interface Report {
    id: string;
    post_id: string;
    reporter_id: string;
    reason: string;
    created_at: string;
    reporter_username?: string;
    post_caption?: string;
    post_user_username?: string;
    type: 'user';
}

interface AIFlag {
    id: string;
    post_id: string;
    flagged_categories: string[];
    created_at: string;
    post_caption?: string;
    post_user_username?: string;
    type: 'ai';
}

type ModerationItem = Report | AIFlag;

interface Stats {
    totalUsers: number;
    newUsersToday: number;
    newUsersWeek: number;
    newUsersMonth: number;
    totalPosts: number;
    postsToday: number;
    postsWeek: number;
    postsMonth: number;
    totalChallenges: number;
    activeChallenges: number;
    totalMeals: number;
}

interface AdminScreenProps {
    onViewApp: () => void;
}

type ActivePage = 'moderation' | 'statistics';

const AdminScreen: React.FC<AdminScreenProps> = ({ onViewApp }) => {
    const [activePage, setActivePage] = useState<ActivePage>('moderation');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Moderation State
    const [items, setItems] = useState<ModerationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'reports' | 'ai'>('all');

    // Statistics State
    const [stats, setStats] = useState<Stats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    useEffect(() => {
        if (activePage === 'moderation') fetchAll();
        if (activePage === 'statistics') fetchStats();
    }, [activePage]);

    // ============ MODERATION FUNCTIONS ============
    const fetchAll = async () => {
        try {
            setLoading(true);
            const { data: reportsData } = await supabase
                .from('reports')
                .select(`id, post_id, reporter_id, reason, created_at, reporter:reporter_id (username), post:post_id (caption, user_id, profiles:user_id (username))`)
                .order('created_at', { ascending: false });

            const { data: aiData } = await supabase
                .from('ai_flags')
                .select(`id, post_id, flagged_categories, created_at, post:post_id (caption, user_id, profiles:user_id (username))`)
                .order('created_at', { ascending: false });

            const reports: ModerationItem[] = (reportsData || []).map((r: any) => ({
                id: r.id, post_id: r.post_id, reporter_id: r.reporter_id, reason: r.reason, created_at: r.created_at,
                reporter_username: r.reporter?.username || 'Anônimo',
                post_caption: r.post?.caption || '[Post sem texto]',
                post_user_username: r.post?.profiles?.username || 'Desconhecido',
                type: 'user' as const
            }));

            const aiFlags: ModerationItem[] = (aiData || []).map((a: any) => ({
                id: a.id, post_id: a.post_id, flagged_categories: a.flagged_categories || [], created_at: a.created_at,
                post_caption: a.post?.caption || '[Post sem texto]',
                post_user_username: a.post?.profiles?.username || 'Desconhecido',
                type: 'ai' as const
            }));

            const all = [...reports, ...aiFlags].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setItems(all);
        } catch (error) {
            console.error('Error fetching moderation items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm('Tem certeza que deseja EXCLUIR este post?')) return;
        setDeletingPostId(postId);
        try {
            const { error } = await supabase.from('posts').delete().eq('id', postId);
            if (error) throw error;
            setItems(prev => prev.filter(i => i.post_id !== postId));
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Erro ao excluir post');
        } finally {
            setDeletingPostId(null);
        }
    };

    const handleDismiss = async (item: ModerationItem) => {
        const table = item.type === 'user' ? 'reports' : 'ai_flags';
        try {
            await supabase.from(table).delete().eq('id', item.id);
            setItems(prev => prev.filter(i => i.id !== item.id));
        } catch (error) {
            console.error('Error dismissing:', error);
        }
    };

    // ============ STATISTICS FUNCTIONS ============
    const fetchStats = async () => {
        try {
            setStatsLoading(true);
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

            // Total users
            const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

            // New users today
            const { count: newUsersToday } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart);

            // New users this week
            const { count: newUsersWeek } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekStart);

            // New users this month
            const { count: newUsersMonth } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthStart);

            // Total posts
            const { count: totalPosts } = await supabase.from('posts').select('*', { count: 'exact', head: true });

            // Posts today
            const { count: postsToday } = await supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', todayStart);

            // Posts this week
            const { count: postsWeek } = await supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', weekStart);

            // Posts this month
            const { count: postsMonth } = await supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', monthStart);

            // Challenges
            const { count: totalChallenges } = await supabase.from('challenges').select('*', { count: 'exact', head: true });
            const { count: activeChallenges } = await supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('status', 'active');

            // Meals
            const { count: totalMeals } = await supabase.from('meals').select('*', { count: 'exact', head: true });

            setStats({
                totalUsers: totalUsers || 0,
                newUsersToday: newUsersToday || 0,
                newUsersWeek: newUsersWeek || 0,
                newUsersMonth: newUsersMonth || 0,
                totalPosts: totalPosts || 0,
                postsToday: postsToday || 0,
                postsWeek: postsWeek || 0,
                postsMonth: postsMonth || 0,
                totalChallenges: totalChallenges || 0,
                activeChallenges: activeChallenges || 0,
                totalMeals: totalMeals || 0,
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    // Filtered items for moderation
    const filteredItems = items.filter(i => {
        if (activeTab === 'all') return true;
        if (activeTab === 'reports') return i.type === 'user';
        if (activeTab === 'ai') return i.type === 'ai';
        return true;
    });
    const reportCount = items.filter(i => i.type === 'user').length;
    const aiCount = items.filter(i => i.type === 'ai').length;

    // ============ SIDEBAR ============
    const Sidebar = () => (
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-red-500 to-orange-500 p-2 rounded-xl">
                        <Shield className="text-white" size={20} />
                    </div>
                    <span className="text-lg font-bold text-white">Admin</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
                    <X size={24} />
                </button>
            </div>

            <nav className="p-4 space-y-2">
                <button
                    onClick={() => { setActivePage('moderation'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activePage === 'moderation' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
                >
                    <Flag size={20} />
                    <span className="font-medium">Moderação</span>
                    {items.length > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{items.length}</span>
                    )}
                </button>

                <button
                    onClick={() => { setActivePage('statistics'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activePage === 'statistics' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
                >
                    <BarChart3 size={20} />
                    <span className="font-medium">Estatísticas</span>
                </button>
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
                <button
                    onClick={onViewApp}
                    className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-white px-4 py-3 rounded-xl font-semibold transition-all"
                >
                    <Eye size={18} />
                    Ver App
                </button>
            </div>
        </aside>
    );

    // ============ MODERATION PAGE ============
    const ModerationPage = () => (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4">
                    <div className="bg-orange-500/20 p-3 rounded-xl"><Flag className="text-orange-400" size={24} /></div>
                    <div><p className="text-3xl font-bold text-white">{reportCount}</p><p className="text-sm text-slate-400">Denúncias</p></div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4">
                    <div className="bg-purple-500/20 p-3 rounded-xl"><Bot className="text-purple-400" size={24} /></div>
                    <div><p className="text-3xl font-bold text-white">{aiCount}</p><p className="text-sm text-slate-400">IA Detectou</p></div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4 col-span-2 lg:col-span-1">
                    <div className="bg-green-500/20 p-3 rounded-xl"><Shield className="text-green-400" size={24} /></div>
                    <div><p className="text-xl font-bold text-white">{items.length} Pendentes</p><p className="text-sm text-slate-400">Total para análise</p></div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-slate-800/40 p-1.5 rounded-xl w-fit">
                <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'all' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}>Todos ({items.length})</button>
                <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'reports' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}><Flag size={14} /> Denúncias</button>
                <button onClick={() => setActiveTab('ai')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'ai' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'}`}><Bot size={14} /> IA</button>
            </div>

            {/* Items */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent"></div></div>
                ) : filteredItems.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <Shield className="mx-auto text-green-400 mb-4" size={48} />
                        <p className="text-slate-400 font-medium">Nenhum item pendente!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-700/50">
                        {filteredItems.map((item) => (
                            <div key={item.id} className="p-4 md:p-6 hover:bg-slate-700/30 transition-colors">
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            {item.type === 'user' ? (
                                                <>
                                                    <div className="bg-orange-500/20 p-1.5 rounded-lg"><Flag size={14} className="text-orange-400" /></div>
                                                    <span className="text-orange-400 font-medium">Denúncia por</span>
                                                    <span className="text-white font-medium">{(item as Report).reporter_username}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="bg-purple-500/20 p-1.5 rounded-lg"><Bot size={14} className="text-purple-400" /></div>
                                                    <span className="text-purple-400 font-medium">IA Detectou</span>
                                                    {(item as AIFlag).flagged_categories?.slice(0, 2).map(cat => (
                                                        <span key={cat} className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs">{cat.replace(/_/g, ' ')}</span>
                                                    ))}
                                                </>
                                            )}
                                            <span className="text-slate-500 ml-auto text-xs">{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                                            <div className="flex items-center gap-2 mb-2">
                                                <User size={14} className="text-cyan-400" />
                                                <span className="text-sm font-medium text-cyan-400">@{item.post_user_username}</span>
                                            </div>
                                            <p className="text-slate-300 text-sm line-clamp-3">{item.post_caption}</p>
                                        </div>
                                    </div>
                                    <div className="flex md:flex-col gap-2">
                                        <button onClick={() => handleDeletePost(item.post_id)} disabled={deletingPostId === item.post_id} className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50">
                                            {deletingPostId === item.post_id ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-400 border-t-transparent" /> : <Trash2 size={16} />}
                                            <span>Excluir</span>
                                        </button>
                                        <button onClick={() => handleDismiss(item)} className="flex-1 flex items-center justify-center gap-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all">
                                            <Eye size={16} /><span>Ignorar</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    // ============ STATISTICS PAGE ============
    const StatisticsPage = () => (
        <div className="space-y-6">
            {statsLoading ? (
                <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div></div>
            ) : stats && (
                <>
                    {/* Users Section */}
                    <div>
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Users size={20} className="text-cyan-400" /> Usuários</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-3"><div className="bg-cyan-500/20 p-2 rounded-lg"><Users size={18} className="text-cyan-400" /></div></div>
                                <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
                                <p className="text-sm text-slate-400 mt-1">Total de usuários</p>
                            </div>
                            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-3"><div className="bg-green-500/20 p-2 rounded-lg"><TrendingUp size={18} className="text-green-400" /></div></div>
                                <p className="text-3xl font-bold text-white">{stats.newUsersToday}</p>
                                <p className="text-sm text-slate-400 mt-1">Hoje</p>
                            </div>
                            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-3"><div className="bg-blue-500/20 p-2 rounded-lg"><Calendar size={18} className="text-blue-400" /></div></div>
                                <p className="text-3xl font-bold text-white">{stats.newUsersWeek}</p>
                                <p className="text-sm text-slate-400 mt-1">Últimos 7 dias</p>
                            </div>
                            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-3"><div className="bg-purple-500/20 p-2 rounded-lg"><Clock size={18} className="text-purple-400" /></div></div>
                                <p className="text-3xl font-bold text-white">{stats.newUsersMonth}</p>
                                <p className="text-sm text-slate-400 mt-1">Últimos 30 dias</p>
                            </div>
                        </div>
                    </div>

                    {/* Posts Section */}
                    <div>
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FileText size={20} className="text-orange-400" /> Postagens</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-3"><div className="bg-orange-500/20 p-2 rounded-lg"><FileText size={18} className="text-orange-400" /></div></div>
                                <p className="text-3xl font-bold text-white">{stats.totalPosts}</p>
                                <p className="text-sm text-slate-400 mt-1">Total de posts</p>
                            </div>
                            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-3"><div className="bg-green-500/20 p-2 rounded-lg"><TrendingUp size={18} className="text-green-400" /></div></div>
                                <p className="text-3xl font-bold text-white">{stats.postsToday}</p>
                                <p className="text-sm text-slate-400 mt-1">Hoje</p>
                            </div>
                            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-3"><div className="bg-blue-500/20 p-2 rounded-lg"><Calendar size={18} className="text-blue-400" /></div></div>
                                <p className="text-3xl font-bold text-white">{stats.postsWeek}</p>
                                <p className="text-sm text-slate-400 mt-1">Últimos 7 dias</p>
                            </div>
                            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-3"><div className="bg-purple-500/20 p-2 rounded-lg"><Clock size={18} className="text-purple-400" /></div></div>
                                <p className="text-3xl font-bold text-white">{stats.postsMonth}</p>
                                <p className="text-sm text-slate-400 mt-1">Últimos 30 dias</p>
                            </div>
                        </div>
                    </div>

                    {/* Other Stats */}
                    <div>
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Activity size={20} className="text-lime-400" /> Outras Métricas</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                                <p className="text-3xl font-bold text-white">{stats.totalChallenges}</p>
                                <p className="text-sm text-slate-400 mt-1">Total Desafios</p>
                            </div>
                            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                                <p className="text-3xl font-bold text-white">{stats.activeChallenges}</p>
                                <p className="text-sm text-slate-400 mt-1">Desafios Ativos</p>
                            </div>
                            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 col-span-2 lg:col-span-1">
                                <p className="text-3xl font-bold text-white">{stats.totalMeals}</p>
                                <p className="text-sm text-slate-400 mt-1">Refeições Registradas</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <Sidebar />

            {/* Overlay for mobile sidebar */}
            {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

            {/* Main Content */}
            <div className="lg:ml-64 min-h-screen">
                {/* Header */}
                <header className="bg-slate-800/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-white">
                                    <Menu size={24} />
                                </button>
                                <h1 className="text-xl font-bold text-white">
                                    {activePage === 'moderation' ? 'Moderação' : 'Estatísticas'}
                                </h1>
                            </div>
                            <button onClick={activePage === 'moderation' ? fetchAll : fetchStats} className="p-2 hover:bg-slate-700/50 rounded-xl text-slate-400 hover:text-white transition-colors">
                                <RefreshCw size={20} />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {activePage === 'moderation' && <ModerationPage />}
                    {activePage === 'statistics' && <StatisticsPage />}
                </main>
            </div>
        </div>
    );
};

export default AdminScreen;
