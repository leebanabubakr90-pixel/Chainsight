import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { seedDemoData } from "@/lib/demoData";
import { Sparkles, Play, ArrowRight, Loader2, Package, TrendingUp, Route, AlertTriangle, MessageSquare, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const TOUR_STEPS = [
  { icon: Package, title: "1. Track shipments", desc: "Browse 24+ pre-loaded shipments across global routes." },
  { icon: TrendingUp, title: "2. Forecast demand", desc: "Generate a 12-week AI prediction with one click." },
  { icon: Route, title: "3. Optimize routes", desc: "Get AI route recommendations for any origin/destination." },
  { icon: AlertTriangle, title: "4. Detect bottlenecks", desc: "Run AI scans to surface risks before they hit." },
  { icon: MessageSquare, title: "5. Ask the AI", desc: "Chat with your supply chain in plain English." },
  { icon: FileText, title: "6. Export PDF reports", desc: "One-click branded reports for stakeholders." },
];

export default function Demo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [demoOrg, setDemoOrg] = useState<any>(null);

  useEffect(() => {
    supabase.from("organizations").select("*").eq("is_demo", true).limit(1).maybeSingle()
      .then(({ data }) => setDemoOrg(data));
  }, []);

  const launchDemo = async () => {
    setLoading(true);
    if (!user) {
      // Anonymous — bounce to signup with note
      toast({ title: "Quick sign-up needed", description: "Create a free account to enter the demo (no card required)." });
      navigate("/auth?mode=signup");
      return;
    }
    // Ensure a demo org exists
    let org = demoOrg;
    if (!org) {
      const { data } = await supabase.from("organizations").insert({
        name: "ChainSight Demo Co.",
        slug: "demo",
        is_demo: true,
        created_by: user.id,
      }).select().single();
      org = data;
      setDemoOrg(org);
    }
    // Add user as member if not yet
    await supabase.from("organization_members").insert({
      organization_id: org.id,
      user_id: user.id,
      role: "member",
    }).select();
    // Seed demo data
    await seedDemoData(org.id);
    localStorage.setItem(`active_org_${user.id}`, org.id);
    localStorage.setItem("show_tour", "1");
    setLoading(false);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen">
      <PublicNav />
      <section className="pt-32 pb-16">
        <div className="container max-w-5xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              <Sparkles className="h-3 w-3 mr-1.5" /> Live Demo
            </Badge>
            <h1 className="text-5xl font-bold mb-4 tracking-tight">Practice with real-world data.</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Spin up a demo workspace pre-loaded with 24 shipments, active bottlenecks, and a guided tour. Practice as often as you like — the data resets every time.
            </p>
          </div>

          <Card className="p-8 md:p-10 mb-10 bg-gradient-to-br from-primary/10 via-card to-accent/10 border-primary/30 text-center">
            <Play className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-3">Ready in under 5 seconds</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              {user ? "We'll seed fresh demo data and walk you through every feature." : "Free account required — takes 10 seconds to create."}
            </p>
            <Button size="lg" onClick={launchDemo} disabled={loading} className="shadow-[var(--shadow-elevated)]">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {user ? "Launch demo workspace" : "Create account & enter demo"} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOUR_STEPS.map((s) => (
              <Card key={s.title} className="p-5 bg-card/60 hover:border-primary/40 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12 text-sm text-muted-foreground">
            Already exploring? <Link to="/dashboard" className="text-primary hover:underline">Open your dashboard</Link>
          </div>
        </div>
      </section>
    </div>
  );
}