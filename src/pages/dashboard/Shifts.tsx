import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Clock, Plus, Play, Square, CalendarRange, ShieldCheck, Trash2, Pencil } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Member = { user_id: string; role: string; profile?: { display_name: string | null } | null };
type Shift = { id: string; user_id: string; starts_at: string; ends_at: string; role_label: string | null; notes: string | null };
type Clockin = { id: string; user_id: string; shift_id: string | null; clock_in_at: string; clock_out_at: string | null; note: string | null };

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const fmtDur = (a: string, b: string | null) => {
  const ms = (b ? new Date(b) : new Date()).getTime() - new Date(a).getTime();
  const h = Math.floor(ms / 3_600_000); const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
};

export default function ShiftsPage() {
  const { user } = useAuth();
  const { activeOrg } = useOrganization();
  const [members, setMembers] = useState<Member[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [clockins, setClockins] = useState<Clockin[]>([]);
  const [myRole, setMyRole] = useState<"admin" | "member" | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);

  const load = useCallback(async () => {
    if (!activeOrg) return;
    const [{ data: mems }, { data: sh }, { data: cl }] = await Promise.all([
      supabase.from("organization_members").select("user_id, role").eq("organization_id", activeOrg.id),
      supabase.from("shift_schedules").select("*").eq("organization_id", activeOrg.id).order("starts_at", { ascending: false }),
      supabase.from("shift_clockins").select("*").eq("organization_id", activeOrg.id).order("clock_in_at", { ascending: false }).limit(200),
    ]);
    const mm = mems || [];
    const ids = mm.map((m) => m.user_id);
    let profByUser: Record<string, { display_name: string | null }> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
      profByUser = Object.fromEntries((profs || []).map((p) => [p.user_id, { display_name: p.display_name }]));
    }
    setMembers(mm.map((m) => ({ ...m, profile: profByUser[m.user_id] || null })));
    setShifts(sh || []);
    setClockins(cl || []);
    const me = mm.find((m) => m.user_id === user?.id);
    setMyRole((me?.role as "admin" | "member") || null);
  }, [activeOrg?.id, user?.id]);

  useEffect(() => { load(); }, [load]);

  const isAdmin = myRole === "admin";
  const nameOf = (uid: string) => members.find((m) => m.user_id === uid)?.profile?.display_name || "Member";
  const myOpenClockin = clockins.find((c) => c.user_id === user?.id && !c.clock_out_at);

  const clockIn = async () => {
    if (!activeOrg || !user) return;
    // find the staff's current/upcoming shift
    const now = Date.now();
    const current = shifts.find((s) => s.user_id === user.id && new Date(s.starts_at).getTime() <= now + 3_600_000 && new Date(s.ends_at).getTime() >= now - 3_600_000);
    const { error } = await supabase.from("shift_clockins").insert({
      organization_id: activeOrg.id, user_id: user.id, shift_id: current?.id ?? null,
    });
    if (error) { toast({ title: "Couldn't clock in", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Clocked in" });
    load();
  };

  const clockOut = async (id: string) => {
    const { error } = await supabase.from("shift_clockins").update({ clock_out_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast({ title: "Couldn't clock out", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Clocked out" });
    load();
  };

  const saveShift = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeOrg || !user) return;
    const f = new FormData(e.currentTarget);
    const payload = {
      organization_id: activeOrg.id,
      user_id: String(f.get("user_id")),
      starts_at: new Date(String(f.get("starts_at"))).toISOString(),
      ends_at: new Date(String(f.get("ends_at"))).toISOString(),
      role_label: String(f.get("role_label") || "") || null,
      notes: String(f.get("notes") || "") || null,
      created_by: user.id,
    };
    if (new Date(payload.ends_at) <= new Date(payload.starts_at)) {
      toast({ title: "Invalid time", description: "End must be after start", variant: "destructive" });
      return;
    }
    const { error } = editing
      ? await supabase.from("shift_schedules").update(payload).eq("id", editing.id)
      : await supabase.from("shift_schedules").insert(payload);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Shift updated" : "Shift scheduled" });
    setOpen(false); setEditing(null); load();
  };

  const deleteShift = async (id: string) => {
    const { error } = await supabase.from("shift_schedules").delete().eq("id", id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Shift removed" }); load();
  };

  const editClockoutTime = async (id: string, when: string) => {
    const { error } = await supabase.from("shift_clockins").update({ clock_out_at: new Date(when).toISOString() }).eq("id", id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Updated" }); load();
  };

  const deleteClockin = async (id: string) => {
    const { error } = await supabase.from("shift_clockins").delete().eq("id", id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Entry removed" }); load();
  };

  // Helper for datetime-local default
  const toLocal = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Clock className="h-7 w-7 text-primary" /> Shifts</h1>
          <p className="text-muted-foreground">Schedule shifts and track clock-in/out.</p>
        </div>
        <div className="flex items-center gap-2">
          {myOpenClockin ? (
            <Button onClick={() => clockOut(myOpenClockin.id)} variant="destructive">
              <Square className="h-4 w-4 mr-2" /> Clock out ({fmtDur(myOpenClockin.clock_in_at, null)})
            </Button>
          ) : (
            <Button onClick={clockIn}><Play className="h-4 w-4 mr-2" /> Clock in</Button>
          )}
          {isAdmin && (
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button variant="outline"><Plus className="h-4 w-4 mr-2" /> Schedule shift</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editing ? "Edit shift" : "Schedule shift"}</DialogTitle></DialogHeader>
                <form onSubmit={saveShift} className="space-y-3">
                  <div>
                    <Label>Staff member</Label>
                    <Select name="user_id" defaultValue={editing?.user_id} required>
                      <SelectTrigger><SelectValue placeholder="Select a staff member" /></SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>{m.profile?.display_name || "Member"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Hidden fallback so RHF/native captures Select value when uncontrolled */}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Starts</Label>
                      <Input type="datetime-local" name="starts_at" required defaultValue={editing ? toLocal(new Date(editing.starts_at)) : toLocal(new Date(Date.now() + 60 * 60 * 1000))} />
                    </div>
                    <div>
                      <Label>Ends</Label>
                      <Input type="datetime-local" name="ends_at" required defaultValue={editing ? toLocal(new Date(editing.ends_at)) : toLocal(new Date(Date.now() + 9 * 60 * 60 * 1000))} />
                    </div>
                  </div>
                  <div>
                    <Label>Role / area (optional)</Label>
                    <Input name="role_label" defaultValue={editing?.role_label || ""} placeholder="Warehouse A" />
                  </div>
                  <div>
                    <Label>Notes (optional)</Label>
                    <Input name="notes" defaultValue={editing?.notes || ""} />
                  </div>
                  <Button type="submit" className="w-full">{editing ? "Save changes" : "Create shift"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule"><CalendarRange className="h-4 w-4 mr-2" /> Schedule</TabsTrigger>
          <TabsTrigger value="log"><Clock className="h-4 w-4 mr-2" /> Time log</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <Card className="p-5 bg-card/60">
            {shifts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shifts scheduled yet.</p>
            ) : (
              <div className="space-y-2">
                {shifts.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-md bg-background/40 border border-border/60 gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{nameOf(s.user_id)} {s.role_label && <span className="text-muted-foreground">· {s.role_label}</span>}</div>
                      <div className="text-xs text-muted-foreground">{fmt(s.starts_at)} → {fmt(s.ends_at)}</div>
                      {s.notes && <div className="text-xs text-muted-foreground mt-0.5">{s.notes}</div>}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove shift?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteShift(s.id)}>Remove</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="log">
          <Card className="p-5 bg-card/60">
            {!isAdmin && <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground"><ShieldCheck className="h-3 w-3" /> Only admins can edit time entries.</div>}
            {clockins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clock-ins recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {clockins.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-md bg-background/40 border border-border/60 gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{nameOf(c.user_id)}</div>
                      <div className="text-xs text-muted-foreground">In: {fmt(c.clock_in_at)} · Out: {c.clock_out_at ? fmt(c.clock_out_at) : <span className="text-primary">Active</span>}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{fmtDur(c.clock_in_at, c.clock_out_at)}</Badge>
                      {isAdmin && (
                        <>
                          {c.clock_out_at && (
                            <Input
                              type="datetime-local"
                              defaultValue={toLocal(new Date(c.clock_out_at))}
                              className="h-8 w-44"
                              onBlur={(e) => { if (e.target.value) editClockoutTime(c.id, e.target.value); }}
                            />
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" aria-label="Delete entry"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove time entry?</AlertDialogTitle>
                                <AlertDialogDescription>This permanently deletes the record.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteClockin(c.id)}>Remove</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
