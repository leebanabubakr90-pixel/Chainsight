import { ReactNode, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useTrackDashboardView } from "@/hooks/useTrackDashboardView";
import {
  LayoutDashboard, Package, TrendingUp, Route as RouteIcon, AlertTriangle,
  MessageSquare, FileText, Settings, LogOut, Building2, Check, ChevronsUpDown, BarChart3,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Badge } from "./ui/badge";
import { SettingsModal } from "./SettingsModal";
import { useOrgSettings } from "@/hooks/useOrgSettings";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/shipments", label: "Shipments", icon: Package },
  { to: "/dashboard/forecast", label: "Demand Forecast", icon: TrendingUp },
  { to: "/dashboard/routes", label: "Route Optimizer", icon: RouteIcon },
  { to: "/dashboard/bottlenecks", label: "Bottlenecks", icon: AlertTriangle },
  { to: "/dashboard/assistant", label: "AI Assistant", icon: MessageSquare },
  { to: "/dashboard/reports", label: "Reports", icon: FileText },
  { to: "/dashboard/organization", label: "Organization", icon: Settings },
];

export const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const { activeOrg, orgs, setActiveOrg } = useOrganization();
  const { isSuperAdmin } = useSuperAdmin();
  const { settings } = useOrgSettings();
  useTrackDashboardView();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col">
        <div className="p-5 border-b border-border">
          <Link to="/"><Logo /></Link>
        </div>

        <div className="p-3">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between h-auto py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 shrink-0 text-primary" />
                  <div className="text-left min-w-0">
                    <div className="text-sm font-medium truncate">{activeOrg?.name || "No organization"}</div>
                    {activeOrg?.is_demo && <Badge variant="secondary" className="text-[10px] h-4 mt-0.5">Demo</Badge>}
                  </div>
                </div>
                <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-1">
              {orgs.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No organizations yet</div>}
              {orgs.map((o) => (
                <button
                  key={o.id}
                  onClick={() => { setActiveOrg(o); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-secondary text-left"
                >
                  <Check className={`h-4 w-4 ${activeOrg?.id === o.id ? "opacity-100 text-primary" : "opacity-0"}`} />
                  <span className="truncate flex-1">{o.name}</span>
                  {o.is_demo && <Badge variant="secondary" className="text-[10px] h-4">Demo</Badge>}
                </button>
              ))}
              <div className="border-t my-1" />
              <Link to="/dashboard/organization" onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-secondary">
                <Settings className="h-4 w-4" /> Manage organizations
              </Link>
            </PopoverContent>
          </Popover>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/dashboard"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
          {isSuperAdmin && (
            <NavLink
              to="/dashboard/admin-analytics"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`
              }
            >
              <BarChart3 className="h-4 w-4" />
              Org Analytics
              <Badge variant="secondary" className="ml-auto text-[10px] h-4">Admin</Badge>
            </NavLink>
          )}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="px-2 py-2 text-xs text-muted-foreground truncate">{user?.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-20 flex items-center justify-end gap-2 border-b border-border/60 bg-background/70 backdrop-blur-md px-6 py-2.5">
          <Badge variant="outline" className="font-mono text-[10px]">{settings.currency}</Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            title="Workspace settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </header>
        <div className="container py-8">{children}</div>
      </main>
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};