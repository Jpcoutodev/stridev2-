import { PostModel, UserProfile } from '../types';

// Defined current user for consistency in "My Stride" tab
const currentUser = {
  username: 'alex_stride',
  avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
};

// Helper to get ISO string for relative days
const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

export const myPosts: PostModel[] = [
  {
    id: 'my-1',
    type: 'workout',
    username: currentUser.username,
    userAvatar: currentUser.avatar,
    clapCount: 24,
    caption: 'Domingo ativo! Comecei com uma corrida leve e terminei soltando o corpo. 🏃‍♂️💃',
    date: new Date().toISOString(), // Today
    workoutItems: [
      { activity: 'Corrida', detail: '10km • Ritmo 5:30' },
      { activity: 'Dança', detail: '30 minutos • Cardio Fun' }
    ],
    comments: [
        { id: 'c1', username: 'sarah_runner', userAvatar: 'https://randomuser.me/api/portraits/women/44.jpg', text: 'Esse ritmo está ótimo! 👏', timestamp: '10 min' }
    ]
  },
  {
    id: 'my-2',
    type: 'measurement',
    imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=1000&auto=format&fit=crop',
    weight: 84.2,
    measurements: 'Bíceps: 43cm | Cintura: 89cm',
    username: currentUser.username,
    userAvatar: currentUser.avatar,
    clapCount: 156,
    caption: 'Atualização da Semana 4: Braços crescendo! 💪 Consistência é o segredo.',
    date: daysAgo(45), // Current Year, older
    comments: []
  },
  {
    id: 'my-3',
    type: 'text',
    username: currentUser.username,
    userAvatar: currentUser.avatar,
    clapCount: 42,
    caption: '“O único treino ruim é aquele que não aconteceu.” ✨',
    date: '2023-11-15T10:00:00Z', // Past Year
    comments: [
        { id: 'c2', username: 'mike_lifter', userAvatar: 'https://randomuser.me/api/portraits/men/85.jpg', text: 'Fato!', timestamp: '1 ano' },
        { id: 'c3', username: 'emma_yoga', userAvatar: 'https://randomuser.me/api/portraits/women/68.jpg', text: 'Disse tudo.', timestamp: '1 ano' }
    ]
  }
];

export const communityPosts: PostModel[] = [
  {
    id: 'c-1',
    type: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1000&auto=format&fit=crop',
    username: 'alex_fit',
    userAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    clapCount: 89,
    caption: 'Fim de treino! A energia da academia hoje estava insana. 🔥',
    date: daysAgo(0), // Today
    comments: [
        { id: 'c4', username: 'dani_crossfit', userAvatar: 'https://randomuser.me/api/portraits/men/32.jpg', text: 'Monstro! 💪', timestamp: '2h' },
        { id: 'c5', username: 'sarah_runner', userAvatar: 'https://randomuser.me/api/portraits/women/44.jpg', text: 'Que academia é essa?', timestamp: '1h' }
    ]
  },
  {
    id: 'c-2',
    type: 'workout',
    username: 'sarah_runner',
    userAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    clapCount: 112,
    caption: 'Treino de tiros hoje. Morri mas passo bem! 🥵',
    date: daysAgo(1),
    workoutItems: [
      { activity: 'Aquecimento', detail: '1.5km Trote' },
      { activity: 'Tiros', detail: '10x 400m' },
      { activity: 'Desaquecimento', detail: '1km Caminhada' }
    ],
    comments: []
  },
  {
    id: 'c-3',
    type: 'measurement',
    imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1000&auto=format&fit=crop',
    weight: 92.3,
    measurements: 'Peito: 110cm | Supino: 120kg',
    username: 'mike_lifter',
    userAvatar: 'https://randomuser.me/api/portraits/men/85.jpg',
    clapCount: 256,
    caption: 'Novo Recorde no supino! O trabalho duro está valendo a pena.',
    date: '2023-08-20T14:30:00Z', // Past Year
    comments: [
        { id: 'c6', username: 'alex_stride', userAvatar: currentUser.avatar, text: 'Impressionante Mike! Qual sua meta?', timestamp: '1 ano' },
        { id: 'c7', username: 'mike_lifter', userAvatar: 'https://randomuser.me/api/portraits/men/85.jpg', text: '@alex_stride Chegar nos 140kg até dezembro!', timestamp: '1 ano' }
    ]
  },
  {
    id: 'c-4',
    type: 'text',
    username: 'emma_yoga',
    userAvatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    clapCount: 45,
    caption: 'Lembre-se de descansar. A recuperação faz parte do progresso. 🧘‍♀️💤',
    date: '2022-05-10T09:00:00Z', // Even older
    comments: []
  }
];

// --- SHARED USER DATA ---

export const MOCK_USERS: UserProfile[] = [
  {
    id: '1',
    name: 'Sarah Runner',
    username: '@sarah_runner',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    bio: 'Marathoner 🏃‍♀️ | Plant-based 🌱 | Chasing PBs',
    location: 'Rio de Janeiro, RJ',
    followers: 1250,
    following: 450,
    posts: 142,
    isFollowing: true, // User follows her
    hasNewStory: true, // Recent activity
    isPrivate: false,
    postsList: [
      {
        id: 's-1',
        type: 'workout',
        username: '@sarah_runner',
        userAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
        date: '2023-10-25T08:00:00Z',
        clapCount: 120,
        caption: 'Treino de hoje pago! Foco na maratona. 🏅',
        workoutItems: [
            { activity: 'Corrida Longa', detail: '18km • Pace 5:15' },
            { activity: 'Alongamento', detail: '15 min' }
        ],
        comments: []
      },
      {
        id: 's-2',
        type: 'image',
        username: '@sarah_runner',
        userAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
        date: '2023-10-22T10:00:00Z',
        clapCount: 340,
        caption: 'Nada como a vista do Aterro do Flamengo para inspirar. ☀️',
        imageUrl: 'https://images.unsplash.com/photo-1483721310020-03333e577078?q=80&w=1000&auto=format&fit=crop',
        comments: [
            { id: 'sc1', username: 'alex_stride', userAvatar: currentUser.avatar, text: 'Vista incrível!', timestamp: '1 ano' }
        ]
      }
    ]
  },
  {
    id: '2',
    name: 'Mike Lifter',
    username: '@mike_lifter',
    avatar: 'https://randomuser.me/api/portraits/men/85.jpg',
    bio: 'Powerlifting & Coffee ☕ | Coach @ IronGym',
    location: 'São Paulo, SP',
    followers: 3400,
    following: 120,
    posts: 89,
    isFollowing: true, // User follows him
    hasNewStory: false, // No new story
    isPrivate: false,
    postsList: [
        {
            id: 'm-1',
            type: 'measurement',
            username: '@mike_lifter',
            userAvatar: 'https://randomuser.me/api/portraits/men/85.jpg',
            date: '2023-11-01T18:30:00Z',
            clapCount: 890,
            caption: 'Evolução constante. Bulk limpo está funcionando! 🦍',
            weight: 98.5,
            measurements: 'Bíceps: 48cm | Peito: 115cm',
            imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1000&auto=format&fit=crop',
            comments: []
        },
        {
            id: 'm-2',
            type: 'text',
            username: '@mike_lifter',
            userAvatar: 'https://randomuser.me/api/portraits/men/85.jpg',
            date: '2023-10-28T09:15:00Z',
            clapCount: 200,
            caption: 'Disciplina é fazer o que precisa ser feito, mesmo quando você não quer.',
            comments: []
        }
    ]
  },
  {
    id: '3',
    name: 'Emma Yoga',
    username: '@emma_yoga',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    bio: 'Mindfulness & Movement 🧘‍♀️ | RYT 200',
    location: 'Florianópolis, SC',
    followers: 890,
    following: 900,
    posts: 34,
    isFollowing: true, // User follows her
    hasNewStory: true, // Recent activity
    isPrivate: true, 
    postsList: [
        {
            id: 'e-1',
            type: 'image',
            username: '@emma_yoga',
            userAvatar: 'https://randomuser.me/api/portraits/women/68.jpg',
            date: new Date().toISOString(),
            clapCount: 45,
            caption: 'Morning flow. 🌿',
            imageUrl: 'https://images.unsplash.com/photo-1544367563-12123d8965cd?q=80&w=1000&auto=format&fit=crop',
            comments: []
        }
    ]
  },
  {
    id: '4',
    name: 'Daniel Cross',
    username: '@dani_crossfit',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    bio: 'WOD lover. Burpees are life. 🔥',
    location: 'Curitiba, PR',
    followers: 560,
    following: 300,
    posts: 55,
    isFollowing: false,
    hasNewStory: true,
    isPrivate: true, 
    postsList: [
        {
            id: 'd-1',
            type: 'workout',
            username: '@dani_crossfit',
            userAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
            date: new Date().toISOString(),
            clapCount: 67,
            caption: 'Murph completo! Tempo: 45min. 💀',
            workoutItems: [
                { activity: 'Corrida', detail: '1.6km' },
                { activity: 'Pull-ups', detail: '100 reps' },
                { activity: 'Push-ups', detail: '200 reps' },
                { activity: 'Squats', detail: '300 reps' },
                { activity: 'Corrida', detail: '1.6km' }
            ],
            comments: []
        }
    ]
  },
  {
    id: '5',
    name: 'Alex Fit',
    username: '@alex_fit',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    bio: 'Gym addict. No pain no gain.',
    location: 'Belo Horizonte, MG',
    followers: 420,
    following: 300,
    posts: 12,
    isFollowing: false,
    hasNewStory: false,
    isPrivate: false,
    postsList: []
  }
];