import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Plus, Users, Sparkles, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { seedDemoData } from "@/lib/demoData";

export default function OrganizationPage() {
  const { user } = useAuth();
  const { activeOrg, orgs, refresh, setActiveOrg } = useOrganization();
  const [members, setMembers] = useState<any[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!activeOrg) return;
    supabase
      .from("organization_members")
      .select("id, role, user_id, profiles:profiles(display_name, avatar_url)")
      .eq("organization_id", activeOrg.id)
      .then(({ data }) => setMembers(data || []));
  }, [activeOrg?.id]);

  const createOrg = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") || "").trim();
    if (!name) return;
    const { data: org, error } = await supabase
      .from("organizations")
      .insert({ name, created_by: user.id, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") })
      .select().single();
    if (error || !org) { toast({ title: "Failed", description: error?.message, variant: "destructive" }); return; }
    await supabase.from("organization_members").insert({ organization_id: org.id, user_id: user.id, role: "admin" });
    toast({ title: "Organization created", description: name });
    setOpen(false);
    await refresh();
    setActiveOrg(org as any);
  };

  const loadDemo = async () => {
    if (!activeOrg) return;
    setSeeding(true);
    await seedDemoData(activeOrg.id);
    setSeeding(false);
    toast({ title: "Demo data loaded", description: "Sample shipments and bottlenecks added." });
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Building2 className="h-7 w-7 text-primary" />Organization</h1>
          <p className="text-muted-foreground">Manage your workspaces and team.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New organization</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create organization</DialogTitle></DialogHeader>
            <form onSubmit={createOrg} className="space-y-3">
              <div><Label>Organization name</Label><Input name="name" required placeholder="Acme Logistics" /></div>
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        {orgs.map((o) => (
          <Card key={o.id} className={`p-5 cursor-pointer transition-all bg-card/60 ${activeOrg?.id === o.id ? "border-primary shadow-[var(--shadow-glow)]" : "hover:border-border"}`}
            onClick={() => setActiveOrg(o)}>
            <div className="flex items-start justify-between mb-3">
              <Building2 className="h-6 w-6 text-primary" />
              {o.is_demo && <Badge variant="secondary">Demo</Badge>}
              {activeOrg?.id === o.id && !o.is_demo && <Badge>Active</Badge>}
            </div>
            <h3 className="font-semibold">{o.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">{o.slug}</p>
          </Card>
        ))}
      </div>

      {activeOrg && (
        <>
          <Card className="p-6 mb-5 bg-card/60">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><h3 className="text-lg font-semibold">Members of {activeOrg.name}</h3></div>
              <Badge variant="outline">{members.length} member{members.length !== 1 && "s"}</Badge>
            </div>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members loaded.</p>
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-md bg-background/40 border border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold">
                        {(m.profiles?.display_name || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{m.profiles?.display_name || "Member"}</div>
                        <div className="text-xs text-muted-foreground">{m.user_id === user?.id ? "You" : "Teammate"}</div>
                      </div>
                    </div>
                    <Badge variant={m.role === "admin" ? "default" : "secondary"}>{m.role}</Badge>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              Invite teammates by sharing your sign-up link — once they create an account, you can add them via the organization (multi-user invite UI coming soon).
            </p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-primary/5 to-card border-primary/20">
            <div className="flex items-start gap-3">
              <Sparkles className="h-6 w-6 text-primary mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Load sample data</h3>
                <p className="text-sm text-muted-foreground mb-4">Populate this organization with realistic shipments and bottlenecks to explore every feature.</p>
                <Button onClick={loadDemo} disabled={seeding}>
                  {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Seed sample data
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}