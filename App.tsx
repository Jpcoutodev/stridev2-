import React, { useState, useEffect, useRef } from 'react';
import { myPosts, communityPosts, MOCK_USERS } from './data/mockData';
import { PostModel } from './types';
import PostCard from './components/PostCard';
import NewPostModal from './components/NewPostModal';
import StopwatchScreen from './components/StopwatchScreen';
import ProfileScreen from './components/ProfileScreen';
import NutritionScreen from './components/NutritionScreen';
import SearchScreen from './components/SearchScreen';
import MessagesScreen from './components/MessagesScreen';
import NotificationsScreen from './components/NotificationsScreen';
import RecipesScreen from './components/RecipesScreen';
import AuthScreen from './components/AuthScreen';
import LegalScreen from './components/LegalScreen';
import ChallengesScreen from './components/ChallengesScreen';
import NewChallengeModal from './components/NewChallengeModal';
import OnboardingScreen from './components/OnboardingScreen';
import AdminScreen from './components/AdminScreen';
import DeleteAccountScreen from './components/DeleteAccountScreen';
import { useToast } from './components/Toast';
import PostSkeleton from './components/PostSkeleton';
import { Plus, Bell, Search, Home, Timer, User, Camera, Ruler, MessageSquare, Dumbbell, Apple, MessageCircle, ChefHat, Loader2, RefreshCw, Trophy, Target } from 'lucide-react';
import { supabase } from './supabaseClient';

const App: React.FC = () => {
  const { showToast } = useToast();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Navigation State
  const [currentView, setCurrentView] = useState<'home' | 'nutrition' | 'stopwatch' | 'profile' | 'search' | 'messages' | 'notifications' | 'recipes' | 'legal' | 'challenges' | 'admin' | 'delete_account'>('home');
  const [initialLegalTab, setInitialLegalTab] = useState<'terms' | 'privacy' | 'security' | 'lgpd'>('terms');

  // Home Tab State
  const [activeTab, setActiveTab] = useState<'myStride' | 'community'>('myStride');

  // Modal & Fab State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [isFoodMenuOpen, setIsFoodMenuOpen] = useState(false);

  // Data State
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [feedPage, setFeedPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const POSTS_PER_PAGE = 20;
  const [myPostList, setMyPostList] = useState<PostModel[]>([]);
  const [communityPostList, setCommunityPostList] = useState<PostModel[]>([]);

  // Follow relationships for filtering private posts
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followerIds, setFollowerIds] = useState<Set<string>>(new Set());
  const [selectedPostType, setSelectedPostType] = useState<'image' | 'measurement' | 'text' | 'workout'>('image');
  const [editingPost, setEditingPost] = useState<PostModel | null>(null);
  const [communityStories, setCommunityStories] = useState<any[]>([]); // Real stories data

  // Profile Navigation State
  const [targetProfileUser, setTargetProfileUser] = useState<string | null>(null);
  const [targetMessageUser, setTargetMessageUser] = useState<string | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Scroll Logic for Header Hiding
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);

  // Select data source based on active tab
  const postsToDisplay = activeTab === 'myStride' ? myPostList : communityPostList;

  // -- Stories Logic (Combined Friends + Suggestions) --
  // This is now handled by communityStories state fetched from Supabase

  // -- SUPABASE AUTH LISTENER --
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthenticated(!!session);
      if (session) {
        fetchUserProfile(session.user.id);
        fetchRelationships(session.user.id);
        fetchCommunityStories(session.user.id); // Added
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthenticated(!!session);
      if (session) {
        fetchUserProfile(session.user.id);
        fetchRelationships(session.user.id);
        fetchCommunityStories(session.user.id);
        fetchPosts();
        fetchUnreadNotificationsCount(session.user.id);
        fetchUnreadMessagesCount(session.user.id);
      } else {
        setFollowingIds(new Set());
        setFollowerIds(new Set());
        setUserProfile(null);
        setMyPostList([]);
        setUnreadNotificationsCount(0);
        setUnreadMessagesCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // -- PWA SHORTCUT URL PARAMETER HANDLING --
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const screenParam = params.get('screen');
    const tabParam = params.get('tab');

    if (screenParam) {
      const validScreens = ['nutrition', 'stopwatch', 'challenges', 'profile', 'search', 'messages', 'notifications', 'recipes', 'legal', 'delete_account'];
      if (validScreens.includes(screenParam)) {
        setCurrentView(screenParam as any);
      }
      // Clean URL after navigation
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (tabParam === 'community') {
      setActiveTab('community');
      setCurrentView('home');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (screenParam === 'legal' && tabParam) {
      // Support for ?screen=legal&tab=privacy
      if (['terms', 'privacy', 'security', 'lgpd'].includes(tabParam)) {
        setInitialLegalTab(tabParam as any);
      }
    }
  }, []);

  // -- REAL-TIME NOTIFICATIONS --
  useEffect(() => {
    if (!session?.user?.id) return;

    fetchUnreadNotificationsCount(session.user.id);
    fetchUnreadMessagesCount(session.user.id);

    const subscription = supabase
      .channel('notifications-changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`
        },
        () => {
          fetchUnreadNotificationsCount(session.user.id);
          // Also fetch messages count as a new notification might mean a new message
          fetchUnreadMessagesCount(session.user.id);
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
          // We can't filter UPDATEs by sender if we are the receiver purely by column here easily without RLS awareness,
          // but we can just listen to all message events involving us.
          // RLS ensures we only receive events for messages we can see.
        },
        () => {
          fetchUnreadMessagesCount(session.user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [session?.user?.id]);

  // -- DATA FETCHING --
  const fetchUserProfile = async (userId: string, retryCount = 0) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setUserProfile(data);
      console.log('Profile loaded:', { id: data.id, onboarding_completed: data.onboarding_completed, is_admin: data.is_admin });

      if (data.is_admin === true) {
        setCurrentView('admin');
      }
      else if (data.onboarding_completed !== true) {
        console.log('Showing onboarding, onboarding_completed:', data.onboarding_completed);
        setShowOnboarding(true);
      }
    } else {
      // Se não achou o perfil (comum em cadastros novos devido a delay), tenta de novo
      if (retryCount < 3) {
        console.log(`Profile not found, retrying in 1s... (Attempt ${retryCount + 1}/3)`);
        setTimeout(() => fetchUserProfile(userId, retryCount + 1), 1000);
      } else {
        console.error('Error fetching profile after retries:', error);
      }
    }
  };

  const fetchUnreadNotificationsCount = async (userId: string) => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (!error && count !== null) {
      setUnreadNotificationsCount(count);
    }
  };

  const fetchUnreadMessagesCount = async (userId: string) => {
    // Count unread messages where sender is NOT me
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .neq('sender_id', userId);

    if (!error && count !== null) {
      setUnreadMessagesCount(count);
    }
  };

  const fetchRelationships = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('follower_id, following_id, status')
        .or(`follower_id.eq.${userId},following_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (error) throw error;

      if (data) {
        const following = new Set<string>();
        const followers = new Set<string>();

        data.forEach((f: any) => {
          if (f.follower_id === userId) {
            following.add(f.following_id);
          } else {
            followers.add(f.follower_id);
          }
        });

        setFollowingIds(following);
        setFollowerIds(followers);
      }
    } catch (err) {
      console.error('Error fetching relationships:', err);
    }
  };

  const fetchCommunityStories = async (userId: string) => {
    try {
      // 1. Fetch followed users (friends)
      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select(`
          following_id,
          profiles:following_id (id, username, full_name, avatar_url)
        `)
        .eq('follower_id', userId)
        .eq('status', 'accepted')
        .limit(10);

      if (followsError) throw followsError;

      const friends = follows?.map((f: any) => ({
        id: f.profiles.id,
        name: f.profiles.full_name || f.profiles.username,
        username: f.profiles.username,
        avatar: f.profiles.avatar_url || 'https://via.placeholder.com/150',
        isFriend: true,
        hasNewStory: false // Logic for stories could be added here later
      })) || [];

      // 2. Algorithm: Fetch suggested users (not followed yet)
      const friendIds = friends.map(f => f.id);
      const { data: suggestions, error: suggestionsError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .neq('id', userId) // Not me
        .not('id', 'in', `(${[userId, ...friendIds].join(',')})`) // Not someone I already follow
        .limit(10 - friends.length > 0 ? 10 - friends.length : 5);

      if (suggestionsError) throw suggestionsError;

      const suggestedProfiles = suggestions?.map((p: any) => ({
        id: p.id,
        name: p.full_name || p.username,
        username: p.username,
        avatar: p.avatar_url || 'https://via.placeholder.com/150',
        isFriend: false,
        hasNewStory: false
      })) || [];

      setCommunityStories([...friends, ...suggestedProfiles]);

    } catch (err) {
      console.error('Error fetching community stories:', err);
      // Fallback to minimal suggestions if everything fails
      setCommunityStories([]);
    }
  };

  const fetchPosts = async (reset: boolean = true) => {
    if (!reset && !hasMorePosts) return; // Don't fetch if no more posts

    // Use different loading states for initial load vs load more
    if (reset) {
      setIsLoadingPosts(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const currentPage = reset ? 0 : feedPage;
      const from = currentPage * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      // Fetch posts with pagination
      const { data, error } = await supabase
        .from('posts')
        .select(`
                *,
                profiles (username, avatar_url, is_private)
            `)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data) {
        console.log(`Posts carregados (página ${currentPage}):`, data.length);

        // Check if there are more posts
        setHasMorePosts(data.length === POSTS_PER_PAGE);

        if (reset) {
          setFeedPage(1);
        } else {
          setFeedPage(prev => prev + 1);
        }

        // For shared posts, we need to fetch the original post data
        const sharedPostIds = data.filter(p => p.shared_post_id).map(p => p.shared_post_id);
        let originalPostsMap: Record<string, any> = {};

        if (sharedPostIds.length > 0) {
          const { data: originalPosts } = await supabase
            .from('posts')
            .select(`*, profiles (username, avatar_url)`)
            .in('id', sharedPostIds);

          if (originalPosts) {
            originalPostsMap = originalPosts.reduce((acc, p) => {
              acc[p.id] = p;
              return acc;
            }, {} as Record<string, any>);
          }
        }

        // Map DB snake_case to App camelCase
        const mappedPosts: PostModel[] = data.map((p: any) => {
          // If this is a shared post, use original post data for display
          const originalPost = p.shared_post_id ? originalPostsMap[p.shared_post_id] : null;
          const isShared = !!originalPost;
          const displayData = isShared ? originalPost : p;

          return {
            id: p.id,
            userId: p.user_id,
            type: displayData.type,
            username: isShared ? displayData.profiles?.username : p.profiles?.username || 'Usuário',
            userAvatar: isShared ? displayData.profiles?.avatar_url : p.profiles?.avatar_url || 'https://via.placeholder.com/150',
            date: displayData.created_at || p.created_at,
            clapCount: displayData.clap_count || 0,
            caption: displayData.caption,
            imageUrl: displayData.image_url,
            weight: displayData.weight,
            measurements: displayData.measurements,
            workoutItems: displayData.workout_items,
            challengeId: p.challenge_id,
            comments: [],
            isPrivate: p.profiles?.is_private || false,
            // Shared post metadata
            sharedPostId: p.shared_post_id,
            originalPost: isShared ? {
              id: displayData.id,
              userId: displayData.user_id,
              type: displayData.type,
              username: displayData.profiles?.username || 'Usuário',
              userAvatar: displayData.profiles?.avatar_url || 'https://via.placeholder.com/150',
              date: displayData.created_at,
              clapCount: displayData.clap_count || 0,
              caption: displayData.caption,
              imageUrl: displayData.image_url,
              weight: displayData.weight,
              measurements: displayData.measurements,
              workoutItems: displayData.workout_items,
              comments: []
            } : undefined,
            sharedByUsername: isShared ? p.profiles?.username : undefined,
            sharedByAvatar: isShared ? p.profiles?.avatar_url : undefined
          };
        });

        // Filter out private posts from community feed, EXCEPT from approved followers
        const userId = session?.user?.id;
        const filteredCommunity = mappedPosts.filter(p => {
          // Don't show my own posts in community feed (they're in "My Stride")
          if (userId && p.userId === userId) return false;

          // Public posts: always show
          if (!p.isPrivate) return true;

          // Private posts: only show if I'm following them with accepted status
          if (userId) {
            return followingIds.has(p.userId);
          }
          return false;
        });

        const filteredMyPosts = userId ? mappedPosts.filter(p => p.userId === userId) : [];

        // Append or replace based on reset flag
        if (reset) {
          setCommunityPostList(filteredCommunity);
          setMyPostList(filteredMyPosts);
        } else {
          setCommunityPostList(prev => [...prev, ...filteredCommunity]);
          setMyPostList(prev => [...prev, ...filteredMyPosts]);
        }
      }
    } catch (err: any) {
      console.error('Erro ao buscar posts:', err.message);
      if (communityPostList.length === 0) {
        setCommunityPostList(communityPosts);
        setMyPostList(myPosts);
      }
    } finally {
      setIsLoadingPosts(false);
      setIsLoadingMore(false);
    }
  };

  const handleProfileUpdate = () => {
    if (session) {
      fetchUserProfile(session.user.id);
      fetchRelationships(session.user.id); // Added
      fetchPosts();
    }
  };

  // Initial Fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchPosts();
    }
  }, [isAuthenticated, userProfile]); // Re-run if profile loads

  // -- Scroll Effect --
  useEffect(() => {
    const handleScroll = () => {
      if (currentView !== 'home') return;
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) {
        setShowHeader(true);
        lastScrollY.current = currentScrollY;
        return;
      }
      if (currentScrollY > lastScrollY.current + 10) {
        setShowHeader(false);
      } else if (currentScrollY < lastScrollY.current - 10) {
        setShowHeader(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentView]);

  // -- Actions --

  const handleLogin = () => { /* Logic inside AuthScreen */ };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setSession(null);
    setCurrentView('home');
  };

  const openNewPostModal = (type: 'image' | 'measurement' | 'text' | 'workout') => {
    setEditingPost(null);
    setSelectedPostType(type);
    setIsFabMenuOpen(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPost(null);
  };

  const handleDeletePost = async (postId: string) => {
    // Optimistic Update
    const prevMy = [...myPostList];
    const prevComm = [...communityPostList];

    setMyPostList(prev => prev.filter(p => p.id !== postId));
    setCommunityPostList(prev => prev.filter(p => p.id !== postId));

    const { error } = await supabase.from('posts').delete().eq('id', postId);

    if (error) {
      showToast('Erro ao excluir post.', 'error');
      setMyPostList(prevMy);
      setCommunityPostList(prevComm);
    }
  };

  const handleEditPost = (postId: string) => {
    const postToEdit = postsToDisplay.find(p => p.id === postId);
    if (postToEdit) {
      setEditingPost(postToEdit);
      setSelectedPostType(postToEdit.type);
      setIsModalOpen(true);
    }
  };

  const handleBlockUser = (username: string) => {
    if (confirm(`Deseja deixar de ver as publicações de ${username}?`)) {
      setCommunityPostList(prev => prev.filter(p => p.username !== username));
    }
  };

  const handleSavePost = async (postData: Partial<PostModel>, imageFile?: File | null) => {
    // Prepare payload for Supabase
    const user = session.user;
    if (!user) return;

    try {
      let finalImageUrl = postData.imageUrl; // Default to current or undefined

      // UPLOAD LOGIC
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        // Upload to 'posts' bucket with CDN cache headers
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, imageFile, {
            cacheControl: '31536000', // 1 year cache for CDN
            contentType: imageFile.type || 'image/jpeg'
          });

        if (uploadError) {
          console.error("Upload error details:", uploadError);
          throw uploadError;
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);

        finalImageUrl = publicUrl;
      }

      const dbPayload = {
        user_id: user.id,
        type: selectedPostType,
        caption: postData.caption,
        weight: postData.weight,
        measurements: postData.measurements ? postData.measurements : null,
        workout_items: postData.workoutItems,
        image_url: finalImageUrl || null
      };

      if (editingPost) {
        // Update
        const { error } = await supabase
          .from('posts')
          .update(dbPayload)
          .eq('id', editingPost.id);

        if (error) throw error;
      } else {
        // Insert
        const { data: insertedPost, error } = await supabase
          .from('posts')
          .insert(dbPayload)
          .select('id')
          .single();

        if (error) throw error;

        // Background AI moderation analysis
        if (insertedPost) {
          const { analyzePost } = await import('./lib/openai');
          analyzePost(insertedPost.id, postData.caption, imageFile || undefined);
        }
      }

      await fetchPosts(); // Refresh feed
      handleCloseModal();

    } catch (error: any) {
      console.error("Error saving post:", error);
      showToast("Erro ao salvar post. Verifique se o Bucket 'posts' existe e está público.", 'error');
    }
  };

  const handleNavigateToProfile = (username: string) => {
    if (username === 'alex_stride' || (userProfile && username === userProfile.username)) {
      setCurrentView('profile');
    } else {
      setTargetProfileUser(username);
      setCurrentView('search');
    }
  };

  const handleBackFromSearch = () => {
    setTargetProfileUser(null);
    setCurrentView('home');
  };

  // --- EARLY RETURN: AUTH SCREEN ---
  if (!isAuthenticated) {
    // If legal screen is requested, show it, otherwise show auth
    if (currentView === 'legal') {
      return <LegalScreen onBack={() => setCurrentView('home')} initialTab={initialLegalTab} />;
    }
    if (currentView === 'delete_account') {
      return <DeleteAccountScreen onBack={() => {
        window.history.replaceState({}, '', window.location.pathname); // Clean URL
        setCurrentView('home');
      }} />;
    }
    return <AuthScreen onLogin={handleLogin} onOpenLegal={() => setCurrentView('legal')} />;
  }

  // --- ONBOARDING OVERLAY ---
  if (showOnboarding && session?.user?.id) {
    return (
      <OnboardingScreen
        userId={session.user.id}
        onComplete={() => setShowOnboarding(false)}
      />
    );
  }

  const renderHomeContent = () => (
    <>
      {/* Top App Bar & Tabs */}
      <header className={`sticky top-0 z-30 bg-[#fdfdfc] border-b border-gray-100 flex flex-col transition-transform duration-300 ease-in-out ${showHeader ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/logo-strideup.png"
              alt="Stride Up"
              className="h-10 object-contain"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => { setTargetProfileUser(null); setCurrentView('search'); }}
              className="text-slate-600 hover:text-cyan-600 transition-colors p-2 rounded-full hover:bg-slate-50"
            >
              <Search size={24} />
            </button>
            <button
              onClick={() => {
                setCurrentView('messages');
                // We'll trust that entering the screen eventually clears the count via fetch/subscription
                setTimeout(() => session?.user?.id && fetchUnreadMessagesCount(session.user.id), 2000);
              }}
              className="text-slate-600 hover:text-cyan-600 transition-colors relative p-2 rounded-full hover:bg-slate-50"
            >
              <MessageCircle size={24} />
              {unreadMessagesCount > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-in zoom-in duration-300">
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setCurrentView('notifications');
                // Mark as read could happen here or in the screen
              }}
              className="text-slate-600 hover:text-cyan-600 transition-colors relative p-2 rounded-full hover:bg-slate-50"
            >
              <Bell size={24} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-in zoom-in duration-300">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setCurrentView('profile'); setTargetProfileUser(null); }}
              className="text-slate-600 hover:text-cyan-600 transition-colors p-2 rounded-full hover:bg-slate-50"
            >
              <User size={24} />
            </button>
          </div>
        </div>

        {/* Row 2: Tab Bar */}
        <div className="flex w-full mt-2">
          <button
            onClick={() => setActiveTab('myStride')}
            className="flex-1 relative pb-3 text-center focus:outline-none transition-colors"
          >
            <span className={`text-sm font-bold tracking-wide ${activeTab === 'myStride' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
              Meus Passos
            </span>
            {activeTab === 'myStride' && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-lime-400 rounded-t-full mx-8 animate-in fade-in duration-300"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('community')}
            className="flex-1 relative pb-3 text-center focus:outline-none transition-colors"
          >
            <span className={`text-sm font-bold tracking-wide ${activeTab === 'community' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
              Comunidade
            </span>
            {activeTab === 'community' && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-lime-400 rounded-t-full mx-8 animate-in fade-in duration-300"></div>
            )}
          </button>
        </div>
      </header>

      {/* Stories (Community Only - Dynamic Followed Users) */}
      {activeTab === 'community' && (
        <div className="bg-white pt-4 pb-2 overflow-x-auto no-scrollbar animate-in slide-in-from-top-4 duration-300">
          <div className="flex px-4 space-x-4">
            {communityStories.map((user) => (
              <div
                key={user.id}
                onClick={() => handleNavigateToProfile(user.username)}
                className="flex flex-col items-center space-y-1 min-w-[64px] cursor-pointer group"
              >
                <div className={`w-16 h-16 rounded-full p-[3px] transition-transform group-hover:scale-105 ${user.hasNewStory ? 'bg-gradient-to-tr from-cyan-400 to-lime-500' : (user.isFriend ? 'bg-cyan-200' : 'bg-slate-200')}`}>
                  <div className="w-full h-full bg-white rounded-full p-[2px] relative">
                    <img
                      src={user.avatar}
                      className="w-full h-full rounded-full object-cover"
                      alt={user.name}
                    />
                    {user.isFriend && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-cyan-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-600 truncate max-w-[64px] group-hover:text-cyan-600">{user.name.split(' ')[0]}</span>
              </div>
            ))}

            {communityStories.length === 0 && (
              <div className="flex flex-col items-center justify-center w-full py-2 text-slate-400 text-xs">
                <p>Siga pessoas para ver seus stories</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feed List */}
      <main className="flex-1 pb-24 bg-slate-50 min-h-[500px]">
        {isLoadingPosts ? (
          <div className="pt-4 px-3 space-y-4">
            {[1, 2, 3].map(i => <PostSkeleton key={i} />)}
            <p className="text-center text-slate-400 text-xs font-medium pb-4">Carregando feed...</p>
          </div>
        ) : (
          <div className="pt-4">
            {postsToDisplay.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={activeTab === 'myStride' ? () => handleDeletePost(post.id) : undefined}
                onEdit={activeTab === 'myStride' ? () => handleEditPost(post.id) : undefined}
                onBlockUser={activeTab === 'community' ? () => handleBlockUser(post.username) : undefined}
                onUserClick={handleNavigateToProfile}
              />
            ))}

            {/* Load More Button */}
            {postsToDisplay.length > 0 && hasMorePosts && (
              <div className="flex justify-center py-6">
                <button
                  onClick={() => fetchPosts(false)}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2 bg-white text-cyan-600 font-bold px-6 py-3 rounded-full shadow-md border border-cyan-100 hover:bg-cyan-50 transition-all disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <><Loader2 size={18} className="animate-spin" /> Carregando...</>
                  ) : (
                    <><RefreshCw size={18} /> Carregar Mais</>
                  )}
                </button>
              </div>
            )}

            {/* No More Posts Message */}
            {postsToDisplay.length > 0 && !hasMorePosts && (
              <div className="text-center py-6 text-slate-400 text-sm">
                Você já viu tudo! 🎉
              </div>
            )}

            {postsToDisplay.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Dumbbell size={48} className="mb-4 opacity-50" />
                <p>Nenhum post encontrado no banco de dados.</p>
                <button onClick={() => fetchPosts(true)} className="mt-4 flex items-center gap-2 text-cyan-600 font-bold bg-white px-4 py-2 rounded-full shadow-sm">
                  <RefreshCw size={16} /> Tentar Novamente
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FAB (Only on Home) */}
      <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 flex flex-col items-center gap-3 transition-transform duration-300 ${!showHeader ? 'translate-y-24' : 'translate-y-0'}`}>
        {isFabMenuOpen && (
          <div className="flex flex-col gap-3 mb-2 animate-in slide-in-from-bottom-5 duration-300 fade-in">
            <button onClick={() => openNewPostModal('image')} className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-lg border border-slate-100 hover:bg-slate-50 transition-colors w-40">
              <div className="bg-cyan-100 p-2 rounded-full text-cyan-600"><Camera size={20} /></div>
              <span className="font-semibold text-slate-700 text-sm">Foto</span>
            </button>
            <button onClick={() => openNewPostModal('workout')} className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-lg border border-slate-100 hover:bg-slate-50 transition-colors w-40">
              <div className="bg-orange-100 p-2 rounded-full text-orange-600"><Dumbbell size={20} /></div>
              <span className="font-semibold text-slate-700 text-sm">Treino</span>
            </button>
            <button onClick={() => openNewPostModal('measurement')} className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-lg border border-slate-100 hover:bg-slate-50 transition-colors w-40">
              <div className="bg-lime-100 p-2 rounded-full text-lime-600"><Ruler size={20} /></div>
              <span className="font-semibold text-slate-700 text-sm">Medidas</span>
            </button>
            <button onClick={() => openNewPostModal('text')} className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-lg border border-slate-100 hover:bg-slate-50 transition-colors w-40">
              <div className="bg-purple-100 p-2 rounded-full text-purple-600"><MessageSquare size={20} /></div>
              <span className="font-semibold text-slate-700 text-sm">Frase</span>
            </button>
            <button onClick={() => { setIsChallengeModalOpen(true); setIsFabMenuOpen(false); }} className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 rounded-full shadow-lg hover:from-orange-400 hover:to-amber-400 transition-colors w-40">
              <div className="bg-white/20 p-2 rounded-full text-white"><Trophy size={20} /></div>
              <span className="font-semibold text-white text-sm">Desafio</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
          className={`group flex items-center justify-center w-16 h-16 ${isFabMenuOpen ? 'bg-slate-800 rotate-45' : 'bg-lime-400 rotate-0'} text-slate-900 rounded-full shadow-xl shadow-lime-400/40 hover:scale-110 active:scale-95 transition-all duration-300 focus:outline-none ring-4 ring-white z-50`}
        >
          {isFabMenuOpen ? <Plus size={32} className="text-white" /> : <Plus size={32} strokeWidth={3} />}
        </button>
      </div>

      {isFabMenuOpen && (
        <div
          className="fixed inset-0 bg-white/60 backdrop-blur-sm z-30"
          onClick={() => setIsFabMenuOpen(false)}
        />
      )}
    </>
  );

  // Admin screen renders at full width (outside mobile container)
  if (currentView === 'admin') {
    return <AdminScreen onViewApp={() => setCurrentView('home')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen relative shadow-2xl flex flex-col">

        {/* Main Content Switcher */}
        {currentView === 'home' && renderHomeContent()}
        {currentView === 'nutrition' && <NutritionScreen />}
        {currentView === 'stopwatch' && <StopwatchScreen />}
        {currentView === 'profile' && <ProfileScreen onLogout={handleLogout} onUpdate={handleProfileUpdate} />}
        {currentView === 'search' && (
          <SearchScreen
            targetUsername={targetProfileUser}
            onBack={handleBackFromSearch}
            onMessageClick={(userId) => {
              setTargetMessageUser(userId);
              setCurrentView('messages');
            }}
          />
        )}
        {currentView === 'messages' && (
          <MessagesScreen
            onBack={() => {
              setCurrentView('home');
              setTargetMessageUser(null);
              if (session?.user?.id) fetchUnreadMessagesCount(session.user.id);
            }}
            targetUserId={targetMessageUser}
          />
        )}
        {currentView === 'notifications' && (
          <NotificationsScreen
            onBack={() => setCurrentView('home')}
            onUserClick={(username) => {
              setTargetProfileUser(username);
              setCurrentView('search');
            }}
            onNotificationClick={(notif) => {
              if (notif.type === 'message') {
                setTargetMessageUser(notif.actor_id);
                setCurrentView('messages');
              } else {
                setTargetProfileUser(notif.actor?.username);
                setCurrentView('search');
              }
            }}
          />
        )}
        {currentView === 'recipes' && <RecipesScreen />}
        {currentView === 'challenges' && <ChallengesScreen onBack={() => setCurrentView('home')} />}
        {currentView === 'admin' && <AdminScreen onViewApp={() => setCurrentView('home')} />}
        {currentView === 'legal' && <LegalScreen onBack={() => setCurrentView('home')} />}

        {/* Bottom Navigation */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-3.5 flex justify-between items-center z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <button
            onClick={() => { setCurrentView('home'); setTargetProfileUser(null); setIsFoodMenuOpen(false); }}
            className={`${currentView === 'home' ? 'text-cyan-600' : 'text-slate-400 hover:text-cyan-600'} transition-colors flex flex-col items-center gap-1`}
          >
            <Home size={26} strokeWidth={currentView === 'home' ? 2.5 : 2} />
            {currentView === 'home' && <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full"></div>}
          </button>

          {/* Unified Food Button (Apple) */}
          <div className="relative">
            <button
              onClick={() => setIsFoodMenuOpen(!isFoodMenuOpen)}
              className={`${currentView === 'nutrition' || currentView === 'recipes' ? 'text-lime-500' : 'text-slate-400 hover:text-lime-500'} transition-colors flex flex-col items-center gap-1`}
            >
              <Apple size={26} strokeWidth={(currentView === 'nutrition' || currentView === 'recipes') ? 2.5 : 2} />
              {(currentView === 'nutrition' || currentView === 'recipes') && <div className="w-1.5 h-1.5 bg-lime-500 rounded-full"></div>}
            </button>

            {/* Food Menu Popup */}
            {isFoodMenuOpen && (
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 w-44">
                <button
                  onClick={() => { setCurrentView('nutrition'); setTargetProfileUser(null); setIsFoodMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-lime-50 transition-colors border-b border-slate-100"
                >
                  <div className="w-9 h-9 bg-lime-100 rounded-xl flex items-center justify-center">
                    <Apple size={20} className="text-lime-600" />
                  </div>
                  <span className="font-semibold text-slate-700">Nutrição</span>
                </button>
                <button
                  onClick={() => { setCurrentView('recipes'); setTargetProfileUser(null); setIsFoodMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-orange-50 transition-colors"
                >
                  <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
                    <ChefHat size={20} className="text-orange-600" />
                  </div>
                  <span className="font-semibold text-slate-700">Chef IA</span>
                </button>
              </div>
            )}
          </div>

          <div className="w-10"></div> {/* Spacer for FAB */}

          <button
            onClick={() => { setCurrentView('challenges'); setTargetProfileUser(null); setIsFoodMenuOpen(false); }}
            className={`${currentView === 'challenges' ? 'text-orange-500' : 'text-slate-400 hover:text-orange-500'} transition-colors flex flex-col items-center gap-1`}
          >
            <Trophy size={26} strokeWidth={currentView === 'challenges' ? 2.5 : 2} />
            {currentView === 'challenges' && <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>}
          </button>

          <button
            onClick={() => { setCurrentView('stopwatch'); setTargetProfileUser(null); setIsFoodMenuOpen(false); }}
            className={`${currentView === 'stopwatch' ? 'text-cyan-600' : 'text-slate-400 hover:text-cyan-600'} transition-colors flex flex-col items-center gap-1`}
          >
            <Timer size={26} strokeWidth={currentView === 'stopwatch' ? 2.5 : 2} />
            {currentView === 'stopwatch' && <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full"></div>}
          </button>

        </div>

        {/* Modal */}
        <NewPostModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSavePost}
          postType={selectedPostType}
          initialData={editingPost}
        />

        {/* Challenge Modal */}
        <NewChallengeModal
          isOpen={isChallengeModalOpen}
          onClose={() => setIsChallengeModalOpen(false)}
          onSave={() => fetchPosts()}
        />
      </div>
    </div>
  );
};

export default App;