import type { BlacklistEntry, BlacklistMatch } from '../types';

class BlacklistCheckerClass {
  checkName(name: string, blacklist: BlacklistEntry[]): BlacklistMatch | null {
    const matchingEntry = blacklist.find(entry => 
      entry.names.fullNameEn.toLowerCase() === name.toLowerCase() ||
      entry.names.fullNameRu.toLowerCase() === name.toLowerCase()
    );

    if (!matchingEntry) return null;

    return {
      isMatch: true,
      matchedName: matchingEntry.names.fullNameEn,
      matchType: 'full',
      language: 'en',
      entry: matchingEntry
    };
  }
}

export const BlacklistChecker = new BlacklistCheckerClass();
