export type SDNStatus = 'clear' | 'flagged' | 'processing' | 'pending';

export interface Owner {
  owner: string;
  percentage?: number | undefined;
  isCompany?: boolean;
  companyDetails?: {
    inn?: string;
    registrationDate?: string;
    CEO?: string;
    Founders?: Owner[];
  };
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

export interface SwiftMessage {
  id: string;
  transactionRef: string;
  type: string;
  date: string;
  currency: string;
  amount: string;
  notes?: string;
  matchScore?: number;
  nameChecks?: Record<string, NameCheckResult>;
  sender: {
    account: string;
    inn: string;
    name: string;
    address: string;
    bankCode: string;
    ownership?: Owner[];
    sdnStatus?: SDNStatus;
    registrationDoc?: string;
    company_details?: {
      CEO?: string;
      Founders?: Owner[];
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
    ownership?: Owner[];
    sdnStatus?: SDNStatus;
    registrationDoc?: string;
    CEO?: string;
    Founders?: Owner[];
  };
  purpose: string;
  fees: string;
  lastChecked?: string;
  status: SDNStatus;
  manuallyUpdated?: boolean;
}

export interface DashboardCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
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

export interface CommonEntity {
  id: string;
  name: string;
  inn?: string;
  status: 'clean' | 'needs_review' | 'flagged';
  lastChecked?: string;
  notes?: string;
  source: 'orginfo' | 'egrul';
  CEO?: string;
  Founders?: Array<{
    owner: string;
    isCompany: boolean;
    companyDetails?: {
      name: string;
      CEO?: string;
      Founders?: Array<any>;
    };
  }>;
}

export interface PreviewData {
  name: string;
  inn: string;
  source: 'egrul' | 'orginfo';
  CEO: string;
  Founders: Array<{
    owner: string;
    isCompany: boolean;
    companyDetails?: {
      name: string;
      CEO?: string;
      Founders?: Array<any>;
    };
  }>;
  status: 'clean' | 'needs_review' | 'flagged';
  lastChecked: string;
  notes: string;
  originalData: {
    name: string;
    inn: string;
    source: 'egrul' | 'orginfo';
  };
}
