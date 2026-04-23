import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type Organization = {
  id: string;
  name: string;
  slug: string | null;
  is_demo: boolean;
};

export const useOrganization = () => {
  const { user } = useAuth();
  const [activeOrg, setActiveOrgState] = useState<Organization | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) {
      setOrgs([]);
      setActiveOrgState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Auto-accept any pending invitations addressed to this user
    try { await supabase.rpc("accept_my_pending_invites"); } catch { /* ignore */ }
    // memberships
    const { data: memberships } = await supabase
      .from("organization_members")
      .select("organization_id, organizations(id, name, slug, is_demo)")
      .eq("user_id", user.id);

    let myOrgs: Organization[] = (memberships || [])
      .map((m: any) => m.organizations)
      .filter(Boolean);

    // also include demo orgs (visible via RLS)
    const { data: demoOrgs } = await supabase
      .from("organizations")
      .select("id, name, slug, is_demo")
      .eq("is_demo", true);

    if (demoOrgs) {
      const ids = new Set(myOrgs.map((o) => o.id));
      for (const d of demoOrgs) if (!ids.has(d.id)) myOrgs.push(d as Organization);
    }

    setOrgs(myOrgs);

    const storedId = localStorage.getItem(`active_org_${user.id}`);
    const found = myOrgs.find((o) => o.id === storedId) || myOrgs[0] || null;
    setActiveOrgState(found);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setActiveOrg = (org: Organization) => {
    if (user) localStorage.setItem(`active_org_${user.id}`, org.id);
    setActiveOrgState(org);
  };

  return { activeOrg, orgs, loading, setActiveOrg, refresh };
};