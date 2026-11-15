export async function onRequestPost(context: any) {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => ({}));
    const { company, reportsContext, lang = "zh" } = body || {};

    if (!company?.name || !company?.ticker) {
      return new Response(JSON.stringify({ error: "Company info is required" }), {
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
      ? `Based on the following company profile and generated analysis context, produce a concise buy-side executive synthesis and 5-axis fundamental profile in English.
Company: ${company.name} (${company.ticker})
Industry: ${company.industry || "General"}
${reportsContext ? `\nAnalysis Context:\n${reportsContext.slice(0, 6000)}` : ""}

Return strict JSON with integer scores (1-10) for these 5 axes: Economic Moat, Growth Momentum, Financial Health, Industry Tailwinds, Valuation Margin of Safety.`
      : `请基于以下公司信息及已完成的分析内容，生成一份高度凝练的买方执行摘要与五维基本面画像（简体中文）。
公司名称：${company.name}
股票代码：${company.ticker}
所属行业：${company.industry || "综合"}
${reportsContext ? `\n已生成分析摘要参考：\n${reportsContext.slice(0, 6000)}` : ""}

请严格按 JSON 结构输出，所有评分（1-10分，整数）必须有明确基本面理由支撑：商业护城河、成长动能、财务健康、行业景气、估值安全边际。`;

    const candidateModels = [env?.GEMINI_MODEL, "gemini-4-hydrogen", "gemini-3.1-flash-lite"].filter(Boolean);
    let parsed: any = null;
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
              systemInstruction: {
                parts: [
                  {
                    text: isEn
                      ? "You are a Chief Investment Officer. Return valid JSON in English."
                      : "你是机构投资委员会首席分析师，请用中文返回规范 JSON。",
                  },
                ],
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

        if (!res.ok) throw new Error(`Model ${model} returned ${res.status}: ${await res.text()}`);
        const data: any = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          parsed = JSON.parse(text);
          usedModel = model;
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!parsed) throw lastError || new Error("Synthesis failed");
    return new Response(JSON.stringify({ synthesis: parsed, model: usedModel }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Synthesis error" }), {
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
