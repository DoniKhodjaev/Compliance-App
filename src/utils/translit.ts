// utils/translit.ts

import { transliterate as transliterateLib } from 'transliteration';

export const transliterate = (text: string): string => {
  return transliterateLib(text);
};
