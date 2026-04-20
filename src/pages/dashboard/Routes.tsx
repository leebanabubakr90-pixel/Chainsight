import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Route as RouteIcon, Sparkles, ArrowRight, DollarSign, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Routes() {
  const { activeOrg } = useOrganization();
  const [origin, setOrigin] = useState("Shanghai, CN");
  const [destination, setDestination] = useState("New York, US");
  const [mode, setMode] = useState("sea");
  const [constraints, setConstraints] = useState("balance cost and speed; avoid Suez congestion");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    if (!activeOrg) return;
    setLoading(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke("ai-supply-chain", {
      body: { task: "route", payload: { origin, destination, mode, constraints } },
    });
    setLoading(false);
    if (error || !data?.result) {
      toast({ title: "Route optimization failed", description: error?.message, variant: "destructive" });
      return;
    }
    setResult(data.result);
    await supabase.from("routes").insert({
      organization_id: activeOrg.id,
      origin, destination,
      recommended_path: data.result.path || [],
      estimated_days: data.result.estimated_days,
      estimated_cost: data.result.estimated_cost,
      reasoning: data.result.reasoning,
    });
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2"><RouteIcon className="h-7 w-7 text-primary" />Route Optimizer</h1>
        <p className="text-muted-foreground">AI suggests the best path given your constraints.</p>
      </div>

      <Card className="p-6 mb-6 bg-card/60">
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div><Label>Origin</Label><Input value={origin} onChange={(e) => setOrigin(e.target.value)} /></div>
          <div><Label>Destination</Label><Input value={destination} onChange={(e) => setDestination(e.target.value)} /></div>
          <div><Label>Mode</Label><Input value={mode} onChange={(e) => setMode(e.target.value)} placeholder="sea, air, rail, road, multimodal" /></div>
          <div><Label>Constraints</Label><Input value={constraints} onChange={(e) => setConstraints(e.target.value)} /></div>
        </div>
        <Button onClick={run} disabled={loading || !activeOrg} className="shadow-[var(--shadow-glow)]">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Optimize route
        </Button>
      </Card>

      {result && (
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-card border-primary/20">
          <h3 className="text-lg font-semibold mb-4">Recommended route</h3>
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {(result.path || []).map((leg: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <Badge variant="outline" className="border-primary/40 text-primary px-3 py-1.5">{leg}</Badge>
                {i < (result.path || []).length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-background/40 border border-border/60">
              <Clock className="h-6 w-6 text-primary" />
              <div><div className="text-2xl font-bold">{result.estimated_days} days</div><div className="text-xs text-muted-foreground">Estimated transit</div></div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-background/40 border border-border/60">
              <DollarSign className="h-6 w-6 text-success" />
              <div><div className="text-2xl font-bold">${Number(result.estimated_cost || 0).toLocaleString()}</div><div className="text-xs text-muted-foreground">Estimated cost</div></div>
            </div>
          </div>
          {result.reasoning && (
            <div className="flex items-start gap-3 pt-4 border-t border-border/60">
              <Sparkles className="h-5 w-5 text-primary mt-1" />
              <p className="text-sm text-muted-foreground">{result.reasoning}</p>
            </div>
          )}
        </Card>
      )}
    </DashboardLayout>
  );
}