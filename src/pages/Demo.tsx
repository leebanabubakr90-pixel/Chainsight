import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { seedDemoData } from "@/lib/demoData";
import {
  Sparkles, Play, ArrowRight, Loader2, Package, TrendingUp,
  Route, AlertTriangle, MessageSquare, FileText,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const DEMO_EMAIL = "demo@chainsight.com";
const DEMO_PASSWORD = "password123";

const TOUR_STEPS = [
  { icon: Package, title: "1. Track shipments", desc: "Browse 24+ pre-loaded shipments across global routes." },
  { icon: TrendingUp, title: "2. Forecast demand", desc: "Generate a 12-week AI prediction with one click." },
  { icon: Route, title: "3. Optimize routes", desc: "Get AI route recommendations for any origin/destination." },
  { icon: AlertTriangle, title: "4. Detect bottlenecks", desc: "Run AI scans to surface risks before they hit." },
  { icon: MessageSquare, title: "5. Ask the AI", desc: "Chat with your supply chain in plain English." },
  { icon: FileText, title: "6. Export PDF reports", desc: "One-click branded reports for stakeholders." },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Demo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [demoOrg, setDemoOrg] = useState<any>(null);
  const [typedEmail, setTypedEmail] = useState("");
  const [typedPassword, setTypedPassword] = useState("");
  const [phase, setPhase] = useState<"idle" | "typing-email" | "typing-password" | "signing-in" | "seeding">("idle");
  const startedRef = useRef(false);

  useEffect(() => {
    supabase.from("organizations").select("*").eq("is_demo", true).limit(1).maybeSingle()
      .then(({ data }) => setDemoOrg(data));
  }, []);

  const ensureDemoUser = async () => {
    // Try sign-in first
    let { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    if (!error) return true;
    // If invalid credentials, attempt to create the demo account, then sign in
    const { error: signUpErr } = await supabase.auth.signUp({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: "Demo Explorer" },
      },
    });
    if (signUpErr && !signUpErr.message.toLowerCase().includes("registered")) {
      toast({ title: "Demo unavailable", description: signUpErr.message, variant: "destructive" });
      return false;
    }
    // Try sign-in again (works if email confirmation is off, or user already exists)
    const retry = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    if (retry.error) {
      // Fallback: signUp returns a session when confirmation is disabled — check current session
      const { data: sess } = await supabase.auth.getSession();
      if (sess.session) return true;
      toast({
        title: "Demo needs one-time setup",
        description: "Please confirm the demo email or contact support@chainsight.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const typeInto = async (
    text: string,
    setter: (v: string) => void,
    perChar = 55,
  ) => {
    setter("");
    for (let i = 1; i <= text.length; i++) {
      setter(text.slice(0, i));
      await sleep(perChar);
    }
  };

  const launchDemo = async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setLoading(true);

    // If already signed in, skip the typing animation
    if (!user) {
      setPhase("typing-email");
      await typeInto(DEMO_EMAIL, setTypedEmail);
      await sleep(180);
      setPhase("typing-password");
      await typeInto(DEMO_PASSWORD, setTypedPassword);
      await sleep(220);
      setPhase("signing-in");
      const ok = await ensureDemoUser();
      if (!ok) {
        setLoading(false);
        startedRef.current = false;
        setPhase("idle");
        return;
      }
    }

    setPhase("seeding");
    // Re-fetch the active user id (may have just signed in)
    const { data: sessData } = await supabase.auth.getSession();
    const uid = sessData.session?.user.id;
    if (!uid) {
      toast({ title: "Demo error", description: "Could not establish demo session.", variant: "destructive" });
      setLoading(false);
      startedRef.current = false;
      return;
    }

    // Ensure a demo org exists
    let org = demoOrg;
    if (!org) {
      const { data } = await supabase.from("organizations").insert({
        name: "ChainSight Demo Co.",
        slug: "demo",
        is_demo: true,
        created_by: uid,
      }).select().single();
      org = data;
    }
    if (org) {
      await supabase.from("organization_members").insert({
        organization_id: org.id,
        user_id: uid,
        role: "member",
      }).select();
      await seedDemoData(org.id);
      localStorage.setItem(`active_org_${uid}`, org.id);
    }
    localStorage.setItem("show_tour", "1");
    setLoading(false);
    navigate("/dashboard");
  };

  const showCredentialsPanel = phase !== "idle" || loading;

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
              No sign-up. We'll auto-fill the demo credentials and drop you straight into a workspace pre-loaded with 24 shipments, active bottlenecks, and a guided tour.
            </p>
          </div>

          <Card className="p-8 md:p-10 mb-10 bg-gradient-to-br from-primary/10 via-card to-accent/10 border-primary/30 text-center">
            <Play className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-3">Ready in under 5 seconds</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              {user
                ? "We'll seed fresh demo data and walk you through every feature."
                : "No account needed — we'll sign you in as our demo user automatically."}
            </p>

            {showCredentialsPanel && !user && (
              <div className="max-w-sm mx-auto mb-6 text-left space-y-3 animate-fade-in">
                <div>
                  <Label htmlFor="demo-email" className="text-xs">Email</Label>
                  <Input
                    id="demo-email"
                    value={typedEmail}
                    readOnly
                    className="font-mono text-sm bg-background/60"
                  />
                </div>
                <div>
                  <Label htmlFor="demo-password" className="text-xs">Password</Label>
                  <Input
                    id="demo-password"
                    value={typedPassword}
                    readOnly
                    type="text"
                    className="font-mono text-sm bg-background/60"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center pt-1">
                  {phase === "typing-email" && "Filling email…"}
                  {phase === "typing-password" && "Filling password…"}
                  {phase === "signing-in" && "Signing in…"}
                  {phase === "seeding" && "Loading demo workspace…"}
                </p>
              </div>
            )}

            <Button
              size="lg"
              onClick={launchDemo}
              disabled={loading}
              className="shadow-[var(--shadow-elevated)]"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {user ? "Launch demo workspace" : "Open demo (no sign-up)"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            {!user && (
              <p className="text-xs text-muted-foreground mt-4">
                Shared demo account: <span className="font-mono">{DEMO_EMAIL}</span>
              </p>
            )}
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
            Questions? <a href="mailto:leebanabubakr90@gmail.com" className="text-primary hover:underline">Contact the developer</a> · Already exploring? <Link to="/dashboard" className="text-primary hover:underline">Open your dashboard</Link>
          </div>
        </div>
      </section>
    </div>
  );
}