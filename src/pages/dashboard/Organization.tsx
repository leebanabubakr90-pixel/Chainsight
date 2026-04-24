import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Plus, Users, Sparkles, Loader2, Mail, UserPlus, Trash2, ShieldCheck, Clock, IdCard, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { seedDemoData } from "@/lib/demoData";

export default function OrganizationPage() {
  const { user } = useAuth();
  const { activeOrg, orgs, refresh, setActiveOrg } = useOrganization();
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [myRole, setMyRole] = useState<"admin" | "member" | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [staffOpen, setStaffOpen] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!activeOrg) return;
    const { data: rows } = await supabase
      .from("organization_members")
      .select("id, role, user_id, created_at")
      .eq("organization_id", activeOrg.id);
    const memberList = rows || [];
    // Hydrate profiles separately (no FK relationship in schema)
    const userIds = memberList.map((m) => m.user_id);
    let profilesById: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      profilesById = Object.fromEntries((profs || []).map((p) => [p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url }]));
    }
    setMembers(memberList.map((m) => ({ ...m, profile: profilesById[m.user_id] || null })));
    const me = memberList.find((m) => m.user_id === user?.id);
    setMyRole((me?.role as "admin" | "member") || null);
  }, [activeOrg?.id, user?.id]);

  const loadInvites = useCallback(async () => {
    if (!activeOrg) return;
    const { data } = await supabase
      .from("organization_invitations")
      .select("id, email, role, status, created_at")
      .eq("organization_id", activeOrg.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setInvites(data || []);
  }, [activeOrg?.id]);

  const loadStaff = useCallback(async () => {
    if (!activeOrg) return;
    const { data } = await supabase
      .from("staff_details")
      .select("*")
      .eq("organization_id", activeOrg.id)
      .order("created_at", { ascending: false });
    setStaff(data || []);
  }, [activeOrg?.id]);

  useEffect(() => {
    loadMembers();
    loadInvites();
    loadStaff();
  }, [loadMembers, loadInvites, loadStaff]);

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

  const invite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeOrg || !inviteEmail.trim()) return;
    setInviting(true);
    const { data, error } = await supabase.rpc("invite_org_member", {
      _org_id: activeOrg.id,
      _email: inviteEmail.trim(),
      _role: inviteRole,
    });
    setInviting(false);
    if (error) {
      toast({ title: "Couldn't invite", description: error.message, variant: "destructive" });
      return;
    }
    const result = String(data);
    if (result === "added") {
      toast({ title: "Member added", description: `${inviteEmail} now has access.` });
    } else if (result === "invited") {
      toast({ title: "Invitation pending", description: `${inviteEmail} will join when they sign up.` });
    } else if (result === "already_member") {
      toast({ title: "Already a member", description: `${inviteEmail} is in this organization.` });
    }
    setInviteEmail("");
    setInviteRole("member");
    await Promise.all([loadMembers(), loadInvites()]);
  };

  const changeRole = async (memberUserId: string, role: "admin" | "member") => {
    if (!activeOrg) return;
    const { error } = await supabase.rpc("set_member_role", {
      _org_id: activeOrg.id, _user_id: memberUserId, _role: role,
    });
    if (error) { toast({ title: "Couldn't update role", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Role updated" });
    loadMembers();
  };

  const removeMember = async (memberUserId: string) => {
    if (!activeOrg) return;
    const { error } = await supabase.rpc("remove_org_member", {
      _org_id: activeOrg.id, _user_id: memberUserId,
    });
    if (error) { toast({ title: "Couldn't remove", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Member removed" });
    loadMembers();
  };

  const cancelInvite = async (id: string) => {
    const { error } = await supabase.from("organization_invitations").delete().eq("id", id);
    if (error) { toast({ title: "Couldn't cancel", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Invitation cancelled" });
    loadInvites();
  };

  const loadDemo = async () => {
    if (!activeOrg) return;
    setSeeding(true);
    await seedDemoData(activeOrg.id);
    setSeeding(false);
    toast({ title: "Demo data loaded", description: "Sample shipments and bottlenecks added." });
  };

  const isAdmin = myRole === "admin";

  const addStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeOrg || !user) return;
    const f = new FormData(e.currentTarget);
    const payload = {
      organization_id: activeOrg.id,
      full_name: String(f.get("full_name") || "").trim(),
      email: String(f.get("email") || "").trim() || null,
      phone: String(f.get("phone") || "").trim() || null,
      id_number: String(f.get("id_number") || "").trim() || null,
      position: String(f.get("position") || "").trim() || null,
      notes: String(f.get("notes") || "").trim() || null,
      added_by: user.id,
    };
    if (!payload.full_name) return;
    const { error } = await supabase.from("staff_details").insert(payload);
    if (error) { toast({ title: "Couldn't add", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Staff added", description: payload.full_name });
    setStaffOpen(false);
    loadStaff();
  };

  const removeStaff = async (id: string) => {
    const { error } = await supabase.from("staff_details").delete().eq("id", id);
    if (error) { toast({ title: "Couldn't remove", description: error.message, variant: "destructive" }); return; }
    loadStaff();
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
          {isAdmin && !activeOrg.is_demo && (
            <Card className="p-6 mb-5 bg-card/60">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Invite a teammate</h3>
              </div>
              <form onSubmit={invite} className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[220px]">
                  <Label className="text-xs">Email address</Label>
                  <Input
                    type="email"
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="w-36">
                  <Label className="text-xs">Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "member")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={inviting}>
                  {inviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send invite
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-3">
                Existing accounts are added immediately. New emails get a pending invite that activates the moment they sign up. Email delivery requires a verified sender domain — until then, share the signup link with them directly.
              </p>
            </Card>
          )}

          {isAdmin && !activeOrg.is_demo && (
            <Card className="p-6 mb-5 bg-card/60">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <IdCard className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Staff already at the company</h3>
                  <Badge variant="outline">{staff.length}</Badge>
                </div>
                <Dialog open={staffOpen} onOpenChange={setStaffOpen}>
                  <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" /> Add staff record</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add staff details</DialogTitle></DialogHeader>
                    <form onSubmit={addStaff} className="space-y-3">
                      <div><Label>Full name</Label><Input name="full_name" required maxLength={120} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Email (optional)</Label><Input name="email" type="email" maxLength={255} /></div>
                        <div><Label>Phone</Label><Input name="phone" maxLength={40} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>ID / Passport #</Label><Input name="id_number" maxLength={60} /></div>
                        <div><Label>Position</Label><Input name="position" maxLength={80} /></div>
                      </div>
                      <div><Label>Notes</Label><Input name="notes" maxLength={500} /></div>
                      <Button type="submit" className="w-full">Save staff record</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-xs text-muted-foreground mb-3">For staff already on-site, capture their details directly instead of sending email invites.</p>
              {staff.length === 0 ? (
                <p className="text-sm text-muted-foreground">No staff records yet.</p>
              ) : (
                <div className="space-y-2">
                  {staff.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-md bg-background/40 border border-border/60 gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{s.full_name} {s.position && <span className="text-muted-foreground">· {s.position}</span>}</div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                          {s.email && <span><Mail className="h-3 w-3 inline mr-1" />{s.email}</span>}
                          {s.phone && <span><Phone className="h-3 w-3 inline mr-1" />{s.phone}</span>}
                          {s.id_number && <span><IdCard className="h-3 w-3 inline mr-1" />{s.id_number}</span>}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeStaff(s.id)} aria-label="Remove"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {invites.length > 0 && isAdmin && (
            <Card className="p-6 mb-5 bg-card/60">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-warning" />
                <h3 className="text-lg font-semibold">Pending invitations</h3>
                <Badge variant="outline">{invites.length}</Badge>
              </div>
              <div className="space-y-2">
                {invites.map((i) => (
                  <div key={i.id} className="flex items-center justify-between p-3 rounded-md bg-background/40 border border-border/60">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{i.email}</div>
                        <div className="text-xs text-muted-foreground">Invited {new Date(i.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{i.role}</Badge>
                      <Button size="icon" variant="ghost" onClick={() => cancelInvite(i.id)} aria-label="Cancel invite">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

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
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-md bg-background/40 border border-border/60 gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold shrink-0">
                        {(m.profile?.display_name || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{m.profile?.display_name || "Member"}</div>
                        <div className="text-xs text-muted-foreground">{m.user_id === user?.id ? "You" : "Teammate"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin && m.user_id !== user?.id ? (
                        <Select value={m.role} onValueChange={(v) => changeRole(m.user_id, v as "admin" | "member")}>
                          <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={m.role === "admin" ? "default" : "secondary"}>
                          {m.role === "admin" && <ShieldCheck className="h-3 w-3 mr-1" />}
                          {m.role}
                        </Badge>
                      )}
                      {isAdmin && m.user_id !== user?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label="Remove member"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove member?</AlertDialogTitle>
                              <AlertDialogDescription>
                                They will lose access to {activeOrg.name} immediately. You can re-invite them later.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeMember(m.user_id)}>Remove</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!isAdmin && (
              <p className="text-xs text-muted-foreground mt-4">
                Only admins can invite or change roles. Contact an admin if you need to add someone.
              </p>
            )}
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