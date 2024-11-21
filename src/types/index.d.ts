type SdnStatusType = 'clear' | 'flagged' | 'pending';
interface FounderDetails {
    owner: string;
    percentage?: number;
    companyDetails?: {
        CEO?: string;
        Founders?: FounderDetails[];
        inn?: string;
        registrationDate?: string | null;
    };
}
export interface NameCheckResult {
    name: string;
    isMatch: boolean;
    matchScore: number;
    matchedName?: string;
    matchType: 'name' | 'id' | 'address' | 'other';
    details?: {
        type?: string;
        programs?: string[];
        remarks?: string;
        ids?: string[];
        addresses?: string[];
    };
}
export interface SwiftMessage {
    id: string;
    transactionRef: string;
    type: string;
    date: string;
    currency: string;
    amount: string;
    notes?: string;
    manuallyUpdated?: boolean;
    sender: {
        account: string;
        inn: string;
        name: string;
        address: string;
        bankCode: string;
        sdnStatus?: SdnStatusType;
        company_details?: {
            CEO?: string;
            Founders?: FounderDetails[];
        };
    };
    receiver: {
        account: string;
        transitAccount: string;
        bankCode: string;
        bankName: string;
        name: string;
        inn: string;
        kpp: string;
        sdnStatus?: SdnStatusType;
        CEO?: string;
        Founders?: FounderDetails[];
    };
    purpose: string;
    fees: string;
    status: 'processing' | 'clear' | 'flagged';
}
export interface BlacklistEntry {
    id: string;
    inn?: string;
    names: {
        fullNameEn: string;
        fullNameRu: string;
        shortNameEn: string;
        shortNameRu: string;
        abbreviationEn: string;
        abbreviationRu: string;
    };
    dateAdded: string;
    notes?: string;
}
export interface BlacklistMatch {
    isMatch: boolean;
    matchedName: string;
    matchType: 'full' | 'short' | 'abbreviation' | 'inn';
    language: 'en' | 'ru' | 'numeric';
    entry: BlacklistEntry;
}
export interface DashboardCardProps {
    title: string;
    value: number;
    icon: React.ComponentType<{
        className?: string;
    }>;
    trend?: {
        value: number;
        isPositive: boolean;
    };
}
export {};
