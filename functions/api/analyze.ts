export async function onRequestPost(context: any) {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => ({}));
    const prompt = body?.prompt;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    const apiKey = env?.GEMINI_API_KEY || (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : "");
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return new Response(
        JSON.stringify({
          error: "Cloudflare Pages 环境变量中未配置 GEMINI_API_KEY。请在 Cloudflare Pages 控制台 (Settings -> Environment variables) 中添加生产环境变量 GEMINI_API_KEY。"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    const candidateModels = [
      env?.GEMINI_MODEL,
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
      "gemini-2.5-flash",
      "gemini-1.5-flash"
    ].filter(Boolean);

    let generatedText = "";
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "aistudio-build"
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: {
              parts: [{ text: "你是一位资深的股票分析师和投资专家。请用专业、客观、深入的语气进行分析。如果是中文请求，请用中文回答。保持格式整洁，使用Markdown进行排版。" }]
            }
          })
        });

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`Model ${model} returned ${res.status}: ${errBody}`);
        }

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

    if (!generatedText) {
      throw lastError || new Error("未能生成分析内容。");
    }

    return new Response(JSON.stringify({ text: generatedText }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error?.message || "AI 分析服务异常，请稍后重试"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
