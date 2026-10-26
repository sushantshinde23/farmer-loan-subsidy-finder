import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLanguage } from '../types';
import { translations, SUPPORTED_LANGUAGES, LanguageMeta } from '../translations/translations';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  languages: LanguageMeta[];
  t: (key: string, defaultText?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

import { saveUserPreferencesToCloud, getUserPreferencesFromCloud, auth } from '../lib/firestoreService';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('krishi_lang');
    return (saved as SupportedLanguage) || 'en';
  });

  // Restore language from Firestore when user authenticates
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        try {
          const cloudPrefs = await getUserPreferencesFromCloud(fbUser.uid);
          if (cloudPrefs && cloudPrefs.language) {
            setLanguageState(cloudPrefs.language as SupportedLanguage);
          }
        } catch (e) {
          console.warn('Language preference sync note:', e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('krishi_lang', language);
    document.documentElement.lang = language;
    if (auth.currentUser) {
      saveUserPreferencesToCloud({ language }).catch(() => {});
    }
  }, [language]);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
  };

  const t = (key: string, defaultText: string = ''): string => {
    const langDict = translations[language] || translations.en;
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to English
    if (translations.en && translations.en[key]) {
      return translations.en[key];
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, languages: SUPPORTED_LANGUAGES, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
