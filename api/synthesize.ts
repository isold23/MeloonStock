export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { company, reportsContext, lang = "zh" } = req.body || {};
    if (!company?.name || !company?.ticker) {
      return res.status(400).json({ error: "Company info is required" });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.status(400).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const isEn = lang === "en";
    const prompt = isEn
      ? `Generate a concise buy-side executive synthesis and 5-axis fundamental profile in English for ${company.name} (${company.ticker}), Industry: ${company.industry || "General"}. Context: ${(reportsContext || "").slice(0, 6000)}`
      : `请基于公司信息生成简体中文买方执行摘要与五维基本面画像：${company.name} (${company.ticker})，行业：${company.industry || "综合"}。参考：${(reportsContext || "").slice(0, 6000)}`;

    const candidateModels = [process.env.GEMINI_MODEL, "gemini-4-hydrogen", "gemini-3.1-flash-lite"].filter(Boolean);
    let parsed: any = null;
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
              systemInstruction: {
                parts: [{ text: isEn ? "Return valid JSON in English." : "请用简体中文返回规范 JSON。" }],
              },
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: "OBJECT",
                  properties: {
                    oneLineThesis: { type: "STRING" },
                    moatType: { type: "STRING" },
                    dimensions: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: {
                          label: { type: "STRING" },
                          score: { type: "INTEGER" },
                          reason: { type: "STRING" },
                        },
                        required: ["label", "score", "reason"],
                      },
                    },
                    bullCatalysts: { type: "ARRAY", items: { type: "STRING" } },
                    bearRisks: { type: "ARRAY", items: { type: "STRING" } },
                    trackingMetrics: { type: "ARRAY", items: { type: "STRING" } },
                  },
                  required: ["oneLineThesis", "moatType", "dimensions", "bullCatalysts", "bearRisks", "trackingMetrics"],
                },
              },
            }),
          }
        );

        if (!fetchRes.ok) throw new Error(await fetchRes.text());
        const data: any = await fetchRes.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          parsed = JSON.parse(text);
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!parsed) throw lastError || new Error("Synthesis failed");
    return res.status(200).json({ synthesis: parsed });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Synthesis error" });
  }
}
