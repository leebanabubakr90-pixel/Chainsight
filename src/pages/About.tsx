import { PublicNav } from "@/components/PublicNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Users, Sparkles, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function About() {
  return (
    <div className="min-h-screen">
      <PublicNav />
      <section className="pt-32 pb-16">
        <div className="container max-w-4xl">
          <Badge variant="outline" className="mb-4">About ChainSight</Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
            Built for the people who keep the world moving.
          </h1>
          <p className="text-lg text-muted-foreground mb-12">
            Global trade depends on millions of shipments crossing oceans, ports, rails, and roads every day. Yet most logistics teams still operate with spreadsheets, phone calls, and gut instinct. We're building the AI layer that finally gives operators the same edge their competitors have been quietly buying for years.
          </p>

          <div className="grid md:grid-cols-2 gap-5 mb-12">
            <Card className="p-6 bg-card/60">
              <Target className="h-7 w-7 text-primary mb-3" />
              <h3 className="text-xl font-semibold mb-2">Our mission</h3>
              <p className="text-sm text-muted-foreground">Make AI-driven supply chain intelligence accessible to every company — not just the Maersks of the world.</p>
            </Card>
            <Card className="p-6 bg-card/60">
              <Sparkles className="h-7 w-7 text-accent mb-3" />
              <h3 className="text-xl font-semibold mb-2">What we believe</h3>
              <p className="text-sm text-muted-foreground">The next decade of logistics will be won by teams that predict, not react. Software should make that easy.</p>
            </Card>
            <Card className="p-6 bg-card/60">
              <Users className="h-7 w-7 text-primary mb-3" />
              <h3 className="text-xl font-semibold mb-2">Built for teams</h3>
              <p className="text-sm text-muted-foreground">Multi-organization workspaces, role-based access, and shared dashboards out of the box.</p>
            </Card>
            <Card className="p-6 bg-card/60">
              <Shield className="h-7 w-7 text-accent mb-3" />
              <h3 className="text-xl font-semibold mb-2">Secure by default</h3>
              <p className="text-sm text-muted-foreground">Row-level data isolation, encrypted at rest, and audit-ready reporting from day one.</p>
            </Card>
          </div>

          <Card className="p-8 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30 text-center">
            <h2 className="text-3xl font-bold mb-3">Want to see it in action?</h2>
            <p className="text-muted-foreground mb-6">Open the live demo — no sign-up required to look around.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/demo"><Button size="lg">Open demo</Button></Link>
              <Link to="/auth?mode=signup"><Button size="lg" variant="outline">Create account</Button></Link>
              <a href="mailto:leebanabubakr90@gmail.com"><Button size="lg" variant="ghost">Contact us</Button></a>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}