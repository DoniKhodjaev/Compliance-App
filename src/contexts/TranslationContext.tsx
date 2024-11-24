import React, { createContext, useContext, ReactNode } from 'react';
import { Language, TranslationKey } from '../utils/translations';

interface TranslationContextType {
  t: (key: TranslationKey) => string;
  language: Language;
}

export const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}

export interface TranslationProviderProps {
  children: ReactNode;
  language: Language;
}

export function TranslationProvider({ children, language }: TranslationProviderProps) {
  const t = (key: TranslationKey): string => key;

  return (
    <TranslationContext.Provider value={{ t, language }}>
      {children}
    </TranslationContext.Provider>
  );
} 