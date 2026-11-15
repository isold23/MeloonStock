import {
  AnalysisDepth,
  AppLanguage,
  CompanyInfo,
  ExecutiveSynthesis,
  FollowUpMessage,
} from '../types/research';

async function postJson<T>(
  endpoint: string,
  payload: unknown,
  options?: { retries?: number; delay?: number; signal?: AbortSignal }
): Promise<T> {
  const retries = options?.retries ?? 3;
  const delay = options?.delay ?? 1400;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (options?.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: options?.signal,
      });

      if (!res.ok) {
        let errorText = '';
        try {
          const errJson = await res.json();
          errorText = errJson.error || errJson.message || `HTTP ${res.status}`;
        } catch {
          if (res.status === 405) {
            errorText =
              'HTTP 405 (Method Not Allowed): Static hosting cannot handle POST /api/analyze. Ensure Cloudflare Pages functions/ directory is deployed with GEMINI_API_KEY.';
          } else if (res.status === 502 || res.status === 503 || res.status === 504) {
            errorText = `Backend connecting (HTTP ${res.status}), retrying automatically`;
          } else {
            errorText = `HTTP ${res.status}: ${res.statusText || 'Request failed'}`;
          }
        }
        throw new Error(errorText);
      }

      return (await res.json()) as T;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw error;
      }

      const errMessage = error?.message || '';
      const isTransient =
        !errMessage.includes('405') &&
        !errMessage.includes('GEMINI_API_KEY') &&
        (errMessage.includes('429') ||
          errMessage.includes('503') ||
          errMessage.includes('502') ||
          errMessage.includes('504') ||
          errMessage.includes('Backend connecting') ||
          errMessage.includes('RESOURCE_EXHAUSTED') ||
          errMessage.includes('UNAVAILABLE') ||
          errMessage.includes('Failed to fetch') ||
          errMessage.includes('NetworkError') ||
          errMessage.includes('network'));

      if (isTransient && attempt < retries) {
        const backoff = delay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }
      throw error;
    }
  }

  throw new Error('Request timed out after retries. Please try again.');
}

export async function analyzeDimension(
  prompt: string,
  stepId: number,
  depth: AnalysisDepth,
  lang: AppLanguage,
  signal?: AbortSignal
): Promise<string> {
  const data = await postJson<{ text?: string }>(
    '/api/analyze',
    { prompt, stepId, depth, lang },
    { signal }
  );
  return data.text || '';
}

export async function synthesizeExecutiveBrief(
  company: CompanyInfo,
  reportsContext: string,
  lang: AppLanguage,
  signal?: AbortSignal
): Promise<ExecutiveSynthesis> {
  const data = await postJson<{ synthesis: ExecutiveSynthesis }>(
    '/api/synthesize',
    { company, reportsContext, lang },
    { retries: 2, signal }
  );
  return data.synthesis;
}

export async function askFollowUpQuestion(
  company: CompanyInfo,
  question: string,
  history: FollowUpMessage[],
  contextSummary: string,
  lang: AppLanguage
): Promise<string> {
  const data = await postJson<{ text?: string }>(
    '/api/followup',
    { company, question, history, contextSummary, lang },
    { retries: 2 }
  );
  return data.text || '';
}

export async function compareTwoCompanies(
  companyA: CompanyInfo,
  companyB: CompanyInfo,
  lang: AppLanguage
): Promise<string> {
  const data = await postJson<{ text?: string }>(
    '/api/compare',
    { companyA, companyB, lang },
    { retries: 2 }
  );
  return data.text || '';
}
