export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.status(400).json({
        error: "环境变量中未配置 GEMINI_API_KEY。请在部署平台的 Environment Variables 中添加 GEMINI_API_KEY。"
      });
    }

    const candidateModels = [
      process.env.GEMINI_MODEL,
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
        const fetchRes = await fetch(apiUrl, {
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

        if (!fetchRes.ok) {
          const errBody = await fetchRes.text();
          throw new Error(`Model ${model} returned ${fetchRes.status}: ${errBody}`);
        }

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

    if (!generatedText) {
      throw lastError || new Error("未能生成分析内容。");
    }

    return res.status(200).json({ text: generatedText });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "AI 分析服务异常" });
  }
}
