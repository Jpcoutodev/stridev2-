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
import { Plus, Bell, Search, Home, Timer, User, Camera, Ruler, MessageSquare, Dumbbell, Apple, MessageCircle, ChefHat, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from './supabaseClient';

const App: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Navigation State
  const [currentView, setCurrentView] = useState<'home' | 'nutrition' | 'stopwatch' | 'profile' | 'search' | 'messages' | 'notifications' | 'recipes'>('home');

  // Home Tab State
  const [activeTab, setActiveTab] = useState<'myStride' | 'community'>('myStride');

  // Modal & Fab State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  // Data State
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
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
      } else {
        setFollowingIds(new Set());
        setFollowerIds(new Set());
        setUserProfile(null);
        setMyPostList([]);
        setUnreadNotificationsCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // -- REAL-TIME NOTIFICATIONS --
  useEffect(() => {
    if (!session?.user?.id) return;

    fetchUnreadNotificationsCount(session.user.id);

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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [session?.user?.id]);

  // -- DATA FETCHING --
  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) setUserProfile(data);
    if (error) console.error('Error fetching profile:', error);
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

  const fetchPosts = async () => {
    setIsLoadingPosts(true);
    try {
      // Fetch posts and join with profiles to get username/avatar/privacy
      const { data, error } = await supabase
        .from('posts')
        .select(`
                *,
                profiles (username, avatar_url, is_private)
            `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        console.log("Posts carregados:", data.length);

        // Map DB snake_case to App camelCase
        const mappedPosts: PostModel[] = data.map((p: any) => ({
          id: p.id,
          userId: p.user_id, // Added
          type: p.type,
          username: p.profiles?.username || 'Usuário',
          userAvatar: p.profiles?.avatar_url || 'https://via.placeholder.com/150',
          date: p.created_at,
          clapCount: p.clap_count || 0,
          caption: p.caption,
          imageUrl: p.image_url,
          weight: p.weight,
          measurements: p.measurements,
          workoutItems: p.workout_items,
          comments: [],
          isPrivate: p.profiles?.is_private || false
        }));

        // Filter out private posts from community feed, EXCEPT from people I follow OR people who follow me
        const userId = session?.user?.id;
        setCommunityPostList(mappedPosts.filter(p => {
          if (!p.isPrivate) return true;
          if (userId) {
            // I follow them OR they follow me
            return followingIds.has(p.userId) || followerIds.has(p.userId) || p.userId === userId;
          }
          return false;
        }));
        // Filter for "My Stride" (all my posts)
        const currentUsername = userProfile?.username;

        if (userId) {
          setMyPostList(mappedPosts.filter(p => p.username === currentUsername));
        } else {
          setMyPostList([]);
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
      alert('Erro ao excluir post.');
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

        // Upload to 'posts' bucket
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, imageFile);

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
        const { error } = await supabase
          .from('posts')
          .insert(dbPayload);

        if (error) throw error;
      }

      await fetchPosts(); // Refresh feed
      handleCloseModal();

    } catch (error: any) {
      console.error("Error saving post:", error);
      alert("Erro ao salvar post. Verifique se o Bucket 'posts' existe e está público.");
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
    return <AuthScreen onLogin={handleLogin} />;
  }

  const renderHomeContent = () => (
    <>
      {/* Top App Bar & Tabs */}
      <header className={`sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 flex flex-col transition-transform duration-300 ease-in-out ${showHeader ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/20 bg-slate-900 transition-transform hover:scale-105">
              <img
                src="https://qgbxduvipeadycxremqa.supabase.co/storage/v1/object/public/logo/logos/logo%203.png"
                alt="Stride Up"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-cyan-400 font-bold italic text-lg tracking-tighter">SU</div>';
                  }
                }}
              />
            </div>
            <h1 className="text-2xl font-bold italic tracking-tight text-slate-900">
              Stride Up
            </h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => { setTargetProfileUser(null); setCurrentView('search'); }}
              className="text-slate-600 hover:text-cyan-600 transition-colors p-2 rounded-full hover:bg-slate-50"
            >
              <Search size={24} />
            </button>
            <button
              onClick={() => setCurrentView('messages')}
              className="text-slate-600 hover:text-cyan-600 transition-colors relative p-2 rounded-full hover:bg-slate-50"
            >
              <MessageCircle size={24} />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
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
              My Stride
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
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={40} className="text-cyan-500 animate-spin mb-4" />
            <p className="text-slate-400 font-medium">Buscando no Supabase...</p>
          </div>
        ) : (
          <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-2 duration-500 pt-4">
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
            {postsToDisplay.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Dumbbell size={48} className="mb-4 opacity-50" />
                <p>Nenhum post encontrado no banco de dados.</p>
                <button onClick={fetchPosts} className="mt-4 flex items-center gap-2 text-cyan-600 font-bold bg-white px-4 py-2 rounded-full shadow-sm">
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

        {/* Bottom Navigation */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-100 px-5 py-4 flex justify-between items-center z-30">
          <button
            onClick={() => { setCurrentView('home'); setTargetProfileUser(null); }}
            className={`${currentView === 'home' ? 'text-cyan-600' : 'text-slate-300 hover:text-cyan-600'} transition-colors flex flex-col items-center gap-1`}
          >
            <Home size={24} strokeWidth={currentView === 'home' ? 3 : 2.5} />
            {currentView === 'home' && <div className="w-1 h-1 bg-cyan-600 rounded-full"></div>}
          </button>

          <button
            onClick={() => { setCurrentView('nutrition'); setTargetProfileUser(null); }}
            className={`${currentView === 'nutrition' ? 'text-cyan-600' : 'text-slate-300 hover:text-cyan-600'} transition-colors flex flex-col items-center gap-1`}
          >
            <Apple size={24} strokeWidth={currentView === 'nutrition' ? 3 : 2.5} />
            {currentView === 'nutrition' && <div className="w-1 h-1 bg-cyan-600 rounded-full"></div>}
          </button>

          <div className="w-8"></div> {/* Spacer for FAB */}

          <button
            onClick={() => { setCurrentView('recipes'); setTargetProfileUser(null); }}
            className={`${currentView === 'recipes' ? 'text-cyan-600' : 'text-slate-300 hover:text-cyan-600'} transition-colors flex flex-col items-center gap-1`}
          >
            <ChefHat size={24} strokeWidth={currentView === 'recipes' ? 3 : 2.5} />
            {currentView === 'recipes' && <div className="w-1 h-1 bg-cyan-600 rounded-full"></div>}
          </button>

          <button
            onClick={() => { setCurrentView('stopwatch'); setTargetProfileUser(null); }}
            className={`${currentView === 'stopwatch' ? 'text-cyan-600' : 'text-slate-300 hover:text-cyan-600'} transition-colors flex flex-col items-center gap-1`}
          >
            <Timer size={24} strokeWidth={currentView === 'stopwatch' ? 3 : 2.5} />
            {currentView === 'stopwatch' && <div className="w-1 h-1 bg-cyan-600 rounded-full"></div>}
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
      </div>
    </div>
  );
};

export default App;