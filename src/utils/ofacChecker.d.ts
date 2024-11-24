interface SdnEntry {
  name: string;
  name_variations: string[];
  type: string;
  date_of_birth?: string;
  id_number?: string;
}
export declare class OfacChecker {
  private static ofacList;
  private static initialized;
  private static FULL_NAME_THRESHOLD;
  private static PARTIAL_NAME_THRESHOLD;
  static initialize(): Promise<void>;
  /**
   * Check a name or entity against the OFAC list.
   * @param searchText The text to search (name or entity).
   * @returns Match details with score and type.
   */
  static checkName(searchText: string): Promise<{
    isMatch: boolean;
    matchScore: number;
    matchedEntry?: SdnEntry;
    matchType?: "name";
  }>;
  /**
   * Calculate similarity score between two strings.
   * @param str1 First string.
   * @param str2 Second string.
   * @returns A similarity score between 0.0 and 1.0.
   */
  private static calculateSimilarity;
  /**
   * Create letter pairs for each word in a string.
   * @param str Input string.
   * @returns An array of letter pairs.
   */
  private static wordLetterPairs;
}
export {};
