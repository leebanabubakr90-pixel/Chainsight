import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Loader2, Sparkles, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const sevColor: Record<string, string> = {
  high: "destructive", medium: "default", low: "secondary",
};

export default function Bottlenecks() {
  const { activeOrg } = useOrganization();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!activeOrg) return;
    const { data } = await supabase.from("bottlenecks").select("*").eq("organization_id", activeOrg.id).order("detected_at", { ascending: false });
    setItems(data || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [activeOrg?.id]);

  const detect = async () => {
    if (!activeOrg) return;
    setLoading(true);
    const { data: ships } = await supabase.from("shipments").select("tracking_code, product, origin, destination, carrier, status, eta, risk_score").eq("organization_id", activeOrg.id).limit(30);
    const { data, error } = await supabase.functions.invoke("ai-supply-chain", {
      body: { task: "bottlenecks", payload: { shipments: ships || [] } },
    });
    if (error || !data?.result?.bottlenecks) {
      toast({ title: "Detection failed", description: error?.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const newOnes = (data.result.bottlenecks as any[]).map((b) => ({
      organization_id: activeOrg.id,
      severity: b.severity || "medium",
      category: b.category,
      title: b.title,
      description: b.description,
      suggested_action: b.suggested_action,
    }));
    if (newOnes.length) await supabase.from("bottlenecks").insert(newOnes);
    toast({ title: "AI scan complete", description: `Found ${newOnes.length} new bottleneck(s).` });
    setLoading(false);
    load();
  };

  const resolve = async (id: string) => {
    await supabase.from("bottlenecks").update({ resolved: true }).eq("id", id);
    load();
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><AlertTriangle className="h-7 w-7 text-warning" />Bottlenecks</h1>
          <p className="text-muted-foreground">AI-detected risks in your active operation.</p>
        </div>
        <Button onClick={detect} disabled={loading || !activeOrg}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Run AI detection
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center bg-card/60">
          <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No bottlenecks yet. Run AI detection to scan your shipments.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <Card key={b.id} className={`p-5 bg-card/60 ${b.resolved ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant={sevColor[b.severity] as any}>{b.severity}</Badge>
                    {b.category && <Badge variant="outline">{b.category}</Badge>}
                    {b.resolved && <Badge variant="secondary">resolved</Badge>}
                    <span className="text-xs text-muted-foreground ml-auto">{new Date(b.detected_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{b.description}</p>
                  {b.suggested_action && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/20">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-sm"><span className="font-medium">Suggested action: </span>{b.suggested_action}</p>
                    </div>
                  )}
                </div>
                {!b.resolved && (
                  <Button size="sm" variant="outline" onClick={() => resolve(b.id)}>
                    <Check className="h-4 w-4 mr-1" />Resolve
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}