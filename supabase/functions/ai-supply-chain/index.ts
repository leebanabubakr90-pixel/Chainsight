import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are ChainSight, an expert AI supply chain analyst.
You help logistics teams predict demand, optimize routes, and detect bottlenecks before they cause delays.
Be concise, data-driven, and actionable. Use bullet points for recommendations.
When given shipment context, ground every recommendation in that data.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { task, payload, messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let userPrompt = "";
    let stream = false;
    let chatMessages: any[] = [];

    if (task === "chat") {
      stream = true;
      chatMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...(messages || []),
      ];
    } else if (task === "forecast") {
      const { product, region, history } = payload || {};
      userPrompt = `Generate a 12-week demand forecast for product "${product}" in region "${region}".
Recent shipment history (units per week): ${JSON.stringify(history || [])}.
Return ONLY valid JSON: {"predictions":[{"week":1,"units":number,"low":number,"high":number}, ...12 entries], "confidence": 0-100, "insights":"2-3 sentence narrative"}`;
      chatMessages = [
        { role: "system", content: SYSTEM_PROMPT + " Respond ONLY with valid JSON, no markdown fences." },
        { role: "user", content: userPrompt },
      ];
    } else if (task === "route") {
      const { origin, destination, mode, constraints } = payload || {};
      userPrompt = `Recommend an optimized route from ${origin} to ${destination} (mode: ${mode || "any"}).
Constraints: ${constraints || "balance cost and speed"}.
Return ONLY valid JSON: {"path":["leg1","leg2",...], "estimated_days": number, "estimated_cost": number_usd, "reasoning":"why this route is optimal"}`;
      chatMessages = [
        { role: "system", content: SYSTEM_PROMPT + " Respond ONLY with valid JSON, no markdown fences." },
        { role: "user", content: userPrompt },
      ];
    } else if (task === "bottlenecks") {
      const { shipments } = payload || {};
      userPrompt = `Analyze these shipments and detect bottlenecks/risks:
${JSON.stringify(shipments || [])}
Return ONLY valid JSON: {"bottlenecks":[{"severity":"low|medium|high","category":string,"title":string,"description":string,"suggested_action":string}, ...up to 5]}`;
      chatMessages = [
        { role: "system", content: SYSTEM_PROMPT + " Respond ONLY with valid JSON, no markdown fences." },
        { role: "user", content: userPrompt },
      ];
    } else if (task === "summary") {
      const { shipments, bottlenecks } = payload || {};
      userPrompt = `Write a 4-6 sentence executive summary of supply chain status given:
Shipments: ${JSON.stringify((shipments || []).slice(0, 30))}
Bottlenecks: ${JSON.stringify(bottlenecks || [])}
Highlight risks, opportunities, and one prioritized action.`;
      chatMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ];
    } else {
      return new Response(JSON.stringify({ error: "Unknown task" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: chatMessages,
        stream,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || "";
    // strip ```json fences if present
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: any = text;
    if (task !== "summary") {
      try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    }
    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-supply-chain error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});