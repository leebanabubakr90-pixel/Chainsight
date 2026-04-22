import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganization } from "./useOrganization";

export const useTrackDashboardView = () => {
  const { user } = useAuth();
  const { activeOrg } = useOrganization();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!user || !activeOrg) return;
    // Page view (one row per navigation)
    supabase.from("dashboard_events").insert({
      user_id: user.id,
      organization_id: activeOrg.id,
      event_type: "page_view",
      path: pathname,
    }).then(() => {});

    // Daily active (deduped via partial unique index)
    supabase
      .from("dashboard_events")
      .upsert(
        {
          user_id: user.id,
          organization_id: activeOrg.id,
          event_type: "daily_active",
          path: null,
        },
        { onConflict: "user_id,organization_id,day", ignoreDuplicates: true }
      )
      .then(() => {});
  }, [user?.id, activeOrg?.id, pathname]);
};
