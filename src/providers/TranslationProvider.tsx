import { ReactNode } from 'react';
import { TranslationContext } from '../contexts/TranslationContext';
import { Language, translations, TranslationKey } from '../utils/translations';

interface TranslationProviderProps {
  children: ReactNode;
  language: Language;
}

export function TranslationProvider({ children, language }: TranslationProviderProps) {
  const t = (key: TranslationKey): string => {
    return translations[language][key] || key;
  };

  return (
    <TranslationContext.Provider value={{ t, language }}>
      {children}
    </TranslationContext.Provider>
  );
} 