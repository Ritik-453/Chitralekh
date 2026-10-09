import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { preferencesApi } from '../services/api';
import type { UserPreferences, PreferencesUpdate } from '../types';
import { useAuth } from './AuthContext';

interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
  preferences: UserPreferences | null;
  updatePreferences: (data: PreferencesUpdate) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyTheme = useCallback((newTheme: 'light' | 'dark' | 'system') => {
    let resolved: 'light' | 'dark';
    
    if (newTheme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolved = newTheme;
    }
    
    setResolvedTheme(resolved);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    localStorage.setItem('theme', newTheme);
  }, []);

  const setTheme = useCallback((newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    
    if (isAuthenticated) {
      preferencesApi.update({ theme: newTheme }).catch(console.error);
    }
  }, [applyTheme, isAuthenticated]);

  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    if (stored) {
      setThemeState(stored);
      applyTheme(stored);
    } else {
      applyTheme('system');
    }
  }, [applyTheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  const loadPreferences = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await preferencesApi.get();
      setPreferences(response.data);
      setThemeState(response.data.theme);
      applyTheme(response.data.theme);
    } catch {
      // Ignore errors
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, applyTheme]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const updatePreferences = async (data: PreferencesUpdate) => {
    const response = await preferencesApi.update(data);
    setPreferences(response.data);
    if (data.theme) {
      setThemeState(data.theme);
      applyTheme(data.theme);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
        preferences,
        updatePreferences,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}