import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, setAccessToken } from '../services/api';
import type { User, AuthTokens } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  loginAsGuest: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const GUEST_USER: User = {
  id: 'guest_user',
  email: 'guest@chitralekh.local',
  full_name: 'Guest Explorer',
  is_active: true,
  is_verified: true,
  institution: 'Demo College / University',
  department: 'Computer Science & Engineering',
  batch: 'Batch 2024-2028',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem('is_guest_mode') === 'true';
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (localStorage.getItem('is_guest_mode') === 'true') {
      setUser(GUEST_USER);
      setIsGuest(true);
      return;
    }
    try {
      const response = await authApi.getMe();
      setUser(response.data);
    } catch {
      setUser(null);
      setTokens(null);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const isGuestMode = localStorage.getItem('is_guest_mode') === 'true';
      const storedTokens = localStorage.getItem('auth_tokens');
      if (storedTokens) {
        try {
          const parsed = JSON.parse(storedTokens);
          setTokens(parsed);
          setAccessToken(parsed.access_token);
          if (parsed.access_token) {
            const response = await authApi.getMe();
            setUser(response.data);
            setIsGuest(false);
            localStorage.removeItem('is_guest_mode');
          }
        } catch {
          localStorage.removeItem('auth_tokens');
          if (isGuestMode) {
            setUser(GUEST_USER);
            setIsGuest(true);
          }
        }
      } else if (isGuestMode) {
        setUser(GUEST_USER);
        setIsGuest(true);
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const loginAsGuest = () => {
    localStorage.removeItem('auth_tokens');
    setAccessToken(null);
    localStorage.setItem('is_guest_mode', 'true');
    setUser(GUEST_USER);
    setIsGuest(true);
    toast.success('Browsing as Guest! Try out notes & diagrams freely 🚀');
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    const { access_token, refresh_token } = response.data;
    const newTokens = { access_token, refresh_token, token_type: 'bearer' };
    setTokens(newTokens);
    localStorage.setItem('auth_tokens', JSON.stringify(newTokens));
    localStorage.removeItem('is_guest_mode');
    setIsGuest(false);
    setAccessToken(access_token);
    const userResponse = await authApi.getMe();
    setUser(userResponse.data);
    toast.success('Welcome back!');
  };

  const register = async (email: string, password: string, fullName?: string) => {
    // Register then auto-login for smoother UX
    await authApi.register({ email, password, full_name: fullName });
    localStorage.setItem('notes_is_first_time_signup', 'true');
    localStorage.removeItem('notes_tour_completed');
    localStorage.removeItem('is_guest_mode');
    setIsGuest(false);
    try {
      await login(email, password);
      toast.success('Account created and signed in!');
    } catch {
      toast.success('Account created successfully! Please sign in.');
    }
  };

  const logout = async () => {
    if (!isGuest) {
      try {
        await authApi.logout();
      } catch {
        // Ignore logout errors
      }
    }
    setUser(null);
    setTokens(null);
    setIsGuest(false);
    localStorage.removeItem('auth_tokens');
    localStorage.removeItem('is_guest_mode');
    setAccessToken(null);
    toast.success('Signed out successfully');
  };

  const updateUser = async (data: Partial<User>) => {
    if (isGuest) {
      setUser(prev => prev ? { ...prev, ...data } : GUEST_USER);
      toast.success('Guest profile updated locally');
      return;
    }
    const response = await authApi.updateMe(data);
    setUser(response.data);
    toast.success('Profile updated');
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (isGuest) {
      toast.error('Password change is unavailable in Guest Mode. Please create an account.');
      return;
    }
    await authApi.changePassword({ current_password: currentPassword, new_password: newPassword });
    toast.success('Password changed');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        isLoading,
        isAuthenticated: !!user && !isGuest,
        isGuest,
        loginAsGuest,
        login,
        register,
        logout,
        updateUser,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}