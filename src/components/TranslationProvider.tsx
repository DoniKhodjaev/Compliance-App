import React, { createContext, useContext, ReactNode } from 'react';
import type { Language } from '../utils/translations';

interface TranslationContextType {
  language: Language;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

interface TranslationProviderProps {
  children: ReactNode;
  initialLanguage: Language;
}

export function TranslationProvider({ children, initialLanguage }: TranslationProviderProps) {
  return (
    <TranslationContext.Provider value={{ language: initialLanguage }}>
      {children}
    </TranslationContext.Provider>
  );
} 