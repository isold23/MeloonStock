export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { company, question, history = [], contextSummary = "", lang = "zh" } = req.body || {};
    if (!company?.name || !question) {
      return res.status(400).json({ error: "Company and question are required" });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.status(400).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const isEn = lang === "en";
    const historyText = Array.isArray(history)
      ? history.slice(-6).map((m: any) => `${m.role === "user" ? "Investor" : "Analyst"}: ${m.content}`).join("\n\n")
      : "";

    const prompt = isEn
      ? `Subject: ${company.name} (${company.ticker}), Industry: ${company.industry || "General"}\nContext: ${contextSummary.slice(0, 4500)}\n${historyText}\nQuestion: ${question}`
      : `当前研究标的：${company.name} (${company.ticker})，行业：${company.industry || "综合"}\n背景：${contextSummary.slice(0, 4500)}\n${historyText}\n追问：${question}`;

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
                parts: [{ text: isEn ? "Answer in English using Markdown." : "请用简体中文和 Markdown 回答追问。" }],
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

    if (!generatedText) throw lastError || new Error("Follow-up failed");
    return res.status(200).json({ text: generatedText });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Follow-up error" });
  }
}
