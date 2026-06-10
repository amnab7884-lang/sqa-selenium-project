import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { CopilotPanel } from "@/components/copilot/CopilotPanel";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Clock, Wifi } from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
}

function StatusBar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-4 px-5 py-2.5 text-[11px] font-mono glass-thin border-b border-border" style={{ borderRadius: 0 }}>
      <div className="flex items-center gap-2">
        <div className="live-dot" />
        <span className="text-success font-semibold tracking-wider">LIVE</span>
      </div>
      <span className="w-[1px] h-3 bg-border" />
      <span className="text-muted-foreground flex items-center gap-1.5">
        <Wifi className="w-3 h-3" />
        Backend: <span className="text-foreground/80">localhost:8000</span>
      </span>
      <span className="w-[1px] h-3 bg-border" />
      <span className="text-muted-foreground">
        DB: <span className="text-foreground/80">MongoDB Atlas</span>
      </span>
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        <span className="w-[1px] h-3 bg-border" />
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="text-foreground/80 tabular-nums">{time.toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const isCopilotPage = location.pathname === "/copilot";

  return (
    <div className="min-h-screen bg-background noise-overlay">
      <Sidebar />
      <main className={isCopilotPage ? "pl-60" : "pl-60 pr-80"}>
        <StatusBar />
        <div className="min-h-screen p-6">
          {children}
        </div>
      </main>
      {!isCopilotPage && <CopilotPanel />}
    </div>
  );
}
