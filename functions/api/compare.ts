export async function onRequestPost(context: any) {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => ({}));
    const { companyA, companyB, lang = "zh" } = body || {};

    if (!companyA?.name || !companyB?.name) {
      return new Response(JSON.stringify({ error: "Two companies are required" }), {
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
    const prompt = isEn
      ? `Perform a buy-side side-by-side fundamental comparison in English:
Company A: ${companyA.name} (${companyA.ticker}) - Industry: ${companyA.industry || "General"}
Company B: ${companyB.name} (${companyB.ticker}) - Industry: ${companyB.industry || "General"}

Structure with Markdown table: Executive Difference Summary, Comparison Matrix, Outperformance Scenarios, Allocation Takeaway.`
      : `请对以下两家上市公司进行专业买方视角的横向深度对比研究（简体中文）：
标的 A：${companyA.name} (${companyA.ticker}) - 行业：${companyA.industry || "综合"}
标的 B：${companyB.name} (${companyB.ticker}) - 行业：${companyB.industry || "综合"}

请按以下结构输出完整 Markdown 对比报告：
1. **核心差异一句话总结**
2. **关键维度对比矩阵**（使用 Markdown 表格）
3. **谁在什么市场环境下更占优？**
4. **最终配置建议与关键观察指标**`;

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
                      ? "You are a portfolio director comparing two equities in English with Markdown tables."
                      : "你是一位管理多空股票组合的投资总监，擅长横向对比两家公司拆解相对价值。请使用中文和规范 Markdown 表格。",
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

    if (!generatedText) throw lastError || new Error("Comparison failed");
    return new Response(JSON.stringify({ text: generatedText }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Comparison error" }), {
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
