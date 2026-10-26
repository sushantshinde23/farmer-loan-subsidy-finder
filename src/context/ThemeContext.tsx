import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
export type ColorTheme = 'forest' | 'emerald' | 'navy' | 'amber';

export interface ColorThemeOption {
  id: ColorTheme;
  name: string;
  primaryColor: string;
  accentColor: string;
  description: string;
}

export const COLOR_THEMES: ColorThemeOption[] = [
  {
    id: 'forest',
    name: 'Forest & Linen (Recommended)',
    primaryColor: '#253F1E',
    accentColor: '#E06D43',
    description: 'Natural Organic Linen Canvas with Deep Forest Green and Terracotta'
  },
  {
    id: 'emerald',
    name: 'Agri Green',
    primaryColor: '#065F46',
    accentColor: '#D97706',
    description: 'Traditional Agriculture & Harvest Green'
  },
  {
    id: 'navy',
    name: 'National Blue',
    primaryColor: '#1E3A8A',
    accentColor: '#EA580C',
    description: 'Official Government of India National Portal Blue'
  },
  {
    id: 'amber',
    name: 'Golden Saffron',
    primaryColor: '#B45309',
    accentColor: '#0284C7',
    description: 'Warm Saffron & Solar Gold'
  }
];

interface ThemeContextType {
  theme: Theme;
  colorTheme: ColorTheme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  setColorTheme: (c: ColorTheme) => void;
  colorThemes: ColorThemeOption[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

import { saveUserPreferencesToCloud, getUserPreferencesFromCloud, auth } from '../lib/firestoreService';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('krishi_theme');
    return (saved as Theme) || 'light';
  });

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem('krishi_color_theme');
    return (saved as ColorTheme) || 'forest';
  });

  // Restore preferences from Firestore when user authenticates
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        try {
          const cloudPrefs = await getUserPreferencesFromCloud(fbUser.uid);
          if (cloudPrefs) {
            if (cloudPrefs.theme) setThemeState(cloudPrefs.theme as Theme);
            if (cloudPrefs.colorTheme) setColorThemeState(cloudPrefs.colorTheme as ColorTheme);
          }
        } catch (e) {
          console.warn('Theme preference sync note:', e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('krishi_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    if (auth.currentUser) {
      saveUserPreferencesToCloud({ theme }).catch(() => {});
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('krishi_color_theme', colorTheme);
    document.documentElement.setAttribute('data-color-theme', colorTheme);
    if (auth.currentUser) {
      saveUserPreferencesToCloud({ colorTheme }).catch(() => {});
    }
  }, [colorTheme]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  const setColorTheme = (c: ColorTheme) => {
    setColorThemeState(c);
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      colorTheme,
      toggleTheme,
      setTheme,
      setColorTheme,
      colorThemes: COLOR_THEMES
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
