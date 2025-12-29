import React, { useState, useRef, useEffect } from 'react';
import { PostModel, CommentModel } from '../types';
import { MessageCircle, Share2, Ruler, Scale, Dumbbell, Quote, MoreHorizontal, Edit, Trash2, Calendar, EyeOff, Send, Reply, Copy, Check, Loader2, Trophy, Target, UserPlus, Flag } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from './Toast';

interface PostCardProps {
  post: PostModel;
  onDelete?: () => void;
  onEdit?: () => void;
  onBlockUser?: () => void;
  onUserClick?: (username: string) => void;
  onJoinChallenge?: (challengeId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onDelete, onEdit, onBlockUser, onUserClick, onJoinChallenge }) => {
  const { showToast } = useToast();
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Challenge Join State
  const [isJoiningChallenge, setIsJoiningChallenge] = useState(false);
  const [hasJoinedChallenge, setHasJoinedChallenge] = useState(false);

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
  const handleShare = () => {
    setShowShareModal(true);
  };

  const confirmShare = async () => {
    if (!currentUser) return;
    setIsSharing(true);
    try {
      // Create a new "shared" post that references the original
      const { error } = await supabase.from('posts').insert({
        user_id: currentUser.id,
        type: post.type,
        caption: '', // Shared posts don't need their own caption
        shared_post_id: post.sharedPostId || post.id, // Always reference the original, not a re-share
        clap_count: 0
      });

      if (error) throw error;

      setShowShareModal(false);
      setShowShareTooltip(true);
      setTimeout(() => setShowShareTooltip(false), 2000);
    } catch (err) {
      console.error('Error sharing post:', err);
    } finally {
      setIsSharing(false);
    }
  };

  // --- Join Challenge Logic ---
  const handleJoinChallenge = async () => {
    if (!currentUser || !post.challengeId || isJoiningChallenge || hasJoinedChallenge) return;

    // Don't allow joining own challenge
    if (currentUser.id === post.userId) {
      showToast('Este é seu próprio desafio!', 'error');
      return;
    }

    setIsJoiningChallenge(true);

    try {
      // 1. Fetch original challenge details
      const { data: originalChallenge, error: fetchError } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', post.challengeId)
        .single();

      if (fetchError || !originalChallenge) {
        throw new Error('Desafio não encontrado');
      }

      // 2. Check if user already has this challenge
      const { data: existingChallenge } = await supabase
        .from('challenges')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('original_challenge_id', post.challengeId)
        .single();

      if (existingChallenge) {
        showToast('Você já está participando deste desafio!', 'error');
        setHasJoinedChallenge(true);
        return;
      }

      // 3. Create a copy of the challenge for the current user
      const { error: createError } = await supabase
        .from('challenges')
        .insert({
          user_id: currentUser.id,
          title: originalChallenge.title,
          description: originalChallenge.description,
          frequency: originalChallenge.frequency,
          target_count: originalChallenge.target_count,
          current_count: 0,
          status: 'active',
          original_challenge_id: post.challengeId
        });

      if (createError) throw createError;

      setHasJoinedChallenge(true);
      showToast('🎯 Você entrou no desafio! Boa sorte!', 'success');

      if (onJoinChallenge) {
        onJoinChallenge(post.challengeId);
      }
    } catch (err: any) {
      console.error('Error joining challenge:', err);
      showToast(err.message || 'Erro ao aderir ao desafio', 'error');
    } finally {
      setIsJoiningChallenge(false);
    }
  };

  // --- Date Formatting Logic - Simplified inline text ---
  const renderDateBadge = (isoDate: string) => {
    const date = new Date(isoDate);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const day = date.getDate();
    const month = date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
    const year = date.getFullYear();
    const isCurrentYear = date.getFullYear() === now.getFullYear();

    if (isToday) {
      return <span className="text-xs text-slate-400 font-medium">Hoje</span>;
    } else if (isCurrentYear) {
      return <span className="text-xs text-slate-400 font-medium">{day} {month}</span>;
    } else {
      return <span className="text-xs text-slate-400 font-medium">{day} {month} {year}</span>;
    }
  };

  const renderContent = () => {


    // 2. Measurement Post WITHOUT Image (Render specialized Data Card)
    if (post.type === 'measurement' && !post.imageUrl) {
      return (
        <div className="w-full min-h-[200px] py-8 bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden group">
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
              <div className="flex flex-col items-center animate-in slide-in-from-bottom-2 duration-700 delay-100 w-full">
                <Ruler size={24} className="text-lime-400 mb-3" />
                <div className="flex flex-wrap justify-center gap-2 max-w-full px-4">
                  {post.measurements.split(' | ').map((item, index) => (
                    <span
                      key={index}
                      className="text-sm font-medium text-slate-200 bg-slate-700/50 px-3 py-1.5 rounded-full border border-slate-600/50 whitespace-nowrap"
                    >
                      {item}
                    </span>
                  ))}
                </div>
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
    <div className="bg-white border-y border-slate-100 md:border md:rounded-3xl shadow-sm mb-1 md:mb-6 mx-0 md:mx-4 overflow-hidden relative">

      {/* Challenge Status Badge at Top */}
      {post.type === 'challenge' && (
        <div className={`px-4 py-2 flex items-center justify-between ${post.caption?.includes('Concluído') ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-orange-50 border-b border-orange-100'}`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${post.caption?.includes('Concluído') ? 'bg-emerald-500' : 'bg-orange-500'}`}>
              <Trophy size={14} className="text-white" />
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${post.caption?.includes('Concluído') ? 'text-emerald-700' : 'text-orange-700'}`}>
              {post.caption?.includes('Concluído') ? '✅ Concluído' : '🔥 Em Andamento'}
            </span>
          </div>
        </div>
      )}

      {/* Shared Post Attribution */}
      {post.originalPost && post.sharedByUsername && (
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 text-slate-500 border-b border-slate-50">
          <Share2 size={14} />
          <span className="text-xs font-medium">
            <span className="font-bold text-slate-700">{post.sharedByUsername}</span> compartilhou
          </span>
        </div>
      )}

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
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white"></div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 hover:text-emerald-600 transition-colors">{post.username}</span>
              <span className="text-slate-300">·</span>
              {renderDateBadge(post.date)}
            </div>
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

              {/* Report Button - Always visible for posts not owned by current user */}
              {currentUser && currentUser.id !== post.userId && (
                <button
                  onClick={async () => {
                    setShowMenu(false);
                    try {
                      const { error } = await supabase.from('reports').insert({
                        post_id: post.id,
                        reporter_id: currentUser.id,
                        reason: 'Conteúdo impróprio'
                      });
                      if (error) throw error;
                      showToast('Denúncia enviada. Obrigado!', 'success');
                    } catch (err) {
                      console.error('Report error:', err);
                      showToast('Erro ao denunciar', 'error');
                    }
                  }}
                  className="w-full flex items-center px-4 py-3 text-sm text-orange-600 hover:bg-orange-50 transition-colors font-medium border-t border-slate-100"
                >
                  <Flag size={16} className="mr-2" />
                  Denunciar
                </button>
              )}

            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {/* Caption (X/Twitter Style) */}
      {post.caption && (
        <div className="px-4 pb-3 pt-0">
          <p className="text-[15px] sm:text-base text-slate-900 leading-relaxed whitespace-pre-wrap font-normal">
            {post.caption}
          </p>
        </div>
      )}

      {/* Main Content Area (Media) */}
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

      {/* Challenge Section (Visible if type is challenge) */}
      {post.type === 'challenge' && (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 border-t border-b border-orange-100/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-orange-500 p-1.5 rounded-lg">
              <Trophy size={16} className="text-white" />
            </div>
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Desafio</span>
            {post.caption?.includes('Concluído') ? (
              <span className="ml-auto bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                ✅ Concluído
              </span>
            ) : (
              <span className="ml-auto bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                🔥 Em andamento
              </span>
            )}
          </div>

          {/* Join Challenge Button (Only for other users, not owner) */}
          {currentUser && currentUser.id !== post.userId && post.challengeId && !post.caption?.includes('Concluído') && (
            <div className="flex justify-end mt-2">
              <button
                onClick={handleJoinChallenge}
                disabled={isJoiningChallenge || hasJoinedChallenge}
                className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${hasJoinedChallenge
                  ? 'bg-green-100 text-green-700 cursor-default'
                  : 'bg-orange-500 hover:bg-orange-600 text-white active:scale-[0.98]'
                  }`}
              >
                {isJoiningChallenge ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Entrando...
                  </>
                ) : hasJoinedChallenge ? (
                  <>
                    <Check size={14} />
                    Participando
                  </>
                ) : (
                  <>
                    <UserPlus size={14} />
                    Aceitar Desafio
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Bar - Compact Design */}
      <div className="px-4 py-2">
        <div className="flex items-center">
          {/* Left: Clap, Comment icons with counters */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleClap}
              className={`flex items-center gap-1.5 transition-all duration-300 ${isAnimating ? 'scale-110' : 'scale-100'} focus:outline-none group`}
            >
              <span className={`text-2xl transition-all duration-300 ${hasClapped ? 'grayscale-0' : 'grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100'}`}>
                👏
              </span>
              <span className={`text-sm font-bold ${hasClapped ? 'text-emerald-600' : 'text-slate-500'}`}>{claps}</span>
            </button>

            <button
              onClick={toggleComments}
              className={`flex items-center gap-1.5 focus:outline-none hover:text-emerald-600 transition-colors ${showComments ? 'text-emerald-600' : 'text-slate-600'}`}
            >
              <MessageCircle size={22} />
              <span className="text-sm font-bold text-slate-500">{comments.length}</span>
            </button>
          </div>

          {/* Right: Share */}
          <div className="ml-auto relative">
            {showShareTooltip && (
              <div className="absolute bottom-full right-0 mb-2 bg-slate-800 text-white text-xs py-1 px-3 rounded-lg shadow-lg whitespace-nowrap animate-in fade-in zoom-in">
                Link copiado!
              </div>
            )}
            <button
              onClick={handleShare}
              className="text-slate-600 focus:outline-none hover:text-emerald-600 transition-colors"
            >
              <Share2 size={22} />
            </button>
          </div>
        </div>

        {/* --- COMMENTS SECTION --- */}
        {/* Comment Preview (If hidden and comments exist) */}
        {!showComments && comments.length > 0 && (
          <button onClick={toggleComments} className="mt-2 text-xs text-slate-400 font-semibold hover:text-emerald-600 transition-colors">
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
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-3xl border border-slate-200 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100 transition-all w-full">
              <img
                src={currentUser?.avatar_url || "https://via.placeholder.com/150"}
                alt="Current User"
                className="w-8 h-8 rounded-full border border-white shadow-sm object-cover flex-shrink-0"
              />
              <input
                ref={commentInputRef}
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Comentar..."
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none px-2 font-medium min-w-0"
                onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
              />
              <button
                onClick={handleSendComment}
                disabled={!commentInput.trim()}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all flex-shrink-0 shadow-sm ${commentInput.trim() ? 'bg-cyan-500 text-white hover:bg-cyan-600 scale-100' : 'bg-slate-200 text-slate-400 scale-95'}`}
              >
                <Send size={16} fill={commentInput.trim() ? "currentColor" : "none"} className={commentInput.trim() ? "ml-0.5" : ""} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Share Confirmation Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Share2 size={24} className="text-cyan-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Compartilhar Publicação?</h3>
              <p className="text-sm text-slate-500 mt-1">Esta postagem aparecerá no seu perfil e no feed da comunidade.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmShare}
                disabled={isSharing}
                className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 text-white font-semibold hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2"
              >
                {isSharing ? <Loader2 size={18} className="animate-spin" /> : 'Compartilhar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;