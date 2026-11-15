export type AppLanguage = 'zh' | 'en';

export type AnalysisDepth = 'concise' | 'standard' | 'institutional';

export type ConvictionLevel = 'undecided' | 'high' | 'watch' | 'pass';

export type WorkspaceView = 'research' | 'archive' | 'compare';

export type ReadingMode = 'scroll' | 'chapter';

export interface CompanyInfo {
  name: string;
  ticker: string;
  industry: string;
}

export interface ReportChapterState {
  id: number;
  content: string;
  status: 'idle' | 'loading' | 'completed' | 'error';
  updatedAt?: number;
}

export interface FundamentalAxis {
  label: string;
  score: number;
  reason: string;
}

export interface ExecutiveSynthesis {
  oneLineThesis: string;
  moatType: string;
  dimensions: FundamentalAxis[];
  bullCatalysts: string[];
  bearRisks: string[];
  trackingMetrics: string[];
}

export interface FollowUpMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface SavedResearchRecord {
  id: string;
  company: CompanyInfo;
  depth: AnalysisDepth;
  lang?: AppLanguage;
  chapters: ReportChapterState[];
  synthesis: ExecutiveSynthesis | null;
  conviction: ConvictionLevel;
  starred: boolean;
  notes: string;
  followUps: FollowUpMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface PresetCompany {
  name: Record<AppLanguage, string>;
  ticker: string;
  industry: Record<AppLanguage, string>;
  market: 'HK' | 'US' | 'A';
  note: Record<AppLanguage, string>;
}
