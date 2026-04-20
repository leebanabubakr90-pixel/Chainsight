import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Loader2, Trash2 } from "lucide-react";
import { generateSupplyChainReport } from "@/lib/pdfReport";
import { toast } from "@/hooks/use-toast";

export default function Reports() {
  const { activeOrg } = useOrganization();
  const [reports, setReports] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    if (!activeOrg) return;
    const { data } = await supabase.from("reports").select("*").eq("organization_id", activeOrg.id).order("created_at", { ascending: false });
    setReports(data || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [activeOrg?.id]);

  const generate = async () => {
    if (!activeOrg) return;
    setGenerating(true);
    const [{ data: ships }, { data: bots }] = await Promise.all([
      supabase.from("shipments").select("*").eq("organization_id", activeOrg.id),
      supabase.from("bottlenecks").select("*").eq("organization_id", activeOrg.id),
    ]);
    let summary = "";
    try {
      const { data } = await supabase.functions.invoke("ai-supply-chain", {
        body: { task: "summary", payload: { shipments: (ships || []).slice(0, 30), bottlenecks: bots || [] } },
      });
      summary = typeof data?.result === "string" ? data.result : (data?.result?.raw || "");
    } catch {}
    generateSupplyChainReport({ orgName: activeOrg.name, shipments: ships || [], bottlenecks: bots || [], summary });
    await supabase.from("reports").insert({
      organization_id: activeOrg.id,
      title: `Supply Chain Report — ${new Date().toLocaleDateString()}`,
      report_type: "full",
      summary,
      data: { shipment_count: (ships || []).length, bottleneck_count: (bots || []).length },
    });
    setGenerating(false);
    toast({ title: "Report generated" });
    load();
  };

  const reGenerate = async (r: any) => {
    if (!activeOrg) return;
    const [{ data: ships }, { data: bots }] = await Promise.all([
      supabase.from("shipments").select("*").eq("organization_id", activeOrg.id),
      supabase.from("bottlenecks").select("*").eq("organization_id", activeOrg.id),
    ]);
    generateSupplyChainReport({ orgName: activeOrg.name, shipments: ships || [], bottlenecks: bots || [], summary: r.summary || "" });
  };

  const remove = async (id: string) => {
    await supabase.from("reports").delete().eq("id", id);
    load();
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><FileText className="h-7 w-7 text-primary" />Reports</h1>
          <p className="text-muted-foreground">PDF reports for execs, customers, and audits.</p>
        </div>
        <Button onClick={generate} disabled={generating || !activeOrg}>
          {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
          Generate new report
        </Button>
      </div>

      {reports.length === 0 ? (
        <Card className="p-12 text-center bg-card/60">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No reports yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id} className="p-5 bg-card/60 flex items-center justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-semibold">{r.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()} · {r.report_type}</p>
                {r.summary && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{r.summary}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => reGenerate(r)}><Download className="h-4 w-4 mr-1" />PDF</Button>
                <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}