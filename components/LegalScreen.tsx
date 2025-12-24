import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, FileText, Lock, Scale } from 'lucide-react';

interface LegalScreenProps {
    onBack: () => void;
    initialTab?: 'terms' | 'privacy' | 'security' | 'lgpd';
}

type TabType = 'terms' | 'privacy' | 'security' | 'lgpd';

const LegalScreen: React.FC<LegalScreenProps> = ({ onBack, initialTab = 'terms' }) => {
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [hasAccepted, setHasAccepted] = useState(false);

    useEffect(() => {
        // Check if user has already accepted terms
        const accepted = localStorage.getItem('stride_terms_accepted');
        if (accepted === 'true') {
            setHasAccepted(true);
        }
    }, []);

    const handleAcceptTerms = () => {
        localStorage.setItem('stride_terms_accepted', 'true');
        setHasAccepted(true);
    };

    const tabs = [
        { id: 'terms' as TabType, label: 'Termos de Uso', icon: FileText },
        { id: 'privacy' as TabType, label: 'Privacidade', icon: Shield },
        { id: 'security' as TabType, label: 'Segurança', icon: Lock },
        { id: 'lgpd' as TabType, label: 'LGPD', icon: Scale },
    ];

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-5 pt-6 pb-4 sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-4">
                    <button onClick={onBack} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors">
                        <ArrowLeft size={20} className="text-white" />
                    </button>
                    <h1 className="text-2xl font-bold text-white">Legal & Privacidade</h1>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === tab.id
                                        ? 'bg-white text-cyan-600 shadow-md'
                                        : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 pb-32">
                <div className="max-w-3xl mx-auto">
                    {activeTab === 'terms' && <TermsContent />}
                    {activeTab === 'privacy' && <PrivacyContent />}
                    {activeTab === 'security' && <SecurityContent />}
                    {activeTab === 'lgpd' && <LGPDContent />}
                </div>
            </div>

            {/* Accept Button (only if not accepted) */}
            {!hasAccepted && (
                <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 shadow-lg">
                    <button
                        onClick={handleAcceptTerms}
                        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all"
                    >
                        Aceitar Termos e Políticas
                    </button>
                </div>
            )}
        </div>
    );
};

// Terms of Use Content
const TermsContent = () => (
    <div className="prose prose-slate max-w-none">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Termos de Uso</h2>
        <p className="text-slate-600 mb-4">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">1. Aceitação dos Termos</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Ao acessar e usar o Stride Up, você concorda em cumprir e estar vinculado a estes Termos de Uso.
            Se você não concordar com qualquer parte destes termos, não deverá usar nosso aplicativo.
        </p>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">2. Licença de Uso</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Concedemos a você uma licença limitada, não exclusiva, intransferível e revogável para usar o Stride Up
            para fins pessoais e não comerciais. Você não pode:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li>Modificar, copiar ou distribuir o aplicativo sem autorização</li>
            <li>Fazer engenharia reversa ou descompilar o código-fonte</li>
            <li>Usar o aplicativo para fins ilegais ou não autorizados</li>
            <li>Tentar obter acesso não autorizado a sistemas ou redes</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">3. Responsabilidades do Usuário</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Você é responsável por manter a confidencialidade de sua conta e senha. Você concorda em:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li>Fornecer informações precisas e atualizadas durante o cadastro</li>
            <li>Notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta</li>
            <li>Não compartilhar sua conta com terceiros</li>
            <li>Ser responsável por todas as atividades realizadas em sua conta</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">4. Conteúdo do Usuário</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Ao publicar conteúdo no Stride Up, você mantém todos os direitos sobre seu conteúdo, mas nos concede
            uma licença mundial, não exclusiva e isenta de royalties para usar, armazenar e exibir esse conteúdo
            conforme necessário para fornecer nossos serviços.
        </p>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">5. Atividades Proibidas</h3>
        <p className="text-slate-700 leading-relaxed mb-4">É estritamente proibido:</p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li>Publicar conteúdo ofensivo, difamatório ou ilegal</li>
            <li>Assediar, intimidar ou ameaçar outros usuários</li>
            <li>Transmitir spam, vírus ou códigos maliciosos</li>
            <li>Coletar dados de outros usuários sem consentimento</li>
            <li>Violar direitos de propriedade intelectual de terceiros</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">6. Suspensão e Encerramento</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Reservamo-nos o direito de suspender ou encerrar sua conta a qualquer momento, sem aviso prévio,
            se você violar estes Termos de Uso ou se envolver em atividades fraudulentas ou prejudiciais.
        </p>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">7. Isenção de Garantias</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            O Stride Up é fornecido "como está" e "conforme disponível", sem garantias de qualquer tipo.
            Não garantimos que o serviço será ininterrupto, seguro ou livre de erros.
        </p>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">8. Limitação de Responsabilidade</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Em nenhuma circunstância seremos responsáveis por danos indiretos, incidentais, especiais ou
            consequenciais decorrentes do uso ou impossibilidade de uso do aplicativo.
        </p>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">9. Modificações</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento. As alterações
            entrarão em vigor imediatamente após a publicação. Seu uso continuado do aplicativo após
            as alterações constitui aceitação dos novos termos.
        </p>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">10. Lei Aplicável</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa
            será resolvida nos tribunais brasileiros.
        </p>
    </div>
);

// Privacy Policy Content
const PrivacyContent = () => (
    <div className="prose prose-slate max-w-none">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Política de Privacidade</h2>
        <p className="text-slate-600 mb-4">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">1. Informações que Coletamos</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Coletamos diferentes tipos de informações para fornecer e melhorar nossos serviços:
        </p>

        <h4 className="text-lg font-semibold text-slate-800 mt-4 mb-2">Informações Fornecidas por Você</h4>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li>Nome, e-mail e informações de perfil</li>
            <li>Fotos, posts e conteúdo que você compartilha</li>
            <li>Dados de nutrição e treinos que você registra</li>
            <li>Mensagens e comunicações dentro do aplicativo</li>
        </ul>

        <h4 className="text-lg font-semibold text-slate-800 mt-4 mb-2">Informações Coletadas Automaticamente</h4>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li>Endereço IP e informações do dispositivo</li>
            <li>Tipo de navegador e sistema operacional</li>
            <li>Dados de uso e interação com o aplicativo</li>
            <li>Cookies e tecnologias similares</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">2. Como Usamos Suas Informações</h3>
        <p className="text-slate-700 leading-relaxed mb-4">Utilizamos suas informações para:</p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li>Fornecer, manter e melhorar nossos serviços</li>
            <li>Personalizar sua experiência no aplicativo</li>
            <li>Processar suas solicitações e transações</li>
            <li>Enviar notificações importantes e atualizações</li>
            <li>Analisar padrões de uso e otimizar o desempenho</li>
            <li>Detectar e prevenir fraudes e abusos</li>
            <li>Cumprir obrigações legais e regulatórias</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">3. Cookies e Tecnologias Similares</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Utilizamos cookies e tecnologias similares para melhorar sua experiência. Cookies são pequenos
            arquivos armazenados no seu dispositivo que nos ajudam a:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li>Lembrar suas preferências e configurações</li>
            <li>Manter você conectado entre sessões</li>
            <li>Analisar o tráfego e uso do aplicativo</li>
            <li>Fornecer conteúdo personalizado</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mb-4">
            Você pode configurar seu navegador para recusar cookies, mas isso pode afetar algumas funcionalidades.
        </p>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">4. Compartilhamento com Terceiros</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Podemos compartilhar suas informações com terceiros nas seguintes circunstâncias:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li><strong>Provedores de Serviços:</strong> Empresas que nos auxiliam na operação (hospedagem, análise, suporte)</li>
            <li><strong>Conformidade Legal:</strong> Quando exigido por lei ou para proteger nossos direitos</li>
            <li><strong>Transferências Corporativas:</strong> Em caso de fusão, aquisição ou venda de ativos</li>
            <li><strong>Com Seu Consentimento:</strong> Quando você nos autoriza expressamente</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mb-4">
            <strong>Importante:</strong> Nunca vendemos suas informações pessoais para terceiros.
        </p>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">5. Segurança dos Dados</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados contra
            acesso não autorizado, alteração, divulgação ou destruição. No entanto, nenhum método de
            transmissão pela internet é 100% seguro.
        </p>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">6. Retenção de Dados</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Mantemos suas informações pessoais pelo tempo necessário para cumprir os propósitos descritos
            nesta Política, a menos que um período de retenção mais longo seja exigido ou permitido por lei.
        </p>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">7. Seus Direitos de Privacidade</h3>
        <p className="text-slate-700 leading-relaxed mb-4">Você tem o direito de:</p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li>Acessar suas informações pessoais</li>
            <li>Corrigir dados imprecisos ou incompletos</li>
            <li>Solicitar a exclusão de seus dados</li>
            <li>Revogar consentimentos fornecidos</li>
            <li>Exportar seus dados em formato portável</li>
            <li>Opor-se ao processamento de seus dados</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">8. Privacidade de Menores</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            O Stride Up não é destinado a menores de 13 anos. Não coletamos intencionalmente informações
            de crianças. Se você acredita que coletamos dados de um menor, entre em contato conosco
            imediatamente para remoção.
        </p>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">9. Alterações nesta Política</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre
            alterações significativas publicando a nova política no aplicativo e atualizando a data
            de "Última atualização".
        </p>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">10. Contato</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Se você tiver dúvidas sobre esta Política de Privacidade, entre em contato conosco através
            do e-mail: <a href="mailto:privacidade@strideup.com" className="text-cyan-600 hover:underline">privacidade@strideup.com</a>
        </p>
    </div>
);

// Security Content
const SecurityContent = () => (
    <div className="prose prose-slate max-w-none">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Segurança de Dados</h2>
        <p className="text-slate-600 mb-4">Como protegemos suas informações</p>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">1. Criptografia de Dados</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Utilizamos criptografia de ponta a ponta para proteger seus dados durante a transmissão e
            armazenamento:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li><strong>TLS/SSL:</strong> Todas as comunicações entre seu dispositivo e nossos servidores são criptografadas usando TLS 1.3</li>
            <li><strong>Criptografia em Repouso:</strong> Dados sensíveis são criptografados quando armazenados em nossos servidores</li>
            <li><strong>Senhas:</strong> Suas senhas são protegidas com algoritmos de hash seguros (bcrypt) e nunca são armazenadas em texto simples</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">2. Infraestrutura Segura</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Nossa infraestrutura é projetada com segurança em mente:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li><strong>Servidores Protegidos:</strong> Hospedados em data centers certificados com segurança física 24/7</li>
            <li><strong>Firewall e Monitoramento:</strong> Proteção contra ataques DDoS, invasões e atividades suspeitas</li>
            <li><strong>Backups Regulares:</strong> Backups automáticos diários para recuperação de desastres</li>
            <li><strong>Atualizações de Segurança:</strong> Patches e atualizações aplicados regularmente</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">3. Controle de Acesso</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Implementamos rigorosos controles de acesso:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li>Acesso aos dados limitado apenas a funcionários autorizados com necessidade legítima</li>
            <li>Autenticação de dois fatores (2FA) para acessos administrativos</li>
            <li>Registro e auditoria de todos os acessos a dados sensíveis</li>
            <li>Políticas de senha forte e rotação periódica</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">4. Proteção Contra Ameaças</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Medidas proativas para prevenir ameaças de segurança:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li><strong>Detecção de Intrusão:</strong> Sistemas automatizados que monitoram atividades suspeitas</li>
            <li><strong>Prevenção de Fraudes:</strong> Algoritmos de machine learning para detectar comportamentos anormais</li>
            <li><strong>Testes de Segurança:</strong> Auditorias regulares e testes de penetração por especialistas</li>
            <li><strong>Proteção contra Malware:</strong> Scanners automáticos para arquivos enviados</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">5. Segurança da Conta</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Recomendações para manter sua conta segura:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li>Use uma senha forte e única para o Stride Up</li>
            <li>Nunca compartilhe sua senha com terceiros</li>
            <li>Ative a autenticação de dois fatores quando disponível</li>
            <li>Faça logout de dispositivos públicos ou compartilhados</li>
            <li>Revise regularmente as atividades da sua conta</li>
            <li>Reporte imediatamente qualquer atividade suspeita</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">6. Resposta a Incidentes</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Em caso de violação de segurança:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li>Equipe de resposta a incidentes disponível 24/7</li>
            <li>Investigação imediata e medidas corretivas</li>
            <li>Notificação aos usuários afetados conforme exigido por lei</li>
            <li>Cooperação com autoridades quando apropriado</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">7. Conformidade e Certificações</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Aderimos aos mais altos padrões de segurança da indústria:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li>Conformidade com LGPD (Lei Geral de Proteção de Dados)</li>
            <li>Boas práticas de segurança segundo OWASP Top 10</li>
            <li>Políticas alinhadas com ISO 27001</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">8. Suas Responsabilidades</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            A segurança é uma responsabilidade compartilhada. Por favor:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li>Mantenha seus dispositivos atualizados e protegidos</li>
            <li>Use conexões seguras (evite WiFi público para dados sensíveis)</li>
            <li>Seja cauteloso com e-mails e mensagens suspeitas</li>
            <li>Não clique em links desconhecidos</li>
        </ul>

        <div className="bg-cyan-50 border-l-4 border-cyan-500 p-4 mt-6">
            <p className="text-slate-700">
                <strong>Importante:</strong> Se você suspeitar de qualquer atividade não autorizada em sua conta
                ou identificar uma vulnerabilidade de segurança, entre em contato imediatamente através do e-mail:
                <a href="mailto:seguranca@strideup.com" className="text-cyan-600 hover:underline ml-1">seguranca@strideup.com</a>
            </p>
        </div>
    </div>
);

// LGPD Content
const LGPDContent = () => (
    <div className="prose prose-slate max-w-none">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Lei Geral de Proteção de Dados (LGPD)</h2>
        <p className="text-slate-600 mb-4">Conformidade com a Lei nº 13.709/2018</p>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">1. Compromisso com a LGPD</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            O Stride Up está totalmente comprometido com a proteção dos dados pessoais de nossos usuários,
            em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018). Esta seção
            explica como cumprimos as exigências legais e respeitamos seus direitos.
        </p>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">2. Base Legal para Tratamento de Dados</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Tratamos seus dados pessoais com base nas seguintes hipóteses legais:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li><strong>Consentimento:</strong> Para funcionalidades opcionais e marketing</li>
            <li><strong>Execução de Contrato:</strong> Para fornecer os serviços solicitados</li>
            <li><strong>Obrigação Legal:</strong> Para cumprir requisitos regulatórios</li>
            <li><strong>Legítimo Interesse:</strong> Para melhorias do serviço e segurança</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">3. Direitos do Titular dos Dados</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Conforme a LGPD, você tem os seguintes direitos:
        </p>

        <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-slate-800 mb-2">📋 Confirmação e Acesso</h4>
                <p className="text-slate-700">
                    Direito de confirmar a existência de tratamento e acessar seus dados pessoais.
                </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-slate-800 mb-2">✏️ Correção</h4>
                <p className="text-slate-700">
                    Direito de corrigir dados incompletos, inexatos ou desatualizados.
                </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-slate-800 mb-2">🗑️ Exclusão</h4>
                <p className="text-slate-700">
                    Direito de solicitar a eliminação de dados tratados com base em seu consentimento.
                </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-slate-800 mb-2">📦 Portabilidade</h4>
                <p className="text-slate-700">
                    Direito de receber seus dados em formato estruturado e interoperável.
                </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-slate-800 mb-2">🚫 Revogação do Consentimento</h4>
                <p className="text-slate-700">
                    Direito de retirar seu consentimento a qualquer momento.
                </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-slate-800 mb-2">ℹ️ Informação sobre Compartilhamento</h4>
                <p className="text-slate-700">
                    Direito de saber com quais entidades públicas e privadas compartilhamos seus dados.
                </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-slate-800 mb-2">⛔ Oposição</h4>
                <p className="text-slate-700">
                    Direito de se opor ao tratamento realizado em desconformidade com a lei.
                </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-slate-800 mb-2">⚖️ Revisão de Decisões Automatizadas</h4>
                <p className="text-slate-700">
                    Direito de solicitar revisão de decisões tomadas unicamente com base em tratamento automatizado.
                </p>
            </div>
        </div>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">4. Como Exercer Seus Direitos</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Para exercer qualquer um dos direitos acima, você pode:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li>Acessar as configurações da sua conta diretamente no aplicativo</li>
            <li>Entrar em contato com nosso Encarregado de Dados (DPO)</li>
            <li>Enviar uma solicitação formal por e-mail</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mb-4">
            <strong>Prazo de Resposta:</strong> Responderemos às suas solicitações em até 15 dias, conforme
            exigido pela LGPD.
        </p>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">5. Encarregado de Proteção de Dados (DPO)</h3>
        <div className="bg-cyan-50 border-l-4 border-cyan-500 p-5 mt-4">
            <p className="text-slate-700 mb-3">
                <strong className="text-slate-900">Encarregado de Dados (DPO):</strong>
            </p>
            <ul className="text-slate-700 space-y-2">
                <li><strong>Nome:</strong> [A DEFINIR - Placeholder]</li>
                <li><strong>E-mail:</strong> <a href="mailto:dpo@strideup.com" className="text-cyan-600 hover:underline">dpo@strideup.com</a></li>
                <li><strong>Endereço:</strong> [A DEFINIR - Placeholder]</li>
            </ul>
            <p className="text-slate-600 text-sm mt-3">
                O DPO é o canal oficial para questões relacionadas à proteção de dados pessoais.
            </p>
        </div>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">6. Transferência Internacional de Dados</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Alguns de nossos provedores de serviços podem estar localizados fora do Brasil. Quando ocorre
            transferência internacional de dados, garantimos que:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li>Os países receptores oferecem grau de proteção adequado</li>
            <li>Cláusulas contratuais específicas são estabelecidas</li>
            <li>Medidas de segurança apropriadas são implementadas</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">7. Tratamento de Dados Sensíveis</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Dados de saúde (como informações nutricionais e de treino) são considerados dados sensíveis
            pela LGPD. O tratamento desses dados:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li>Requer seu consentimento específico e destacado</li>
            <li>É realizado com proteção adicional de segurança</li>
            <li>Utilizado apenas para finalidades explicitamente informadas</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">8. Menores de Idade</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            O tratamento de dados de crianças e adolescentes é realizado em conformidade com a LGPD:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li>Requer consentimento específico de pelo menos um dos pais ou responsável legal</li>
            <li>Dados tratados no melhor interesse da criança ou adolescente</li>
            <li>Informações coletadas de forma adequada e compreensível</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">9. Registro de Atividades de Tratamento</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Mantemos registro detalhado das atividades de tratamento de dados, incluindo:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li>Finalidades do tratamento</li>
            <li>Categorias de dados tratados</li>
            <li>Medidas de segurança implementadas</li>
            <li>Compartilhamento de dados com terceiros</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">10. Comunicação de Incidentes</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
            <li>Notificaremos a ANPD (Autoridade Nacional de Proteção de Dados)</li>
            <li>Comunicaremos os titulares afetados em prazo adequado</li>
            <li>Tomaremos medidas para reverter ou mitigar os efeitos do incidente</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">11. Atualização desta Seção</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
            Esta seção pode ser atualizada para refletir mudanças na legislação ou em nossas práticas.
            Recomendamos revisá-la periodicamente.
        </p>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-6">
            <p className="text-slate-700">
                <strong>Dúvidas sobre LGPD?</strong> Entre em contato com nosso DPO através do e-mail:
                <a href="mailto:dpo@strideup.com" className="text-cyan-600 hover:underline ml-1">dpo@strideup.com</a>
            </p>
        </div>
    </div>
);

export default LegalScreen;
