import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tiny in-memory cache (per-instance, cleared on cold start)
const cache = new Map<string, { at: number; rates: Record<string, number> }>();
const TTL_MS = 30 * 60 * 1000; // 30 minutes

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { base = "USD", symbols = [] } = await req.json().catch(() => ({}));
    const baseUp = String(base).toUpperCase();
    const want: string[] = (Array.isArray(symbols) ? symbols : [])
      .map((s) => String(s).toUpperCase())
      .filter(Boolean);

    const key = baseUp;
    const now = Date.now();
    const hit = cache.get(key);
    let rates: Record<string, number> | null = hit && now - hit.at < TTL_MS ? hit.rates : null;

    if (!rates) {
      // Free, no-key endpoint with daily updates
      const url = `https://open.er-api.com/v6/latest/${baseUp}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`fx upstream ${res.status}`);
      const json = await res.json();
      if (json?.result !== "success" || !json?.rates) throw new Error("fx upstream invalid");
      rates = json.rates as Record<string, number>;
      cache.set(key, { at: now, rates });
    }

    const filtered: Record<string, number> = {};
    if (want.length === 0) {
      Object.assign(filtered, rates);
    } else {
      for (const s of want) if (rates[s]) filtered[s] = rates[s];
    }

    return new Response(JSON.stringify({ base: baseUp, rates: filtered, fetched_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fx-rates error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});