export default async function handler(_req: any, res: any) {
  res.status(200).json({
    status: "healthy",
    platform: "vercel",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY)
  });
}
