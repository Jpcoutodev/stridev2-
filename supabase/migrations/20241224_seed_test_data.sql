-- Script para popular o banco com dados de teste
-- Execute este script no SQL Editor do Supabase
-- ATENÇÃO: Este script insere usuários fake no auth.users

-- Primeiro, inserir usuários no auth.users (requer extensão)
-- Supabase permite inserir diretamente se você estiver usando o SQL Editor com permissões de service_role

INSERT INTO auth.users (
    id, 
    instance_id, 
    aud, 
    role, 
    email, 
    encrypted_password,
    email_confirmed_at, 
    created_at, 
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
) VALUES
('11111111-1111-1111-1111-111111111101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lucas.fitness@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maria.strong@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111103', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'joao.runner@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111104', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana.yoga@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111105', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pedro.gains@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111106', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carla.fit@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111107', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rafael.muscle@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111108', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'juliana.power@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111109', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bruno.cardio@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111110', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fernanda.health@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'thiago.beast@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'camila.wellness@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'diego.lift@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111114', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'patricia.gym@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111115', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'marcos.shape@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111116', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'aline.active@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111117', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gustavo.pro@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111118', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'beatriz.love@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111119', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'andre.iron@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111120', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'larissa.fit@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', ''),
('11111111-1111-1111-1111-111111111121', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ricardo.alpha@teste.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- Agora inserir os identities (necessário para o auth funcionar)
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
SELECT 
    id,
    id,
    jsonb_build_object('sub', id::text, 'email', email),
    'email',
    id::text,
    NOW(),
    NOW(),
    NOW()
FROM auth.users 
WHERE id IN (
    '11111111-1111-1111-1111-111111111101',
    '11111111-1111-1111-1111-111111111102',
    '11111111-1111-1111-1111-111111111103',
    '11111111-1111-1111-1111-111111111104',
    '11111111-1111-1111-1111-111111111105',
    '11111111-1111-1111-1111-111111111106',
    '11111111-1111-1111-1111-111111111107',
    '11111111-1111-1111-1111-111111111108',
    '11111111-1111-1111-1111-111111111109',
    '11111111-1111-1111-1111-111111111110',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111112',
    '11111111-1111-1111-1111-111111111113',
    '11111111-1111-1111-1111-111111111114',
    '11111111-1111-1111-1111-111111111115',
    '11111111-1111-1111-1111-111111111116',
    '11111111-1111-1111-1111-111111111117',
    '11111111-1111-1111-1111-111111111118',
    '11111111-1111-1111-1111-111111111119',
    '11111111-1111-1111-1111-111111111120',
    '11111111-1111-1111-1111-111111111121'
)
ON CONFLICT DO NOTHING;

-- Inserir 21 perfis de teste
INSERT INTO profiles (id, username, full_name, bio, location, avatar_url, weight, height, is_private, created_at) VALUES
('11111111-1111-1111-1111-111111111101', 'lucas.fitness', 'Lucas Ferreira', '🏋️ Personal Trainer | 5 anos de academia', 'São Paulo, SP', 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200', 82, 180, false, NOW() - INTERVAL '30 days'),
('11111111-1111-1111-1111-111111111102', 'maria.strong', 'Maria Silva', '💪 Crossfit athlete | Competidora regional', 'Rio de Janeiro, RJ', 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=200', 62, 168, false, NOW() - INTERVAL '25 days'),
('11111111-1111-1111-1111-111111111103', 'joao.runner', 'João Santos', '🏃 Maratonista | 42km em menos de 4h', 'Belo Horizonte, MG', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200', 70, 175, false, NOW() - INTERVAL '28 days'),
('11111111-1111-1111-1111-111111111104', 'ana.yoga', 'Ana Oliveira', '🧘‍♀️ Instrutora de Yoga | Meditação diária', 'Curitiba, PR', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200', 55, 165, false, NOW() - INTERVAL '20 days'),
('11111111-1111-1111-1111-111111111105', 'pedro.gains', 'Pedro Costa', '💥 Bodybuilding | Em busca do shape perfeito', 'Porto Alegre, RS', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', 95, 185, false, NOW() - INTERVAL '22 days'),
('11111111-1111-1111-1111-111111111106', 'carla.fit', 'Carla Mendes', '🥗 Nutricionista esportiva | Vida saudável', 'Salvador, BA', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200', 58, 162, false, NOW() - INTERVAL '18 days'),
('11111111-1111-1111-1111-111111111107', 'rafael.muscle', 'Rafael Almeida', '🏆 Campeão estadual 2023 | Fisiculturismo', 'Brasília, DF', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200', 88, 178, false, NOW() - INTERVAL '15 days'),
('11111111-1111-1111-1111-111111111108', 'juliana.power', 'Juliana Lima', '⚡ Powerlifter | Força feminina', 'Recife, PE', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200', 68, 170, false, NOW() - INTERVAL '12 days'),
('11111111-1111-1111-1111-111111111109', 'bruno.cardio', 'Bruno Rocha', '🚴 Ciclista | 200km por semana', 'Florianópolis, SC', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200', 72, 177, false, NOW() - INTERVAL '10 days'),
('11111111-1111-1111-1111-111111111110', 'fernanda.health', 'Fernanda Dias', '🌿 Vida fitness | Mãe de 2 | Sem desculpas', 'Goiânia, GO', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200', 60, 164, false, NOW() - INTERVAL '8 days'),
('11111111-1111-1111-1111-111111111111', 'thiago.beast', 'Thiago Barbosa', '🦁 Beast mode ON | Treino pesado sempre', 'Campinas, SP', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200', 90, 182, false, NOW() - INTERVAL '7 days'),
('11111111-1111-1111-1111-111111111112', 'camila.wellness', 'Camila Souza', '✨ Wellness | Equilibrio corpo e mente', 'Vitória, ES', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200', 56, 160, false, NOW() - INTERVAL '6 days'),
('11111111-1111-1111-1111-111111111113', 'diego.lift', 'Diego Martins', '🔥 Levantamento olímpico | Técnica perfeita', 'Manaus, AM', 'https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=200', 78, 173, false, NOW() - INTERVAL '5 days'),
('11111111-1111-1111-1111-111111111114', 'patricia.gym', 'Patrícia Nunes', '💖 Gym life | De sedentária a fitness', 'Fortaleza, CE', 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=200', 63, 167, false, NOW() - INTERVAL '4 days'),
('11111111-1111-1111-1111-111111111115', 'marcos.shape', 'Marcos Pereira', '🎯 Foco total | Dieta + Treino = Resultado', 'Belém, PA', 'https://images.unsplash.com/photo-1542178243-bc20974f57a4?w=200', 85, 179, false, NOW() - INTERVAL '3 days'),
('11111111-1111-1111-1111-111111111116', 'aline.active', 'Aline Ribeiro', '🏄‍♀️ Surf + Funcional | Praia lifestyle', 'Santos, SP', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200', 54, 163, false, NOW() - INTERVAL '2 days'),
('11111111-1111-1111-1111-111111111117', 'gustavo.pro', 'Gustavo Andrade', '🥊 Lutador MMA | Disciplina acima de tudo', 'Natal, RN', 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=200', 76, 174, false, NOW() - INTERVAL '1 day'),
('11111111-1111-1111-1111-111111111118', 'beatriz.love', 'Beatriz Carvalho', '💕 Amo treinar | Pilates + Musculação', 'João Pessoa, PB', 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200', 57, 161, false, NOW() - INTERVAL '12 hours'),
('11111111-1111-1111-1111-111111111119', 'andre.iron', 'André Moreira', '🏋️‍♂️ Iron addict | Ferro todos os dias', 'Cuiabá, MT', 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=200', 92, 184, false, NOW() - INTERVAL '6 hours'),
('11111111-1111-1111-1111-111111111120', 'larissa.fit', 'Larissa Gomes', '🌟 Transformação fitness | -30kg', 'Campo Grande, MS', 'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=200', 64, 169, false, NOW() - INTERVAL '3 hours'),
('11111111-1111-1111-1111-111111111121', 'ricardo.alpha', 'Ricardo Nascimento', '🐺 Alpha mindset | Treino e negócios', 'Londrina, PR', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200', 80, 176, false, NOW() - INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;

-- Inserir posts para cada perfil (2-3 posts por perfil)
INSERT INTO posts (user_id, type, caption, image_url, weight, measurements, created_at) VALUES
-- Lucas
('11111111-1111-1111-1111-111111111101', 'image', '🔥 Dia de peito! Supino reto batendo PR de 120kg. Foco total na técnica. #ChestDay #GymLife', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600', NULL, NULL, NOW() - INTERVAL '29 days'),
('11111111-1111-1111-1111-111111111101', 'workout', '💪 Treino completo de hoje: Peito + Tríceps. Sensação incrível após bater meu recorde!', NULL, NULL, NULL, NOW() - INTERVAL '20 days'),
('11111111-1111-1111-1111-111111111101', 'measurement', 'Evolução do shape! Muito feliz com o progresso 📈', NULL, 82, 'Peito: 110cm | Bíceps: 42cm | Cintura: 80cm', NOW() - INTERVAL '5 days'),

-- Maria
('11111111-1111-1111-1111-111111111102', 'image', '🏆 WOD de hoje destruído! Fran em 4:30 - novo PR! #CrossFit #WOD', 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600', NULL, NULL, NOW() - INTERVAL '24 days'),
('11111111-1111-1111-1111-111111111102', 'text', '✨ Dica do dia: Consistência > Intensidade. Prefira treinar 5x na semana leve do que 2x pesado.', NULL, NULL, NULL, NOW() - INTERVAL '15 days'),
('11111111-1111-1111-1111-111111111102', 'workout', '⚡ Treino de hoje foi INTENSO! 21-15-9 de Thrusters + Pull-ups. Tempo: 8:45', NULL, NULL, NULL, NOW() - INTERVAL '3 days'),

-- João
('11111111-1111-1111-1111-111111111103', 'image', '🏃 21km matinais! Preparação para a São Silvestre tá a todo vapor 💨', 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600', NULL, NULL, NOW() - INTERVAL '27 days'),
('11111111-1111-1111-1111-111111111103', 'text', '📊 Semana de corrida: 85km totais. Maior quilometragem do ano! Pernas estão reclamando mas a mente tá forte 🧠', NULL, NULL, NULL, NOW() - INTERVAL '12 days'),

-- Ana
('11111111-1111-1111-1111-111111111104', 'image', '🧘‍♀️ Paz interior começa com o primeiro alongamento do dia. Namastê 🙏', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600', NULL, NULL, NOW() - INTERVAL '19 days'),
('11111111-1111-1111-1111-111111111104', 'text', '🌸 10 minutos de meditação por dia mudaram minha vida. Ansiedade reduzida, foco aumentado. Alguém mais pratica?', NULL, NULL, NULL, NOW() - INTERVAL '8 days'),
('11111111-1111-1111-1111-111111111104', 'image', '☀️ Yoga ao nascer do sol. Não existe melhor forma de começar o dia!', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600', NULL, NULL, NOW() - INTERVAL '2 days'),

-- Pedro
('11111111-1111-1111-1111-111111111105', 'image', '🦍 Beast mode activated! Agachamento livre 180kg x 5. Legs day nunca foi tão bom!', 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600', NULL, NULL, NOW() - INTERVAL '21 days'),
('11111111-1111-1111-1111-111111111105', 'measurement', '💪 Update do progresso! Bulking tá dando resultado', NULL, 95, 'Peito: 120cm | Coxa: 72cm | Bíceps: 46cm', NOW() - INTERVAL '10 days'),

-- Carla
('11111111-1111-1111-1111-111111111106', 'text', '🥗 Dica nutricional: Proteína no café da manhã aumenta saciedade o dia todo. Ovo + aveia = combo perfeito!', NULL, NULL, NULL, NOW() - INTERVAL '17 days'),
('11111111-1111-1111-1111-111111111106', 'image', '🍎 Prep semanal feito! 7 marmitas fit prontas. Organização é a chave do sucesso 🔑', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600', NULL, NULL, NOW() - INTERVAL '7 days'),
('11111111-1111-1111-1111-111111111106', 'text', '💧 Você bebeu água hoje? Meta: 3 litros. Seu corpo agradece!', NULL, NULL, NULL, NOW() - INTERVAL '1 day'),

-- Rafael
('11111111-1111-1111-1111-111111111107', 'image', '🏆 Pós competição! Trouxe o ouro pra casa! 1° lugar categoria até 85kg', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600', NULL, NULL, NOW() - INTERVAL '14 days'),
('11111111-1111-1111-1111-111111111107', 'workout', '📋 Treino de costas completo: Barra fixa 5x10, Remada curvada 4x12, Pulldown 4x15', NULL, NULL, NULL, NOW() - INTERVAL '5 days'),

-- Juliana
('11111111-1111-1111-1111-111111111108', 'image', '💪 Deadlift PR: 150kg! Força feminina não tem limite! 🚀', 'https://images.unsplash.com/photo-1550345332-09e3ac987658?w=600', NULL, NULL, NOW() - INTERVAL '11 days'),
('11111111-1111-1111-1111-111111111108', 'text', '🔥 Pra quem acha que mulher não deve pegar pesado: EU LEVANTO MAIS QUE VOCÊ 😎', NULL, NULL, NULL, NOW() - INTERVAL '4 days'),

-- Bruno
('11111111-1111-1111-1111-111111111109', 'image', '🚴 100km de bike! Vista incrível do topo da serra. Vale cada pedalada', 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=600', NULL, NULL, NOW() - INTERVAL '9 days'),
('11111111-1111-1111-1111-111111111109', 'text', '🌅 Acordar 5h da manhã pra pedalar enquanto a cidade dorme. Não tem preço!', NULL, NULL, NULL, NOW() - INTERVAL '3 days'),
('11111111-1111-1111-1111-111111111109', 'workout', '📊 Treino de hoje: 80km / 3h15 / Média 24km/h. Pernas queimando!', NULL, NULL, NULL, NOW() - INTERVAL '1 day'),

-- Fernanda
('11111111-1111-1111-1111-111111111110', 'image', '👶 Treino com as crianças! Quem disse que ser mãe é desculpa? #MomLife #FitMom', 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600', NULL, NULL, NOW() - INTERVAL '7 days'),
('11111111-1111-1111-1111-111111111110', 'text', '💪 Acordei 5h, preparei lancheira, deixei na escola e fui treinar. Ser mãe fitness é sobre gestão de tempo!', NULL, NULL, NULL, NOW() - INTERVAL '2 days'),

-- Thiago
('11111111-1111-1111-1111-111111111111', 'image', '🔥 BACK DAY! Remada cavalinho 100kg. Costas de cobra ficando real!', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600', NULL, NULL, NOW() - INTERVAL '6 days'),
('11111111-1111-1111-1111-111111111111', 'measurement', '📈 Shape update: Massa magra subindo, gordura caindo. Dieta + treino = resultado!', NULL, 90, 'Costas: 125cm | Bíceps: 44cm | Cintura: 82cm', NOW() - INTERVAL '2 days'),

-- Camila
('11111111-1111-1111-1111-111111111112', 'image', '🧘 Equilíbrio entre corpo e mente. Pilates + Natureza = Paz', 'https://images.unsplash.com/photo-1518459031867-a89b944bffe4?w=600', NULL, NULL, NOW() - INTERVAL '5 days'),
('11111111-1111-1111-1111-111111111112', 'text', '🌿 Menos é mais. Treino consciente, alimentação natural, mente tranquila.', NULL, NULL, NULL, NOW() - INTERVAL '1 day'),

-- Diego
('11111111-1111-1111-1111-111111111113', 'image', '🏋️ Snatch 100kg! Meses de técnica valeram a pena!', 'https://images.unsplash.com/photo-1532384748853-8f54a8f476e2?w=600', NULL, NULL, NOW() - INTERVAL '4 days'),
('11111111-1111-1111-1111-111111111113', 'workout', '📝 Treino olímpico: Clean & Jerk 90kg x 3, Snatch 85kg x 5, Front Squat 120kg x 5', NULL, NULL, NULL, NOW() - INTERVAL '1 day'),

-- Patrícia
('11111111-1111-1111-1111-111111111114', 'image', '✨ 1 ano de transformação! De 90kg para 63kg. Prova que é possível! 💪', 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600', NULL, NULL, NOW() - INTERVAL '3 days'),
('11111111-1111-1111-1111-111111111114', 'text', '🌟 Há 1 ano eu não conseguia subir escada. Hoje corro 5km. Nunca desista!', NULL, NULL, NULL, NOW() - INTERVAL '1 day'),

-- Marcos
('11111111-1111-1111-1111-111111111115', 'measurement', '📊 Check semanal! Mantendo o foco na dieta even no feriado', NULL, 85, 'Peito: 108cm | Bíceps: 40cm | Abdômen: 78cm', NOW() - INTERVAL '2 days'),
('11111111-1111-1111-1111-111111111115', 'text', '🎯 Consistência > Perfeição. Melhor fazer 80% todo dia do que 100% uma vez por mês.', NULL, NULL, NULL, NOW() - INTERVAL '6 hours'),

-- Aline
('11111111-1111-1111-1111-111111111116', 'image', '🏄‍♀️ Treino + praia = vida perfeita! Funcional na areia da manhã', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600', NULL, NULL, NOW() - INTERVAL '1 day'),
('11111111-1111-1111-1111-111111111116', 'text', '🌊 Sal no cabelo, areia nos pés, endorfina no sangue. Isso é viver!', NULL, NULL, NULL, NOW() - INTERVAL '5 hours'),

-- Gustavo
('11111111-1111-1111-1111-111111111117', 'image', '🥊 Treino de sparring intenso! Preparando pra próxima luta', 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=600', NULL, NULL, NOW() - INTERVAL '1 day'),
('11111111-1111-1111-1111-111111111117', 'workout', '📋 Treino MMA: 30min cardio, 40min técnica, 20min saco. Exausto porém satisfeito!', NULL, NULL, NULL, NOW() - INTERVAL '4 hours'),

-- Beatriz
('11111111-1111-1111-1111-111111111118', 'image', '💕 Sexta-feira de treino! Glúteos em dia pra curtir o fds', 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600', NULL, NULL, NOW() - INTERVAL '12 hours'),
('11111111-1111-1111-1111-111111111118', 'text', '💪 Quem mais treinou hoje mesmo sendo véspera de feriado? Bora comentar!', NULL, NULL, NULL, NOW() - INTERVAL '3 hours'),

-- André
('11111111-1111-1111-1111-111111111119', 'image', '🏋️ Iron therapy! Nada como um treino pesado pra limpar a mente', 'https://images.unsplash.com/photo-1605296867724-fa87a8ef53fd?w=600', NULL, NULL, NOW() - INTERVAL '6 hours'),
('11111111-1111-1111-1111-111111111119', 'measurement', '💪 Atualização mensal do shape! Progresso constante', NULL, 92, 'Peito: 118cm | Coxa: 70cm | Bíceps: 45cm', NOW() - INTERVAL '2 hours'),

-- Larissa
('11111111-1111-1111-1111-111111111120', 'image', '🌟 30kg a menos em 18 meses! Sem cirurgia, sem milagre, só disciplina!', 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600', NULL, NULL, NOW() - INTERVAL '3 hours'),
('11111111-1111-1111-1111-111111111120', 'text', '❤️ Obrigada a todos que me apoiaram nessa jornada. Vocês fazem parte dessa conquista!', NULL, NULL, NULL, NOW() - INTERVAL '1 hour'),

-- Ricardo
('11111111-1111-1111-1111-111111111121', 'image', '🐺 Mentalidade de lobo! Primeiro treino então reunião de negócios', 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600', NULL, NULL, NOW() - INTERVAL '1 hour'),
('11111111-1111-1111-1111-111111111121', 'text', '📈 Treino de manhã potencializa a produtividade o dia todo. CEO fitness mode!', NULL, NULL, NULL, NOW() - INTERVAL '30 minutes')
ON CONFLICT DO NOTHING;
