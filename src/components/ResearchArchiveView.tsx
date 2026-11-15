import React, { useMemo, useState } from 'react';
import { Search, Star, Trash2, ArrowUpRight, RefreshCw, FolderOpen } from 'lucide-react';
import { AppLanguage, ConvictionLevel, SavedResearchRecord } from '../types/research';
import { CONVICTION_LABELS } from '../constants/analysisSteps';
import { UI_COPY } from '../constants/i18n';

interface ResearchArchiveViewProps {
  records: SavedResearchRecord[];
  lang: AppLanguage;
  onOpenRecord: (record: SavedResearchRecord) => void;
  onRefreshRecord: (record: SavedResearchRecord) => void;
  onToggleStar: (id: string) => void;
  onDeleteRecord: (id: string) => void;
  onStartNew: () => void;
}

type ArchiveFilter = 'all' | 'starred' | ConvictionLevel;

export const ResearchArchiveView: React.FC<ResearchArchiveViewProps> = ({
  records,
  lang,
  onOpenRecord,
  onRefreshRecord,
  onToggleStar,
  onDeleteRecord,
  onStartNew,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ArchiveFilter>('all');
  const t = UI_COPY[lang];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((rec) => {
      if (filter === 'starred' && !rec.starred) return false;
      if (filter !== 'all' && filter !== 'starred' && rec.conviction !== filter) return false;
      if (!q) return true;
      return (
        rec.company.name.toLowerCase().includes(q) ||
        rec.company.ticker.toLowerCase().includes(q) ||
        rec.company.industry.toLowerCase().includes(q)
      );
    });
  }, [records, query, filter]);

  const filterTabs: { id: ArchiveFilter; label: string }[] = [
    { id: 'all', label: `${t.archiveFilterAll} (${records.length})` },
    { id: 'starred', label: `${t.archiveFilterStarred} (${records.filter((r) => r.starred).length})` },
    { id: 'high', label: CONVICTION_LABELS.high[lang] },
    { id: 'watch', label: CONVICTION_LABELS.watch[lang] },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t.archiveTitle}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t.archiveSubtitle}</p>
        </div>
        <button
          onClick={onStartNew}
          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0"
        >
          {t.archiveNewBtn}
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.archiveSearchPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            {records.length === 0 ? t.archiveEmptyTitle : t.archiveNoMatchTitle}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
            {records.length === 0 ? t.archiveEmptyDesc : t.archiveNoMatchDesc}
          </p>
          {records.length === 0 && (
            <button
              onClick={onStartNew}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {t.archiveStartFirst}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 pl-5 pr-3">{t.colSubject}</th>
                  <th className="py-3 px-3">{t.colIndustry}</th>
                  <th className="py-3 px-3">{t.colRating}</th>
                  <th className="py-3 px-3 text-right">{t.colProgress}</th>
                  <th className="py-3 px-3 text-right">{t.colUpdated}</th>
                  <th className="py-3 pl-3 pr-5 text-right">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {filtered.map((rec) => {
                  const completedCount = rec.chapters.filter((c) => c.status === 'completed').length;
                  const convictionMeta = CONVICTION_LABELS[rec.conviction] || CONVICTION_LABELS.undecided;
                  const convictionTone =
                    rec.conviction === 'high'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : rec.conviction === 'watch'
                      ? 'text-amber-700 dark:text-amber-400'
                      : rec.conviction === 'pass'
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-slate-500 dark:text-slate-400';

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 pl-5 pr-3">
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => onToggleStar(rec.id)}
                            className="p-1 text-slate-400 hover:text-amber-500 transition-colors shrink-0"
                            aria-label="Toggle Watchlist"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                rec.starred ? 'fill-amber-400 text-amber-400' : ''
                              }`}
                            />
                          </button>
                          <button onClick={() => onOpenRecord(rec)} className="text-left group">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                              {rec.company.name}
                            </div>
                            <div className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                              {rec.company.ticker}
                            </div>
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 max-w-[180px] truncate">
                        {rec.company.industry || t.generalIndustry}
                      </td>
                      <td className={`py-3.5 px-3 font-medium text-xs ${convictionTone}`}>
                        {convictionMeta[lang]}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                        {completedCount} / 10
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(rec.updatedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN')}
                      </td>
                      <td className="py-3.5 pl-3 pr-5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenRecord(rec)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 rounded-md transition-colors whitespace-nowrap"
                          >
                            {t.openBtn}
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onRefreshRecord(rec)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors"
                            aria-label={t.rerunAll}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteRecord(rec.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
