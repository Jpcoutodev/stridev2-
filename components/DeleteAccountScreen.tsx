import React from 'react';
import { ArrowLeft, Trash2, Mail, ShieldAlert, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

interface DeleteAccountScreenProps {
    onBack: () => void;
}

const DeleteAccountScreen: React.FC<DeleteAccountScreenProps> = ({ onBack }) => {
    const supportEmail = "suporte.strideup@gmail.com"; // Replace with actual support email if different
    const subject = encodeURIComponent("Solicitação de Exclusão de Conta - Stride Up");
    const body = encodeURIComponent("Olá,\n\nGostaria de solicitar a exclusão da minha conta no app Stride Up.\n\nMeu usuário/email é: [Insira seu usuário ou email aqui]\n\nEstou ciente de que esta ação é irreversível.");

    const mailtoLink = `mailto:${supportEmail}?subject=${subject}&body=${body}`;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">

            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-red-400/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-slate-300/20 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-2xl bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-[32px] overflow-hidden relative z-10 animate-in fade-in zoom-in duration-300">

                {/* Header */}
                <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/5 opacity-30 pattern-grid-lg"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-red-500/50">
                            <Trash2 className="text-red-400" size={28} />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Solicitação de Exclusão de Conta</h1>
                        <p className="text-slate-400 text-sm mt-2">Stride Up - Gerenciamento de Dados</p>
                    </div>
                </div>

                <div className="p-8">
                    <div className="prose prose-slate max-w-none text-slate-600 text-sm">
                        <p className="lead text-base font-medium text-slate-800 mb-6 text-center">
                            Você tem o direito de solicitar a exclusão completa da sua conta e dos seus dados associados a qualquer momento.
                        </p>

                        <div className="grid md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                                <h3 className="flex items-center gap-2 font-bold text-red-700 mb-3 text-sm uppercase tracking-wider">
                                    <ShieldAlert size={16} /> O que será excluído
                                </h3>
                                <ul className="space-y-2 text-xs font-medium text-red-900/70">
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1 block min-w-[4px] h-[4px] rounded-full bg-red-400"></span>
                                        Todas as informações do seu perfil (Nome, Bio, Foto).
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1 block min-w-[4px] h-[4px] rounded-full bg-red-400"></span>
                                        Histórico de publicações, fotos e legendas.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1 block min-w-[4px] h-[4px] rounded-full bg-red-400"></span>
                                        Registros de atividades, medidas e treinos.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1 block min-w-[4px] h-[4px] rounded-full bg-red-400"></span>
                                        Comentários e interações em posts.
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                                <h3 className="flex items-center gap-2 font-bold text-blue-700 mb-3 text-sm uppercase tracking-wider">
                                    <FileText size={16} /> Retenção de Dados
                                </h3>
                                <ul className="space-y-2 text-xs font-medium text-blue-900/70">
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1 block min-w-[4px] h-[4px] rounded-full bg-blue-400"></span>
                                        Logs de acesso anônimos podem ser mantidos por até 90 dias para fins de segurança e auditoria.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1 block min-w-[4px] h-[4px] rounded-full bg-blue-400"></span>
                                        Backups de banco de dados são rotacionados e apagados automaticamente.
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="bg-slate-100 rounded-2xl p-6 text-center border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-2">Como solicitar</h3>
                            <p className="mb-6">
                                Para processar sua solicitação, precisamos confirmar sua identidade. Envie um email para nossa equipe de suporte.
                            </p>

                            <a
                                href={mailtoLink}
                                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-red-600/20 active:scale-95 transition-all text-sm mb-4"
                            >
                                <Mail size={18} />
                                Solicitar Exclusão por Email
                            </a>

                            <p className="text-[10px] text-slate-400">
                                O processo de exclusão pode levar até 30 dias úteis após a confirmação.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onBack}
                        className="w-full mt-8 py-3 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors flex items-center justify-center gap-2"
                    >
                        <ArrowLeft size={16} /> Voltar para o Stride Up
                    </button>
                </div>
            </div>
            <p className="mt-8 text-slate-400 text-xs font-medium text-center relative z-10">
                &copy; {new Date().getFullYear()} Stride Up App. Todos os direitos reservados.
            </p>
        </div>
    );
};

export default DeleteAccountScreen;
