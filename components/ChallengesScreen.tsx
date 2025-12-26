import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Target, CheckCircle2, Circle, Loader2, Plus, Calendar, Zap, Clock, Flame, Award, PartyPopper } from 'lucide-react';
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
    periodCheckIns?: number; // Check-ins feitos neste período (dia/semana/mês)
    canCheckIn?: boolean;
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

    useEffect(() => {
        fetchChallenges();
    }, []);

    const fetchChallenges = async () => {
        try {
            setIsLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Buscar desafios
            const { data: challengesData, error } = await supabase
                .from('challenges')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Calcular período atual para cada desafio
            const now = new Date();
            const mapped = await Promise.all((challengesData || []).map(async (c: any) => {
                // Determinar início do período
                let periodStart: Date;
                if (c.frequency === 'daily') {
                    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                } else if (c.frequency === 'weekly') {
                    const dayOfWeek = now.getDay();
                    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Segunda = início
                    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
                } else {
                    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
                }

                // Contar check-ins do período
                const { count } = await supabase
                    .from('challenge_checkins')
                    .select('*', { count: 'exact', head: true })
                    .eq('challenge_id', c.id)
                    .eq('user_id', session.user.id)
                    .gte('checked_at', periodStart.toISOString());

                const periodCheckIns = count || 0;
                const timesPerPeriod = c.times_per_period || 1;
                const canCheckIn = periodCheckIns < timesPerPeriod;

                return {
                    ...c,
                    periodCheckIns,
                    canCheckIn
                };
            }));

            setChallenges(mapped);
        } catch (error: any) {
            console.error('Erro ao buscar desafios:', error);
            showToast('Erro ao carregar desafios', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckIn = async (challenge: Challenge) => {
        if (!challenge.canCheckIn || challenge.status !== 'active') return;

        setCheckingInId(challenge.id);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado');

            const today = new Date().toISOString().split('T')[0];

            // 1. Inserir check-in
            const { error: checkinError } = await supabase
                .from('challenge_checkins')
                .insert({
                    challenge_id: challenge.id,
                    user_id: session.user.id
                });

            // 2. Verificar se completou todos os check-ins do período
            const newPeriodCheckIns = (challenge.periodCheckIns || 0) + 1;
            const timesPerPeriod = challenge.times_per_period || 1;

            // Se completou todos check-ins deste período, incrementar current_count
            if (newPeriodCheckIns >= timesPerPeriod) {
                const newCount = challenge.current_count + 1;
                const isCompleted = newCount >= challenge.target_count;

                const updateData: any = {
                    current_count: newCount,
                    updated_at: new Date().toISOString()
                };

                if (isCompleted) {
                    updateData.status = 'completed';
                    updateData.completed_at = new Date().toISOString();
                }

                const { error: updateError } = await supabase
                    .from('challenges')
                    .update(updateData)
                    .eq('id', challenge.id);

                if (updateError) throw updateError;

                // 3. Se completou, criar post de conclusão
                if (isCompleted) {
                    const frequencyLabel = {
                        daily: 'dias',
                        weekly: 'semanas',
                        monthly: 'meses'
                    }[challenge.frequency];

                    await supabase
                        .from('posts')
                        .insert({
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
                // Ainda faltam check-ins neste período
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
            {/* Header */}
            <header className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 py-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Trophy className="text-orange-500" size={24} />
                            Meus Desafios
                        </h1>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-orange-500 mb-3" />
                        <p className="text-slate-500 font-medium">Carregando desafios...</p>
                    </div>
                ) : (
                    <div className="space-y-6 pt-4">
                        {/* Active Challenges */}
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
                                        const progress = (challenge.current_count / challenge.target_count) * 100;
                                        const colors = getFrequencyColors(challenge.frequency);
                                        const FreqIcon = getFrequencyIcon(challenge.frequency);

                                        return (
                                            <div
                                                key={challenge.id}
                                                className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm"
                                            >
                                                {/* Title Row */}
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-slate-800">{challenge.title}</h3>
                                                        {challenge.description && (
                                                            <p className="text-sm text-slate-500 mt-0.5">{challenge.description}</p>
                                                        )}
                                                    </div>
                                                    <div className={`p-2 rounded-xl ${colors.bg}`}>
                                                        <FreqIcon size={18} className={colors.text} />
                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
                                                    <div
                                                        className={`absolute inset-y-0 left-0 ${colors.bar} rounded-full transition-all duration-500`}
                                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                                    />
                                                </div>

                                                {/* Stats Row */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-slate-600">
                                                            {challenge.current_count}/{challenge.target_count} {getFrequencyLabel(challenge.frequency)}
                                                        </span>
                                                        {challenge.times_per_period > 1 && (
                                                            <span className="text-xs text-orange-500 font-medium">
                                                                {challenge.periodCheckIns || 0}/{challenge.times_per_period} check-ins esta {challenge.frequency === 'weekly' ? 'semana' : 'mês'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Check-in Button */}
                                                    <button
                                                        onClick={() => handleCheckIn(challenge)}
                                                        disabled={!challenge.canCheckIn || checkingInId === challenge.id}
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${!challenge.canCheckIn
                                                            ? 'bg-green-100 text-green-600 cursor-default'
                                                            : 'bg-orange-500 hover:bg-orange-600 text-white active:scale-95'
                                                            } ${checkingInId === challenge.id ? 'opacity-70' : ''}`}
                                                    >
                                                        {checkingInId === challenge.id ? (
                                                            <Loader2 size={16} className="animate-spin" />
                                                        ) : !challenge.canCheckIn ? (
                                                            <CheckCircle2 size={16} />
                                                        ) : (
                                                            <Circle size={16} />
                                                        )}
                                                        {!challenge.canCheckIn ? 'Completo!' : 'Check-in'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        {/* Completed Challenges */}
                        {completedChallenges.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Award size={16} className="text-green-500" />
                                    Concluídos ({completedChallenges.length})
                                </h2>

                                <div className="space-y-3">
                                    {completedChallenges.map((challenge) => {
                                        const colors = getFrequencyColors(challenge.frequency);

                                        return (
                                            <div
                                                key={challenge.id}
                                                className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100 p-4"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-green-100 p-2 rounded-xl">
                                                        <PartyPopper size={20} className="text-green-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-slate-800">{challenge.title}</h3>
                                                        <p className="text-xs text-green-600 font-semibold">
                                                            ✅ {challenge.target_count} {getFrequencyLabel(challenge.frequency)} concluídos
                                                        </p>
                                                    </div>
                                                    <Trophy size={24} className="text-yellow-500" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>

            {/* FAB - New Challenge */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-24 right-6 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-xl shadow-orange-500/30 flex items-center justify-center active:scale-95 transition-all z-30"
            >
                <Plus size={28} />
            </button>

            {/* Modal */}
            <NewChallengeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchChallenges}
            />
        </div>
    );
};

export default ChallengesScreen;
