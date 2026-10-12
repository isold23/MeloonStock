export async function onRequestGet(context: any) {
  const hasKey = Boolean(context.env?.GEMINI_API_KEY);
  return new Response(
    JSON.stringify({
      status: "healthy",
      platform: "cloudflare-pages",
      hasApiKey: hasKey
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    }
  );
}
