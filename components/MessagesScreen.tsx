import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Send, MoreVertical, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string;
  otherUser?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
  lastMessageText?: string; // Derived from latest message if needed, or fetched
  unreadCount?: number;
}

interface MessagesScreenProps {
  onBack: () => void;
  targetUserId?: string | null;
}

const MessagesScreen: React.FC<MessagesScreenProps> = ({ onBack, targetUserId }) => {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  // Refs for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async (userId: string) => {
    try {
      setLoading(true);
      // Fetch conversations where current user is a participant
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      if (convError) throw convError;

      if (!convData || convData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Collect other user IDs
      const otherUserIds = convData.map(c =>
        c.participant1_id === userId ? c.participant2_id : c.participant1_id
      );

      // Fetch profiles
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', otherUserIds);

      if (profError) throw profError;

      // Map profiles to conversations
      // Also fetch last message for each conversation
      const enrichedConversations = await Promise.all(convData.map(async (conv) => {
        const otherUser = profiles?.find(p => p.id === (conv.participant1_id === userId ? conv.participant2_id : conv.participant1_id));

        // Fetch last message text
        const { data: msgData } = await supabase
          .from('messages')
          .select('text, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Fetch unread count
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('is_read', false)
          .neq('sender_id', userId);

        return {
          ...conv,
          otherUser,
          lastMessageText: msgData?.text || 'Inicie uma conversa',
          unreadCount: unreadCount || 0
        };
      }));

      setConversations(enrichedConversations);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTargetUser = async (targetId: string) => {
    // Check if conversation already exists
    const existing = conversations.find(c =>
      (c.participant1_id === targetId || c.participant2_id === targetId)
    );

    if (existing) {
      setActiveConversationId(existing.id);
    } else {
      // Create new conversation
      try {
        if (!currentUserId) return;
        const { data, error } = await supabase
          .from('conversations')
          .insert({ participant1_id: currentUserId, participant2_id: targetId })
          .select()
          .single();

        if (error) throw error;

        // Refresh conversations to include new one
        await fetchConversations(currentUserId);
        setActiveConversationId(data.id);
      } catch (err) {
        console.error('Error creating conversation:', err);
      }
    }
  };

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);

      // Mark as read (if there are unread messages from others)
      const hasUnread = data.some(m => !m.is_read && m.sender_id !== currentUserId);
      if (hasUnread && currentUserId) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', convId)
          .neq('sender_id', currentUserId)
          .eq('is_read', false);
      }
    }
  };

  // Initialize
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCurrentUserId(session.user.id);
        fetchConversations(session.user.id);
      }
    });
  }, []);

  // Handle Target User (Deep Link logic)
  useEffect(() => {
    if (currentUserId && targetUserId && !loading) {
      handleTargetUser(targetUserId);
    }
  }, [currentUserId, targetUserId, loading]);

  // Refetch list when returning from a conversation
  useEffect(() => {
    if (!activeConversationId && currentUserId) {
      fetchConversations(currentUserId);
    }
  }, [activeConversationId]);



  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
      const subscription = supabase
        .channel(`chat:${activeConversationId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`
        }, async (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);

          // Mark as read immediately if I'm viewing this conversation
          if (newMsg.sender_id !== currentUserId) {
            await supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [activeConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeConversationId || !currentUserId) return;

    const textPayload = inputText.trim();
    setInputText(''); // Optimistic clear

    try {
      // 1. Insert message
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConversationId,
          sender_id: currentUserId,
          text: textPayload
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Optimistic update: Add message to state immediately
      if (msgData) {
        setMessages(prev => {
          // Avoid duplicates if subscription also caught it
          if (prev.find(m => m.id === msgData.id)) return prev;
          return [...prev, msgData];
        });
      }

      // 2. Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeConversationId);

      // 3. Send Notification to other user
      const conversation = conversations.find(c => c.id === activeConversationId);
      if (conversation) {
        const otherUserId = conversation.participant1_id === currentUserId
          ? conversation.participant2_id
          : conversation.participant1_id;

        await supabase.from('notifications').insert({
          user_id: otherUserId,
          actor_id: currentUserId,
          type: 'message', // New type
          conversation_id: activeConversationId // Link to conversation
        });
      }

    } catch (err) {
      console.error('Error sending message:', err);
      // Could restore input text if failed
    }
  };

  const handleDeleteConversation = async () => {
    if (!activeConversationId) return;

    // Optional: Confirm with user before deleting? For now, direct delete as requested.
    if (!window.confirm("Tem certeza que deseja apagar toda a conversa?")) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', activeConversationId);

      if (error) throw error;

      // Reset state
      setActiveConversationId(null);
      setShowMenu(false);
      if (currentUserId) fetchConversations(currentUserId);
    } catch (err) {
      console.error("Error deleting conversation:", err);
      alert("Erro ao apagar conversa.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- RENDER: CHAT DETAIL VIEW ---
  if (activeConversationId) {
    const activeConv = conversations.find(c => c.id === activeConversationId);

    // Fallback if conversation just created and not fully enriched yet
    const otherUser = activeConv?.otherUser;

    if (!activeConv) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>;

    return (
      <div className="flex flex-col h-full bg-slate-50 relative animate-in slide-in-from-right duration-300">

        {/* Chat Header */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveConversationId(null)} className="text-slate-600 hover:text-cyan-600 transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div className="relative">
              <img src={otherUser?.avatar_url || 'https://via.placeholder.com/150'} alt={otherUser?.username} className="w-10 h-10 rounded-full object-cover border border-slate-100" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 leading-tight">{otherUser?.full_name || 'Usuário'}</span>
              <span className="text-xs text-slate-400 font-medium">@{otherUser?.username}</span>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-slate-400 hover:text-cyan-600 p-2"
            >
              <MoreVertical size={20} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20 animate-in fade-in zoom-in-95 duration-200">
                <button
                  onClick={handleDeleteConversation}
                  className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 font-medium transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} /> Apagar conversa
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm relative group ${msg.sender_id === currentUserId
                ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-tr-none'
                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <span className={`text-[10px] absolute bottom-1 right-2 opacity-0 group-hover:opacity-70 transition-opacity ${msg.sender_id === currentUserId ? 'text-white' : 'text-slate-400'}`}>
                  {formatTime(msg.created_at)}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
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
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-cyan-500" /></div>
        ) : conversations.length > 0 ? (
          conversations.map((conv) => {
            const user = conv.otherUser;
            if (!user) return null;

            return (
              <div
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white hover:shadow-sm hover:border-slate-100 border border-transparent transition-all cursor-pointer active:scale-[0.99]"
              >
                <div className="relative">
                  <img src={user.avatar_url || 'https://via.placeholder.com/150'} alt={user.username} className="w-14 h-14 rounded-full object-cover border border-slate-100" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-slate-900 truncate">{user.full_name}</h3>
                    <span className="text-xs text-slate-400 font-semibold">{formatTime(conv.last_message_at)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-slate-500 truncate pr-2 flex-1">
                      {conv.lastMessageText}
                    </p>
                    {!!conv.unreadCount && conv.unreadCount > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full ml-2">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 text-slate-400">
            <p>Nenhuma conversa ainda.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default MessagesScreen;
