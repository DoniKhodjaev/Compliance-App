import type { BlacklistEntry, BlacklistMatch } from '../types';
export declare class BlacklistChecker {
    private static normalizeText;
    private static calculateSimilarity;
    private static getPairs;
    static checkName(name: string, blacklist: BlacklistEntry[]): BlacklistMatch | null;
}
