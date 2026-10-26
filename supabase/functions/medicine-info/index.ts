import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { medicine } = await req.json();
    if (!medicine || typeof medicine !== "string") {
      return new Response(JSON.stringify({ error: "medicine required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const GROK_API_KEY = Deno.env.get("GROK_API_KEY");
    if (!GROK_API_KEY) throw new Error("GROK_API_KEY not configured");

    const prompt = `Return a JSON object describing the cardiac medicine "${medicine}" with EXACTLY this shape and nothing else:
{
  "name": string,
  "generic": string,
  "class": string,
  "what_it_is": string (2-3 plain English sentences),
  "uses": string[] (3-5 items),
  "side_effects": { "common": string[], "serious": string[], "rare": string[] },
  "do_not_use": string[] (contraindications, 3-5 items),
  "dosage": [{ "group": string, "dose": string }] (3-4 rows),
  "alternatives": string[] (3-5 alternative drug names)
}
Return ONLY valid JSON, no markdown, no code fences.`;

    const resp = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROK_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "grok-2-latest",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a clinical pharmacology assistant. Be accurate and concise. Always include the safety reminder that this is informational only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("Grok error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { error: "Parse failed", raw: content }; }
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
