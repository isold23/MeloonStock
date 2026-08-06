import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API route for Gemini stock analysis
  app.post("/api/analyze", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        return res.status(400).json({ 
          error: "GEMINI_API_KEY 未配置或为占位符。请在 AI Studio 的设置 (Settings) 中添加或更新有效的 Gemini API Key。" 
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: "你是一位资深的股票分析师和投资专家。请用专业、客观、深入的语气进行分析。如果是中文请求，请用中文回答。保持格式整洁，使用Markdown进行排版。",
        }
      });

      const text = response.text || "未能生成分析内容。";
      res.json({ text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      let errMsg = error?.message || "请求 AI 模型失败";
      if (typeof errMsg === "string" && (errMsg.includes("API key not valid") || errMsg.includes("INVALID_ARGUMENT"))) {
        errMsg = "Gemini API Key 无效。请在 AI Studio 设置 (Settings) 中配置有效的 GEMINI_API_KEY。";
      }
      res.status(400).json({ 
        error: errMsg,
        status: error?.status || 400
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
