import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, AlertTriangle, Shield,
  FileBarChart, Settings, Crosshair, Brain, Bot,
  Users, LogOut, ChevronRight, Radio,
} from "lucide-react";
import { cn } from "@/components/lib/utils";
import { useState, useEffect } from "react";

const navGroups = [
  {
    label: "MONITOR",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: Radio, label: "Ingestion", path: "/ingestion" },
      { icon: FileText, label: "Logs", path: "/history" },
    ],
  },
  {
    label: "DETECT",
    items: [
      { icon: AlertTriangle, label: "Alerts", path: "/alerts" },
      { icon: Shield, label: "Threat Intel", path: "/threat-intel" },
      { icon: Brain, label: "ML Models", path: "/models" },
    ],
  },
  {
    label: "RESPOND",
    items: [
      { icon: FileBarChart, label: "Incidents", path: "/incidents" },
      { icon: Bot, label: "AI Copilot", path: "/copilot" },
      { icon: Users, label: "Users", path: "/users" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<{ name?: string; email?: string; username?: string; role?: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("intellihunt_user");
    if (stored) {
      try { setCurrentUser(JSON.parse(stored)); } catch { }
    }
  }, []);

  const displayName = currentUser?.name || currentUser?.username || currentUser?.email || "User";
  const initials = displayName.charAt(0).toUpperCase();
  const role = localStorage.getItem("intellihunt_role") || "analyst";

  const handleSignOut = () => {
    localStorage.removeItem("intellihunt_user");
    localStorage.removeItem("intellihunt_role");
    navigate("/auth/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 flex flex-col glass-thin glass-frosted border-r border-border" style={{ borderRadius: 0 }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary glow-primary">
          <Crosshair className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wide font-['Space_Grotesk',sans-serif]">
            <span className="text-foreground">INTELLI</span>
            <span className="text-primary">HUNT</span>
          </h1>
          <p className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase">Threat Hunting</p>
        </div>
      </div>

      {/* Separator */}
      <div className="mx-4 h-[1px] bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground px-3 mb-2.5 font-['Space_Grotesk',sans-serif]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-300",
                      isActive
                        ? "text-foreground bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {/* Active light bar */}
                    {isActive && (
                      <div className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-primary glow-primary" />
                    )}
                    <item.icon className={cn("h-4 w-4 transition-colors duration-300", isActive ? "text-primary" : "text-muted-foreground")} />
                    {item.label}
                    {isActive && <ChevronRight className="w-3 h-3 ml-auto text-primary/50" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Separator */}
      <div className="mx-4 h-[1px] bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* User Profile */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary text-xs font-bold font-['Space_Grotesk',sans-serif]">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-foreground truncate">{displayName}</p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 capitalize">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-success glow-success" />
              {role}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
