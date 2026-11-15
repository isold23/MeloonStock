export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { prompt, depth = "standard", lang = "zh" } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.status(400).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const isEn = lang === "en";
    const depthInstruction = isEn
      ? depth === "concise"
        ? "Write a crisp investment memo under 350 words."
        : depth === "institutional"
        ? "Write an institutional buy-side deep-dive with unit economics and Markdown tables."
        : "Write a well-structured buy-side equity research section."
      : depth === "concise"
      ? "请采用精炼高密度的投研备忘录风格，控制在 300-450 字以内。"
      : depth === "institutional"
      ? "请采用机构买方深度研究报告风格，包含单位经济模型与 Markdown 对比表格。"
      : "请采用结构清晰的买方投研分析风格。";

    const systemText = isEn
      ? `You are a senior buy-side equity research analyst. Respond strictly in English. ${depthInstruction}`
      : `你是一位资深买方股票分析师。请严格使用简体中文。${depthInstruction}`;

    const candidateModels = [process.env.GEMINI_MODEL, "gemini-4-hydrogen", "gemini-3.1-flash-lite"].filter(Boolean);
    let generatedText = "";
    let usedModel = "";
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const fetchRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "aistudio-build" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              systemInstruction: { parts: [{ text: systemText }] },
            }),
          }
        );
        if (!fetchRes.ok) throw new Error(await fetchRes.text());
        const data: any = await fetchRes.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          generatedText = text;
          usedModel = model;
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!generatedText) throw lastError || new Error("Failed to generate content");
    return res.status(200).json({ text: generatedText, model: usedModel });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "AI service error" });
  }
}
