import { useTranslation } from '../contexts/TranslationContext';
import { transliterate } from 'transliteration';

export function useTranslateAndTransliterate() {
  const { t } = useTranslation();
  
  const transliterateText = (text: string | undefined): string => {
    if (!text) return '';
    return transliterate(text);
  };

  return {
    t,
    transliterate: transliterateText
  };
} 