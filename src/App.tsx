/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Loader2,
  RefreshCw,
  Download,
  FileCode2,
  Star,
  AlertCircle,
  CheckCircle2,
  Square,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Menu,
  X,
  MessageSquarePlus,
  BookOpen,
  ScrollText,
  Languages,
  Stamp,
} from 'lucide-react';
import {
  AnalysisDepth,
  AppLanguage,
  CompanyInfo,
  ConvictionLevel,
  ExecutiveSynthesis,
  FollowUpMessage,
  ReadingMode,
  ReportChapterState,
  SavedResearchRecord,
  WorkspaceView,
} from './types/research';
import {
  ANALYSIS_STEPS,
  CONVICTION_LABELS,
  PRESET_COMPANIES,
} from './constants/analysisSteps';
import { marketLabel, UI_COPY } from './constants/i18n';
import {
  buildRecordId,
  deleteResearchRecord,
  loadActiveRecordId,
  loadLanguagePreference,
  loadLibrary,
  loadThemePreference,
  loadWatermarkPreference,
  saveActiveRecordId,
  saveLanguagePreference,
  saveThemePreference,
  saveWatermarkPreference,
  upsertResearchRecord,
} from './utils/storage';
import { analyzeDimension, synthesizeExecutiveBrief } from './utils/api';
import {
  downloadMarkdownFile,
  exportElementToPDF,
  WATERMARK_TEXT,
} from './utils/exportReport';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { RadarProfileChart } from './components/RadarProfileChart';
import { ResearchArchiveView } from './components/ResearchArchiveView';
import { CompareView } from './components/CompareView';
import { FollowUpPanel } from './components/FollowUpPanel';
import { ReportWatermarkOverlay } from './components/ReportWatermarkOverlay';

function createEmptyChapters(): ReportChapterState[] {
  return ANALYSIS_STEPS.map((s) => ({
    id: s.id,
    content: '',
    status: 'idle',
  }));
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadThemePreference());
  const [lang, setLang] = useState<AppLanguage>(() => loadLanguagePreference());
  const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(() =>
    loadWatermarkPreference()
  );
  const [view, setView] = useState<WorkspaceView>('research');
  const [library, setLibrary] = useState<SavedResearchRecord[]>(() => loadLibrary());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Active research state
  const [activeRecordId, setActiveRecordId] = useState<string | null>(() => loadActiveRecordId());
  const [company, setCompany] = useState<CompanyInfo>({ name: '', ticker: '', industry: '' });
  const [depth, setDepth] = useState<AnalysisDepth>('standard');
  const [chapters, setChapters] = useState<ReportChapterState[]>(createEmptyChapters);
  const [synthesis, setSynthesis] = useState<ExecutiveSynthesis | null>(null);
  const [conviction, setConviction] = useState<ConvictionLevel>('undecided');
  const [starred, setStarred] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [followUps, setFollowUps] = useState<FollowUpMessage[]>([]);
  const [createdAt, setCreatedAt] = useState<number>(Date.now());

  // Execution & UI state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [readingMode, setReadingMode] = useState<ReadingMode>('scroll');
  const [focusedChapterId, setFocusedChapterId] = useState<number>(1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'HK' | 'US' | 'A'>('ALL');

  const abortControllerRef = useRef<AbortController | null>(null);
  const t = UI_COPY[lang];

  const hasStartedReport = useMemo(
    () => isAnalyzing || chapters.some((c) => c.status !== 'idle'),
    [isAnalyzing, chapters]
  );

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveThemePreference(theme);
  }, [theme]);

  // Persist language & dynamic SEO metadata
  useEffect(() => {
    saveLanguagePreference(lang);
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';

    const pageTitle =
      view === 'research' && hasStartedReport && company.name
        ? `${company.name} (${company.ticker}) – ${
            lang === 'en' ? 'Equity Research Report | StockInsight AI' : '深度投研报告 | StockInsight AI'
          }`
        : t.seoTitle;

    document.title = pageTitle;

    const desc = t.seoDescription;
    const setMeta = (selector: string, attr: string, value: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', 'content', desc);
    setMeta('meta[property="og:title"]', 'content', pageTitle);
    setMeta('meta[property="og:description"]', 'content', desc);
    setMeta('meta[name="twitter:title"]', 'content', pageTitle);
    setMeta('meta[name="twitter:description"]', 'content', desc);

    const currentUrl =
      typeof window !== 'undefined'
        ? window.location.origin + window.location.pathname
        : 'https://stock.meloon.top/';
    setMeta('meta[property="og:url"]', 'content', currentUrl);
    setMeta('meta[name="twitter:url"]', 'content', currentUrl);
    setMeta('link[rel="canonical"]', 'href', currentUrl);
  }, [lang, view, hasStartedReport, company.name, company.ticker, t.seoTitle, t.seoDescription]);

  // Persist watermark toggle
  useEffect(() => {
    saveWatermarkPreference(watermarkEnabled);
  }, [watermarkEnabled]);

  // Restore last active record on initial load
  useEffect(() => {
    if (activeRecordId) {
      const found = library.find((r) => r.id === activeRecordId);
      if (found) {
        setCompany(found.company);
        setDepth(found.depth);
        if (found.lang) setLang(found.lang);
        setChapters(found.chapters);
        setSynthesis(found.synthesis);
        setConviction(found.conviction);
        setStarred(found.starred);
        setNotes(found.notes);
        setFollowUps(found.followUps || []);
        setCreatedAt(found.createdAt);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completedCount = useMemo(
    () => chapters.filter((c) => c.status === 'completed').length,
    [chapters]
  );

  const reportContextSummary = useMemo(
    () =>
      chapters
        .filter((c) => c.status === 'completed' && c.content)
        .map((c) => {
          const def = ANALYSIS_STEPS.find((s) => s.id === c.id);
          return `[${def?.shortTitle[lang]}]\n${c.content.slice(0, 600)}`;
        })
        .join('\n\n'),
    [chapters, lang]
  );

  const persistCurrentRecord = (overrides?: Partial<SavedResearchRecord>) => {
    const targetCompany = overrides?.company || company;
    if (!targetCompany.name.trim() || !targetCompany.ticker.trim()) return;

    const id = overrides?.id || buildRecordId(targetCompany);
    const record: SavedResearchRecord = {
      id,
      company: targetCompany,
      depth: overrides?.depth ?? depth,
      lang: overrides?.lang ?? lang,
      chapters: overrides?.chapters ?? chapters,
      synthesis: overrides?.synthesis !== undefined ? overrides.synthesis : synthesis,
      conviction: overrides?.conviction ?? conviction,
      starred: overrides?.starred ?? starred,
      notes: overrides?.notes ?? notes,
      followUps: overrides?.followUps ?? followUps,
      createdAt: overrides?.createdAt ?? createdAt,
      updatedAt: Date.now(),
    };

    const updated = upsertResearchRecord(record);
    setLibrary(updated);
    setActiveRecordId(id);
    saveActiveRecordId(id);
  };

  const resetToNewResearch = () => {
    if (isAnalyzing) {
      abortControllerRef.current?.abort();
      setIsAnalyzing(false);
    }
    setActiveRecordId(null);
    saveActiveRecordId(null);
    setCompany({ name: '', ticker: '', industry: '' });
    setChapters(createEmptyChapters());
    setSynthesis(null);
    setSynthesisError(null);
    setConviction('undecided');
    setStarred(false);
    setNotes('');
    setFollowUps([]);
    setFocusedChapterId(1);
    setExportError(null);
    setView('research');
  };

  const openSavedRecord = (record: SavedResearchRecord) => {
    if (isAnalyzing) {
      abortControllerRef.current?.abort();
      setIsAnalyzing(false);
    }
    setActiveRecordId(record.id);
    saveActiveRecordId(record.id);
    setCompany(record.company);
    setDepth(record.depth);
    if (record.lang) setLang(record.lang);
    setChapters(record.chapters);
    setSynthesis(record.synthesis);
    setSynthesisError(null);
    setConviction(record.conviction);
    setStarred(record.starred);
    setNotes(record.notes);
    setFollowUps(record.followUps || []);
    setCreatedAt(record.createdAt);
    setFocusedChapterId(1);
    setView('research');
    setMobileSidebarOpen(false);
  };

  const generateSynthesis = async (
    targetCompany: CompanyInfo,
    targetChapters: ReportChapterState[],
    targetLang: AppLanguage,
    signal?: AbortSignal
  ) => {
    const context = targetChapters
      .filter((c) => c.status === 'completed' && c.content)
      .map((c) => {
        const def = ANALYSIS_STEPS.find((s) => s.id === c.id);
        return `## ${def?.shortTitle[targetLang]}\n${c.content.slice(0, 650)}`;
      })
      .join('\n\n');

    setIsSynthesizing(true);
    setSynthesisError(null);
    try {
      const result = await synthesizeExecutiveBrief(targetCompany, context, targetLang, signal);
      setSynthesis(result);
      persistCurrentRecord({
        company: targetCompany,
        chapters: targetChapters,
        synthesis: result,
        lang: targetLang,
      });
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setSynthesisError(err?.message || 'Synthesis generation failed');
      }
    } finally {
      setIsSynthesizing(false);
    }
  };

  const runAnalysis = async (
    overrideCompany?: CompanyInfo,
    overrideDepth?: AnalysisDepth,
    overrideLang?: AppLanguage
  ) => {
    const targetCompany = overrideCompany || company;
    const targetDepth = overrideDepth || depth;
    const targetLang = overrideLang || lang;
    if (!targetCompany.name.trim() || !targetCompany.ticker.trim()) return;

    if (overrideCompany) setCompany(overrideCompany);
    if (overrideDepth) setDepth(overrideDepth);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const now = Date.now();
    const initialChapters = createEmptyChapters();
    setView('research');
    setIsAnalyzing(true);
    setChapters(initialChapters);
    setSynthesis(null);
    setSynthesisError(null);
    setExportError(null);
    setCreatedAt(now);
    setFocusedChapterId(1);

    let workingChapters = [...initialChapters];
    const recordId = buildRecordId(targetCompany);
    const existing = library.find((r) => r.id === recordId);

    const baseStarred = existing?.starred ?? false;
    const baseConviction = existing?.conviction ?? 'undecided';
    const baseNotes = existing?.notes ?? '';
    const baseFollowUps = existing?.followUps ?? [];

    setStarred(baseStarred);
    setConviction(baseConviction);
    setNotes(baseNotes);
    setFollowUps(baseFollowUps);

    const batchSize = 2;
    for (let i = 0; i < ANALYSIS_STEPS.length; i += batchSize) {
      if (controller.signal.aborted) break;

      const batch = ANALYSIS_STEPS.slice(i, i + batchSize);
      const batchIds = batch.map((b) => b.id);

      workingChapters = workingChapters.map((ch) =>
        batchIds.includes(ch.id) ? { ...ch, status: 'loading' } : ch
      );
      setChapters(workingChapters);

      await Promise.all(
        batch.map(async (step) => {
          try {
            const text = await analyzeDimension(
              step.prompt(targetCompany, targetLang),
              step.id,
              targetDepth,
              targetLang,
              controller.signal
            );
            workingChapters = workingChapters.map((ch) =>
              ch.id === step.id
                ? { ...ch, content: text, status: 'completed', updatedAt: Date.now() }
                : ch
            );
          } catch (err: any) {
            if (err?.name === 'AbortError') {
              workingChapters = workingChapters.map((ch) =>
                ch.id === step.id && ch.status === 'loading'
                  ? { ...ch, status: 'idle' }
                  : ch
              );
            } else {
              workingChapters = workingChapters.map((ch) =>
                ch.id === step.id
                  ? {
                      ...ch,
                      content:
                        err?.message ||
                        (targetLang === 'en'
                          ? 'Generation failed. Click Retry to regenerate this section.'
                          : '该维度生成失败，请点击单章重试。'),
                      status: 'error',
                    }
                  : ch
              );
            }
          }
          setChapters([...workingChapters]);
        })
      );

      persistCurrentRecord({
        id: recordId,
        company: targetCompany,
        depth: targetDepth,
        lang: targetLang,
        chapters: workingChapters,
        synthesis: null,
        conviction: baseConviction,
        starred: baseStarred,
        notes: baseNotes,
        followUps: baseFollowUps,
        createdAt: now,
      });

      if (i + batchSize < ANALYSIS_STEPS.length && !controller.signal.aborted) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    setIsAnalyzing(false);

    const completed = workingChapters.filter((c) => c.status === 'completed').length;
    if (!controller.signal.aborted && completed >= 3) {
      await generateSynthesis(targetCompany, workingChapters, targetLang, controller.signal);
    }
  };

  const stopAnalysis = () => {
    abortControllerRef.current?.abort();
    setIsAnalyzing(false);
  };

  const retrySingleChapter = async (stepId: number) => {
    if (isAnalyzing || !company.name.trim() || !company.ticker.trim()) return;
    const step = ANALYSIS_STEPS.find((s) => s.id === stepId);
    if (!step) return;

    const loadingChapters = chapters.map((ch) =>
      ch.id === stepId ? { ...ch, status: 'loading' as const } : ch
    );
    setChapters(loadingChapters);

    try {
      const text = await analyzeDimension(step.prompt(company, lang), step.id, depth, lang);
      const nextChapters = loadingChapters.map((ch) =>
        ch.id === stepId
          ? { ...ch, content: text, status: 'completed' as const, updatedAt: Date.now() }
          : ch
      );
      setChapters(nextChapters);
      persistCurrentRecord({ chapters: nextChapters });
    } catch (err: any) {
      const errChapters = loadingChapters.map((ch) =>
        ch.id === stepId
          ? {
              ...ch,
              content:
                err?.message ||
                (lang === 'en' ? 'Retry failed.' : '重试失败，请检查网络或接口配置。'),
              status: 'error' as const,
            }
          : ch
      );
      setChapters(errChapters);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportError(null);
    const prevMode = readingMode;
    if (prevMode === 'chapter') {
      setReadingMode('scroll');
      await new Promise((r) => setTimeout(r, 120));
    }

    try {
      await exportElementToPDF('report-content', company, lang, watermarkEnabled);
    } catch (err: any) {
      setExportError(
        err?.message || (lang === 'en' ? 'Failed to export PDF' : '导出报告失败，请稍后重试')
      );
    } finally {
      if (prevMode === 'chapter') {
        setReadingMode('chapter');
      }
      setIsExporting(false);
    }
  };

  const handleSelectChapter = (id: number) => {
    setFocusedChapterId(id);
    setMobileSidebarOpen(false);
    if (readingMode === 'scroll') {
      const el = document.getElementById(`report-${id}`);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 88;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  const handleToggleStar = (targetId?: string) => {
    if (targetId && targetId !== activeRecordId) {
      const updated = library.map((rec) =>
        rec.id === targetId ? { ...rec, starred: !rec.starred, updatedAt: Date.now() } : rec
      );
      setLibrary(updated);
      const item = updated.find((r) => r.id === targetId);
      if (item) upsertResearchRecord(item);
      return;
    }
    const nextStarred = !starred;
    setStarred(nextStarred);
    persistCurrentRecord({ starred: nextStarred });
  };

  const handleConvictionChange = (val: ConvictionLevel) => {
    setConviction(val);
    persistCurrentRecord({ conviction: val });
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    persistCurrentRecord({ notes: val });
  };

  const handleAddFollowUps = (newMsgs: FollowUpMessage[]) => {
    const next = [...followUps, ...newMsgs];
    setFollowUps(next);
    persistCurrentRecord({ followUps: next });
  };

  const handleDeleteRecord = (id: string) => {
    const updated = deleteResearchRecord(id);
    setLibrary(updated);
    if (id === activeRecordId) {
      resetToNewResearch();
    }
  };

  const filteredPresets = useMemo(
    () =>
      marketFilter === 'ALL'
        ? PRESET_COMPANIES
        : PRESET_COMPANIES.filter((p) => p.market === marketFilter),
    [marketFilter]
  );

  const visibleChapters = useMemo(() => {
    if (readingMode === 'chapter') {
      return chapters.filter((c) => c.id === focusedChapterId);
    }
    return chapters.filter((c) => c.status !== 'idle');
  }, [chapters, readingMode, focusedChapterId]);

  const starredRecords = useMemo(() => library.filter((r) => r.starred), [library]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 h-16 bg-white/90 dark:bg-[#0B1120]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6">
        <div className="max-w-[1440px] mx-auto h-full flex items-center justify-between gap-8">
          {/* Zone 1: Single-element Brand Wordmark */}
          <button
            onClick={() => setView('research')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0 hover:opacity-80 transition-opacity"
          >
            StockInsight
          </button>

          {/* Zone 2: Clean single-line text nav links */}
          <nav className="flex items-center gap-6 sm:gap-8 text-sm font-medium">
            <button
              onClick={() => setView('research')}
              className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                view === 'research'
                  ? 'border-teal-700 dark:border-teal-400 text-slate-900 dark:text-slate-50 font-semibold'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {t.navResearch}
            </button>
            <button
              onClick={() => setView('archive')}
              className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                view === 'archive'
                  ? 'border-teal-700 dark:border-teal-400 text-slate-900 dark:text-slate-50 font-semibold'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {t.navArchive}
            </button>
            <button
              onClick={() => setView('compare')}
              className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                view === 'compare'
                  ? 'border-teal-700 dark:border-teal-400 text-slate-900 dark:text-slate-50 font-semibold'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {t.navCompare}
            </button>
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="flex items-center shrink-0">
            <button
              onClick={resetToNewResearch}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0"
            >
              {t.newAnalysis}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto flex items-start relative">
        {/* Desktop Sidebar & Mobile Drawer (Visible in Research view) */}
        {view === 'research' && (
          <>
            {mobileSidebarOpen && (
              <div
                onClick={() => setMobileSidebarOpen(false)}
                className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
              />
            )}
            <aside
              className={`fixed lg:sticky top-0 lg:top-16 left-0 z-50 lg:z-20 w-72 shrink-0 h-screen lg:h-[calc(100vh-4rem)] bg-white dark:bg-[#0F172A] lg:bg-transparent lg:dark:bg-transparent border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ${
                mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
              }`}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 lg:hidden">
                <span className="font-display font-bold text-sm">{t.mobileOutlineBtn}</span>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  aria-label="Close sidebar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-7">
                {/* 10-Dimension Chapter Outline */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {t.outlineTitle}
                    </h2>
                    {hasStartedReport && (
                      <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {completedCount}/10
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {ANALYSIS_STEPS.map((step) => {
                      const ch = chapters.find((c) => c.id === step.id);
                      const status = ch?.status || 'idle';
                      const isFocused = focusedChapterId === step.id && hasStartedReport;

                      return (
                        <button
                          key={step.id}
                          onClick={() => {
                            if (status !== 'idle' || readingMode === 'chapter') {
                              handleSelectChapter(step.id);
                            }
                          }}
                          disabled={status === 'idle' && !hasStartedReport}
                          className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                            isFocused
                              ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-medium'
                              : status === 'idle' && !hasStartedReport
                              ? 'text-slate-400 dark:text-slate-600 cursor-default'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono text-xs tabular-nums text-slate-400 w-5 shrink-0">
                              {String(step.id).padStart(2, '0')}
                            </span>
                            <span className="truncate">{step.shortTitle[lang]}</span>
                          </div>
                          <span className="shrink-0">
                            {status === 'loading' && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600 dark:text-teal-400" />
                            )}
                            {status === 'completed' && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            )}
                            {status === 'error' && (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Starred & Recent Watchlist */}
                {library.length > 0 && (
                  <div className="pt-5 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {starredRecords.length > 0 ? t.starredTitle : t.recentTitle}
                      </h2>
                      <button
                        onClick={() => setView('archive')}
                        className="text-xs text-teal-700 dark:text-teal-400 hover:underline"
                      >
                        {t.viewAll} ({library.length})
                      </button>
                    </div>
                    <div className="space-y-1">
                      {(starredRecords.length > 0 ? starredRecords : library)
                        .slice(0, 6)
                        .map((rec) => {
                          const isCurrent = rec.id === activeRecordId && hasStartedReport;
                          return (
                            <button
                              key={rec.id}
                              onClick={() => openSavedRecord(rec)}
                              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                                isCurrent
                                  ? 'bg-slate-200/70 dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-medium'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="text-sm truncate">{rec.company.name}</div>
                                <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                                  {rec.company.ticker}
                                </div>
                              </div>
                              {rec.starred && (
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Footer: Language & Theme Preferences */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5" />
                    {t.langLabel}
                  </span>
                  <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setLang('zh')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        lang === 'zh'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      中文
                    </button>
                    <button
                      onClick={() => setLang('en')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        lang === 'en'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t.themeLabel}</span>
                  <button
                    onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    {theme === 'light' ? (
                      <>
                        <Moon className="w-3.5 h-3.5" />
                        {t.themeDark}
                      </>
                    ) : (
                      <>
                        <Sun className="w-3.5 h-3.5" />
                        {t.themeLight}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </aside>
          </>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 sm:py-8">
          {/* Sub-Toolbar for Mobile or Views without Sidebar */}
          <div
            className={`flex items-center justify-between gap-3 mb-5 ${
              view === 'research' ? 'lg:hidden' : ''
            }`}
          >
            {view === 'research' ? (
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
              >
                <Menu className="w-4 h-4" />
                {t.mobileOutlineBtn} ({completedCount}/10)
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setLang('zh')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    lang === 'zh'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  中文
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    lang === 'en'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  EN
                </button>
              </div>
              <button
                onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                aria-label="Toggle Theme"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {view === 'archive' && (
            <ResearchArchiveView
              records={library}
              lang={lang}
              onOpenRecord={openSavedRecord}
              onRefreshRecord={(rec) => runAnalysis(rec.company, rec.depth, lang)}
              onToggleStar={(id) => handleToggleStar(id)}
              onDeleteRecord={handleDeleteRecord}
              onStartNew={resetToNewResearch}
            />
          )}

          {view === 'compare' && <CompareView records={library} lang={lang} />}

          {view === 'research' && !hasStartedReport && (
            <div className="max-w-4xl mx-auto space-y-10">
              {/* Launch Hero & Research Input */}
              <section className="space-y-6">
                <div className="space-y-2.5">
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 max-w-2xl">
                    {t.heroTitle}
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                    {t.heroSubtitle}
                  </p>
                </div>

                {/* Research Form Container */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    runAnalysis();
                  }}
                  className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                        {t.companyNameLabel}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={t.companyNamePlaceholder}
                        value={company.name}
                        onChange={(e) => setCompany((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                        {t.tickerLabel}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={t.tickerPlaceholder}
                        value={company.ticker}
                        onChange={(e) => setCompany((prev) => ({ ...prev, ticker: e.target.value }))}
                        className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                        {t.industryLabel}
                      </label>
                      <input
                        type="text"
                        placeholder={t.industryPlaceholder}
                        value={company.industry}
                        onChange={(e) =>
                          setCompany((prev) => ({ ...prev, industry: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {t.depthLabel}
                      </span>
                      <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        {(
                          [
                            { id: 'concise', label: t.depthConcise },
                            { id: 'standard', label: t.depthStandard },
                            { id: 'institutional', label: t.depthInstitutional },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setDepth(opt.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                              depth === opt.id
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!company.name.trim() || !company.ticker.trim()}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                    >
                      <Search className="w-4 h-4" />
                      {t.startAnalysisBtn}
                    </button>
                  </div>
                </form>
              </section>

              {/* Popular Market Presets (1-Click Launch) */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                      {t.presetsTitle}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t.presetsSubtitle}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 self-start">
                    {(
                      [
                        { id: 'ALL', label: t.marketAll },
                        { id: 'HK', label: t.marketHK },
                        { id: 'US', label: t.marketUS },
                        { id: 'A', label: t.marketA },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMarketFilter(m.id)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          marketFilter === m.id
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {filteredPresets.map((preset) => (
                    <button
                      key={preset.ticker}
                      onClick={() =>
                        runAnalysis(
                          {
                            name: preset.name[lang],
                            ticker: preset.ticker,
                            industry: preset.industry[lang],
                          },
                          depth,
                          lang
                        )
                      }
                      className="group text-left bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-teal-600/60 dark:hover:border-teal-500/60 rounded-xl p-4 transition-colors flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                            {preset.name[lang]}
                          </span>
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                            {preset.ticker}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {marketLabel(preset.market, lang)} · {preset.industry[lang]}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {preset.note[lang]}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              {/* Recent Saved Reports Resume Strip */}
              {library.length > 0 && (
                <section className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                      {t.resumeTitle}
                    </h2>
                    <button
                      onClick={() => setView('archive')}
                      className="text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline"
                    >
                      {t.resumeViewAll} ({library.length})
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {library.slice(0, 3).map((rec) => {
                      const done = rec.chapters.filter((c) => c.status === 'completed').length;
                      return (
                        <button
                          key={rec.id}
                          onClick={() => openSavedRecord(rec)}
                          className="text-left bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 rounded-xl p-4 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                              {rec.company.name}
                            </span>
                            {rec.starred && (
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            <span>{rec.company.ticker}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {done}/10 {t.dimensionsUnit}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {new Date(rec.updatedAt).toLocaleDateString(
                                lang === 'en' ? 'en-US' : 'zh-CN'
                              )}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Active Report Workspace */}
          {view === 'research' && hasStartedReport && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Action & Reading Controls Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleToggleStar()}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      starred
                        ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                    {starred ? t.starred : t.addStar}
                  </button>

                  <select
                    value={conviction}
                    onChange={(e) => handleConvictionChange(e.target.value as ConvictionLevel)}
                    aria-label="Conviction Rating"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-600"
                  >
                    {(Object.keys(CONVICTION_LABELS) as ConvictionLevel[]).map((key) => (
                      <option key={key} value={key}>
                        {t.ratingPrefix}
                        {CONVICTION_LABELS[key][lang]}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setWatermarkEnabled((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      watermarkEnabled
                        ? 'border-teal-600/40 bg-teal-50/70 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400'
                    }`}
                    title={WATERMARK_TEXT}
                  >
                    <Stamp className="w-3.5 h-3.5" />
                    {watermarkEnabled ? t.watermarkOn : t.watermarkOff}
                  </button>

                  <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => setReadingMode('scroll')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        readingMode === 'scroll'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <ScrollText className="w-3.5 h-3.5" />
                      {t.modeScroll}
                    </button>
                    <button
                      onClick={() => setReadingMode('chapter')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        readingMode === 'chapter'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      {t.modeChapter}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isAnalyzing ? (
                    <button
                      onClick={stopAnalysis}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      {t.stopGenerating} ({completedCount}/10)
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => runAnalysis(company, depth, lang)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {t.rerunAll}
                      </button>

                      {completedCount > 0 && (
                        <>
                          <button
                            onClick={() =>
                              downloadMarkdownFile(
                                company,
                                chapters,
                                synthesis,
                                notes,
                                lang,
                                watermarkEnabled
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                          >
                            <FileCode2 className="w-3.5 h-3.5" />
                            Markdown
                          </button>
                          <button
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                          >
                            {isExporting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {t.exportingReport}
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4" />
                                {t.exportReport}
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {exportError && (
                <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-700 dark:text-rose-300">
                  {exportError}
                </div>
              )}

              {/* Generation Progress Bar while running */}
              {isAnalyzing && (
                <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600 dark:text-teal-400" />
                      {t.generatingProgress}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {completedCount} / 10
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600 dark:bg-teal-400 transition-all duration-300"
                      style={{ width: `${Math.max(6, (completedCount / 10) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Exportable Report Content Wrapper with Watermark Overlay */}
              <div id="report-content" className="relative space-y-6">
                <ReportWatermarkOverlay enabled={watermarkEnabled} />

                {/* Report Masthead */}
                <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-teal-700 dark:text-teal-400">
                      {t.reportBrandTag}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                      {company.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      <span>{company.ticker}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-sans">{company.industry || t.generalIndustry}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {new Date(createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN')}
                      </span>
                      {watermarkEnabled && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{WATERMARK_TEXT}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="sm:text-right text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <div>
                      {t.ratingPrefix}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {CONVICTION_LABELS[conviction][lang]}
                      </span>
                    </div>
                    <div className="font-mono tabular-nums">
                      {t.completionLabel}：{completedCount} / 10
                    </div>
                  </div>
                </div>

                {/* Executive Synthesis & 5-Axis Radar Card */}
                {(synthesis ||
                  isSynthesizing ||
                  synthesisError ||
                  (!isAnalyzing && completedCount >= 3)) && (
                  <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 page-break-inside-avoid">
                    <div className="flex items-center justify-between gap-4 mb-5">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                          {t.synthesisTitle}
                        </h2>
                        {synthesis?.moatType && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {t.moatPrefix}
                            {synthesis.moatType}
                          </p>
                        )}
                      </div>
                      {!isSynthesizing && (
                        <button
                          onClick={() => generateSynthesis(company, chapters, lang)}
                          className="no-export inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          {synthesis ? t.refreshSynthesis : t.generateSynthesis}
                        </button>
                      )}
                    </div>

                    {isSynthesizing ? (
                      <div className="py-10 flex items-center justify-center gap-2.5 text-sm text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                        {t.synthesizingText}
                      </div>
                    ) : synthesisError ? (
                      <div className="text-xs text-rose-600 dark:text-rose-400">
                        {synthesisError}
                      </div>
                    ) : synthesis ? (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className="lg:col-span-7 space-y-5">
                          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900">
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              {t.oneLineThesisLabel}
                            </div>
                            <p className="text-sm font-medium leading-relaxed text-slate-900 dark:text-slate-100">
                              {synthesis.oneLineThesis}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                {t.bullCatalystsLabel}
                              </div>
                              <ul className="space-y-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300 list-disc pl-4">
                                {synthesis.bullCatalysts.map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="space-y-2">
                              <div className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                                {t.bearRisksLabel}
                              </div>
                              <ul className="space-y-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300 list-disc pl-4">
                                {synthesis.bearRisks.map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                              {t.trackingMetricsLabel}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                              {synthesis.trackingMetrics.map((m, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <span className="font-mono text-teal-700 dark:text-teal-400">
                                    {idx + 1}.
                                  </span>
                                  <span>{m}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-5">
                          <RadarProfileChart dimensions={synthesis.dimensions} lang={lang} />
                        </div>
                      </div>
                    ) : null}
                  </section>
                )}

                {/* Personal Investment Thesis Memo */}
                <section
                  className={`bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 ${
                    !notes.trim() ? 'no-export' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="personal-memo"
                      className="text-sm font-bold text-slate-900 dark:text-slate-50"
                    >
                      {t.memoTitle}
                    </label>
                    <span className="text-xs text-slate-400 font-mono tabular-nums">
                      {notes.length} {t.charsUnit}
                    </span>
                  </div>
                  <textarea
                    id="personal-memo"
                    rows={3}
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder={t.memoPlaceholder}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 leading-relaxed"
                  />
                </section>

                {/* Single-Chapter Navigation Bar */}
                {readingMode === 'chapter' && (
                  <div className="no-export flex items-center justify-between bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3">
                    <button
                      onClick={() => setFocusedChapterId((prev) => Math.max(1, prev - 1))}
                      disabled={focusedChapterId <= 1}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:text-teal-700 dark:hover:text-teal-400"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {t.prevChapter}
                    </button>
                    <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {t.dimensionLabel} {focusedChapterId} / 10
                    </span>
                    <button
                      onClick={() => setFocusedChapterId((prev) => Math.min(10, prev + 1))}
                      disabled={focusedChapterId >= 10}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:text-teal-700 dark:hover:text-teal-400"
                    >
                      {t.nextChapter}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* 10-Dimension Chapters */}
                <div className="space-y-6">
                  {visibleChapters.map((ch) => {
                    const def = ANALYSIS_STEPS.find((s) => s.id === ch.id)!;
                    return (
                      <section
                        key={ch.id}
                        id={`report-${ch.id}`}
                        className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 page-break-inside-avoid"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-200 dark:border-slate-800">
                          <div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                              {def.category[lang]} · {def.subtitle[lang]}
                            </div>
                            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                              {def.title[lang]}
                            </h2>
                          </div>
                          <div className="no-export flex items-center gap-2 shrink-0">
                            {ch.status === 'completed' && (
                              <button
                                onClick={() => {
                                  const el = document.getElementById('followup-section');
                                  el?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                              >
                                <MessageSquarePlus className="w-3.5 h-3.5" />
                                {t.followupAction}
                              </button>
                            )}
                            {!isAnalyzing && (
                              <button
                                onClick={() => retrySingleChapter(ch.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                {ch.status === 'idle' ? t.generateDimension : t.rewriteDimension}
                              </button>
                            )}
                          </div>
                        </div>

                        {ch.status === 'loading' ? (
                          <div className="py-10 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin text-teal-600 dark:text-teal-400" />
                            <p className="text-sm">
                              {t.analyzingDimension} ({def.shortTitle[lang]})
                            </p>
                          </div>
                        ) : ch.status === 'error' ? (
                          <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-sm">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>{ch.content}</span>
                            </div>
                            <button
                              onClick={() => retrySingleChapter(ch.id)}
                              disabled={isAnalyzing}
                              className="self-end sm:self-auto px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium whitespace-nowrap"
                            >
                              {t.retryNow}
                            </button>
                          </div>
                        ) : ch.status === 'idle' ? (
                          <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            {t.idleDimension}
                          </div>
                        ) : (
                          <MarkdownRenderer content={ch.content} />
                        )}
                      </section>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Follow-Up Q&A Panel */}
              {completedCount > 0 && (
                <FollowUpPanel
                  company={company}
                  messages={followUps}
                  contextSummary={reportContextSummary}
                  lang={lang}
                  onAddMessages={handleAddFollowUps}
                  onSaveToNotes={(snippet) =>
                    handleNotesChange(notes ? `${notes}\n${snippet}` : snippet.trim())
                  }
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Quiet Institutional Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 px-6 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>{t.footerText}</p>
      </footer>
    </div>
  );
}
