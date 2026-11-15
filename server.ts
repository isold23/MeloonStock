import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-4-hydrogen",
  "gemini-3.1-flash-lite",
].filter(Boolean) as string[];

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function parseGeminiError(error: any): string {
  let errMsg = "请求 AI 模型失败";
  try {
    if (typeof error?.message === "string") {
      if (error.message.startsWith("{")) {
        const parsed = JSON.parse(error.message);
        errMsg = parsed?.error?.message || error.message;
      } else {
        errMsg = error.message;
      }
    }
  } catch {
    errMsg = error?.message || "请求 AI 模型失败";
  }

  if (errMsg.includes("API key not valid") || errMsg.includes("INVALID_ARGUMENT") || errMsg.includes("PERMISSION_DENIED")) {
    return "Gemini API Key 无效或权限不足。请在设置 (Settings > Secrets) 中配置有效的 GEMINI_API_KEY。";
  }
  if (errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429")) {
    return "API 请求频率暂时达到上限，请稍候片刻再试。";
  }
  return errMsg;
}

async function generateWithFallback(
  ai: GoogleGenAI,
  contents: string,
  config: Record<string, any>
): Promise<{ text: string; model: string }> {
  let lastError: any = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config,
      });
      if (response?.text) {
        return { text: response.text, model: modelName };
      }
    } catch (modelErr: any) {
      lastError = modelErr;
      console.warn(`Model ${modelName} encountered error:`, modelErr?.message || modelErr);
    }
  }
  throw lastError || new Error("未能生成分析内容。");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: "10mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy", timestamp: Date.now() });
  });

  app.get("/api/analyze", (_req, res) => {
    res.json({
      status: "ready",
      endpoint: "/api/analyze",
      method: "POST",
      models: CANDIDATE_MODELS,
    });
  });

  // 1. Single Dimension Deep Analysis
  app.post("/api/analyze", async (req, res) => {
    try {
      const { prompt, depth = "standard", lang = "zh" } = req.body || {};
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const ai = createGeminiClient();
      if (!ai) {
        return res.status(400).json({
          error:
            lang === "en"
              ? "GEMINI_API_KEY is not configured. Please add it in Settings > Secrets."
              : "GEMINI_API_KEY 未配置。请在 AI Studio 的 Settings > Secrets 中配置有效的 Gemini API Key。",
        });
      }

      const isEn = lang === "en";
      const depthInstruction = isEn
        ? depth === "concise"
          ? "Write a crisp, high-density investment memo under 350 words focusing strictly on key takeaways and figures."
          : depth === "institutional"
          ? "Write an institutional buy-side deep-dive unpacking unit economics, quantitative comparisons, and Markdown comparison tables where helpful."
          : "Write a well-structured buy-side equity research section balancing rigor and clarity, using subheadings, bullet points, and Markdown tables where appropriate."
        : depth === "concise"
        ? "请采用精炼高密度的投研备忘录风格，控制在 300-450 字以内，直击关键结论与核心数字。"
        : depth === "institutional"
        ? "请采用机构买方深度研究报告风格，详尽拆解底层商业逻辑、单位经济模型与量化比较，在合适处使用 Markdown 表格对比关键指标。"
        : "请采用结构清晰的买方投研分析风格，兼顾深度与可读性，善用小标题、要点列表和必要的 Markdown 表格。";

      const systemInstruction = isEn
        ? `You are a senior buy-side equity research analyst with 15 years of institutional experience. Respond strictly in English in an objective, analytical, and incisive tone. ${depthInstruction} Avoid generic fluff and anchor claims in business logic.`
        : `你是一位拥有 15 年买方投研经验的资深股票分析师。请严格使用简体中文，以客观、理性、直击本质的专业语气回答。${depthInstruction} 避免空洞套话，给出具备可验证逻辑的分析判断。`;

      const result = await generateWithFallback(ai, prompt, { systemInstruction });
      res.json({ text: result.text, model: result.model });
    } catch (error: any) {
      console.error("Gemini /api/analyze Error:", error);
      res.status(400).json({
        error: parseGeminiError(error),
        status: error?.status || 400,
      });
    }
  });

  // 2. Structured Executive Synthesis & 5-Axis Fundamental Profile
  app.post("/api/synthesize", async (req, res) => {
    try {
      const { company, reportsContext, lang = "zh" } = req.body || {};
      if (!company?.name || !company?.ticker) {
        return res.status(400).json({ error: "Company info is required" });
      }

      const ai = createGeminiClient();
      if (!ai) {
        return res.status(400).json({ error: "GEMINI_API_KEY is not configured." });
      }

      const isEn = lang === "en";
      const prompt = isEn
        ? `Based on the following company profile and generated analysis context, produce a concise buy-side executive synthesis and 5-axis fundamental profile in English.
Company: ${company.name} (${company.ticker})
Industry: ${company.industry || "General"}
${reportsContext ? `\nAnalysis Context:\n${reportsContext.slice(0, 6000)}` : ""}

Return strict JSON with integer scores (1-10) backed by objective fundamental reasoning for these exact 5 axes:
1. Economic Moat
2. Growth Momentum
3. Financial Health
4. Industry Tailwinds
5. Valuation Margin of Safety`
        : `请基于以下公司信息及已完成的分析内容，生成一份高度凝练的买方执行摘要与五维基本面画像（使用简体中文）。
公司名称：${company.name}
股票代码：${company.ticker}
所属行业：${company.industry || "综合"}
${reportsContext ? `\n已生成分析摘要参考：\n${reportsContext.slice(0, 6000)}` : ""}

请严格按 JSON 结构输出，所有评分（1-10分，整数）必须有明确、客观的基本面理由支撑，不可盲目给高分：
1. 商业护城河
2. 成长动能
3. 财务健康
4. 行业景气
5. 估值安全边际`;

      const result = await generateWithFallback(ai, prompt, {
        systemInstruction: isEn
          ? "You are a Chief Investment Officer. Return valid JSON in English."
          : "你是机构投资委员会首席分析师，擅长将复杂基本面提炼为清晰、客观的决策摘要。请用中文返回规范 JSON。",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            oneLineThesis: { type: Type.STRING },
            moatType: { type: Type.STRING },
            dimensions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  score: { type: Type.INTEGER },
                  reason: { type: Type.STRING },
                },
                required: ["label", "score", "reason"],
              },
            },
            bullCatalysts: { type: Type.ARRAY, items: { type: Type.STRING } },
            bearRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
            trackingMetrics: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            "oneLineThesis",
            "moatType",
            "dimensions",
            "bullCatalysts",
            "bearRisks",
            "trackingMetrics",
          ],
        },
      });

      const parsed = JSON.parse(result.text);
      res.json({ synthesis: parsed, model: result.model });
    } catch (error: any) {
      console.error("Gemini /api/synthesize Error:", error);
      res.status(400).json({ error: parseGeminiError(error) });
    }
  });

  // 3. Interactive Follow-up Research Q&A
  app.post("/api/followup", async (req, res) => {
    try {
      const { company, question, history = [], contextSummary = "", lang = "zh" } = req.body || {};
      if (!company?.name || !question) {
        return res.status(400).json({ error: "Company and question are required" });
      }

      const ai = createGeminiClient();
      if (!ai) {
        return res.status(400).json({ error: "GEMINI_API_KEY is not configured." });
      }

      const isEn = lang === "en";
      const historyText =
        Array.isArray(history) && history.length > 0
          ? history
              .slice(-6)
              .map((m: any) => `${m.role === "user" ? "Investor" : "Analyst"}: ${m.content}`)
              .join("\n\n")
          : "";

      const prompt = isEn
        ? `Subject Company: ${company.name} (${company.ticker}), Industry: ${company.industry || "General"}
${contextSummary ? `\nReport Summary Context:\n${contextSummary.slice(0, 4500)}` : ""}
${historyText ? `\nConversation History:\n${historyText}` : ""}

Latest Investor Follow-up Question: ${question}

Answer directly and rigorously in English using clean Markdown (tables where helpful).`
        : `当前研究标的：${company.name} (${company.ticker})，所属行业：${company.industry || "综合"}
${contextSummary ? `\n已有研报背景摘要：\n${contextSummary.slice(0, 4500)}` : ""}
${historyText ? `\n历史对话上下文：\n${historyText}` : ""}

投资者最新追问：${question}

请用简体中文直接针对该问题给出深入、务实、有数据或逻辑支撑的回答，使用 Markdown 排版（如有对比可用表格）。`;

      const result = await generateWithFallback(ai, prompt, {
        systemInstruction: isEn
          ? "You are a senior buy-side sector analyst answering a portfolio manager's follow-up question. Respond in English with precision and depth."
          : "你是一位买方资深行业研究员，正在就特定上市公司的投资细节回答基金经理的追问。回答必须严谨、直截了当、有洞察力。",
      });

      res.json({ text: result.text, model: result.model });
    } catch (error: any) {
      console.error("Gemini /api/followup Error:", error);
      res.status(400).json({ error: parseGeminiError(error) });
    }
  });

  // 4. Side-by-Side Dual-Stock Comparison
  app.post("/api/compare", async (req, res) => {
    try {
      const { companyA, companyB, lang = "zh" } = req.body || {};
      if (!companyA?.name || !companyB?.name) {
        return res.status(400).json({ error: "Two companies are required for comparison" });
      }

      const ai = createGeminiClient();
      if (!ai) {
        return res.status(400).json({ error: "GEMINI_API_KEY is not configured." });
      }

      const isEn = lang === "en";
      const prompt = isEn
        ? `Perform a buy-side side-by-side fundamental comparison in English:
Company A: ${companyA.name} (${companyA.ticker}) - Industry: ${companyA.industry || "General"}
Company B: ${companyB.name} (${companyB.ticker}) - Industry: ${companyB.industry || "General"}

Structure your response in clean Markdown:
1. **Executive Difference Summary**
2. **Comparison Matrix** (Use a Markdown table comparing: Business Model & Unit Economics, Economic Moat, Growth Runway, Financial Quality & FCF, Key Risks, Valuation Attractiveness)
3. **When Does A vs. B Outperform?**
4. **Portfolio Allocation Takeaway & Key Catalysts to Monitor**`
        : `请对以下两家上市公司进行专业买方视角的横向深度对比研究（使用简体中文）：
标的 A：${companyA.name} (${companyA.ticker}) - 行业：${companyA.industry || "综合"}
标的 B：${companyB.name} (${companyB.ticker}) - 行业：${companyB.industry || "综合"}

请按以下结构输出完整 Markdown 对比报告：
1. **核心差异一句话总结**
2. **关键维度对比矩阵**（请务必使用 Markdown 表格，横向对比：商业模式与变现效率、核心护城河、成长空间、财务健康与现金流、核心风险、估值性价比）
3. **谁在什么市场环境下更占优？**（分别阐述选择 A 与选择 B 的前提条件与投资者适配画像）
4. **最终配置建议与关键观察指标**`;

      const result = await generateWithFallback(ai, prompt, {
        systemInstruction: isEn
          ? "You are a portfolio director comparing two equities on relative value and capital allocation priority. Respond in English with clean Markdown tables."
          : "你是一位管理多空股票组合的投资总监，擅长通过横向对比两家公司拆解相对价值与配置优先级。请使用中文和规范 Markdown 表格。",
      });

      res.json({ text: result.text, model: result.model });
    } catch (error: any) {
      console.error("Gemini /api/compare Error:", error);
      res.status(400).json({ error: parseGeminiError(error) });
    }
  });

  app.use("/api", (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("API error middleware caught:", err);
    res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
