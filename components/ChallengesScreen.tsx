import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Target, CheckCircle2, Circle, Loader2, Plus, Calendar, Zap, Clock, Flame, Award, PartyPopper, Trash2, MoreVertical } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from './Toast';
import NewChallengeModal from './NewChallengeModal';

interface Challenge {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    frequency: 'daily' | 'weekly' | 'monthly';
    times_per_period: number;
    target_count: number;
    current_count: number;
    status: 'active' | 'completed' | 'abandoned';
    started_at: string;
    completed_at: string | null;
    created_at: string;
    periodCheckIns?: number;
    canCheckIn?: boolean;
    totalCheckIns?: number;
}

interface ChallengesScreenProps {
    onBack: () => void;
}

const ChallengesScreen: React.FC<ChallengesScreenProps> = ({ onBack }) => {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [checkingInId, setCheckingInId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showMenuId, setShowMenuId] = useState<string | null>(null);

    useEffect(() => {
        fetchChallenges();
    }, []);

    const fetchChallenges = async () => {
        try {
            setIsLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: challengesData, error } = await supabase
                .from('challenges')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const now = new Date();
            const mapped = await Promise.all((challengesData || []).map(async (c: any) => {
                let periodStart: Date;
                if (c.frequency === 'daily') {
                    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                } else if (c.frequency === 'weekly') {
                    const dayOfWeek = now.getDay();
                    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
                } else {
                    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
                }

                const { count } = await supabase
                    .from('challenge_checkins')
                    .select('*', { count: 'exact', head: true })
                    .eq('challenge_id', c.id)
                    .eq('user_id', session.user.id)
                    .gte('checked_at', periodStart.toISOString());

                const { count: totalCount } = await supabase
                    .from('challenge_checkins')
                    .select('*', { count: 'exact', head: true })
                    .eq('challenge_id', c.id)
                    .eq('user_id', session.user.id);

                const periodCheckIns = count || 0;
                const timesPerPeriod = c.times_per_period || 1;
                const canCheckIn = periodCheckIns < timesPerPeriod;
                const totalCheckIns = totalCount || 0;

                return { ...c, periodCheckIns, canCheckIn, totalCheckIns };
            }));

            setChallenges(mapped);
        } catch (error: any) {
            console.error('Erro ao buscar desafios:', error);
            showToast('Erro ao carregar desafios', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (challengeId: string) => {
        if (deletingId) return;
        if (!window.confirm('Tem certeza que deseja excluir este desafio? Os posts relacionados também serão removidos.')) return;

        setDeletingId(challengeId);
        setShowMenuId(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado');

            await supabase.from('posts').delete().eq('challenge_id', challengeId).eq('user_id', session.user.id);
            await supabase.from('challenge_checkins').delete().eq('challenge_id', challengeId);
            const { error } = await supabase.from('challenges').delete().eq('id', challengeId).eq('user_id', session.user.id);

            if (error) throw error;

            showToast('Desafio excluído com sucesso', 'success');
            fetchChallenges();
        } catch (error: any) {
            console.error('Erro ao excluir desafio:', error);
            showToast(error.message || 'Erro ao excluir desafio', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const handleCheckIn = async (challenge: Challenge) => {
        if (!challenge.canCheckIn || challenge.status !== 'active') return;
        setCheckingInId(challenge.id);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado');

            const { error: checkinError } = await supabase.from('challenge_checkins').insert({
                challenge_id: challenge.id,
                user_id: session.user.id
            });

            if (checkinError) throw checkinError;

            const newPeriodCheckIns = (challenge.periodCheckIns || 0) + 1;
            const timesPerPeriod = challenge.times_per_period || 1;

            if (newPeriodCheckIns >= timesPerPeriod) {
                const newCount = challenge.current_count + 1;
                const isCompleted = newCount >= challenge.target_count;

                const updateData: any = { current_count: newCount, updated_at: new Date().toISOString() };
                if (isCompleted) {
                    updateData.status = 'completed';
                    updateData.completed_at = new Date().toISOString();
                }

                await supabase.from('challenges').update(updateData).eq('id', challenge.id);

                if (isCompleted) {
                    const frequencyLabel = { daily: 'dias', weekly: 'semanas', monthly: 'meses' }[challenge.frequency];
                    await supabase.from('posts').insert({
                        user_id: session.user.id,
                        type: 'challenge',
                        caption: `🏆 Desafio Concluído! 🎉\n\n"${challenge.title}"\n\n✅ Meta alcançada: ${challenge.target_count} ${frequencyLabel}\n🔥 Missão cumprida!\n\nNunca duvide da sua capacidade! 💪`,
                        challenge_id: challenge.id
                    });
                    showToast('🏆 Parabéns! Desafio concluído!', 'success');
                } else {
                    showToast(`🎉 Período completo! ${newCount}/${challenge.target_count}`, 'success');
                }
            } else {
                showToast(`Check-in! ${newPeriodCheckIns}/${timesPerPeriod} neste período`, 'success');
            }

            fetchChallenges();
        } catch (error: any) {
            console.error('Erro no check-in:', error);
            showToast(error.message || 'Erro ao fazer check-in', 'error');
        } finally {
            setCheckingInId(null);
        }
    };

    const getFrequencyIcon = (frequency: string) => {
        switch (frequency) {
            case 'daily': return Zap;
            case 'weekly': return Calendar;
            case 'monthly': return Clock;
            default: return Target;
        }
    };

    const getFrequencyLabel = (frequency: string) => {
        switch (frequency) {
            case 'daily': return 'dias';
            case 'weekly': return 'semanas';
            case 'monthly': return 'meses';
            default: return '';
        }
    };

    const getFrequencyColors = (frequency: string) => {
        switch (frequency) {
            case 'daily': return { bg: 'bg-orange-100', text: 'text-orange-600', bar: 'bg-orange-500' };
            case 'weekly': return { bg: 'bg-blue-100', text: 'text-blue-600', bar: 'bg-blue-500' };
            case 'monthly': return { bg: 'bg-purple-100', text: 'text-purple-600', bar: 'bg-purple-500' };
            default: return { bg: 'bg-slate-100', text: 'text-slate-600', bar: 'bg-slate-500' };
        }
    };

    const activeChallenges = challenges.filter(c => c.status === 'active');
    const completedChallenges = challenges.filter(c => c.status === 'completed');

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-300">
            <header className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 py-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Trophy className="text-orange-500" size={24} />
                        Meus Desafios
                    </h1>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-orange-500 mb-3" />
                        <p className="text-slate-500 font-medium">Carregando desafios...</p>
                    </div>
                ) : (
                    <div className="space-y-6 pt-4">
                        <section>
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Flame size={16} className="text-orange-500" />
                                Em Andamento ({activeChallenges.length})
                            </h2>

                            {activeChallenges.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Target size={32} className="text-orange-500" />
                                    </div>
                                    <p className="text-slate-600 font-medium mb-2">Nenhum desafio ativo</p>
                                    <p className="text-sm text-slate-400">Crie seu primeiro desafio e comece agora!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activeChallenges.map((challenge) => {
                                        const totalRequired = challenge.target_count * (challenge.times_per_period || 1);
                                        const progress = ((challenge.totalCheckIns || 0) / totalRequired) * 100;
                                        const colors = getFrequencyColors(challenge.frequency);
                                        const FreqIcon = getFrequencyIcon(challenge.frequency);

                                        return (
                                            <div key={challenge.id} className={`bg-white rounded-2xl border border-slate-100 p-4 shadow-sm relative ${deletingId === challenge.id ? 'opacity-50' : ''}`}>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-slate-800">{challenge.title}</h3>
                                                        {challenge.description && <p className="text-sm text-slate-500 mt-0.5">{challenge.description}</p>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`p-2 rounded-xl ${colors.bg}`}>
                                                            <FreqIcon size={18} className={colors.text} />
                                                        </div>
                                                        <div className="relative">
                                                            <button onClick={() => setShowMenuId(showMenuId === challenge.id ? null : challenge.id)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                                                <MoreVertical size={18} />
                                                            </button>
                                                            {showMenuId === challenge.id && (
                                                                <div className="absolute right-0 top-10 w-40 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                                    <button onClick={() => handleDelete(challenge.id)} disabled={deletingId === challenge.id} className="w-full flex items-center px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium">
                                                                        <Trash2 size={16} className="mr-2" />
                                                                        Excluir
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
                                                    <div className={`absolute inset-y-0 left-0 ${colors.bar} rounded-full transition-all duration-500`} style={{ width: `${Math.min(progress, 100)}%` }} />
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-slate-600">
                                                            {challenge.current_count}/{challenge.target_count} {getFrequencyLabel(challenge.frequency)}
                                                        </span>
                                                        {(challenge.times_per_period || 1) > 1 && (
                                                            <span className="text-xs text-orange-500 font-medium">
                                                                {challenge.periodCheckIns || 0}/{challenge.times_per_period} check-ins esta {challenge.frequency === 'weekly' ? 'semana' : 'mês'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button onClick={() => handleCheckIn(challenge)} disabled={!challenge.canCheckIn || checkingInId === challenge.id} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${!challenge.canCheckIn ? 'bg-green-100 text-green-600 cursor-default' : 'bg-orange-500 hover:bg-orange-600 text-white active:scale-95'} ${checkingInId === challenge.id ? 'opacity-70' : ''}`}>
                                                        {checkingInId === challenge.id ? <Loader2 size={16} className="animate-spin" /> : !challenge.canCheckIn ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                                        {!challenge.canCheckIn ? 'Completo!' : 'Check-in'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        {completedChallenges.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Award size={16} className="text-green-500" />
                                    Concluídos ({completedChallenges.length})
                                </h2>
                                <div className="space-y-3">
                                    {completedChallenges.map((challenge) => (
                                        <div key={challenge.id} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100 p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-green-100 p-2 rounded-xl">
                                                    <PartyPopper size={20} className="text-green-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-slate-800">{challenge.title}</h3>
                                                    <p className="text-xs text-green-600 font-semibold">✅ {challenge.target_count} {getFrequencyLabel(challenge.frequency)} concluídos</p>
                                                </div>
                                                <Trophy size={24} className="text-yellow-500" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>

            <button onClick={() => setIsModalOpen(true)} className="fixed bottom-24 right-6 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-xl shadow-orange-500/30 flex items-center justify-center active:scale-95 transition-all z-30">
                <Plus size={28} />
            </button>

            <NewChallengeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={fetchChallenges} />
        </div>
    );
};

export default ChallengesScreen;
