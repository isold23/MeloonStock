export async function onRequestPost(context: any) {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => ({}));
    const { company, question, history = [], contextSummary = "", lang = "zh" } = body || {};

    if (!company?.name || !question) {
      return new Response(JSON.stringify({ error: "Company and question are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const apiKey = env?.GEMINI_API_KEY || (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : "");
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY 未配置。" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
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
${historyText ? `\nHistory:\n${historyText}` : ""}

Follow-up Question: ${question}`
      : `当前研究标的：${company.name} (${company.ticker})，所属行业：${company.industry || "综合"}
${contextSummary ? `\n已有研报背景摘要：\n${contextSummary.slice(0, 4500)}` : ""}
${historyText ? `\n历史对话上下文：\n${historyText}` : ""}

投资者最新追问：${question}`;

    const candidateModels = [env?.GEMINI_MODEL, "gemini-4-hydrogen", "gemini-3.1-flash-lite"].filter(Boolean);
    let generatedText = "";
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "aistudio-build" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              systemInstruction: {
                parts: [
                  {
                    text: isEn
                      ? "You are a senior buy-side sector analyst answering a follow-up question in English with clean Markdown."
                      : "你是一位买方资深行业研究员，正在就特定上市公司的投资细节回答基金经理的追问，使用简体中文和 Markdown 排版。",
                  },
                ],
              },
            }),
          }
        );

        if (!res.ok) throw new Error(`Model ${model} returned ${res.status}: ${await res.text()}`);
        const data: any = await res.json();
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
    return new Response(JSON.stringify({ text: generatedText }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Follow-up error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
