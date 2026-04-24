import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const signupSchema = z.object({
  displayName: z.string().trim().min(1, "Name required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  orgName: z.string().trim().min(2, "Organization name required").max(80),
});
const loginSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Password required").max(72),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const initial = params.get("mode") === "signup" ? "signup" : "login";
  const [tab, setTab] = useState(initial);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [user, loading, navigate]);

  const onLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) {
      toast({ title: "Invalid input", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Sign-in failed", description: error.message, variant: "destructive" });
      return;
    }
    navigate("/dashboard");
  };

  const onSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      displayName: form.get("displayName"),
      email: form.get("email"),
      password: form.get("password"),
      orgName: form.get("orgName"),
    });
    if (!parsed.success) {
      toast({ title: "Invalid input", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: parsed.data.displayName, pending_org_name: parsed.data.orgName },
      },
    });
    if (error) {
      setSubmitting(false);
      toast({ title: "Sign-up failed", description: error.message, variant: "destructive" });
      return;
    }
    // Try to also sign in (auto-confirm is on) and create the org as admin
    const newUserId = signUpData.user?.id;
    if (newUserId) {
      const slug = parsed.data.orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
      const { data: org, error: orgErr } = await supabase
        .from("organizations")
        .insert({ name: parsed.data.orgName, created_by: newUserId, slug })
        .select()
        .single();
      if (orgErr) {
        // Likely no session yet (email confirmation required); that's fine, dashboard will prompt to create org
        console.warn("Org auto-create skipped:", orgErr.message);
      } else if (org) {
        await supabase.from("organization_members").insert({
          organization_id: org.id, user_id: newUserId, role: "admin",
        });
      }
    }
    setSubmitting(false);
    toast({ title: "Welcome aboard", description: `${parsed.data.orgName} is ready.` });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-[var(--gradient-radial)] pointer-events-none" />
      <Card className="w-full max-w-md p-8 glass relative">
        <Link to="/" className="flex justify-center mb-6"><Logo /></Link>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <form onSubmit={onLogin} className="space-y-4">
              <p className="text-xs text-muted-foreground -mt-2">
                For teams whose organization is already on ChainSight. Need a new account? <button type="button" onClick={() => setTab("signup")} className="text-primary underline">Get started</button>.
              </p>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Sign in
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={onSignup} className="space-y-4">
              <p className="text-xs text-muted-foreground -mt-2">
                Create your organization and become its admin. Already have an account? <button type="button" onClick={() => setTab("login")} className="text-primary underline">Sign in</button> instead.
              </p>
              <div>
                <Label htmlFor="su-name">Your name</Label>
                <Input id="su-name" name="displayName" required placeholder="Jane Operator" />
              </div>
              <div>
                <Label htmlFor="su-org">Organization name</Label>
                <Input id="su-org" name="orgName" required placeholder="Acme Logistics" minLength={2} maxLength={80} />
                <p className="text-xs text-muted-foreground mt-1">You'll be the admin and can invite teammates after signup.</p>
              </div>
              <div>
                <Label htmlFor="su-email">Work email</Label>
                <Input id="su-email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
              </div>
              <div>
                <Label htmlFor="su-password">Password</Label>
                <Input id="su-password" name="password" type="password" autoComplete="new-password" required minLength={8} />
                <p className="text-xs text-muted-foreground mt-1">At least 8 characters.</p>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing you agree to our terms. <Link to="/" className="underline hover:text-foreground">Back home</Link>
        </p>
      </Card>
    </div>
  );
}