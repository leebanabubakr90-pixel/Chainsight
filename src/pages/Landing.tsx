import { Link } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity, TrendingUp, Route, AlertTriangle, MessageSquare,
  FileText, Sparkles, ArrowRight, ShieldCheck, Globe2, Zap,
} from "lucide-react";

const features = [
  { icon: TrendingUp, title: "Demand Forecasting", desc: "AI-powered 12-week predictions per product and region with confidence intervals." },
  { icon: Route, title: "Route Optimization", desc: "Find the fastest, cheapest path. Reroute around port congestion in seconds." },
  { icon: AlertTriangle, title: "Bottleneck Detection", desc: "Catch delays before they cascade. Get prioritized actions, not just alerts." },
  { icon: MessageSquare, title: "AI Assistant", desc: "Ask anything about your supply chain. Streaming answers grounded in your data." },
  { icon: FileText, title: "PDF Reports", desc: "One-click branded reports for execs, customers, and audits." },
  { icon: ShieldCheck, title: "Multi-Org & Roles", desc: "Bring your team. Admins manage members, members run the operation." },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <PublicNav />

      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-[var(--gradient-radial)] pointer-events-none" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <Badge variant="outline" className="mb-6 border-primary/30 text-primary bg-primary/5">
              <Sparkles className="h-3 w-3 mr-1.5" /> AI-Native Supply Chain Intelligence
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              See your supply chain.
              <br />
              <span className="gradient-text glow-text">Before it breaks.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              ChainSight predicts demand, optimizes routes, and surfaces bottlenecks early — so logistics teams stop firefighting and start forecasting.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="shadow-[var(--shadow-elevated)]">
                  Start free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/demo">
                <Button size="lg" variant="outline">Try the live demo</Button>
              </Link>
            </div>

            <div className="mt-16 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              {[
                { v: "23%", l: "lower freight cost" },
                { v: "4.2d", l: "faster avg ETA" },
                { v: "92%", l: "forecast accuracy" },
              ].map((s) => (
                <div key={s.l} className="glass rounded-xl p-4">
                  <div className="text-3xl font-bold gradient-text">{s.v}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 border-t border-border/50">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4">Capabilities</Badge>
            <h2 className="text-4xl font-bold mb-4">Everything logistics teams need</h2>
            <p className="text-muted-foreground">From global container fleets to regional last-mile, ChainSight gives every operator AI superpowers.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <Card key={f.title} className="p-6 bg-card/60 border-border/60 hover:border-primary/40 transition-all hover:shadow-[var(--shadow-glow)] group">
                <div className="h-11 w-11 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="py-24 border-t border-border/50">
        <div className="container grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="outline" className="mb-4">The problem</Badge>
            <h2 className="text-4xl font-bold mb-6">Supply chain chaos is expensive</h2>
            <p className="text-muted-foreground mb-6">
              Companies routinely lose visibility into where their goods are or when they'll arrive. Even global operators struggle with delays, lost inventory, and unreliable forecasts. The cost is measured in millions per quarter.
            </p>
            <ul className="space-y-3">
              {["Goods stuck in transit with no real-time visibility", "Forecasts off by 30%+ leading to stockouts and overstock", "Bottlenecks discovered after they cause cascading delays", "Manual reporting that's outdated the moment it's printed"].map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm">
                  <Zap className="h-4 w-4 text-warning mt-0.5 shrink-0" /> <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-8 bg-gradient-to-br from-card to-card/40 border-primary/20">
            <Activity className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-2xl font-bold mb-3">The ChainSight fix</h3>
            <p className="text-muted-foreground mb-6">A single intelligence layer that sits on top of your operations. AI watches every shipment, learns your patterns, and tells you exactly what to do next.</p>
            <div className="space-y-3">
              {[
                ["Predict", "demand 12 weeks out with confidence bands"],
                ["Optimize", "routes against cost, time, and risk"],
                ["Detect", "bottlenecks before customers feel them"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline gap-3">
                  <span className="text-primary font-bold w-20">{k}</span>
                  <span className="text-sm text-muted-foreground">{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border/50">
        <div className="container">
          <Card className="relative overflow-hidden p-12 md:p-16 text-center bg-gradient-to-br from-primary/10 via-card to-accent/10 border-primary/30">
            <Globe2 className="absolute -right-10 -top-10 h-64 w-64 text-primary/5" />
            <h2 className="text-4xl md:text-5xl font-bold mb-4 relative">Ship smarter. Starting today.</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto relative">Free to start. No credit card. Demo data included so you can explore every feature in seconds.</p>
            <div className="flex flex-wrap justify-center gap-3 relative">
              <Link to="/auth?mode=signup"><Button size="lg">Create free account</Button></Link>
              <Link to="/demo"><Button size="lg" variant="outline">Open live demo</Button></Link>
            </div>
          </Card>
        </div>
      </section>

      <footer className="py-10 border-t border-border/50">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">© {new Date().getFullYear()} ChainSight</div>
          <div className="flex items-center gap-6">
            <Link to="/about" className="hover:text-foreground">About</Link>
            <Link to="/demo" className="hover:text-foreground">Demo</Link>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
            <a href="mailto:leebanabubakr90@gmail.com" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}