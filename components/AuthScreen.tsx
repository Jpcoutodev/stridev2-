import React, { useState } from 'react';
import { Mail, Lock, User, Calendar, MapPin, AtSign, ArrowRight, Loader2, ArrowLeft, Send } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from './Toast';

interface AuthScreenProps {
    onLogin: () => void;
    onOpenLegal?: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onOpenLegal }) => {
    const { showToast } = useToast();
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [city, setCity] = useState('');
    const [handle, setHandle] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);

    // Formatar data de nascimento no formato DD/MM/AAAA
    const formatDobInput = (value: string) => {
        // Remove tudo que não é número
        const numbers = value.replace(/\D/g, '');

        // Aplica a máscara DD/MM/AAAA
        if (numbers.length <= 2) {
            return numbers;
        } else if (numbers.length <= 4) {
            return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
        } else {
            return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
        }
    };

    // Converter DD/MM/AAAA para AAAA-MM-DD (formato do banco)
    const convertDobToIso = (dobFormatted: string): string | null => {
        const parts = dobFormatted.split('/');
        if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return null;
    };

    const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatDobInput(e.target.value);
        setDob(formatted);
    };

    const handleRecovery = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'https://stridev2.vercel.app/reset-password', // Update this with your actual redirect URL or handle standard reset
            });
            if (error) throw error;
            showToast('Se o email estiver cadastrado, você receberá um link para redefinir sua senha.', 'success');
            setIsRecoveryMode(false);
        } catch (error: any) {
            setErrorMessage(error.message || 'Erro ao enviar email de recuperação.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage(null);

        try {
            if (isLoginMode) {
                // Login
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                // Successful login is detected by App.tsx via onAuthStateChange
            } else {
                // Registration - validar confirmação de senha
                if (password !== confirmPassword) {
                    setErrorMessage('As senhas não coincidem.');
                    setIsLoading(false);
                    return;
                }

                // Validar formato da data
                const dobIso = convertDobToIso(dob);
                if (!dobIso) {
                    setErrorMessage('Data de nascimento inválida. Use o formato DD/MM/AAAA.');
                    setIsLoading(false);
                    return;
                }

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    // Passing metadata for the trigger, BUT we also manually insert just in case the trigger is missing
                    options: {
                        data: {
                            name,
                            handle,
                            city,
                            dob: dobIso
                        }
                    }
                });
                if (error) throw error;

                // Manual profile creation backup (if trigger fails or doesn't exist)
                if (data.user) {
                    const { error: profileError } = await supabase.from('profiles').insert({
                        id: data.user.id,
                        full_name: name,
                        username: handle,
                        location: city,
                        birth_date: dobIso || null,
                        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200'
                    });
                    if (profileError) {
                        // Ignore duplicate key error (if trigger worked)
                        if (profileError.code !== '23505') {
                            console.error("Profile creation error", profileError);
                        }
                    }
                }

                showToast('Cadastro realizado! Se o login não for automático, faça login agora.', 'success');
                setIsLoginMode(true);
            }
        } catch (error: any) {
            setErrorMessage(error.message || 'Ocorreu um erro.');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLoginMode(!isLoginMode);
        setIsRecoveryMode(false);
        setErrorMessage(null);
    };

    const toggleRecovery = () => {
        setIsRecoveryMode(!isRecoveryMode);
        setErrorMessage(null);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">

            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-[40px] overflow-hidden relative z-10 animate-in fade-in zoom-in duration-300">

                {/* Header / Logo Area */}
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 opacity-30 pattern-grid-lg"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4 transform rotate-3">
                            <img
                                src="https://qgbxduvipeadycxremqa.supabase.co/storage/v1/object/public/logo/logos/logo%203.png"
                                alt="Logo"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    if (e.currentTarget.parentElement) {
                                        e.currentTarget.parentElement.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0891b2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7 7"/><path d="m14 21 7-7"/></svg>';
                                    }
                                }}
                                className="w-full h-full object-cover rounded-xl"
                            />
                        </div>
                        <h1 className="text-3xl font-bold text-white italic tracking-tight">Stride Up</h1>
                        <p className="text-cyan-100 text-sm font-medium mt-1">Sua jornada fitness social.</p>
                    </div>
                </div>

                {/* Form Container */}
                <div className="p-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
                        {isRecoveryMode
                            ? 'Recuperar Senha'
                            : (isLoginMode ? 'Bem-vindo de volta!' : 'Crie sua conta')}
                    </h2>

                    {errorMessage && (
                        <div className="bg-red-50 text-red-500 text-xs font-bold p-3 rounded-xl mb-4 border border-red-100">
                            {errorMessage}
                        </div>
                    )}

                    <form onSubmit={isRecoveryMode ? handleRecovery : handleSubmit} className="space-y-4">

                        {isRecoveryMode && (
                            <div className="space-y-4 animate-in slide-in-from-right duration-300">
                                <p className="text-sm text-slate-500 text-center mb-4">
                                    Digite seu email para receber um link de redefinição de senha.
                                </p>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={20} />
                                    </div>
                                    <input
                                        required
                                        type="email"
                                        placeholder="Seu email cadastrado"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all font-medium"
                                    />
                                </div>
                            </div>
                        )}

                        {/* --- REGISTRATION ONLY FIELDS --- */}
                        {!isLoginMode && !isRecoveryMode && (
                            <div className="space-y-4 animate-in slide-in-from-right duration-300">
                                {/* Name */}
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={20} />
                                    </div>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Nome Completo"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all font-medium"
                                    />
                                </div>

                                {/* Handle (@) */}
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <AtSign className="text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={20} />
                                    </div>
                                    <input
                                        required
                                        type="text"
                                        placeholder="usuário (ex: joao55)"
                                        value={handle}
                                        onChange={(e) => setHandle(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all font-medium"
                                    />
                                </div>

                                {/* DOB & City Row */}
                                <div className="flex gap-3">
                                    <div className="relative group flex-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Calendar className="text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={18} />
                                        </div>
                                        <input
                                            required
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="DD/MM/AAAA"
                                            value={dob}
                                            onChange={handleDobChange}
                                            maxLength={10}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-3.5 pl-10 pr-2 outline-none focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all font-medium text-sm"
                                        />
                                    </div>
                                    <div className="relative group flex-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <MapPin className="text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={18} />
                                        </div>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Cidade"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-3.5 pl-10 pr-2 outline-none focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all font-medium text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Terms Checkbox (Signup Only) */}
                        {!isLoginMode && !isRecoveryMode && (
                            <div className="flex items-start gap-3 p-4 bg-cyan-50 border border-cyan-100 rounded-xl">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                    className="mt-1 w-5 h-5 text-cyan-600 border-cyan-300 rounded focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                                />
                                <label htmlFor="terms" className="text-sm text-slate-700 leading-relaxed cursor-pointer">
                                    Eu li e aceito os{' '}
                                    <button
                                        type="button"
                                        onClick={onOpenLegal}
                                        className="text-cyan-600 hover:text-cyan-700 font-bold hover:underline"
                                    >
                                        Termos de Uso e Políticas de Privacidade
                                    </button>
                                </label>
                            </div>
                        )}

                        {/* --- SHARED FIELDS (Email/Pass) --- */}
                        {!isRecoveryMode && (
                            <div className="space-y-4">
                                {/* Email */}
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={20} />
                                    </div>
                                    <input
                                        required
                                        type="email"
                                        placeholder="Seu email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all font-medium"
                                    />
                                </div>

                                {/* Password */}
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={20} />
                                    </div>
                                    <input
                                        required
                                        type="password"
                                        placeholder="Senha secreta"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all font-medium"
                                    />
                                </div>

                                {/* Confirm Password (Signup Only) */}
                                {!isLoginMode && (
                                    <div className="relative group animate-in slide-in-from-right duration-300">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={20} />
                                        </div>
                                        <input
                                            required
                                            type="password"
                                            placeholder="Repita a senha"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all font-medium"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {isLoginMode && !isRecoveryMode && (
                            <div className="flex justify-end">
                                <button type="button" onClick={toggleRecovery} className="text-xs font-bold text-slate-400 hover:text-cyan-600 transition-colors">
                                    Esqueceu a senha?
                                </button>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading || (!isLoginMode && !isRecoveryMode && !termsAccepted)}
                            className="w-full py-4 mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin text-cyan-400" />
                                    <span>Processando...</span>
                                </>
                            ) : (
                                <>
                                    {isRecoveryMode ? (
                                        <>
                                            <span>Enviar Link</span>
                                            <Send size={20} className="text-cyan-400 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    ) : (
                                        <>
                                            <span>{isLoginMode ? 'Entrar no App' : 'Cadastrar Grátis'}</span>
                                            <ArrowRight size={20} className="text-cyan-400 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </>
                            )}
                        </button>

                    </form>

                    {/* Toggle Mode */}
                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <p className="text-slate-500 text-sm font-medium">
                            {isLoginMode ? 'Ainda não tem conta?' : 'Já possui cadastro?'}
                        </p>
                        <button
                            onClick={toggleMode}
                            className="mt-2 text-cyan-600 hover:text-cyan-700 font-bold text-sm tracking-wide border border-cyan-100 bg-cyan-50 px-6 py-2 rounded-full hover:bg-cyan-100 transition-colors"
                        >
                            {isLoginMode ? 'CRIAR CONTA AGORA' : 'FAZER LOGIN'}
                        </button>
                    </div>

                    {isRecoveryMode && (
                        <button
                            onClick={toggleRecovery}
                            className="w-full mt-4 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 font-medium transition-colors"
                        >
                            <ArrowLeft size={16} /> Voltar para Login
                        </button>
                    )}

                </div>
            </div>

            <p className="mt-8 text-slate-400 text-xs font-medium text-center">
                Ao continuar, você concorda com nossos Termos de Serviço.
                <br />Stride Up v4.0
            </p>

        </div >
    );
};

export default AuthScreen;