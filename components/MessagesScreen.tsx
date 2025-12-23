import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Send, MoreVertical } from 'lucide-react';
import { MOCK_USERS } from '../data/mockData';

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'them';
  timestamp: string;
}

interface Conversation {
  id: string;
  userId: string; // Links to MOCK_USERS
  lastMessage: string;
  unreadCount: number;
  time: string;
  messages: Message[];
}

// Generate some mock conversations based on MOCK_USERS
const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    userId: '1', // Sarah
    lastMessage: 'Combinado! Te vejo no parque às 8h? 🏃‍♀️',
    unreadCount: 2,
    time: '10:30',
    messages: [
      { id: 'm1', text: 'Oi Sarah! Vi seu treino de hoje, parabéns!', sender: 'me', timestamp: '10:00' },
      { id: 'm2', text: 'Obrigada! Foi puxado mas valeu a pena.', sender: 'them', timestamp: '10:15' },
      { id: 'm3', text: 'Vamos correr amanhã?', sender: 'me', timestamp: '10:20' },
      { id: 'm4', text: 'Claro! Preciso soltar as pernas.', sender: 'them', timestamp: '10:25' },
      { id: 'm5', text: 'Combinado! Te vejo no parque às 8h? 🏃‍♀️', sender: 'them', timestamp: '10:30' }
    ]
  },
  {
    id: 'c2',
    userId: '2', // Mike
    lastMessage: 'Aquele whey que você indicou é top.',
    unreadCount: 0,
    time: 'Ontem',
    messages: [
      { id: 'mm1', text: 'E aí Mike, blz?', sender: 'me', timestamp: '14:00' },
      { id: 'mm2', text: 'Fala monstro! Tudo certo.', sender: 'them', timestamp: '14:05' },
      { id: 'mm3', text: 'Aquele whey que você indicou é top.', sender: 'them', timestamp: '14:06' }
    ]
  },
  {
    id: 'c3',
    userId: '3', // Emma
    lastMessage: 'Namaste 🙏',
    unreadCount: 1,
    time: 'Segunda',
    messages: [
      { id: 'e1', text: 'Obrigado pela dica de alongamento.', sender: 'me', timestamp: '09:00' },
      { id: 'e2', text: 'Imagina! Se precisar de mais ajuda me avisa.', sender: 'them', timestamp: '09:15' },
      { id: 'e3', text: 'Namaste 🙏', sender: 'them', timestamp: '09:16' }
    ]
  }
];

interface MessagesScreenProps {
  onBack: () => void;
}

const MessagesScreen: React.FC<MessagesScreenProps> = ({ onBack }) => {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [inputText, setInputText] = useState('');
  
  // Refs for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  
  // Helper to get user details
  const getUserDetails = (userId: string) => {
    return MOCK_USERS.find(u => u.id === userId) || { 
        name: 'Usuário', 
        avatar: 'https://via.placeholder.com/50', 
        isPrivate: false 
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeConversationId) {
      scrollToBottom();
      // Mark as read logic could go here
    }
  }, [activeConversationId, conversations]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !activeConversationId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'me',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversationId) {
        return {
          ...conv,
          lastMessage: inputText,
          time: 'Agora',
          messages: [...conv.messages, newMessage]
        };
      }
      return conv;
    }));

    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  // --- RENDER: CHAT DETAIL VIEW ---
  if (activeConversationId && activeConversation) {
    const user = getUserDetails(activeConversation.userId);

    return (
      <div className="flex flex-col h-full bg-slate-50 relative animate-in slide-in-from-right duration-300">
        
        {/* Chat Header */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveConversationId(null)} className="text-slate-600 hover:text-cyan-600 transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div className="relative">
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-slate-100" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-lime-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 leading-tight">{user.name}</span>
              <span className="text-xs text-lime-600 font-medium">Online agora</span>
            </div>
          </div>
          {/* Options removed (Phone/Video) */}
          <button className="text-slate-400 hover:text-cyan-600">
             <MoreVertical size={20} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
           {/* Date Divider Mock */}
           <div className="flex justify-center my-4">
              <span className="text-[10px] font-bold text-slate-400 bg-slate-200/50 px-3 py-1 rounded-full uppercase tracking-wider">Hoje</span>
           </div>

           {activeConversation.messages.map((msg) => (
             <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm relative group ${
                  msg.sender === 'me' 
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                }`}>
                   <p className="text-sm leading-relaxed">{msg.text}</p>
                   <span className={`text-[10px] absolute bottom-1 right-2 opacity-0 group-hover:opacity-70 transition-opacity ${msg.sender === 'me' ? 'text-white' : 'text-slate-400'}`}>
                      {msg.timestamp}
                   </span>
                </div>
             </div>
           ))}
           <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Increased Padding */}
        <div className="p-4 bg-white border-t border-slate-100 sticky bottom-0">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100 transition-all">
             
             <input 
               type="text" 
               value={inputText}
               onChange={(e) => setInputText(e.target.value)}
               onKeyDown={handleKeyDown}
               placeholder="Mensagem..."
               className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 placeholder-slate-400 text-sm font-medium h-10 px-2"
             />

             <button 
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className={`p-2 rounded-full transition-all shadow-sm ${inputText.trim() ? 'bg-cyan-500 text-white hover:bg-cyan-600 hover:scale-105 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
             >
                <Send size={18} fill="currentColor" className={inputText.trim() ? "ml-0.5" : ""} />
             </button>
          </div>
        </div>

      </div>
    );
  }

  // --- RENDER: CONVERSATION LIST VIEW ---
  return (
    <div className="flex flex-col h-full bg-slate-50 relative animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4 border-b border-slate-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-3">
              <button onClick={onBack} className="bg-slate-50 p-2 rounded-full hover:bg-slate-100 transition-colors">
                  <ArrowLeft size={20} className="text-slate-600" />
              </button>
              <h1 className="text-2xl font-bold italic tracking-tight text-slate-900">Directs</h1>
           </div>
           <button className="text-slate-400 hover:text-cyan-600"><MoreVertical size={24} /></button>
        </div>

        {/* Search */}
        <div className="relative">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="Pesquisar conversas..." 
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 rounded-2xl py-3 pl-11 pr-4 text-slate-800 font-medium outline-none transition-all placeholder-slate-400 text-sm"
            />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
         {conversations.map((conv) => {
           const user = getUserDetails(conv.userId);
           return (
             <div 
                key={conv.id} 
                onClick={() => setActiveConversationId(conv.id)}
                className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white hover:shadow-sm hover:border-slate-100 border border-transparent transition-all cursor-pointer active:scale-[0.99]"
             >
                <div className="relative">
                    <img src={user.avatar} alt={user.name} className="w-14 h-14 rounded-full object-cover border border-slate-100" />
                    {/* Status Indicator logic could go here */}
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-bold text-slate-900 truncate">{user.name}</h3>
                        <span className={`text-xs font-semibold ${conv.unreadCount > 0 ? 'text-cyan-600' : 'text-slate-400'}`}>{conv.time}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <p className={`text-sm truncate pr-2 ${conv.unreadCount > 0 ? 'text-slate-800 font-bold' : 'text-slate-500'}`}>
                            {conv.lastMessage}
                        </p>
                        {conv.unreadCount > 0 && (
                            <span className="min-w-[20px] h-5 flex items-center justify-center bg-cyan-500 text-white text-[10px] font-bold rounded-full px-1.5 shadow-sm shadow-cyan-200">
                                {conv.unreadCount}
                            </span>
                        )}
                    </div>
                </div>
             </div>
           );
         })}
      </div>
      
      {/* New Message FAB */}
      <div className="absolute bottom-6 right-6">
          <button className="w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-900/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
             <MoreVertical size={24} className="rotate-90" />
          </button>
      </div>

    </div>
  );
};

export default MessagesScreen;
