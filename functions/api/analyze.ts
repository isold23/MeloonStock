export async function onRequestPost(context: any) {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => ({}));
    const prompt = body?.prompt;
    const depth = body?.depth || "standard";
    const lang = body?.lang || "zh";

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const apiKey = env?.GEMINI_API_KEY || (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : "");
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return new Response(
        JSON.stringify({
          error:
            lang === "en"
              ? "GEMINI_API_KEY is not configured in Cloudflare Pages Environment variables."
              : "Cloudflare Pages 环境变量中未配置 GEMINI_API_KEY。请在控制台 Settings -> Environment variables 中添加 GEMINI_API_KEY。",
        }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const isEn = lang === "en";
    const depthInstruction = isEn
      ? depth === "concise"
        ? "Write a crisp investment memo under 350 words focusing on key takeaways."
        : depth === "institutional"
        ? "Write an institutional buy-side deep-dive unpacking unit economics and Markdown comparison tables."
        : "Write a well-structured buy-side equity research section using subheadings, bullets, and Markdown tables where appropriate."
      : depth === "concise"
      ? "请采用精炼高密度的投研备忘录风格，控制在 300-450 字以内，直击关键结论与核心数字。"
      : depth === "institutional"
      ? "请采用机构买方深度研究报告风格，详尽拆解底层商业逻辑、单位经济模型与量化比较，在合适处使用 Markdown 表格对比关键指标。"
      : "请采用结构清晰的买方投研分析风格，兼顾深度与可读性，善用小标题、要点列表和必要的 Markdown 表格。";

    const systemText = isEn
      ? `You are a senior buy-side equity research analyst with 15 years of institutional experience. Respond strictly in English in an objective, analytical tone. ${depthInstruction}`
      : `你是一位拥有 15 年买方投研经验的资深股票分析师。请严格使用简体中文，以客观、理性、直击本质的专业语气回答。${depthInstruction}`;

    const candidateModels = [env?.GEMINI_MODEL, "gemini-4-hydrogen", "gemini-3.1-flash-lite"].filter(Boolean);
    let generatedText = "";
    let usedModel = "";
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
              systemInstruction: { parts: [{ text: systemText }] },
            }),
          }
        );

        if (!res.ok) throw new Error(`Model ${model} returned ${res.status}: ${await res.text()}`);
        const data: any = await res.json();
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

    if (!generatedText) throw lastError || new Error("Failed to generate content.");

    return new Response(JSON.stringify({ text: generatedText, model: usedModel }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "AI service error" }), {
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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
