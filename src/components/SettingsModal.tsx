import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Loader2, Globe, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { CURRENCIES, useOrgSettings } from "@/hooks/useOrgSettings";
import { toast } from "@/hooks/use-toast";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export const SettingsModal = ({ open, onOpenChange }: Props) => {
  const { activeOrg } = useOrganization();
  const { settings, refresh, format } = useOrgSettings();
  const [currency, setCurrency] = useState(settings.currency);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setCurrency(settings.currency);
  }, [settings.currency, open]);

  useEffect(() => {
    if (!open || !activeOrg) return;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: row } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", activeOrg.id)
        .eq("user_id", data.user.id)
        .maybeSingle();
      setIsAdmin(row?.role === "admin");
    });
  }, [open, activeOrg?.id]);

  const save = async () => {
    if (!activeOrg) return;
    setSaving(true);
    // Upsert settings row (admin only by RLS)
    const { error } = await supabase
      .from("organization_settings")
      .upsert(
        { organization_id: activeOrg.id, currency },
        { onConflict: "organization_id" }
      );
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Settings saved", description: `Currency set to ${currency}` });
    await refresh();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Workspace settings</DialogTitle>
          <DialogDescription>Preferences for {activeOrg?.name || "your organization"}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary" />Display currency</Label>
            <Select value={currency} onValueChange={setCurrency} disabled={!isAdmin}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="font-medium">{c.code}</span>
                    <span className="text-muted-foreground"> · {c.label} ({c.country})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Live exchange rates are used to convert costs from USD. {!isAdmin && "Only admins can change this."}
            </p>
          </div>

          <Card className="p-4 bg-secondary/30">
            <div className="text-xs text-muted-foreground mb-1">Preview · $1,000 USD becomes</div>
            <div className="text-2xl font-semibold">{format(1000)}</div>
            <div className="text-xs text-muted-foreground mt-1">Using current rate.</div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !isAdmin || currency === settings.currency}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};