import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, setAccessToken } from '../services/api';
import type { User, AuthTokens } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
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
      const storedTokens = localStorage.getItem('auth_tokens');
      if (storedTokens) {
        try {
          const parsed = JSON.parse(storedTokens);
          setTokens(parsed);
          setAccessToken(parsed.access_token);
          if (parsed.access_token) {
            const response = await authApi.getMe();
            setUser(response.data);
          }
        } catch {
          localStorage.removeItem('auth_tokens');
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    const { access_token, refresh_token } = response.data;
    const newTokens = { access_token, refresh_token, token_type: 'bearer' };
    setTokens(newTokens);
    localStorage.setItem('auth_tokens', JSON.stringify(newTokens));
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
    try {
      await login(email, password);
      toast.success('Account created and signed in!');
    } catch {
      toast.success('Account created successfully! Please sign in.');
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    }
    setUser(null);
    setTokens(null);
    localStorage.removeItem('auth_tokens');
    setAccessToken(null);
    toast.success('Logged out successfully');
  };

  const updateUser = async (data: Partial<User>) => {
    const response = await authApi.updateMe(data);
    setUser(response.data);
    toast.success('Profile updated');
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await authApi.changePassword({ current_password: currentPassword, new_password: newPassword });
    toast.success('Password changed');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        isLoading,
        isAuthenticated: !!user,
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