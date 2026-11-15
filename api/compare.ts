export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { companyA, companyB, lang = "zh" } = req.body || {};
    if (!companyA?.name || !companyB?.name) {
      return res.status(400).json({ error: "Two companies are required" });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.status(400).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const isEn = lang === "en";
    const prompt = isEn
      ? `Compare side-by-side in English with Markdown table:\nCompany A: ${companyA.name} (${companyA.ticker})\nCompany B: ${companyB.name} (${companyB.ticker})`
      : `请横向深度对比以下两家公司（简体中文，含 Markdown 表格）：\n标的 A：${companyA.name} (${companyA.ticker})\n标的 B：${companyB.name} (${companyB.ticker})`;

    const candidateModels = [process.env.GEMINI_MODEL, "gemini-4-hydrogen", "gemini-3.1-flash-lite"].filter(Boolean);
    let generatedText = "";
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
                parts: [{ text: isEn ? "Compare equities in English with Markdown tables." : "请用简体中文和规范 Markdown 表格对比公司。" }],
              },
            }),
          }
        );
        if (!fetchRes.ok) throw new Error(await fetchRes.text());
        const data: any = await fetchRes.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          generatedText = text;
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!generatedText) throw lastError || new Error("Comparison failed");
    return res.status(200).json({ text: generatedText });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Comparison error" });
  }
}
