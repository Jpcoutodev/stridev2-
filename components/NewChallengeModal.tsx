import React, { useState } from 'react';
import { X, Target, Calendar, Hash, Loader2, Trophy, Zap, Clock } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from './Toast';

interface NewChallengeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

const FREQUENCY_OPTIONS = [
    { value: 'daily', label: 'Diária', icon: Zap, color: 'text-orange-500', bg: 'bg-orange-100', description: 'Todo dia', periodLabel: 'por dia' },
    { value: 'weekly', label: 'Semanal', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-100', description: 'Por semana', periodLabel: 'por semana' },
    { value: 'monthly', label: 'Mensal', icon: Clock, color: 'text-purple-500', bg: 'bg-purple-100', description: 'Por mês', periodLabel: 'por mês' },
];

const NewChallengeModal: React.FC<NewChallengeModalProps> = ({ isOpen, onClose, onSave }) => {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [timesPerPeriod, setTimesPerPeriod] = useState(4);
    const [targetCount, setTargetCount] = useState(4);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!title.trim()) {
            showToast('Digite um título para o desafio', 'error');
            return;
        }

        if (targetCount < 1) {
            showToast('A meta deve ser de pelo menos 1', 'error');
            return;
        }

        setIsLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado');

            // 1. Criar o desafio
            const { data: challenge, error: challengeError } = await supabase
                .from('challenges')
                .insert({
                    user_id: session.user.id,
                    title: title.trim(),
                    description: description.trim() || null,
                    frequency,
                    times_per_period: frequency === 'daily' ? 1 : timesPerPeriod,
                    target_count: targetCount,
                    status: 'active'
                })
                .select()
                .single();

            if (challengeError) throw challengeError;

            // 2. Criar post automático no feed com informações completas
            const frequencyText = frequency === 'daily'
                ? 'todo dia'
                : frequency === 'weekly'
                    ? `${timesPerPeriod}x na semana`
                    : `${timesPerPeriod}x no mês`;

            const durationText = frequency === 'daily'
                ? `${targetCount} dias`
                : frequency === 'weekly'
                    ? `${targetCount} semana${targetCount > 1 ? 's' : ''}`
                    : `${targetCount} ${targetCount > 1 ? 'meses' : 'mês'}`;

            const { error: postError } = await supabase
                .from('posts')
                .insert({
                    user_id: session.user.id,
                    type: 'challenge',
                    caption: `🚀 Novo Desafio!\n\n🎯 ${title}\n📅 ${frequencyText} por ${durationText}\n\n💪 Bora lá!`,
                    challenge_id: challenge.id
                });

            if (postError) {
                console.error('Erro ao criar post:', postError);
                // Não falha se o post não for criado
            }

            showToast('Desafio criado com sucesso! 🎯', 'success');

            // Reset form
            setTitle('');
            setDescription('');
            setFrequency('weekly');
            setTimesPerPeriod(4);
            setTargetCount(4);

            onSave();
            onClose();
        } catch (error: any) {
            console.error('Erro ao criar desafio:', error);
            showToast(error.message || 'Erro ao criar desafio', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const getTargetLabel = () => {
        switch (frequency) {
            case 'daily': return 'dias';
            case 'weekly': return 'semanas';
            case 'monthly': return 'meses';
        }
    };

    const getPeriodLabel = () => {
        return FREQUENCY_OPTIONS.find(o => o.value === frequency)?.periodLabel || '';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto no-scrollbar">

                {/* Header */}
                <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-6 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 opacity-30"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-3 transform rotate-3">
                            <Trophy size={32} className="text-orange-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Novo Desafio</h2>
                        <p className="text-orange-100 text-sm mt-1">Defina sua meta e vá além!</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">

                    {/* Título */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                            <Target size={16} className="text-orange-500" />
                            Título do Desafio
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex: Fazer caminhada todos os dias"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 font-medium focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                        />
                    </div>

                    {/* Descrição */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                            Descrição (opcional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descreva seu desafio..."
                            rows={2}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-600 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all resize-none"
                        />
                    </div>

                    {/* Frequência */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                            <Calendar size={16} className="text-blue-500" />
                            Frequência
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {FREQUENCY_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setFrequency(opt.value as 'daily' | 'weekly' | 'monthly')}
                                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${frequency === opt.value
                                        ? `border-orange-500 bg-orange-50`
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                >
                                    <div className={`p-2 rounded-full ${opt.bg}`}>
                                        <opt.icon size={18} className={opt.color} />
                                    </div>
                                    <span className={`text-xs font-bold ${frequency === opt.value ? 'text-orange-600' : 'text-slate-600'}`}>
                                        {opt.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Vezes por Período (Only for weekly/monthly) */}
                    {frequency !== 'daily' && (
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                                <Zap size={16} className="text-orange-500" />
                                Quantas vezes {getPeriodLabel()}?
                            </label>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 flex items-center gap-2">
                                    <button
                                        onClick={() => setTimesPerPeriod(Math.max(1, timesPerPeriod - 1))}
                                        className="w-12 h-12 bg-orange-100 hover:bg-orange-200 rounded-xl text-orange-600 font-bold text-xl transition-colors"
                                    >
                                        -
                                    </button>
                                    <input
                                        type="number"
                                        value={timesPerPeriod}
                                        onChange={(e) => setTimesPerPeriod(Math.max(1, parseInt(e.target.value) || 1))}
                                        min={1}
                                        max={frequency === 'weekly' ? 7 : 30}
                                        className="flex-1 text-center text-3xl font-bold text-orange-600 bg-orange-50 border border-orange-200 rounded-xl py-2 focus:outline-none focus:border-orange-500"
                                    />
                                    <button
                                        onClick={() => setTimesPerPeriod(Math.min(frequency === 'weekly' ? 7 : 30, timesPerPeriod + 1))}
                                        className="w-12 h-12 bg-orange-100 hover:bg-orange-200 rounded-xl text-orange-600 font-bold text-xl transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                                <span className="text-lg text-orange-500 font-bold min-w-[100px]">x {getPeriodLabel()}</span>
                            </div>
                            <p className="text-xs text-slate-500">
                                Ex: Musculação <span className="font-bold text-orange-600">{timesPerPeriod}x</span> {getPeriodLabel()}
                            </p>
                        </div>
                    )}

                    {/* Meta */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                            <Hash size={16} className="text-lime-500" />
                            Meta: Quantos {getTargetLabel()}?
                        </label>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 flex items-center gap-2">
                                <button
                                    onClick={() => setTargetCount(Math.max(1, targetCount - 1))}
                                    className="w-12 h-12 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-bold text-xl transition-colors"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    value={targetCount}
                                    onChange={(e) => setTargetCount(Math.max(1, parseInt(e.target.value) || 1))}
                                    min={1}
                                    className="flex-1 text-center text-3xl font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl py-2 focus:outline-none focus:border-orange-500"
                                />
                                <button
                                    onClick={() => setTargetCount(targetCount + 1)}
                                    className="w-12 h-12 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-bold text-xl transition-colors"
                                >
                                    +
                                </button>
                            </div>
                            <span className="text-lg text-slate-500 font-medium min-w-[80px]">{getTargetLabel()}</span>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-4">
                        <p className="text-xs font-bold text-orange-600 uppercase mb-2">Preview do desafio</p>
                        <p className="text-slate-700 font-semibold">{title || 'Seu desafio aqui'}</p>
                        <p className="text-sm text-slate-500 mt-1">
                            🎯 {frequency === 'daily'
                                ? `Todo dia por ${targetCount} dias`
                                : `${timesPerPeriod}x ${getPeriodLabel()} por ${targetCount} ${getTargetLabel()}`}
                        </p>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !title.trim()}
                        className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Criando desafio...
                            </>
                        ) : (
                            <>
                                <Trophy size={20} />
                                Criar Desafio
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewChallengeModal;
