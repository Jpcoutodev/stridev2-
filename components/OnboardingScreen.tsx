import React, { useState } from 'react';
import { Target, Scale, Lock, Globe, Sparkles, ArrowRight, Check, Dumbbell, Flame, Heart, Activity, Trophy, ChefHat, Apple, Users, Zap, PartyPopper } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from './Toast';

interface OnboardingScreenProps {
    onComplete: () => void;
    userId: string;
}

const GOAL_OPTIONS = [
    { id: 'muscle', label: 'Ganhar massa muscular', icon: Dumbbell, color: 'from-orange-500 to-amber-500' },
    { id: 'weight_loss', label: 'Perder peso', icon: Flame, color: 'from-cyan-500 to-blue-500' },
    { id: 'conditioning', label: 'Melhorar condicionamento', icon: Activity, color: 'from-lime-500 to-green-500' },
    { id: 'maintain', label: 'Manter a forma', icon: Heart, color: 'from-green-500 to-emerald-500' },
];

const FEATURE_SLIDES = [
    {
        icon: Users,
        title: 'Seu Feed & Comunidade',
        description: 'Compartilhe sua evolução e inspire-se com outros atletas. Seu progresso motiva os outros!',
        color: 'from-cyan-500 to-blue-500',
        emoji: '💪'
    },
    {
        icon: Apple,
        title: 'Nutrição Inteligente',
        description: 'Tire uma foto do seu prato e nossa IA calcula calorias e macros instantaneamente!',
        color: 'from-lime-500 to-green-500',
        emoji: '🍎'
    },
    {
        icon: ChefHat,
        title: 'Chef IA',
        description: 'Receitas personalizadas para seu objetivo. Diga o que tem na geladeira e receba sugestões!',
        color: 'from-orange-500 to-amber-500',
        emoji: '👨‍🍳'
    },
    {
        icon: Trophy,
        title: 'Desafios Pessoais',
        description: 'Crie metas como "Musculação 4x por semana" e acompanhe seu progresso com check-ins!',
        color: 'from-yellow-500 to-orange-500',
        emoji: '🏆'
    },
];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete, userId }) => {
    const { showToast } = useToast();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Step 1: Goal
    const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
    const [customGoal, setCustomGoal] = useState('');

    // Step 2: Measurements
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');

    // Step 3: Privacy
    const [isPrivate, setIsPrivate] = useState(false);

    // Step 4: Features tour
    const [featureSlide, setFeatureSlide] = useState(0);

    const totalSteps = 4;

    const handleNext = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleSkip = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleFinish = async () => {
        setIsLoading(true);
        try {
            // Prepare goal
            const goal = selectedGoal === 'custom' ? customGoal :
                GOAL_OPTIONS.find(g => g.id === selectedGoal)?.label || '';

            // Update profile
            const { error } = await supabase
                .from('profiles')
                .update({
                    goal: goal || null,
                    weight: weight ? parseFloat(weight) : null,
                    height: height ? parseFloat(height) : null,
                    is_private: isPrivate,
                    onboarding_completed: true
                })
                .eq('id', userId);

            if (error) throw error;

            showToast('🎉 Bem-vindo ao Stride Up!', 'success');
            onComplete();
        } catch (error: any) {
            console.error('Erro ao salvar onboarding:', error);
            showToast('Erro ao salvar. Tente novamente.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const renderProgressBar = () => (
        <div className="px-6 pt-6">
            <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((step) => (
                    <div
                        key={step}
                        className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${step <= currentStep ? 'bg-gradient-to-r from-cyan-500 to-lime-400' : 'bg-slate-200'
                            }`}
                    />
                ))}
            </div>
            <p className="text-center text-sm text-slate-400 mt-2">
                Etapa {currentStep} de {totalSteps}
            </p>
        </div>
    );

    const renderStep1 = () => (
        <div className="flex-1 flex flex-col px-6 pb-6 animate-in fade-in slide-in-from-right duration-300">
            <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-500/30">
                    <Target size={40} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Qual é o seu objetivo?</h2>
                <p className="text-slate-500">Isso nos ajuda a personalizar sua experiência 🎯</p>
            </div>

            <div className="space-y-3 flex-1">
                {GOAL_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedGoal === option.id;
                    return (
                        <button
                            key={option.id}
                            onClick={() => setSelectedGoal(option.id)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${isSelected
                                ? 'border-cyan-500 bg-cyan-50 shadow-lg shadow-cyan-500/20'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center shadow-lg`}>
                                <Icon size={24} className="text-white" />
                            </div>
                            <span className={`font-semibold ${isSelected ? 'text-cyan-700' : 'text-slate-700'}`}>
                                {option.label}
                            </span>
                            {isSelected && (
                                <Check size={20} className="text-cyan-500 ml-auto" />
                            )}
                        </button>
                    );
                })}

                {/* Custom goal */}
                <button
                    onClick={() => setSelectedGoal('custom')}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${selectedGoal === 'custom'
                        ? 'border-cyan-500 bg-cyan-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
                        <Sparkles size={24} className="text-white" />
                    </div>
                    <span className={`font-semibold ${selectedGoal === 'custom' ? 'text-cyan-700' : 'text-slate-700'}`}>
                        Outro objetivo
                    </span>
                </button>

                {selectedGoal === 'custom' && (
                    <input
                        type="text"
                        value={customGoal}
                        onChange={(e) => setCustomGoal(e.target.value)}
                        placeholder="Ex: Ganhar 10kg de massa"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                    />
                )}
            </div>

            <div className="flex gap-3 mt-6">
                <button
                    onClick={handleSkip}
                    className="flex-1 py-4 text-slate-500 font-semibold rounded-2xl hover:bg-slate-100 transition-colors"
                >
                    Pular
                </button>
                <button
                    onClick={handleNext}
                    className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-lime-400 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/30 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                    Próximo
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="flex-1 flex flex-col px-4 pb-4 animate-in fade-in slide-in-from-right duration-300 overflow-y-auto">
            <div className="text-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-lime-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/30">
                    <Scale size={32} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Suas medidas</h2>
                <p className="text-slate-500 text-sm">Acompanhe sua evolução 📊</p>
            </div>

            <div className="space-y-3 flex-1">
                {/* Peso */}
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide text-center">
                        Peso atual
                    </label>
                    <div className="flex items-center justify-center gap-2">
                        <input
                            type="number"
                            inputMode="decimal"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="75"
                            className="w-24 text-center text-3xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg py-2 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                        />
                        <span className="text-lg font-bold text-slate-400">kg</span>
                    </div>
                </div>

                {/* Altura */}
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide text-center">
                        Altura
                    </label>
                    <div className="flex items-center justify-center gap-2">
                        <input
                            type="number"
                            inputMode="numeric"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            placeholder="175"
                            className="w-24 text-center text-3xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg py-2 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                        />
                        <span className="text-lg font-bold text-slate-400">cm</span>
                    </div>
                </div>

                {weight && height && (
                    <div className="bg-lime-50 rounded-xl p-3 border border-lime-200">
                        <p className="text-center text-lime-700 font-semibold text-sm">
                            💪 Vamos nessa!
                        </p>
                    </div>
                )}
            </div>

            <div className="flex gap-3 mt-4 pt-2">
                <button
                    onClick={handleSkip}
                    className="flex-1 py-3 text-slate-500 font-semibold rounded-xl hover:bg-slate-100 transition-colors text-sm"
                >
                    Pular
                </button>
                <button
                    onClick={handleNext}
                    className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-lime-400 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm"
                >
                    Próximo
                    <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="flex-1 flex flex-col px-6 pb-6 animate-in fade-in slide-in-from-right duration-300">
            <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-500/30">
                    {isPrivate ? <Lock size={40} className="text-white" /> : <Globe size={40} className="text-white" />}
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Privacidade do perfil</h2>
                <p className="text-slate-500">Você controla quem vê seu conteúdo 🔒</p>
            </div>

            <div className="space-y-4 flex-1">
                <button
                    onClick={() => setIsPrivate(false)}
                    className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${!isPrivate
                        ? 'border-cyan-500 bg-cyan-50 shadow-lg shadow-cyan-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${!isPrivate ? 'bg-cyan-500' : 'bg-slate-200'}`}>
                            <Globe size={24} className={!isPrivate ? 'text-white' : 'text-slate-500'} />
                        </div>
                        <div>
                            <h3 className={`font-bold ${!isPrivate ? 'text-cyan-700' : 'text-slate-700'}`}>Perfil Público</h3>
                            <p className="text-sm text-slate-500">Recomendado para motivar outros</p>
                        </div>
                        {!isPrivate && <Check size={24} className="text-cyan-500 ml-auto" />}
                    </div>
                    <p className="text-sm text-slate-500 ml-16">
                        Todos podem ver seus posts e acompanhar sua evolução. Inspire a comunidade! 🌟
                    </p>
                </button>

                <button
                    onClick={() => setIsPrivate(true)}
                    className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${isPrivate
                        ? 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isPrivate ? 'bg-orange-500' : 'bg-slate-200'}`}>
                            <Lock size={24} className={isPrivate ? 'text-white' : 'text-slate-500'} />
                        </div>
                        <div>
                            <h3 className={`font-bold ${isPrivate ? 'text-orange-700' : 'text-slate-700'}`}>Perfil Privado</h3>
                            <p className="text-sm text-slate-500">Mais controle sobre sua audiência</p>
                        </div>
                        {isPrivate && <Check size={24} className="text-orange-500 ml-auto" />}
                    </div>
                    <p className="text-sm text-slate-500 ml-16">
                        Apenas seguidores aprovados podem ver seus posts. Você decide quem te segue. 🔐
                    </p>
                </button>
            </div>

            <button
                onClick={handleNext}
                className="w-full py-4 mt-6 bg-gradient-to-r from-cyan-500 to-lime-400 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/30 hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
                Próximo
                <ArrowRight size={20} />
            </button>
        </div>
    );

    const renderStep4 = () => {
        const currentFeature = FEATURE_SLIDES[featureSlide];
        const Icon = currentFeature.icon;
        const isLastSlide = featureSlide === FEATURE_SLIDES.length - 1;

        return (
            <div className="flex-1 flex flex-col px-6 pb-6 animate-in fade-in slide-in-from-right duration-300">
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Conheça o Stride Up</h2>
                    <p className="text-slate-500 text-sm">Tudo que você precisa para evoluir 🚀</p>
                </div>

                {/* Feature Card */}
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className={`w-24 h-24 bg-gradient-to-br ${currentFeature.color} rounded-3xl flex items-center justify-center mb-6 shadow-2xl animate-in zoom-in duration-500`}>
                        <Icon size={48} className="text-white" />
                    </div>

                    <div className="text-6xl mb-4 animate-in fade-in duration-300">{currentFeature.emoji}</div>

                    <h3 className="text-2xl font-bold text-slate-900 mb-3 text-center animate-in fade-in slide-in-from-bottom duration-300">
                        {currentFeature.title}
                    </h3>

                    <p className="text-slate-500 text-center max-w-xs animate-in fade-in slide-in-from-bottom duration-500">
                        {currentFeature.description}
                    </p>
                </div>

                {/* Dots */}
                <div className="flex justify-center gap-2 my-6">
                    {FEATURE_SLIDES.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setFeatureSlide(idx)}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${idx === featureSlide
                                ? 'bg-cyan-500 w-8'
                                : 'bg-slate-300 hover:bg-slate-400'
                                }`}
                        />
                    ))}
                </div>

                {isLastSlide ? (
                    <button
                        onClick={handleFinish}
                        disabled={isLoading}
                        className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <PartyPopper size={20} />
                                Começar minha jornada!
                            </>
                        )}
                    </button>
                ) : (
                    <div className="flex gap-3">
                        <button
                            onClick={() => setFeatureSlide(FEATURE_SLIDES.length - 1)}
                            className="flex-1 py-4 text-slate-500 font-semibold rounded-2xl hover:bg-slate-100 transition-colors"
                        >
                            Pular tour
                        </button>
                        <button
                            onClick={() => setFeatureSlide(featureSlide + 1)}
                            className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-lime-400 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/30 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                        >
                            Próximo
                            <ArrowRight size={20} />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
            {/* Header with decorative gradient */}
            <div className="h-32 bg-gradient-to-br from-cyan-500 via-cyan-400 to-lime-400 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/20 rounded-full blur-2xl" />
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-lime-300/30 rounded-full blur-xl" />

                {/* Logo/Brand */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center">
                        <Zap size={24} className="text-cyan-500" />
                    </div>
                    <span className="text-white font-bold text-xl">Stride Up</span>
                </div>
            </div>

            {/* Progress Bar */}
            {renderProgressBar()}

            {/* Content */}
            <div className="flex-1 flex flex-col mt-4 overflow-y-auto">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
            </div>
        </div>
    );
};

export default OnboardingScreen;
