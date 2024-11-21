export class BlacklistChecker {
    static normalizeText(text) {
        return text
            .toLowerCase()
            .replace(/['".,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    static calculateSimilarity(str1, str2) {
        const s1 = this.normalizeText(str1);
        const s2 = this.normalizeText(str2);
        if (s1 === s2)
            return 1;
        const pairs1 = this.getPairs(s1);
        const pairs2 = this.getPairs(s2);
        const union = pairs1.size + pairs2.size;
        const intersection = new Set([...pairs1].filter(x => pairs2.has(x))).size;
        return (2.0 * intersection) / union;
    }
    static getPairs(str) {
        const pairs = new Set();
        for (let i = 0; i < str.length - 1; i++) {
            pairs.add(str.slice(i, i + 2));
        }
        return pairs;
    }
    static checkName(name, blacklist) {
        if (!name || !blacklist?.length)
            return null;
        const normalizedName = this.normalizeText(name);
        const SIMILARITY_THRESHOLD = 0.8;
        for (const entry of blacklist) {
            if (entry.inn && entry.inn === name) {
                return {
                    isMatch: true,
                    matchedName: entry.inn,
                    matchType: 'inn',
                    language: 'numeric', // 'numeric' indicating it's an ID rather than a language
                    entry
                };
            }
            const nameChecks = [
                { value: entry.names.fullNameEn, type: 'full', lang: 'en' },
                { value: entry.names.fullNameRu, type: 'full', lang: 'ru' },
                { value: entry.names.shortNameEn, type: 'short', lang: 'en' },
                { value: entry.names.shortNameRu, type: 'short', lang: 'ru' },
                { value: entry.names.abbreviationEn, type: 'abbreviation', lang: 'en' },
                { value: entry.names.abbreviationRu, type: 'abbreviation', lang: 'ru' },
            ];
            for (const check of nameChecks) {
                const similarity = this.calculateSimilarity(normalizedName, check.value);
                if (similarity >= SIMILARITY_THRESHOLD) {
                    return {
                        isMatch: true,
                        matchedName: check.value,
                        matchType: check.type,
                        language: check.lang,
                        entry
                    };
                }
            }
        }
        return null;
    }
}
