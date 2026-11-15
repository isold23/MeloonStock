import { AppLanguage, CompanyInfo, SavedResearchRecord } from '../types/research';

const LIBRARY_STORAGE_KEY = 'stockinsight_library_v2';
const ACTIVE_ID_KEY = 'stockinsight_active_id_v2';
const THEME_STORAGE_KEY = 'stockinsight_theme_v2';
const LANG_STORAGE_KEY = 'stockinsight_lang_v1';
const WATERMARK_STORAGE_KEY = 'stockinsight_watermark_v1';

export function buildRecordId(company: CompanyInfo): string {
  const ticker = (company.ticker || '').trim().toUpperCase();
  const name = (company.name || '').trim();
  return ticker ? `${ticker}::${name}` : name;
}

export function loadLibrary(): SavedResearchRecord[] {
  try {
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLibrary(records: SavedResearchRecord[]): void {
  try {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('Failed to persist research library:', err);
  }
}

export function upsertResearchRecord(record: SavedResearchRecord): SavedResearchRecord[] {
  const existing = loadLibrary();
  const idx = existing.findIndex((item) => item.id === record.id);
  const next =
    idx >= 0
      ? existing.map((item, i) => (i === idx ? record : item))
      : [record, ...existing];
  next.sort((a, b) => b.updatedAt - a.updatedAt);
  saveLibrary(next);
  return next;
}

export function deleteResearchRecord(id: string): SavedResearchRecord[] {
  const existing = loadLibrary();
  const next = existing.filter((item) => item.id !== id);
  saveLibrary(next);
  return next;
}

export function loadActiveRecordId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ID_KEY);
  } catch {
    return null;
  }
}

export function saveActiveRecordId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_ID_KEY, id);
    else localStorage.removeItem(ACTIVE_ID_KEY);
  } catch {
    // ignore
  }
}

export function loadThemePreference(): 'light' | 'dark' {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // ignore
  }
  return 'light';
}

export function saveThemePreference(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

export function loadLanguagePreference(): AppLanguage {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === 'en' || stored === 'zh') return stored;
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en')) {
      return 'en';
    }
  } catch {
    // ignore
  }
  return 'zh';
}

export function saveLanguagePreference(lang: AppLanguage): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

export function loadWatermarkPreference(): boolean {
  try {
    const stored = localStorage.getItem(WATERMARK_STORAGE_KEY);
    if (stored === 'false') return false;
  } catch {
    // ignore
  }
  return true;
}

export function saveWatermarkPreference(enabled: boolean): void {
  try {
    localStorage.setItem(WATERMARK_STORAGE_KEY, String(enabled));
  } catch {
    // ignore
  }
}
