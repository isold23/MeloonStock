import React, { useState } from 'react';
import { ArrowLeftRight, Loader2, AlertCircle } from 'lucide-react';
import { AppLanguage, CompanyInfo, SavedResearchRecord } from '../types/research';
import { compareTwoCompanies } from '../utils/api';
import { MarkdownRenderer } from './MarkdownRenderer';
import { RadarProfileChart } from './RadarProfileChart';
import { UI_COPY } from '../constants/i18n';

interface CompareViewProps {
  records: SavedResearchRecord[];
  lang: AppLanguage;
}

export const CompareView: React.FC<CompareViewProps> = ({ records, lang }) => {
  const t = UI_COPY[lang];
  const [companyA, setCompanyA] = useState<CompanyInfo>(
    records[0]?.company || {
      name: lang === 'en' ? 'Tencent Holdings' : '腾讯控股',
      ticker: '0700.HK',
      industry: lang === 'en' ? 'Internet Ecosystem' : '互联网生态',
    }
  );
  const [companyB, setCompanyB] = useState<CompanyInfo>(
    records[1]?.company || {
      name: lang === 'en' ? 'Alibaba Group' : '阿里巴巴',
      ticker: '9988.HK',
      industry: lang === 'en' ? 'E-Commerce & Cloud' : '电商与云计算',
    }
  );
  const [resultMarkdown, setResultMarkdown] = useState<string>('');
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matchA = records.find(
    (r) =>
      r.company.ticker.toLowerCase() === companyA.ticker.trim().toLowerCase() &&
      r.synthesis !== null
  );
  const matchB = records.find(
    (r) =>
      r.company.ticker.toLowerCase() === companyB.ticker.trim().toLowerCase() &&
      r.synthesis !== null
  );

  const handleCompare = async () => {
    if (!companyA.name.trim() || !companyB.name.trim()) return;
    setIsComparing(true);
    setError(null);
    try {
      const md = await compareTwoCompanies(companyA, companyB, lang);
      setResultMarkdown(md);
    } catch (err: any) {
      setError(err?.message || 'Comparison failed');
    } finally {
      setIsComparing(false);
    }
  };

  const applySavedToSlot = (slot: 'A' | 'B', recordId: string) => {
    const rec = records.find((r) => r.id === recordId);
    if (!rec) return;
    if (slot === 'A') setCompanyA(rec.company);
    else setCompanyB(rec.company);
  };

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t.compareTitle}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t.compareSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-stretch">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
              {t.slotALabel}
            </span>
            {records.length > 0 && (
              <select
                value=""
                onChange={(e) => applySavedToSlot('A', e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-700 dark:text-slate-200"
              >
                <option value="">{t.fillFromArchive}</option>
                {records.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.company.name} ({r.company.ticker})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <input
              type="text"
              placeholder={t.companyNameLabel}
              value={companyA.name}
              onChange={(e) => setCompanyA((prev) => ({ ...prev, name: e.target.value }))}
              className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-600"
            />
            <input
              type="text"
              placeholder={t.tickerLabel}
              value={companyA.ticker}
              onChange={(e) => setCompanyA((prev) => ({ ...prev, ticker: e.target.value }))}
              className="px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>
          <input
            type="text"
            placeholder={t.industryLabel}
            value={companyA.industry}
            onChange={(e) => setCompanyA((prev) => ({ ...prev, industry: e.target.value }))}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-600"
          />
        </div>

        <div className="lg:col-span-1 flex lg:flex-col items-center justify-center gap-2 py-2">
          <button
            onClick={() => {
              const temp = companyA;
              setCompanyA(companyB);
              setCompanyB(temp);
            }}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
            aria-label="Swap"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              {t.slotBLabel}
            </span>
            {records.length > 0 && (
              <select
                value=""
                onChange={(e) => applySavedToSlot('B', e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-700 dark:text-slate-200"
              >
                <option value="">{t.fillFromArchive}</option>
                {records.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.company.name} ({r.company.ticker})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <input
              type="text"
              placeholder={t.companyNameLabel}
              value={companyB.name}
              onChange={(e) => setCompanyB((prev) => ({ ...prev, name: e.target.value }))}
              className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-600"
            />
            <input
              type="text"
              placeholder={t.tickerLabel}
              value={companyB.ticker}
              onChange={(e) => setCompanyB((prev) => ({ ...prev, ticker: e.target.value }))}
              className="px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>
          <input
            type="text"
            placeholder={t.industryLabel}
            value={companyB.industry}
            onChange={(e) => setCompanyB((prev) => ({ ...prev, industry: e.target.value }))}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-600"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleCompare}
          disabled={isComparing || !companyA.name.trim() || !companyB.name.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
        >
          {isComparing && <Loader2 className="w-4 h-4 animate-spin" />}
          {isComparing ? t.comparingBtn : t.runCompareBtn}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {matchA?.synthesis && matchB?.synthesis && (
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
            {t.radarOverlayTitle}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <RadarProfileChart
              dimensions={matchA.synthesis.dimensions}
              compareDimensions={matchB.synthesis.dimensions}
              primaryLabel={`${matchA.company.name} (${matchA.company.ticker})`}
              compareLabel={`${matchB.company.name} (${matchB.company.ticker})`}
              lang={lang}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                    <th className="py-2 text-left font-medium">{t.radarAxisCol}</th>
                    <th className="py-2 text-right font-medium text-teal-700 dark:text-teal-400">
                      {matchA.company.name}
                    </th>
                    <th className="py-2 text-right font-medium text-amber-600 dark:text-amber-400">
                      {matchB.company.name}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                  {matchA.synthesis.dimensions.map((axis, idx) => {
                    const bScore = matchB.synthesis?.dimensions[idx]?.score ?? '-';
                    return (
                      <tr key={axis.label}>
                        <td className="py-2.5 text-slate-700 dark:text-slate-300">{axis.label}</td>
                        <td className="py-2.5 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {axis.score}
                        </td>
                        <td className="py-2.5 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {bScore}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {resultMarkdown && (
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {companyA.name} ({companyA.ticker}) vs {companyB.name} ({companyB.ticker})
            </h3>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN')}
            </span>
          </div>
          <MarkdownRenderer content={resultMarkdown} />
        </div>
      )}
    </div>
  );
};
