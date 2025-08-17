// netlify/functions/translate.js
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "POST, OPTIONS" }, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }
  try {
    const { text, sourceLang = "auto", targetLang = "中文", model = "gpt-4.1-mini", customKey } = JSON.parse(event.body || "{}");
    if (!text || !text.trim()) return { statusCode: 400, body: JSON.stringify({ error: "Missing text" }) };
    const apiKey = (customKey && customKey.trim()) || process.env.OPENAI_API_KEY;
    if (!apiKey) return { statusCode: 400, body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }) };
    const systemPrompt = [
      "You are a professional, faithful, and concise translator.",
      `Translate the user's text ${sourceLang === "auto" ? "(auto-detect source language)" : "from " + sourceLang} to ${targetLang}.`,
      "Preserve meaning, tone, domain terms, punctuation, line breaks, markdown/code blocks and inline formatting.",
      "Do NOT add explanations—return only the translated text."
    ].join(" ");
    const body = { model, temperature: 0.2, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: text }] };
    const resp = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, body: JSON.stringify(body) });
    if (!resp.ok) { const err = await resp.text(); return { statusCode: resp.status, body: JSON.stringify({ error: err || `OpenAI HTTP ${resp.status}` }) }; }
    const data = await resp.json();
    const translation = data?.choices?.[0]?.message?.content?.trim() || "";
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ translation }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message || "Server error" }) };
  }
};
