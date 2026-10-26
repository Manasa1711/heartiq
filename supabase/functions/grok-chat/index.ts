import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are HeartIQ AI, a warm, precise, evidence-based cardiology assistant inside the HeartIQ patient app.
Rules:
- Always speak in plain, calm English. Avoid jargon unless explaining it.
- Be concise. Use short paragraphs and the occasional bullet list.
- Never diagnose. For anything urgent (chest pain, syncope, severe shortness of breath), tell the user to call emergency services immediately.
- When asked about a result, refer to general ECG knowledge — you do not have access to the patient's actual files.
- You are not a replacement for a doctor. Mention this gently when relevant.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const API_KEY = Deno.env.get("GROQ_API_KEY") ?? Deno.env.get("GROK_API_KEY");
    if (!API_KEY) throw new Error("GROQ_API_KEY not configured");

    const sysWithCtx = context?.page
      ? `${SYSTEM}\n\nUser is currently on page: ${context.page}.`
      : SYSTEM;

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        stream: true,
        messages: [{ role: "system", content: sysWithCtx }, ...messages],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("Groq error", resp.status, t);
      const status = resp.status === 429 || resp.status === 402 ? resp.status : 500;
      return new Response(JSON.stringify({ error: `Groq API error (${resp.status}): ${t.slice(0, 300)}` }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(resp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
