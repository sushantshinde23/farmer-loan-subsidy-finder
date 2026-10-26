import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { GovernmentScheme, SavedScheme } from '../types';
import { useAuth } from './AuthContext';
import {
  saveSchemeBookmarkToCloud,
  removeSchemeBookmarkFromCloud,
  getSavedSchemesFromCloud
} from '../lib/firestoreService';

interface SavedSchemesContextType {
  savedSchemes: SavedScheme[];
  savedSchemeIds: Set<string>;
  savedCount: number;
  isLoading: boolean;
  toastMessage: string | null;
  isSaved: (schemeId: string) => boolean;
  toggleSaveScheme: (scheme: GovernmentScheme, notes?: string) => Promise<boolean>;
  saveScheme: (scheme: GovernmentScheme, notes?: string) => Promise<void>;
  unsaveScheme: (schemeId: string) => Promise<void>;
  refreshSavedSchemes: () => Promise<void>;
  clearToast: () => void;
}

const SavedSchemesContext = createContext<SavedSchemesContextType | undefined>(undefined);

export const SavedSchemesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [savedSchemes, setSavedSchemes] = useState<SavedScheme[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 4000);
  };

  const clearToast = () => setToastMessage(null);

  const refreshSavedSchemes = useCallback(async () => {
    if (!user) {
      setSavedSchemes([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await api.getSavedSchemes();
      let combined = Array.isArray(data) ? [...data] : [];

      try {
        const cloudSaved = await getSavedSchemesFromCloud(user.id);
        if (cloudSaved && cloudSaved.length > 0) {
          const map = new Map<string, SavedScheme>();
          combined.forEach(s => map.set(s.schemeId, s));
          cloudSaved.forEach(cs => {
            if (!map.has(cs.schemeId)) {
              map.set(cs.schemeId, cs);
            }
          });
          combined = Array.from(map.values());
        }
      } catch (cErr) {
        console.warn('Cloud saved schemes sync note:', cErr);
      }

      setSavedSchemes(combined);
    } catch (err) {
      console.warn('Could not fetch saved schemes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshSavedSchemes();
  }, [refreshSavedSchemes]);

  const savedSchemeIds = useMemo(() => {
    return new Set(savedSchemes.map(s => s.schemeId));
  }, [savedSchemes]);

  const isSaved = useCallback((schemeId: string): boolean => {
    return savedSchemeIds.has(schemeId);
  }, [savedSchemeIds]);

  const saveScheme = useCallback(async (scheme: GovernmentScheme, notes?: string) => {
    // Optimistic addition
    const tempSaved: SavedScheme = {
      id: `temp-${Date.now()}`,
      userId: user?.id || 'temp-user',
      schemeId: scheme.id,
      schemeName: scheme.name,
      category: scheme.category,
      department: scheme.department,
      subsidyAmountOrPercent: scheme.subsidyAmountOrPercent,
      benefits: scheme.benefits,
      officialSourceUrl: scheme.officialSourceUrl,
      notes: notes || '',
      savedAt: new Date().toISOString(),
      scheme
    };

    setSavedSchemes(prev => [tempSaved, ...prev.filter(s => s.schemeId !== scheme.id)]);
    showToast(`"${scheme.name.slice(0, 32)}..." bookmarked successfully`);

    try {
      const saved = await api.saveFarmerScheme(scheme.id, notes);
      try {
        await saveSchemeBookmarkToCloud(saved);
      } catch (fErr) {
        console.warn('Direct Firestore bookmark save note:', fErr);
      }
      setSavedSchemes(prev => [saved, ...prev.filter(s => s.schemeId !== scheme.id && s.id !== tempSaved.id)]);
    } catch (err) {
      console.error('Failed to save scheme:', err);
      // Rollback on error
      setSavedSchemes(prev => prev.filter(s => s.id !== tempSaved.id));
      showToast('Could not save scheme. Please try again.');
    }
  }, [user]);

  const unsaveScheme = useCallback(async (schemeId: string) => {
    const target = savedSchemes.find(s => s.schemeId === schemeId || s.id === schemeId);
    const targetName = target?.schemeName || 'Scheme';

    // Optimistic removal
    setSavedSchemes(prev => prev.filter(s => s.schemeId !== schemeId && s.id !== schemeId));
    showToast(`Removed "${targetName.slice(0, 32)}..." from saved schemes`);

    try {
      await api.unsaveFarmerScheme(schemeId);
      try {
        await removeSchemeBookmarkFromCloud(schemeId);
      } catch (fDelErr) {
        console.warn('Direct Firestore bookmark delete note:', fDelErr);
      }
    } catch (err) {
      console.error('Failed to unsave scheme:', err);
      if (target) {
        setSavedSchemes(prev => [target, ...prev]);
      }
      showToast('Could not remove bookmark. Please check connection.');
    }
  }, [savedSchemes]);

  const toggleSaveScheme = useCallback(async (scheme: GovernmentScheme, notes?: string): Promise<boolean> => {
    if (isSaved(scheme.id)) {
      await unsaveScheme(scheme.id);
      return false;
    } else {
      await saveScheme(scheme, notes);
      return true;
    }
  }, [isSaved, saveScheme, unsaveScheme]);

  return (
    <SavedSchemesContext.Provider
      value={{
        savedSchemes,
        savedSchemeIds,
        savedCount: savedSchemes.length,
        isLoading,
        toastMessage,
        isSaved,
        toggleSaveScheme,
        saveScheme,
        unsaveScheme,
        refreshSavedSchemes,
        clearToast
      }}
    >
      {children}
      {/* Global Toast for bookmark actions */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{toastMessage}</span>
            <button
              onClick={clearToast}
              className="ml-2 text-slate-400 hover:text-white text-sm leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </SavedSchemesContext.Provider>
  );
};

export const useSavedSchemes = () => {
  const context = useContext(SavedSchemesContext);
  if (!context) {
    throw new Error('useSavedSchemes must be used within a SavedSchemesProvider');
  }
  return context;
};
