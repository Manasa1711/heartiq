import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL_URL = "https://haswanth875-heartiq-model.hf.space/predict";

// Proxy to the ConvNeXt FastAPI model running on Hugging Face Spaces.
// Accepts a JSON body { imageUrl: string } and downloads the image
// server-side before forwarding as multipart to the model.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(JSON.stringify({ error: "imageUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the image
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) {
      return new Response(JSON.stringify({ error: "Could not fetch image" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const blob = await imgResp.blob();
    const fileName = imageUrl.split("/").pop() ?? "ecg.png";

    const form = new FormData();
    form.append("file", blob, fileName);

    const modelResp = await fetch(MODEL_URL, {
      method: "POST",
      body: form,
    });

    if (!modelResp.ok) {
      const t = await modelResp.text();
      console.error("Model error", modelResp.status, t);
      return new Response(
        JSON.stringify({ error: `Model error (${modelResp.status}). The model may still be starting — please try again in a moment.` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await modelResp.json();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ecg-predict error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
