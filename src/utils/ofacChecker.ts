import { transliterate } from 'transliteration';

export interface SdnEntry {
  uid: string;
  name: string;
  name_variations?: string[];
  type: string;
  date_of_birth?: string;
  id_number?: string;
  addresses?: { city: string; country: string }[];
  programs?: string[];
  remarks?: string;
  aka_names?: string[];
}

export interface NameCheckResult {
  name: string;
  isMatch: boolean;
  matchScore: number;
  matchedName?: string;
  details?: {
    type?: string;
    programs?: string[];
    remarks?: string;
  };
}

class OfacCheckerClass {
  private initialized = false;
  private sdnList: SdnEntry[] = [];

  async initialize(): Promise<void> {
    try {
      const response = await fetch('/sdn_cache.json');
      this.sdnList = await response.json();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize OFAC checker:', error);
      throw error;
    }
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;
    
    const pairs1 = this.getWordPairs(s1);
    const pairs2 = this.getWordPairs(s2);
    const union = pairs1.size + pairs2.size;
    const intersection = new Set([...pairs1].filter(x => pairs2.has(x))).size;
    
    return (2.0 * intersection) / union;
  }

  private getWordPairs(str: string): Set<string> {
    const pairs = new Set<string>();
    const words = str.split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      pairs.add(`${words[i]} ${words[i + 1]}`);
    }
    return pairs;
  }

  async checkName(name: string): Promise<NameCheckResult> {
    if (!this.initialized) {
      throw new Error('OFAC Checker not initialized');
    }

    const transliteratedName = transliterate(name).toLowerCase();
    let bestMatch: { score: number; entry: SdnEntry | null } = { score: 0, entry: null };

    for (const entry of this.sdnList) {
      // Check primary name
      const primaryScore = this.calculateSimilarity(transliteratedName, transliterate(entry.name));
      if (primaryScore > bestMatch.score) {
        bestMatch = { score: primaryScore, entry };
      }

      // Check AKA names
      if (entry.aka_names) {
        for (const akaName of entry.aka_names) {
          const akaScore = this.calculateSimilarity(transliteratedName, transliterate(akaName));
          if (akaScore > bestMatch.score) {
            bestMatch = { score: akaScore, entry };
          }
        }
      }
    }

    // Determine match status based on score thresholds
    const isMatch = bestMatch.score >= 0.85;
    
    return {
      name,
      isMatch,
      matchScore: bestMatch.score,
      matchedName: bestMatch.entry?.name,
      details: bestMatch.entry ? {
        type: bestMatch.entry.type,
        programs: bestMatch.entry.programs,
        remarks: bestMatch.entry.remarks
      } : undefined
    };
  }
}

export const OfacChecker = new OfacCheckerClass();
