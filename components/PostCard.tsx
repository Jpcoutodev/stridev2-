import React, { useState, useRef, useEffect } from 'react';
import { PostModel, CommentModel } from '../types';
import { MessageCircle, Share2, Ruler, Scale, Dumbbell, Quote, MoreHorizontal, Edit, Trash2, Calendar, EyeOff, Send, Reply, Copy, Check, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface PostCardProps {
  post: PostModel;
  onDelete?: () => void;
  onEdit?: () => void;
  onBlockUser?: () => void;
  onUserClick?: (username: string) => void; // New prop for profile navigation
}

const PostCard: React.FC<PostCardProps> = ({ post, onDelete, onEdit, onBlockUser, onUserClick }) => {
  const [currentUser, setCurrentUser] = useState<{ id: string, username: string, avatar_url: string } | null>(null);

  const [claps, setClaps] = useState(post.clapCount);
  const [hasClapped, setHasClapped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Menu State
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Comments State
  const [comments, setComments] = useState<CommentModel[]>(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Share State
  const [showShareTooltip, setShowShareTooltip] = useState(false);

  // Init auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from('profiles').select('id, username, avatar_url').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data) setCurrentUser(data as any);
          });

        // Check if user already liked
        supabase.from('likes').select('id').match({ user_id: session.user.id, post_id: post.id }).single()
          .then(({ data }) => {
            if (data) setHasClapped(true);
          });
      }
    });
  }, [post.id]);

  // Fetch comments when opened
  useEffect(() => {
    if (showComments && post.id) {
      fetchComments();
    }
  }, [showComments, post.id]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select(`
        id,
        user_id,
        text,
        created_at,
        profiles (username, avatar_url)
      `)
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (data) {
      const mapped: CommentModel[] = data.map((c: any) => ({
        id: c.id,
        userId: c.user_id,
        username: c.profiles?.username || 'Usuário',
        userAvatar: c.profiles?.avatar_url || 'https://via.placeholder.com/150',
        text: c.text,
        timestamp: formatTime(c.created_at)
      }));
      setComments(mapped);
    }
  };

  const formatTime = (dateStr: string) => {
    const now = new Date();
    const past = new Date(dateStr);
    const diffInMs = now.getTime() - past.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Agora';
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)}d`;
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClap = async () => {
    if (!currentUser) return;

    if (!hasClapped) {
      setClaps((prev) => prev + 1);
      setHasClapped(true);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);

      try {
        // 1. Insert like
        await supabase.from('likes').insert({ user_id: currentUser.id, post_id: post.id });

        // 2. Increment clap count
        await supabase.rpc('increment_clap_count', { post_id_val: post.id });

        // 3. Send Notification (if not owner)
        if (currentUser.id !== post.userId) {
          await supabase.from('notifications').insert({
            user_id: post.userId,
            actor_id: currentUser.id,
            type: 'like',
            post_id: post.id
          });
        }
      } catch (err) {
        console.error('Error liking:', err);
      }
    } else {
      setClaps((prev) => Math.max(0, prev - 1));
      setHasClapped(false);

      try {
        await supabase.from('likes').delete().match({ user_id: currentUser.id, post_id: post.id });
        await supabase.rpc('decrement_clap_count', { post_id_val: post.id });
      } catch (err) {
        console.error('Error unliking:', err);
      }
    }
  };

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUserClick) {
      onUserClick(post.username);
    }
  };

  // --- Comment Logic ---
  const toggleComments = () => {
    setShowComments(!showComments);
  };

  const handleSendComment = async () => {
    if (!commentInput.trim() || !currentUser) return;

    const newCommentContent = commentInput;
    setCommentInput('');

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: currentUser.id,
          post_id: post.id,
          text: newCommentContent
        })
        .select(`
           id,
           created_at
        `)
        .single();

      if (error) throw error;

      // Update local state
      const localComment: CommentModel = {
        id: data.id,
        userId: currentUser.id,
        username: currentUser.username || 'Usuário',
        userAvatar: currentUser.avatar_url || 'https://via.placeholder.com/150',
        text: newCommentContent,
        timestamp: 'Agora'
      };
      setComments([...comments, localComment]);

      // Send Notification (if not owner)
      if (currentUser.id !== post.userId) {
        await supabase.from('notifications').insert({
          user_id: post.userId,
          actor_id: currentUser.id,
          type: 'comment',
          post_id: post.id
        });
      }
    } catch (err) {
      console.error('Error sending comment:', err);
    }
  };

  const handleReply = (username: string) => {
    setCommentInput(`@${username} `);
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  };

  // --- Share Logic ---
  const handleShare = async () => {
    const shareData = {
      title: 'Stride Up',
      text: `Veja o post de ${post.username} no Stride Up!`,
      url: window.location.href // In a real app, this would be a deep link
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(`Veja o post de ${post.username}: ${post.caption}`);
      setShowShareTooltip(true);
      setTimeout(() => setShowShareTooltip(false), 2000);
    }
  };

  // --- Date Formatting Logic for "Evolution" Highlight ---
  const renderDateBadge = (isoDate: string) => {
    const date = new Date(isoDate);
    const now = new Date();
    const isCurrentYear = date.getFullYear() === now.getFullYear();

    const day = date.getDate();
    const month = date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
    const year = date.getFullYear();

    if (isCurrentYear) {
      // CURRENT YEAR: Highlight Day and Month (Active, Fresh)
      return (
        <div className="flex flex-col items-end">
          <span className="text-xs font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md uppercase tracking-wider border border-cyan-100">
            {day} {month}
          </span>
        </div>
      );
    } else {
      // PAST YEAR: Highlight Year (History, Evolution, Vintage)
      return (
        <div className="flex flex-col items-end">
          <div className="flex items-center space-x-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
            <Calendar size={10} className="text-amber-700" />
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">
              {month} {year}
            </span>
          </div>
        </div>
      );
    }
  };

  const renderContent = () => {
    // 1. Text Only Post (Frase) - Render colorful background
    if (post.type === 'text' && !post.imageUrl) {
      return (
        <div className="w-full aspect-[4/3] bg-gradient-to-br from-purple-500 to-indigo-600 flex flex-col items-center justify-center p-8 text-center">
          <Quote size={32} className="text-white/30 mb-4" />
          <p className="text-white text-xl font-bold italic font-serif leading-relaxed">
            {post.caption}
          </p>
        </div>
      );
    }

    // 2. Measurement Post WITHOUT Image (Render specialized Data Card)
    if (post.type === 'measurement' && !post.imageUrl) {
      return (
        <div className="w-full aspect-[4/3] bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden group">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-colors duration-700"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-lime-500/10 rounded-full blur-3xl group-hover:bg-lime-500/20 transition-colors duration-700"></div>

          <div className="z-10 flex flex-col items-center gap-6 w-full">
            {post.weight && (
              <div className="flex flex-col items-center animate-in zoom-in duration-500">
                <Scale size={32} className="text-cyan-400 mb-2" />
                <span className="text-6xl font-bold text-white tracking-tighter flex items-baseline">
                  {post.weight}
                  <span className="text-2xl text-slate-500 font-medium ml-1">kg</span>
                </span>
                <span className="text-xs font-bold text-cyan-500 uppercase tracking-widest mt-1 bg-cyan-950/30 px-3 py-1 rounded-full border border-cyan-900/50">Peso Atual</span>
              </div>
            )}

            {post.weight && post.measurements && <div className="w-16 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>}

            {post.measurements && (
              <div className="flex flex-col items-center animate-in slide-in-from-bottom-2 duration-700 delay-100">
                <Ruler size={24} className="text-lime-400 mb-2" />
                <p className="text-lg font-medium text-slate-300 max-w-[80%] leading-snug">
                  {post.measurements}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 3. Image Post (With or Without Overlay)
    if (post.imageUrl) {
      return (
        <div className="relative w-full bg-slate-100 aspect-[4/5] group">
          <img
            src={post.imageUrl}
            alt="Post content"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.01]"
            loading="lazy"
          />

          {/* Biometric Overlay (Only Weight here now to prevent clutter) */}
          {post.type === 'measurement' && post.weight && (
            <div className="absolute bottom-4 left-4">
              <div className="backdrop-blur-md bg-slate-900/70 rounded-full px-4 py-2 border border-white/10 flex items-center shadow-lg">
                <div className="flex items-center space-x-1.5 text-white">
                  <Scale size={16} className="text-cyan-400" />
                  <span className="text-sm font-bold tracking-wide">{post.weight}kg</span>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 4. Workout Post (No Image) - Shows caption as header + list
    return null; // Will be handled in main render structure if null
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-sm mb-6 mx-4 overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={handleUserClick}>
          <div className="relative">
            <img
              src={post.userAvatar}
              alt={post.username}
              className="w-10 h-10 rounded-full object-cover border-2 border-slate-100"
            />
            {/* Online status dot */}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-lime-400 rounded-full border-2 border-white"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 hover:text-cyan-600 transition-colors">{post.username}</span>
            {/* Replaced 'TimeAgo' with explicit Date Badge */}
            {renderDateBadge(post.date)}
          </div>
        </div>

        {/* Three Dots Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <MoreHorizontal size={20} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">

              {/* OPTION FOR MY POSTS (Owner) */}
              {onEdit && (
                <button
                  onClick={() => { setShowMenu(false); onEdit(); }}
                  className="w-full flex items-center px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium border-b border-slate-50"
                >
                  <Edit size={16} className="mr-2 text-blue-500" />
                  Editar
                </button>
              )}

              {onDelete && (
                <button
                  onClick={() => { setShowMenu(false); onDelete(); }}
                  className="w-full flex items-center px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium"
                >
                  <Trash2 size={16} className="mr-2" />
                  Excluir
                </button>
              )}

              {/* OPTION FOR COMMUNITY POSTS */}
              {onBlockUser && (
                <button
                  onClick={() => { setShowMenu(false); onBlockUser(); }}
                  className="w-full flex items-center px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-red-500 transition-colors font-medium"
                >
                  <EyeOff size={16} className="mr-2" />
                  Ocultar Publicações
                </button>
              )}

            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {renderContent()}

      {/* Measurements List Section (New - displays tags below image) */}
      {post.measurements && post.imageUrl && (
        <div className="px-4 pt-3 flex flex-wrap gap-2">
          {post.measurements.split(' | ').map((item, index) => (
            <div key={index} className="flex items-center gap-1.5 bg-lime-50 text-lime-700 border border-lime-100 px-3 py-1.5 rounded-lg">
              <Ruler size={14} className="text-lime-600" />
              <span className="text-xs font-bold">{item}</span>
            </div>
          ))}
        </div>
      )}

      {/* Workout List Section (Visible if type is workout) */}
      {post.type === 'workout' && post.workoutItems && (
        <div className="bg-orange-50/50 p-4 border-t border-b border-orange-100/30">
          <div className="flex items-center gap-2 mb-3">
            <Dumbbell size={18} className="text-orange-500" />
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Resumo do Treino</span>
          </div>
          <div className="space-y-2">
            {post.workoutItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-orange-100 shadow-sm">
                <span className="text-sm font-bold text-slate-800">{item.activity}</span>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{item.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="px-4 py-3 relative">
        <div className="flex items-center space-x-5 mb-3">
          <button
            onClick={handleClap}
            className={`transition-all duration-300 transform ${isAnimating ? 'scale-125' : 'scale-100'} focus:outline-none group`}
          >
            {/* Clap Emoji with filters for active state */}
            <span className={`text-3xl block transition-all duration-300 ${hasClapped ? 'grayscale-0 drop-shadow-[0_0_15px_rgba(163,230,53,0.8)]' : 'grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100'}`}>
              👏
            </span>
          </button>

          <button
            onClick={toggleComments}
            className={`text-slate-800 focus:outline-none hover:text-cyan-600 transition-colors ${showComments ? 'text-cyan-600' : ''}`}
          >
            <MessageCircle size={28} />
          </button>

          <div className="ml-auto relative">
            {showShareTooltip && (
              <div className="absolute bottom-full right-0 mb-2 bg-slate-800 text-white text-xs py-1 px-3 rounded-lg shadow-lg whitespace-nowrap animate-in fade-in zoom-in">
                Link copiado!
              </div>
            )}
            <button
              onClick={handleShare}
              className="text-slate-800 focus:outline-none hover:text-cyan-600 transition-colors"
            >
              <Share2 size={26} />
            </button>
          </div>
        </div>

        {/* Likes Count */}
        <div className="font-bold text-sm mb-2 text-slate-900 flex items-center">
          <span className="bg-lime-100 text-lime-700 text-[10px] px-1.5 py-0.5 rounded mr-2 uppercase tracking-wider font-bold">Aplausos</span>
          {claps}
        </div>

        {/* Caption (If not text post, because text post has caption in the main block) */}
        {post.type !== 'text' && (
          <div className="text-sm text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-900 mr-2 cursor-pointer hover:text-cyan-600 transition-colors" onClick={handleUserClick}>{post.username}</span>
            {post.caption}
          </div>
        )}

        {/* --- COMMENTS SECTION --- */}
        {/* Comment Preview (If hidden and comments exist) */}
        {!showComments && comments.length > 0 && (
          <button onClick={toggleComments} className="mt-2 text-xs text-slate-400 font-semibold hover:text-slate-600 transition-colors">
            Ver todos os {comments.length} comentários
          </button>
        )}

        {/* Expanded Comments */}
        {showComments && (
          <div className="mt-4 pt-3 border-t border-slate-100 animate-in slide-in-from-top-2">

            {/* Comments List */}
            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto pr-1 no-scrollbar">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">Seja o primeiro a comentar!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5">
                    <img src={comment.userAvatar} alt={comment.username} className="w-8 h-8 rounded-full object-cover border border-slate-100 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold text-slate-900">{comment.username}</span>
                        <span className="text-[10px] text-slate-400">{comment.timestamp}</span>
                      </div>
                      <p className="text-sm text-slate-600 leading-snug">{comment.text}</p>
                      <button
                        onClick={() => handleReply(comment.username)}
                        className="text-[10px] font-bold text-slate-400 mt-1 hover:text-cyan-600 transition-colors flex items-center gap-1"
                      >
                        <Reply size={10} /> Responder
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-full border border-slate-200 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100 transition-all">
              <img
                src={currentUser?.avatar_url || "https://via.placeholder.com/150"}
                alt="Current User"
                className="w-8 h-8 rounded-full border border-white shadow-sm object-cover"
              />
              <input
                ref={commentInputRef}
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Adicione um comentário..."
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none px-2 font-medium"
                onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
              />
              <button
                onClick={handleSendComment}
                disabled={!commentInput.trim()}
                className={`p-2 rounded-full transition-all ${commentInput.trim() ? 'bg-cyan-500 text-white hover:bg-cyan-600' : 'text-slate-300'}`}
              >
                <Send size={16} fill={commentInput.trim() ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PostCard;