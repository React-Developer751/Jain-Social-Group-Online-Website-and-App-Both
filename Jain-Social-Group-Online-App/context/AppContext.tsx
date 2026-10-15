import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { POSTS, CURRENT_USER } from '@/data/dummyData';
import {likeAnUnLikePost} from "@/service/post";
import { Alert } from 'react-native';
import {setPostLikeAnUnLike} from "@/redux-toolkit/slice/postSlice";
import {useAppDispatch} from "@/redux-toolkit/customHook/hook";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = 'dark' | 'light';

interface AppState {
  themeMode: ThemeMode;
  isAuthenticated: boolean;
  currentUser: typeof CURRENT_USER;
  posts: typeof POSTS;
  toggleTheme: () => void;
  setAuthenticated: (v: boolean) => void;
  toggleLike: (postId: string) => void;
  toggleSave: (postId: string) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const dispatch = useAppDispatch();
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [posts, setPosts] = useState(POSTS);

  const toggleTheme = () => setThemeMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  const setAuthenticated = (v: boolean) => setIsAuthenticated(v);

  /* Posts whose like is still in flight, so a second tap is ignored rather
     than sending a second toggle whose reply races the first. */
  const likesInFlight = useRef<Set<string>>(new Set());

  /**
   * Like or unlike, and show it straight away.
   *
   * Two things were wrong. The heart only moved once the server had answered,
   * so every tap waited a full round trip and felt broken on a slow
   * connection. And a successful like opened a native alert the member had to
   * dismiss, which on a feed is unusable: tap a heart, get a modal.
   *
   * The count now changes at once and is put back only if the request fails,
   * which is the one case worth interrupting somebody for.
   */
  const toggleLike = async(postId: string) => {
    if (likesInFlight.current.has(postId)) return;

    const user = await AsyncStorage.getItem("user");
    const userId = user ? JSON.parse(user)._id : null;
    if (!userId) return;

    const obj = {postId, userId};

    likesInFlight.current.add(postId);
    dispatch(setPostLikeAnUnLike({ postId, userId }));

    try{
      const res = await likeAnUnLikePost(obj);
      if(res.status !== 200) {
        // Put it back: the server did not record it.
        dispatch(setPostLikeAnUnLike({ postId, userId }));
      }
    }
    catch(err:any){
      console.log('Error toggling like:', err);
      dispatch(setPostLikeAnUnLike({ postId, userId }));
      Alert.alert('Post Like/Unlike Failed.', err?.response?.data?.message || err?.message || "Post like/unlike action failed. Please try again.");
    }
    finally{
      likesInFlight.current.delete(postId);
    }
  };

  const toggleSave = (postId: string) => {
    setPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, isSaved: !p.isSaved } : p))
    );
  };

  return (
    <AppContext.Provider
      value={{
        themeMode,
        isAuthenticated,
        currentUser: CURRENT_USER,
        posts,
        toggleTheme,
        setAuthenticated,
        toggleLike,
        toggleSave,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function useTheme() {
  const { themeMode } = useApp();
  const isDark = themeMode === 'dark';
  return { isDark, themeMode };
}
