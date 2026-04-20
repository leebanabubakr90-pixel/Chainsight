import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Send, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Which shipments are most at risk this week?",
  "Summarize my supply chain in 3 bullets.",
  "What's the typical delay on the Shanghai → New York route?",
  "How can I reduce freight cost by 10%?",
];

export default function Assistant() {
  const { activeOrg } = useOrganization();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming || !activeOrg || !user) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setStreaming(true);

    // Build context
    const { data: ships } = await supabase.from("shipments").select("tracking_code,product,origin,destination,status,eta,risk_score").eq("organization_id", activeOrg.id).limit(15);
    const contextMsg = `Context — current shipments (latest 15): ${JSON.stringify(ships || [])}`;
    const apiMessages = [{ role: "system" as const, content: contextMsg }, ...next];

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-supply-chain`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ task: "chat", messages: apiMessages }),
      });
      if (resp.status === 429) { toast({ title: "Rate limit hit", description: "Please slow down.", variant: "destructive" }); setStreaming(false); return; }
      if (resp.status === 402) { toast({ title: "Credits exhausted", description: "Add credits in Workspace > Usage.", variant: "destructive" }); setStreaming(false); return; }
      if (!resp.ok || !resp.body) throw new Error("Stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      let done = false;
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(json);
            const delta = p.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((m) => m.map((msg, i) => i === m.length - 1 ? { ...msg, content: acc } : msg));
            }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
    } catch (e: any) {
      toast({ title: "AI error", description: e.message, variant: "destructive" });
    }
    setStreaming(false);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2"><MessageSquare className="h-7 w-7 text-primary" />AI Assistant</h1>
        <p className="text-muted-foreground">Ask anything about your supply chain.</p>
      </div>

      <Card className="bg-card/60 flex flex-col h-[calc(100vh-260px)]">
        <div ref={scrollRef} className="flex-1 overflow-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="h-10 w-10 text-primary mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">How can I help?</h3>
              <p className="text-sm text-muted-foreground mb-6">I have access to your live shipment data.</p>
              <div className="grid md:grid-cols-2 gap-2 max-w-2xl mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)}
                    className="text-left text-sm px-4 py-3 rounded-lg border border-border bg-background/40 hover:border-primary/50 hover:bg-primary/5 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 border border-border/60"
              }`}>
                {m.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none [&>*]:my-1.5">
                    <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{m.content}</p>
                )}
              </div>
            </div>
          ))}
          {streaming && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start"><div className="bg-secondary/60 px-4 py-3 rounded-2xl"><Loader2 className="h-4 w-4 animate-spin" /></div></div>
          )}
        </div>
        <div className="p-4 border-t border-border">
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about shipments, routes, forecasts…" disabled={streaming} />
            <Button type="submit" disabled={streaming || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </DashboardLayout>
  );
}