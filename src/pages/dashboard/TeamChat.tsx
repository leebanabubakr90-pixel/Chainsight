import { useEffect, useRef, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MessagesSquare, Send, Trash2 } from "lucide-react";

type Msg = { id: string; user_id: string; content: string; created_at: string; profile?: { display_name: string | null } | null };

export default function TeamChatPage() {
  const { user } = useAuth();
  const { activeOrg } = useOrganization();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hydrate = useCallback(async (rows: any[]) => {
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    if (ids.length === 0) return rows as Msg[];
    const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
    const map = Object.fromEntries((profs || []).map((p) => [p.user_id, { display_name: p.display_name }]));
    return rows.map((r) => ({ ...r, profile: map[r.user_id] || null })) as Msg[];
  }, []);

  const load = useCallback(async () => {
    if (!activeOrg) return;
    const { data } = await supabase
      .from("team_chat_messages")
      .select("id, user_id, content, created_at")
      .eq("organization_id", activeOrg.id)
      .order("created_at", { ascending: true })
      .limit(200);
    const hydrated = await hydrate(data || []);
    setMessages(hydrated);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
  }, [activeOrg?.id, hydrate]);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    if (!activeOrg) return;
    const channel = supabase
      .channel(`team-chat-${activeOrg.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_chat_messages", filter: `organization_id=eq.${activeOrg.id}` },
        async (payload) => {
          const [withProf] = await hydrate([payload.new]);
          setMessages((prev) => prev.some((m) => m.id === withProf.id) ? prev : [...prev, withProf]);
          setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "team_chat_messages", filter: `organization_id=eq.${activeOrg.id}` },
        (payload) => setMessages((prev) => prev.filter((m) => m.id !== (payload.old as any).id))
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeOrg?.id, hydrate]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || !activeOrg || !user) return;
    if (content.length > 2000) { toast({ title: "Too long", description: "Max 2000 chars", variant: "destructive" }); return; }
    setSending(true);
    const { error } = await supabase.from("team_chat_messages").insert({
      organization_id: activeOrg.id, user_id: user.id, content,
    });
    setSending(false);
    if (error) { toast({ title: "Couldn't send", description: error.message, variant: "destructive" }); return; }
    setText("");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("team_chat_messages").delete().eq("id", id);
    if (error) toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
  };

  const initials = (n?: string | null) => (n || "?").slice(0, 2).toUpperCase();

  return (
    <DashboardLayout>
      <div className="mb-5">
        <h1 className="text-3xl font-bold flex items-center gap-2"><MessagesSquare className="h-7 w-7 text-primary" /> Team Chat</h1>
        <p className="text-muted-foreground">Share progress with everyone in {activeOrg?.name || "your organization"}.</p>
      </div>

      <Card className="bg-card/60 flex flex-col h-[70vh]">
        <div ref={scrollRef} className="flex-1 overflow-auto p-5 space-y-3">
          {messages.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-10">No messages yet. Say hi 👋</div>
          )}
          {messages.map((m) => {
            const mine = m.user_id === user?.id;
            return (
              <div key={m.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold shrink-0">
                  {initials(m.profile?.display_name)}
                </div>
                <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  <div className="text-[11px] text-muted-foreground mb-1">
                    {m.profile?.display_name || "Member"} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary rounded-bl-sm"}`}>
                    {m.content}
                  </div>
                  {mine && (
                    <button onClick={() => remove(m.id)} className="text-[10px] text-muted-foreground hover:text-destructive mt-1 flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={send} className="border-t border-border/60 p-3 flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" maxLength={2000} disabled={!activeOrg} />
          <Button type="submit" disabled={sending || !text.trim() || !activeOrg}><Send className="h-4 w-4" /></Button>
        </form>
      </Card>
    </DashboardLayout>
  );
}
