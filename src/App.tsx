/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Search, 
  TrendingUp, 
  PieChart, 
  Globe, 
  Users, 
  ShieldAlert, 
  Briefcase, 
  LineChart, 
  Scale, 
  FileText,
  Loader2,
  ChevronRight,
  RefreshCw,
  BarChart3,
  Building2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface CompanyInfo {
  name: string;
  ticker: string;
  industry: string;
}

interface AnalysisReport {
  id: number;
  title: string;
  icon: React.ReactNode;
  content: string;
  status: 'idle' | 'loading' | 'completed' | 'error';
}

// --- Constants ---

const ANALYSIS_STEPS = [
  { id: 1, title: "业务理解 (Business Understanding)", icon: <Building2 className="w-5 h-5" />, prompt: (c: CompanyInfo) => `用简单术语解释公司业务、解决的问题、付费者和选择原因。避免财务术语。公司：${c.name} (${c.ticker})，行业：${c.industry}` },
  { id: 2, title: "收入分解 (Revenue Breakdown)", icon: <PieChart className="w-5 h-5" />, prompt: (c: CompanyInfo) => `分解收入流，哪些增长哪些放缓，依赖度。公司：${c.name} (${c.ticker})` },
  { id: 3, title: "行业背景 (Industry Background)", icon: <Globe className="w-5 h-5" />, prompt: (c: CompanyInfo) => `解释行业，市场状态，长期趋势利弊。公司：${c.name} (${c.ticker})，行业：${c.industry}` },
  { id: 4, title: "竞争格局 (Competitive Landscape)", icon: <Users className="w-5 h-5" />, prompt: (c: CompanyInfo) => `列竞争对手，比较定价、产品、规模、护城河，突出赢输。公司：${c.name} (${c.ticker})` },
  { id: 5, title: "财务质量 (Financial Quality)", icon: <BarChart3 className="w-5 h-5" />, prompt: (c: CompanyInfo) => `分析收入增长一致性、利润率、债务、现金流、资本配置。公司：${c.name} (${c.ticker})` },
  { id: 6, title: "风险与下跌 (Risks & Downside)", icon: <ShieldAlert className="w-5 h-5" />, prompt: (c: CompanyInfo) => `识别最大风险：业务、财务、监管、永久损害。公司：${c.name} (${c.ticker})` },
  { id: 7, title: "管理层与执行 (Management & Execution)", icon: <Briefcase className="w-5 h-5" />, prompt: (c: CompanyInfo) => `评估团队历史表现和决策对股东利益。公司：${c.name} (${c.ticker})` },
  { id: 8, title: "牛熊情景 (Bull/Bear Scenarios)", icon: <LineChart className="w-5 h-5" />, prompt: (c: CompanyInfo) => `列未来3-5年牛熊案，关注基本面。股票：${c.name} (${c.ticker})` },
  { id: 9, title: "估值思考 (Valuation Thoughts)", icon: <Scale className="w-5 h-5" />, prompt: (c: CompanyInfo) => `解释估值看法，关键假设和证明高低估值。公司：${c.name} (${c.ticker})` },
  { id: 10, title: "长期论文 (Long-term Thesis)", icon: <FileText className="w-5 h-5" />, prompt: (c: CompanyInfo) => `形成长期投资论点，为什么好、必须成功什么、错的迹象。公司：${c.name} (${c.ticker})` },
];

// --- Main Component ---

export default function App() {
  const [company, setCompany] = useState<CompanyInfo>({ name: '', ticker: '', industry: '' });
  const [reports, setReports] = useState<AnalysisReport[]>(
    ANALYSIS_STEPS.map(step => ({ ...step, content: '', status: 'idle' }))
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeReportId, setActiveReportId] = useState<number | null>(null);

  const runAnalysis = async () => {
    if (!company.name || !company.ticker) return;

    setIsAnalyzing(true);
    const newReports = reports.map(r => ({ ...r, content: '', status: 'idle' as const }));
    setReports(newReports);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = "gemini-3.1-pro-preview";

    for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
      const step = ANALYSIS_STEPS[i];
      
      setReports(prev => prev.map(r => r.id === step.id ? { ...r, status: 'loading' } : r));
      setActiveReportId(step.id);

      try {
        const response = await ai.models.generateContent({
          model,
          contents: step.prompt(company),
          config: {
            systemInstruction: "你是一位资深的股票分析师和投资专家。请用专业、客观、深入的语气进行分析。如果是中文请求，请用中文回答。保持格式整洁，使用Markdown进行排版。",
          }
        });

        const text = response.text || "未能生成分析内容。";
        setReports(prev => prev.map(r => r.id === step.id ? { ...r, content: text, status: 'completed' } : r));
      } catch (error) {
        console.error(`Error in step ${step.id}:`, error);
        setReports(prev => prev.map(r => r.id === step.id ? { ...r, content: "分析过程中发生错误，请检查 API Key 或网络连接。", status: 'error' } : r));
      }
    }

    setIsAnalyzing(false);
    setActiveReportId(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <TrendingUp className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">StockInsight AI</h1>
          </div>
          <div className="text-xs font-mono text-black/40 uppercase tracking-widest">
            Professional Grade Analysis
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input & Status */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-black/40 mb-4 flex items-center gap-2">
              <Search className="w-4 h-4" />
              公司信息输入
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-black/60 mb-1">公司名称</label>
                <input 
                  type="text"
                  placeholder="例如: 腾讯控股"
                  className="w-full px-4 py-2 bg-[#F9F9F9] border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  value={company.name}
                  onChange={(e) => setCompany(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black/60 mb-1">股票代码</label>
                <input 
                  type="text"
                  placeholder="例如: 0700.HK"
                  className="w-full px-4 py-2 bg-[#F9F9F9] border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  value={company.ticker}
                  onChange={(e) => setCompany(prev => ({ ...prev, ticker: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black/60 mb-1">所属行业</label>
                <input 
                  type="text"
                  placeholder="例如: 互联网/社交媒体"
                  className="w-full px-4 py-2 bg-[#F9F9F9] border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  value={company.industry}
                  onChange={(e) => setCompany(prev => ({ ...prev, industry: e.target.value }))}
                />
              </div>
              <button 
                onClick={runAnalysis}
                disabled={isAnalyzing || !company.name || !company.ticker}
                className={cn(
                  "w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all",
                  isAnalyzing || !company.name || !company.ticker
                    ? "bg-black/5 text-black/20 cursor-not-allowed"
                    : "bg-black text-white hover:bg-black/90 active:scale-[0.98]"
                )}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    正在深度分析...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    开始 10 点深度分析
                  </>
                )}
              </button>
            </div>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-black/40 mb-4">分析进度</h2>
            <div className="space-y-3">
              {reports.map((report) => (
                <div 
                  key={report.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                    activeReportId === report.id ? "bg-black/5 border-black/10" : "bg-transparent border-transparent",
                    report.status === 'completed' ? "text-emerald-600" : ""
                  )}
                  onClick={() => report.status === 'completed' && setActiveReportId(report.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      report.status === 'completed' ? "bg-emerald-50 text-emerald-600" : 
                      report.status === 'loading' ? "bg-black/5 text-black animate-pulse" : "bg-black/5 text-black/20"
                    )}>
                      {report.status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : report.icon}
                    </div>
                    <span className="text-sm font-medium">{report.title.split(' ')[0]}</span>
                  </div>
                  {report.status === 'completed' && <ChevronRight className="w-4 h-4 opacity-40" />}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Content Viewer */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {!isAnalyzing && reports.every(r => r.status === 'idle') ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border border-dashed border-black/10"
              >
                <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mb-6">
                  <BarChart3 className="w-8 h-8 text-black/20" />
                </div>
                <h3 className="text-xl font-semibold mb-2">准备好开始分析了吗？</h3>
                <p className="text-black/40 max-w-md">
                  输入公司名称和股票代码，我们的 AI 将为您生成 10 个维度的深度投资分析报告。
                </p>
              </motion.div>
            ) : (
              <div className="space-y-8">
                {reports.filter(r => r.status !== 'idle').map((report) => (
                  <motion.section 
                    key={report.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    id={`report-${report.id}`}
                    className={cn(
                      "bg-white rounded-3xl p-8 shadow-sm border transition-all",
                      activeReportId === report.id ? "border-black/20 ring-4 ring-black/5" : "border-black/5"
                    )}
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/10">
                        {report.icon}
                      </div>
                      <div>
                        <div className="text-xs font-mono text-black/40 uppercase tracking-widest mb-1">Report 0{report.id}</div>
                        <h2 className="text-2xl font-bold tracking-tight">{report.title}</h2>
                      </div>
                    </div>

                    {report.status === 'loading' ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-4 text-black/40">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <p className="text-sm animate-pulse">正在深度挖掘数据并生成报告...</p>
                      </div>
                    ) : report.status === 'error' ? (
                      <div className="p-6 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-4 text-red-600">
                        <AlertCircle className="w-6 h-6 shrink-0" />
                        <p className="text-sm font-medium">{report.content}</p>
                      </div>
                    ) : (
                      <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-p:text-black/70 prose-li:text-black/70">
                        <Markdown>{report.content}</Markdown>
                      </div>
                    )}
                  </motion.section>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-black/5 text-center text-black/40 text-xs">
        <p>© 2026 StockInsight AI. 投资有风险，入市需谨慎。分析报告仅供参考，不构成投资建议。</p>
      </footer>
    </div>
  );
}
