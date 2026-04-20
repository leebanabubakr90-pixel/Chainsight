import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STEPS = [
  { title: "Welcome to ChainSight", body: "This is your operations overview — live KPIs, charts, and active bottlenecks at a glance.", path: "/dashboard" },
  { title: "Manage shipments", body: "Add new shipments or browse existing ones. Search, filter, and edit in seconds.", path: "/dashboard/shipments" },
  { title: "Run a forecast", body: "Click 'Generate forecast' to get a 12-week AI prediction with confidence bands.", path: "/dashboard/forecast" },
  { title: "Optimize a route", body: "Tell the AI where you're going and what matters — speed, cost, or risk.", path: "/dashboard/routes" },
  { title: "Detect bottlenecks", body: "Click 'Run AI detection' to scan your shipments for emerging risks.", path: "/dashboard/bottlenecks" },
  { title: "Ask the AI", body: "Chat with the AI assistant about anything in your supply chain.", path: "/dashboard/assistant" },
  { title: "Export reports", body: "Generate beautiful branded PDF reports for stakeholders.", path: "/dashboard/reports" },
];

export const GuidedTour = () => {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("show_tour") === "1") {
      setShow(true);
      localStorage.removeItem("show_tour");
    }
  }, []);

  if (!show) return null;
  const s = STEPS[step];

  const next = () => {
    if (step === STEPS.length - 1) { setShow(false); return; }
    const n = step + 1;
    setStep(n);
    navigate(STEPS[n].path);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] animate-fade-in">
      <Card className="p-5 bg-card border-primary/40 shadow-[var(--shadow-elevated)]">
        <button onClick={() => setShow(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-7 w-7 rounded-md bg-primary/15 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
        </div>
        <h3 className="font-semibold mb-1">{s.title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{s.body}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setShow(false)}>Skip tour</Button>
          <Button size="sm" className="ml-auto" onClick={next}>
            {step === STEPS.length - 1 ? "Finish" : "Next"} <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
        <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </Card>
    </div>
  );
};