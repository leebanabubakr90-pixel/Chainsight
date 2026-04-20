import { supabase } from "@/integrations/supabase/client";

const PRODUCTS = ["Electronics", "Apparel", "Pharma", "Auto Parts", "Food & Beverage", "Industrial"];
const ORIGINS = ["Shanghai, CN", "Rotterdam, NL", "Los Angeles, US", "Hamburg, DE", "Singapore, SG", "Mumbai, IN"];
const DESTINATIONS = ["New York, US", "London, UK", "Sydney, AU", "Tokyo, JP", "São Paulo, BR", "Dubai, AE"];
const CARRIERS = ["Maersk", "MSC", "DHL", "FedEx", "Hapag-Lloyd"];
const STATUSES = ["pending", "in_transit", "delayed", "delivered", "in_transit", "in_transit"];
const MODES = ["sea", "air", "rail", "road"];

const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export async function seedDemoData(orgId: string, count = 24) {
  // Clear existing demo shipments to keep it fresh
  await supabase.from("shipments").delete().eq("organization_id", orgId);
  await supabase.from("bottlenecks").delete().eq("organization_id", orgId);

  const shipments = Array.from({ length: count }, () => {
    const status = rand(STATUSES);
    const departed = new Date(Date.now() - Math.random() * 30 * 24 * 3600 * 1000);
    const eta = new Date(departed.getTime() + (5 + Math.random() * 25) * 24 * 3600 * 1000);
    const risk = status === "delayed" ? 60 + Math.random() * 40 : Math.random() * 40;
    return {
      organization_id: orgId,
      tracking_code: "SCX-" + Math.random().toString(36).slice(2, 9).toUpperCase(),
      product: rand(PRODUCTS),
      origin: rand(ORIGINS),
      destination: rand(DESTINATIONS),
      carrier: rand(CARRIERS),
      mode: rand(MODES),
      status,
      units: Math.floor(50 + Math.random() * 950),
      cost: Math.floor(2000 + Math.random() * 48000),
      departed_at: departed.toISOString(),
      eta: eta.toISOString(),
      delivered_at: status === "delivered" ? eta.toISOString() : null,
      risk_score: Math.round(risk * 100) / 100,
    };
  });

  await supabase.from("shipments").insert(shipments);

  // Bottlenecks
  const bottlenecks = [
    {
      organization_id: orgId,
      severity: "high",
      category: "Port Congestion",
      title: "Rotterdam port backup",
      description: "12 vessels queued — average wait time exceeded 72h.",
      suggested_action: "Reroute next 3 shipments via Antwerp to avoid 4-day delay.",
    },
    {
      organization_id: orgId,
      severity: "medium",
      category: "Carrier Delay",
      title: "MSC vessel delayed in Suez",
      description: "Mechanical issue affecting 2 active shipments.",
      suggested_action: "Notify customers; offer expedited air freight on critical units.",
    },
    {
      organization_id: orgId,
      severity: "low",
      category: "Weather",
      title: "Storm forecast — North Atlantic",
      description: "Possible 1-2 day delays on US-EU corridor next week.",
      suggested_action: "Build buffer into ETAs for affected shipments.",
    },
  ];
  await supabase.from("bottlenecks").insert(bottlenecks);
}