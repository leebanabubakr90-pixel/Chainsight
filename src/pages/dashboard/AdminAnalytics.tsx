import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Loader2, ShieldAlert, Building2, Eye, Users, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Row = {
  organization_id: string;
  organization_name: string;
  is_demo: boolean;
  total_views: number;
  unique_users: number;
  active_30d: number;
  active_7d: number;
  last_activity: string | null;
};

export default function AdminAnalytics() {
  const { isSuperAdmin, loading: roleLoading } = useSuperAdmin();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSuperAdmin) { setLoading(false); return; }
    supabase.rpc("org_dashboard_analytics").then(({ data, error }) => {
      if (!error && data) setRows(data as any);
      setLoading(false);
    });
  }, [isSuperAdmin]);

  if (roleLoading) {
    return <DashboardLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></DashboardLayout>;
  }

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <Card className="p-8 max-w-lg mx-auto text-center">
          <ShieldAlert className="h-10 w-10 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Restricted</h2>
          <p className="text-sm text-muted-foreground">Per-organization analytics are visible to super admins only.</p>
        </Card>
      </DashboardLayout>
    );
  }

  const totals = rows.reduce(
    (acc, r) => {
      acc.views += Number(r.total_views || 0);
      acc.users += Number(r.unique_users || 0);
      acc.active30 += Number(r.active_30d || 0);
      return acc;
    },
    { views: 0, users: 0, active30: 0 }
  );

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Per-organization analytics</h1>
        <p className="text-muted-foreground text-sm">Dashboard usage broken down by company.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2 text-muted-foreground text-xs uppercase tracking-wide">
            Organizations <Building2 className="h-4 w-4" />
          </div>
          <div className="text-3xl font-bold">{rows.length}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2 text-muted-foreground text-xs uppercase tracking-wide">
            Total page views <Eye className="h-4 w-4" />
          </div>
          <div className="text-3xl font-bold">{totals.views.toLocaleString()}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2 text-muted-foreground text-xs uppercase tracking-wide">
            Unique users <Users className="h-4 w-4" />
          </div>
          <div className="text-3xl font-bold">{totals.users.toLocaleString()}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2 text-muted-foreground text-xs uppercase tracking-wide">
            Active (30d) <Activity className="h-4 w-4" />
          </div>
          <div className="text-3xl font-bold">{totals.active30.toLocaleString()}</div>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Unique users</TableHead>
              <TableHead className="text-right">Active 7d</TableHead>
              <TableHead className="text-right">Active 30d</TableHead>
              <TableHead>Last activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No activity yet.</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.organization_id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.organization_name}</span>
                    {r.is_demo && <Badge variant="secondary" className="text-[10px] h-4">Demo</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{Number(r.total_views).toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums">{Number(r.unique_users).toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums">{Number(r.active_7d).toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums">{Number(r.active_30d).toLocaleString()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.last_activity ? formatDistanceToNow(new Date(r.last_activity), { addSuffix: true }) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </DashboardLayout>
  );
}
