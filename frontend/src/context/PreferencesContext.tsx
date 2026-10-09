import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { preferencesApi } from '../services/api';
import type { UserPreferences, PreferencesUpdate } from '../types';
import { useAuth } from './AuthContext';

interface PreferencesContextType {
  preferences: UserPreferences | null;
  isLoading: boolean;
  updatePreferences: (data: PreferencesUpdate) => Promise<void>;
  resetPreferences: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadPreferences = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await preferencesApi.get();
      setPreferences(response.data);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const updatePreferences = async (data: PreferencesUpdate) => {
    const response = await preferencesApi.update(data);
    setPreferences(response.data);
  };

  const resetPreferences = async () => {
    const response = await preferencesApi.reset();
    setPreferences(response.data);
  };

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        isLoading,
        updatePreferences,
        resetPreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}