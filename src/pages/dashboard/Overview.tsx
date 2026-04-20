import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, TrendingUp, AlertTriangle, DollarSign, ArrowUpRight, Sparkles, Loader2, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area, BarChart, Bar, CartesianGrid } from "recharts";
import { generateSupplyChainReport } from "@/lib/pdfReport";
import { toast } from "@/hooks/use-toast";

export default function Overview() {
  const { activeOrg } = useOrganization();
  const [shipments, setShipments] = useState<any[]>([]);
  const [bottlenecks, setBottlenecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    if (!activeOrg) return;
    setLoading(true);
    Promise.all([
      supabase.from("shipments").select("*").eq("organization_id", activeOrg.id),
      supabase.from("bottlenecks").select("*").eq("organization_id", activeOrg.id).eq("resolved", false),
    ]).then(([s, b]) => {
      setShipments(s.data || []);
      setBottlenecks(b.data || []);
      setLoading(false);
    });
  }, [activeOrg?.id]);

  const stats = {
    total: shipments.length,
    inTransit: shipments.filter((s) => s.status === "in_transit").length,
    delayed: shipments.filter((s) => s.status === "delayed").length,
    spend: shipments.reduce((sum, s) => sum + (Number(s.cost) || 0), 0),
  };

  // Group shipments by week for chart
  const weekly = (() => {
    const buckets: Record<string, number> = {};
    shipments.forEach((s) => {
      if (!s.departed_at) return;
      const d = new Date(s.departed_at);
      const key = `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleString("en", { month: "short" })}`;
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.entries(buckets).slice(-8).map(([week, count]) => ({ week, count }));
  })();

  const statusBreakdown = [
    { name: "In transit", value: stats.inTransit, color: "hsl(174, 90%, 50%)" },
    { name: "Delayed", value: stats.delayed, color: "hsl(0, 84%, 60%)" },
    { name: "Delivered", value: shipments.filter((s) => s.status === "delivered").length, color: "hsl(142, 71%, 45%)" },
    { name: "Pending", value: shipments.filter((s) => s.status === "pending").length, color: "hsl(215, 20%, 65%)" },
  ];

  const handleReport = async () => {
    setGeneratingReport(true);
    try {
      let summary = "";
      try {
        const { data } = await supabase.functions.invoke("ai-supply-chain", {
          body: { task: "summary", payload: { shipments: shipments.slice(0, 30), bottlenecks } },
        });
        summary = typeof data?.result === "string" ? data.result : (data?.result?.raw || "");
      } catch {}
      generateSupplyChainReport({
        orgName: activeOrg?.name || "Organization",
        shipments,
        bottlenecks,
        summary,
      });
      // Save report metadata
      await supabase.from("reports").insert({
        organization_id: activeOrg!.id,
        title: `Supply Chain Report — ${new Date().toLocaleDateString()}`,
        report_type: "overview",
        summary,
        data: { stats, count: shipments.length },
      });
      toast({ title: "Report generated", description: "PDF downloaded and saved to Reports." });
    } catch (e: any) {
      toast({ title: "Report failed", description: e.message, variant: "destructive" });
    }
    setGeneratingReport(false);
  };

  if (!activeOrg) {
    return (
      <DashboardLayout>
        <Card className="p-12 text-center">
          <h2 className="text-xl font-semibold mb-2">No organization selected</h2>
          <p className="text-muted-foreground mb-6">Create your organization to start tracking shipments.</p>
          <Link to="/dashboard/organization"><Button>Create organization</Button></Link>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold">Operations Overview</h1>
            {activeOrg.is_demo && <Badge variant="secondary">Demo data</Badge>}
          </div>
          <p className="text-muted-foreground">Real-time view of {activeOrg.name}'s supply chain.</p>
        </div>
        <Button onClick={handleReport} disabled={generatingReport || loading}>
          {generatingReport ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
          Generate PDF Report
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active shipments", value: stats.total, icon: Package, color: "text-primary" },
          { label: "In transit", value: stats.inTransit, icon: TrendingUp, color: "text-accent" },
          { label: "Delayed", value: stats.delayed, icon: AlertTriangle, color: "text-destructive" },
          { label: "Total spend", value: `$${(stats.spend / 1000).toFixed(1)}k`, icon: DollarSign, color: "text-success" },
        ].map((s) => (
          <Card key={s.label} className="p-5 bg-card/60">
            <div className="flex items-start justify-between mb-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        <Card className="lg:col-span-2 p-6 bg-card/60">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Weekly shipment volume</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={weekly}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(174, 90%, 50%)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(174, 90%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 32%, 17%)" />
              <XAxis dataKey="week" stroke="hsl(215, 20%, 65%)" fontSize={11} />
              <YAxis stroke="hsl(215, 20%, 65%)" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(222, 40%, 9%)", border: "1px solid hsl(217, 32%, 17%)", borderRadius: 8 }} />
              <Area type="monotone" dataKey="count" stroke="hsl(174, 90%, 50%)" fill="url(#g1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6 bg-card/60">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Status breakdown</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={statusBreakdown} layout="vertical">
              <XAxis type="number" stroke="hsl(215, 20%, 65%)" fontSize={11} />
              <YAxis dataKey="name" type="category" stroke="hsl(215, 20%, 65%)" fontSize={11} width={70} />
              <Tooltip contentStyle={{ background: "hsl(222, 40%, 9%)", border: "1px solid hsl(217, 32%, 17%)", borderRadius: 8 }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {statusBreakdown.map((s) => <Bar key={s.name} dataKey="value" fill={s.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6 bg-card/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h3 className="text-lg font-semibold">Active bottlenecks</h3>
          </div>
          <Link to="/dashboard/bottlenecks" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : bottlenecks.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">No active bottlenecks. Run AI detection from the Bottlenecks page.</div>
        ) : (
          <div className="space-y-3">
            {bottlenecks.slice(0, 3).map((b) => (
              <div key={b.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-background/40">
                <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={b.severity === "high" ? "destructive" : b.severity === "medium" ? "default" : "secondary"} className="text-[10px]">
                      {b.severity}
                    </Badge>
                    <span className="font-medium text-sm">{b.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}