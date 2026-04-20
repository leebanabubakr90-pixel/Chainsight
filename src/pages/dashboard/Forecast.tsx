import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart, CartesianGrid } from "recharts";
import { toast } from "@/hooks/use-toast";

export default function Forecast() {
  const { activeOrg } = useOrganization();
  const [product, setProduct] = useState("Electronics");
  const [region, setRegion] = useState("North America");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    if (!activeOrg) return;
    setLoading(true);
    setResult(null);
    // Build dummy history from existing shipments
    const { data: ships } = await supabase.from("shipments").select("units, departed_at").eq("organization_id", activeOrg.id);
    const history = (ships || []).map((s: any) => Number(s.units || 0)).slice(-12);

    const { data, error } = await supabase.functions.invoke("ai-supply-chain", {
      body: { task: "forecast", payload: { product, region, history } },
    });
    setLoading(false);
    if (error || !data?.result) {
      toast({ title: "Forecast failed", description: error?.message || "Try again", variant: "destructive" });
      return;
    }
    setResult(data.result);
    // Persist
    await supabase.from("forecasts").insert({
      organization_id: activeOrg.id,
      product, region,
      horizon_weeks: 12,
      predictions: data.result.predictions || [],
      confidence: data.result.confidence || 0,
      insights: data.result.insights || "",
    });
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2"><TrendingUp className="h-7 w-7 text-primary" />Demand Forecast</h1>
        <p className="text-muted-foreground">AI-powered predictions for the next 12 weeks.</p>
      </div>

      <Card className="p-6 mb-6 bg-card/60">
        <div className="grid md:grid-cols-3 gap-4 items-end">
          <div><Label>Product</Label><Input value={product} onChange={(e) => setProduct(e.target.value)} /></div>
          <div><Label>Region</Label><Input value={region} onChange={(e) => setRegion(e.target.value)} /></div>
          <Button onClick={run} disabled={loading || !activeOrg} className="shadow-[var(--shadow-glow)]">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate forecast
          </Button>
        </div>
      </Card>

      {result && (
        <>
          <Card className="p-6 mb-5 bg-card/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">12-week prediction</h3>
              <Badge variant="outline" className="border-primary/40 text-primary">Confidence: {result.confidence}%</Badge>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={result.predictions}>
                <defs>
                  <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(174, 90%, 50%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(174, 90%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 32%, 17%)" />
                <XAxis dataKey="week" stroke="hsl(215, 20%, 65%)" fontSize={11} />
                <YAxis stroke="hsl(215, 20%, 65%)" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(222, 40%, 9%)", border: "1px solid hsl(217, 32%, 17%)", borderRadius: 8 }} />
                <Area dataKey="high" stroke="none" fill="url(#band)" />
                <Area dataKey="low" stroke="none" fill="hsl(222, 47%, 6%)" />
                <Line type="monotone" dataKey="units" stroke="hsl(174, 90%, 50%)" strokeWidth={3} dot={{ fill: "hsl(174, 100%, 65%)", r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          {result.insights && (
            <Card className="p-6 bg-gradient-to-br from-primary/10 to-card border-primary/20">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h4 className="font-semibold mb-1">AI insights</h4>
                  <p className="text-sm text-muted-foreground">{result.insights}</p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </DashboardLayout>
  );
}