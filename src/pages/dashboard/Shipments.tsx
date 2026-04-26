import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  in_transit: "default", delayed: "destructive", delivered: "secondary", pending: "outline",
};

export default function Shipments() {
  const { activeOrg } = useOrganization();
  const [shipments, setShipments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    if (!activeOrg) return;
    const { data } = await supabase.from("shipments").select("*").eq("organization_id", activeOrg.id).order("created_at", { ascending: false });
    setShipments(data || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [activeOrg?.id]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeOrg) return;
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("shipments").insert({
      organization_id: activeOrg.id,
      tracking_code: String(f.get("tracking") || ""),
      product: String(f.get("product") || ""),
      origin: String(f.get("origin") || ""),
      destination: String(f.get("destination") || ""),
      carrier: String(f.get("carrier") || ""),
      mode: String(f.get("mode") || "sea"),
      units: Number(f.get("units") || 1),
      cost: Number(f.get("cost") || 0),
      status: "pending",
    });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Shipment added" });
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("shipments").delete().eq("id", id);
    load();
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const f = new FormData(e.currentTarget);
    const { error } = await supabase
      .from("shipments")
      .update({
        tracking_code: String(f.get("tracking") || ""),
        product: String(f.get("product") || ""),
        origin: String(f.get("origin") || ""),
        destination: String(f.get("destination") || ""),
        carrier: String(f.get("carrier") || ""),
        mode: String(f.get("mode") || "sea"),
        units: Number(f.get("units") || 1),
        cost: Number(f.get("cost") || 0),
        status: String(f.get("status") || "pending"),
      })
      .eq("id", editing.id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Shipment updated" });
    setEditing(null);
    load();
  };

  const filtered = shipments.filter((s) =>
    [s.tracking_code, s.product, s.origin, s.destination, s.carrier].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Shipments</h1>
          <p className="text-muted-foreground">Track and manage every shipment.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New shipment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add shipment</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tracking code</Label><Input name="tracking" required /></div>
                <div><Label>Product</Label><Input name="product" required /></div>
                <div><Label>Origin</Label><Input name="origin" required placeholder="Shanghai, CN" /></div>
                <div><Label>Destination</Label><Input name="destination" required placeholder="New York, US" /></div>
                <div><Label>Carrier</Label><Input name="carrier" /></div>
                <div><Label>Mode</Label><Input name="mode" defaultValue="sea" /></div>
                <div><Label>Units</Label><Input name="units" type="number" defaultValue={100} /></div>
                <div><Label>Cost (USD)</Label><Input name="cost" type="number" defaultValue={5000} /></div>
              </div>
              <Button type="submit" className="w-full">Create shipment</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4 bg-card/60 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tracking, product, route, carrier…" className="pl-9" />
        </div>
      </Card>

      <Card className="bg-card/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tracking</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Carrier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Risk</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">No shipments yet. Add your first or seed demo data.</TableCell></TableRow>
            )}
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.tracking_code}</TableCell>
                <TableCell>{s.product}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.origin} → {s.destination}</TableCell>
                <TableCell>{s.carrier || "—"}</TableCell>
                <TableCell><Badge variant={statusColor[s.status] || "outline"}>{s.status.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-right">{s.units}</TableCell>
                <TableCell className="text-right">${Number(s.cost || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <span className={Number(s.risk_score) > 60 ? "text-destructive" : Number(s.risk_score) > 30 ? "text-warning" : "text-success"}>
                    {Number(s.risk_score || 0).toFixed(0)}%
                  </span>
                </TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => setEditing(s)}>
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit shipment</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={handleUpdate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tracking code</Label><Input name="tracking" defaultValue={editing.tracking_code} required /></div>
                <div><Label>Product</Label><Input name="product" defaultValue={editing.product} required /></div>
                <div><Label>Origin</Label><Input name="origin" defaultValue={editing.origin} required /></div>
                <div><Label>Destination</Label><Input name="destination" defaultValue={editing.destination} required /></div>
                <div><Label>Carrier</Label><Input name="carrier" defaultValue={editing.carrier || ""} /></div>
                <div><Label>Mode</Label><Input name="mode" defaultValue={editing.mode || "sea"} /></div>
                <div><Label>Units</Label><Input name="units" type="number" defaultValue={editing.units} /></div>
                <div><Label>Cost</Label><Input name="cost" type="number" defaultValue={editing.cost} /></div>
                <div className="col-span-2"><Label>Status</Label><Input name="status" defaultValue={editing.status} placeholder="pending | in_transit | delivered | delayed" /></div>
              </div>
              <Button type="submit" className="w-full">Save changes</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}