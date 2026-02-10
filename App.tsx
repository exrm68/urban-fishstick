import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Zap, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot, doc, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

import { Movie, Category, AppSettings, StoryItem } from './types';
import { INITIAL_MOVIES, CATEGORIES, BOT_USERNAME } from './constants';

import MovieTile from './components/MovieTile';
import Sidebar from './components/Sidebar';
import MovieDetails from './components/MovieDetails';
import Banner from './components/Banner';
import StoryCircle from './components/StoryCircle';
import Top10 from './components/Top10';
import TrendingRow from './components/TrendingRow';
import StoryViewer from './components/StoryViewer';
import BottomNav from './components/BottomNav';
import Explore from './components/Explore';
import Watchlist from './components/Watchlist';
import NoticeBar from './components/NoticeBar';
import SplashScreen from './components/SplashScreen';
import AdminPanel from './components/AdminPanel';

type Tab = 'home' | 'search' | 'favorites';

const App: React.FC = () => {
  // Loading State
  const [isLoading, setIsLoading] = useState(true);

  // State
  const [movies, setMovies] = useState<Movie[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>({
      botUsername: BOT_USERNAME,
      channelLink: 'https://t.me/cineflixrequestcontent',
      noticeText: '',
      noticeEnabled: false,
      enableTop10: true,
      enableStories: true,
      enableBanners: true,
      appName: 'CINEFLIX'
  });
  
  // Navigation & Scroll State
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  
  // 🔐 Secret Admin Access State
  const [tapCount, setTapCount] = useState(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Category State
  const [activeCategory, setActiveCategory] = useState<Category>('All');

  // Story State
  const [viewingStoryIndex, setViewingStoryIndex] = useState<number | null>(null);

  // 🔐 Secret Admin Access Handler
  const handleLogoTap = () => {
    setTapCount(prev => prev + 1);
    
    // Clear previous timeout
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }
    
    // Set new timeout (2 seconds window for taps)
    tapTimeoutRef.current = setTimeout(() => {
      setTapCount(0);
    }, 2000);
  };

  // Check for admin access (5-7 taps)
  useEffect(() => {
    if (tapCount >= 5 && tapCount <= 7) {
      setIsAdminOpen(true);
      setTapCount(0);
      // @ts-ignore
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    }
  }, [tapCount]);

  // Initialize & Fetch Data
  useEffect(() => {
    // 1. Fetch Movies from Firestore
    const q = query(collection(db, 'movies'), orderBy('createdAt', 'desc'), limit(50));
    
    const unsubscribeMovies = onSnapshot(q, (snapshot) => {
      const fetchedMovies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Movie[];
      
      setMovies(fetchedMovies.length > 0 ? fetchedMovies : INITIAL_MOVIES);
    }, (error) => {
      console.warn("Firestore access failed (using offline mode):", error);
      setMovies(INITIAL_MOVIES);
    });

    // 2. Fetch Settings from Firestore
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'config'), (doc) => {
        if (doc.exists()) {
            setAppSettings(prev => ({ ...prev, ...doc.data() as AppSettings }));
        }
    }, (error) => {
       console.warn("Settings fetch failed:", error);
    });

    // 3. Fetch Stories from Firestore
    const storiesQuery = query(collection(db, 'stories'), orderBy('order', 'asc'));
    const unsubscribeStories = onSnapshot(storiesQuery, (snapshot) => {
      const fetchedStories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StoryItem[];
      setStories(fetchedStories);
    }, (error) => {
      console.warn("Stories fetch failed:", error);
    });

    // 4. Handle Splash Screen
    const timer = setTimeout(() => {
        setIsLoading(false);
    }, 2500);

    // 5. Load Favorites
    const savedFavs = localStorage.getItem('cine_favs');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));

    // 6. Telegram Config
    // @ts-ignore
    if (window.Telegram?.WebApp) {
        // @ts-ignore
        window.Telegram.WebApp.expand();
        // @ts-ignore
        window.Telegram.WebApp.setHeaderColor('#000000');
        // @ts-ignore
        window.Telegram.WebApp.setBackgroundColor('#000000');
    }

    return () => {
      clearTimeout(timer);
      unsubscribeMovies();
      unsubscribeSettings();
      unsubscribeStories();
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    };
  }, []);

  // Scroll Handling for Bottom Nav
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 50) {
        setIsNavVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      if (currentScrollY > lastScrollY.current + 20) {
        setIsNavVisible(false);
      } else if (currentScrollY < lastScrollY.current - 20) {
        setIsNavVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Logic
  const handleMovieClick = (movie: Movie) => {
      setSelectedMovie(movie);
  };

  const handleStoryClick = (index: number) => {
      setViewingStoryIndex(index);
  };

  const handleSurpriseMe = () => {
      if (movies.length === 0) return;
      const randomMovie = movies[Math.floor(Math.random() * movies.length)];
      setSelectedMovie(randomMovie);
      // @ts-ignore
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
  };

  const toggleFavorite = (id: string) => {
    const newFavs = favorites.includes(id)
      ? favorites.filter((favId) => favId !== id)
      : [...favorites, id];
    
    setFavorites(newFavs);
    localStorage.setItem('cine_favs', JSON.stringify(newFavs));
    
    // @ts-ignore
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  };

  // ✅ Featured Movies for Banner (from isFeatured flag or high rating)
  const featuredMovies = useMemo(() => {
    // First get movies marked as featured
    let featured = movies.filter(m => m.isFeatured);
    
    // Sort by featuredOrder if available
    featured.sort((a, b) => (a.featuredOrder || 999) - (b.featuredOrder || 999));
    
    // If no featured movies, fallback to high-rated exclusive content
    if (featured.length === 0) {
      featured = movies
        .filter(m => m.category === 'Exclusive' || m.rating > 8.5)
        .slice(0, 5);
    }
    
    return featured.slice(0, 5); // Max 5 banners
  }, [movies]);

  // ✅ Top 10 Movies (from isTop10 flag)
  const top10Movies = useMemo(() => {
    return movies
      .filter(m => m.isTop10)
      .sort((a, b) => (a.top10Position || 999) - (b.top10Position || 999))
      .slice(0, 10);
  }, [movies]);

  // ✅ Story Items (combining movies with storyEnabled and separate stories)
  const allStories = useMemo(() => {
    const movieStories: StoryItem[] = movies
      .filter(m => m.storyEnabled && m.storyImage)
      .map(m => ({
        id: m.id,
        image: m.storyImage!,
        thumbnailUrl: m.thumbnail,
        movieId: m.id,
        order: m.priority || 0
      }));

    // Combine and sort
    const combined = [...movieStories, ...stories];
    return combined.sort((a, b) => (b.order || 0) - (a.order || 0));
  }, [movies, stories]);

  // Filter Logic for Home
  const displayedMovies = useMemo(() => {
     let filtered = movies;
     if (activeCategory !== 'All') {
         filtered = filtered.filter(m => m.category === activeCategory);
     }
     // Sort by priority
     filtered.sort((a, b) => (b.priority || 0) - (a.priority || 0));
     return activeCategory === 'All' ? filtered.slice(0, 12) : filtered;
  }, [movies, activeCategory]);

  const favMovies = useMemo(() => movies.filter(m => favorites.includes(m.id)), [movies, favorites]);

  // Categories from settings or default
  const categories = appSettings.categories || CATEGORIES;

  // --- RENDER ---

  if (isLoading) {
      return <SplashScreen />;
  }

  return (
    <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-black text-white font-sans selection:bg-gold selection:text-black pb-24"
    >
      
      {/* --- HEADER --- */}
      {activeTab === 'home' && (
        <header className={`fixed top-0 inset-x-0 z-50 px-4 py-4 flex justify-between items-center transition-all duration-300 ${!isNavVisible ? 'bg-black/80 backdrop-blur-xl border-b border-white/5 py-3 shadow-lg' : 'bg-gradient-to-b from-black/90 to-transparent'}`}>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="font-brand text-4xl tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-gold via-[#fff] to-gold cursor-pointer drop-shadow-[0_2px_10px_rgba(255,215,0,0.3)] select-none"
              onClick={handleLogoTap}
            >
              {appSettings.appName || 'CINEFLIX'}
            </motion.div>

            <div className="flex items-center gap-3">
                <button 
                  onClick={() => window.open(appSettings.channelLink || 'https://t.me/cineflixrequestcontent', '_blank')}
                  className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-95 transition-all text-white hover:bg-[#0088cc] hover:border-[#0088cc]"
                >
                  <Send size={16} />
                </button>

                <button 
                  onClick={handleSurpriseMe}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                >
                  <Sparkles size={16} />
                </button>

                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-95 transition-all"
                >
                  <Zap size={16} className="text-gold" />
                </button>
            </div>
        </header>
      )}

      {/* ✅ Notice Bar */}
      {appSettings.noticeEnabled && appSettings.noticeText && (
        <div className="pt-16">
          <NoticeBar 
            text={appSettings.noticeText} 
            enabled={appSettings.noticeEnabled} 
          />
        </div>
      )}

      {/* --- CONTENT --- */}
      <AnimatePresence mode="wait">
        {activeTab === 'home' && (
          <motion.div 
            key="home" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="pt-16"
          >
            
            {/* ✅ Banner - Featured Movies with Auto-rotation */}
            {appSettings.enableBanners && featuredMovies.length > 0 && (
              <Banner 
                movies={featuredMovies}
                onClick={handleMovieClick} 
              />
            )}

            {/* ✅ Stories */}
            {appSettings.enableStories && allStories.length > 0 && (
              <div className="px-4 mb-6">
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {allStories.map((story, index) => (
                    <StoryCircle
                      key={story.id}
                      image={story.image}
                      onClick={() => handleStoryClick(index)}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ✅ Top 10 Section */}
            {appSettings.enableTop10 && top10Movies.length > 0 && (
              <Top10 
                movies={top10Movies}
                onMovieClick={handleMovieClick}
              />
            )}

            {/* Category Tabs */}
            <div className="flex gap-3 mb-4 overflow-x-auto no-scrollbar px-4 pt-2">
              {['All', ...categories].map(cat => (
                <motion.button
                  key={cat}
                  onClick={() => setActiveCategory(cat as Category)}
                  whileTap={{ scale: 0.95 }}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat
                      ? 'bg-gold text-black shadow-[0_0_15px_rgba(255,215,0,0.4)]'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  {cat}
                </motion.button>
              ))}
            </div>

            {/* Movies Grid */}
            <div className="grid grid-cols-3 gap-3 px-4 pb-8">
              {displayedMovies.map((movie, idx) => (
                <motion.div
                  key={movie.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <MovieTile 
                    movie={movie}
                    onClick={() => handleMovieClick(movie)}
                    isFavorite={favorites.includes(movie.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                </motion.div>
              ))}
            </div>

            {displayedMovies.length === 0 && (
              <div className="text-center py-20 text-gray-500">
                <p className="text-xl mb-2">📽️</p>
                <p>No content available</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'search' && (
          <motion.div 
            key="search" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="pt-16"
          >
            <Explore 
              movies={movies} 
              onMovieClick={handleMovieClick} 
            />
          </motion.div>
        )}

        {activeTab === 'favorites' && (
          <motion.div 
            key="favorites" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="pt-16"
          >
            <Watchlist 
              movies={favMovies}
              onMovieClick={handleMovieClick}
              onToggleFavorite={toggleFavorite}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODALS & OVERLAYS --- */}
      <AnimatePresence>
        {selectedMovie && (
          <MovieDetails
            movie={selectedMovie}
            onClose={() => setSelectedMovie(null)}
            botUsername={appSettings.botUsername}
            channelLink={appSettings.channelLink}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingStoryIndex !== null && allStories.length > 0 && (
          <StoryViewer
            stories={allStories}
            initialIndex={viewingStoryIndex}
            onClose={() => setViewingStoryIndex(null)}
            onStoryClick={(story) => {
              if (story.movieId) {
                const movie = movies.find(m => m.id === story.movieId);
                if (movie) {
                  setViewingStoryIndex(null);
                  handleMovieClick(movie);
                }
              }
            }}
          />
        )}
      </AnimatePresence>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {isAdminOpen && (
        <AdminPanel onClose={() => setIsAdminOpen(false)} />
      )}

      {/* --- BOTTOM NAVIGATION --- */}
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        isVisible={isNavVisible}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        
        .font-brand { font-family: 'Bebas Neue', sans-serif; }
        .font-sans { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </motion.div>
  );
};

export default App;
