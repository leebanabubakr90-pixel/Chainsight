import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useSuperAdmin = () => {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setIsSuperAdmin(false); setLoading(false); return; }
    setLoading(true);
    supabase
      .from("user_app_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setIsSuperAdmin(!!data);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  return { isSuperAdmin, loading };
};
