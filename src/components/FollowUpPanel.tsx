import React, { useState } from 'react';
import { Send, Loader2, BookmarkPlus, Check } from 'lucide-react';
import { AppLanguage, CompanyInfo, FollowUpMessage } from '../types/research';
import { FOLLOWUP_SUGGESTIONS } from '../constants/analysisSteps';
import { askFollowUpQuestion } from '../utils/api';
import { MarkdownRenderer } from './MarkdownRenderer';
import { UI_COPY } from '../constants/i18n';

interface FollowUpPanelProps {
  company: CompanyInfo;
  messages: FollowUpMessage[];
  contextSummary: string;
  lang: AppLanguage;
  onAddMessages: (newMsgs: FollowUpMessage[]) => void;
  onSaveToNotes: (snippet: string) => void;
}

export const FollowUpPanel: React.FC<FollowUpPanelProps> = ({
  company,
  messages,
  contextSummary,
  lang,
  onAddMessages,
  onSaveToNotes,
}) => {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const t = UI_COPY[lang];

  const submitQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isSending) return;

    const userMsg: FollowUpMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    setInput('');
    setError(null);
    setIsSending(true);

    try {
      const replyText = await askFollowUpQuestion(company, trimmed, messages, contextSummary, lang);
      const assistantMsg: FollowUpMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: Date.now(),
      };
      onAddMessages([userMsg, assistantMsg]);
    } catch (err: any) {
      setError(err?.message || 'Request failed');
    } finally {
      setIsSending(false);
    }
  };

  const handleBookmark = (msg: FollowUpMessage) => {
    const dateLabel = new Date(msg.timestamp).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN');
    onSaveToNotes(`\n[${t.analystReply}] ${dateLabel}\n${msg.content}`);
    setSavedIds((prev) => ({ ...prev, [msg.id]: true }));
    setTimeout(() => {
      setSavedIds((prev) => ({ ...prev, [msg.id]: false }));
    }, 2000);
  };

  return (
    <section
      id="followup-section"
      className="no-export bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5"
    >
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">{t.followupTitle}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t.followupSubtitle}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FOLLOWUP_SUGGESTIONS[lang].map((q) => (
          <button
            key={q}
            onClick={() => submitQuestion(q)}
            disabled={isSending}
            className="text-left text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-teal-600/50 hover:text-teal-700 dark:hover:text-teal-300 transition-colors disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {messages.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-xl p-4 ${
                msg.role === 'user'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium text-sm'
                  : 'bg-slate-50/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold">
                  {msg.role === 'user' ? t.myQuestion : t.analystReply}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono tabular-nums">
                    {new Date(msg.timestamp).toLocaleTimeString(lang === 'en' ? 'en-US' : 'zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => handleBookmark(msg)}
                      className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 hover:underline font-medium"
                    >
                      {savedIds[msg.id] ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          {t.savedToNotes}
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-3.5 h-3.5" />
                          {t.saveToNotes}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              {msg.role === 'user' ? (
                <p className="leading-relaxed">{msg.content}</p>
              ) : (
                <MarkdownRenderer content={msg.content} />
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitQuestion(input);
        }}
        className="flex flex-col sm:flex-row gap-2.5"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.followupPlaceholder}
          className="flex-1 px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t.sendingFollowup}
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {t.sendFollowup}
            </>
          )}
        </button>
      </form>
    </section>
  );
};
