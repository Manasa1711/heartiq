import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a professional pharmacist and medical information assistant. When given a medicine name, return ONLY a valid JSON object with no markdown, no code fences, no extra text. The JSON must have exactly these fields: { name: string, category: string, description: string, uses: string[], sideEffects: string[], dosage: { adult: string, child: string, elderly: string }, warnings: string[], contraindications: string[], interactions: { drug: string, severity: 'Low'|'Medium'|'High', effect: string }[], alternatives: string[], storageInstructions: string, pregnancySafety: string }`;

function cleanJson(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1) t = t.slice(first, last + 1);
  return t;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { medicineName } = await req.json();
    if (!medicineName || typeof medicineName !== "string") {
      return new Response(JSON.stringify({ error: "medicineName required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const API_KEY = Deno.env.get("GROQ_API_KEY") ?? Deno.env.get("GROK_API_KEY");
    if (!API_KEY) throw new Error("GROQ_API_KEY not configured");

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1500,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Medicine: ${medicineName}` },
        ],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("Groq error", resp.status, t);
      return new Response(JSON.stringify({ error: `AI error (${resp.status}): ${t.slice(0, 300)}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanJson(content));
    } catch (err) {
      console.error("parse fail", err, content.slice(0, 300));
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("groq-medicine error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
