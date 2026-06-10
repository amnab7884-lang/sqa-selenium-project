import { AlertTriangle, AlertCircle, ChevronRight, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

const API_BASE = "http://localhost:8000";

interface AlertData {
  id: number;
  type: string;
  source: string;
  destination: string;
  score: number;
  anomaly: boolean;
  intel: {
    virustotal: string;
    abuseipdb: string;
  };
  timestamp: string;
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.15)",
  },
  high: {
    icon: AlertCircle,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.15)",
  },
};

export function RecentAlerts() {
  const { data: alerts = [] } = useQuery<AlertData[]>({
    queryKey: ["dashboard-alerts"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/alerts`);
      return response.ok ? await response.json() : [];
    },
    refetchInterval: 3000,
  });

  const getConfig = (score: number) => score > 0.8 ? severityConfig.critical : severityConfig.high;

  return (
    <div className="relative p-6 rounded-[1.25rem] glass-card glass-frosted">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-[#dfe2f1] font-['Space_Grotesk',sans-serif]">Recent Alerts</h3>
          <p className="text-[11px] text-[#859398] mt-0.5">Real-time security alerts with threat intelligence</p>
        </div>
        <a href="/alerts" className="text-xs text-[#3cd7ff]/70 hover:text-[#3cd7ff] flex items-center gap-1 transition-colors duration-300">
          View all <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="space-y-2.5">
        {alerts.length === 0 ? (
          <div className="text-center py-10 text-[#3c494e]">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No alerts yet.</p>
            <p className="text-xs mt-1">Inject suspicious traffic to trigger alerts.</p>
          </div>
        ) : (
          alerts.slice().reverse().slice(0, 5).map((alert) => {
            const config = getConfig(alert.score);
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className="flex items-start gap-3.5 p-4 rounded-xl bg-[#111524]/40 hover:bg-[#111524]/70 transition-all duration-300 cursor-pointer group"
              >
                <div className="p-2 rounded-lg" style={{ background: config.bg, border: `1px solid ${config.border}` }}>
                  <Icon className="h-4 w-4" style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="text-[13px] font-medium text-[#dfe2f1] truncate">
                      {alert.type} from {alert.source}
                    </h4>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md" style={{ background: config.bg, color: config.color, border: `1px solid ${config.border}` }}>
                      {alert.score.toFixed(2)}
                    </span>
                    {alert.anomaly && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#f59e0b]/8 text-[#f59e0b] border border-[#f59e0b]/15">
                        Anomaly
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#3c494e] mb-1.5">Destination: {alert.destination}</p>
                  <div className="flex items-center gap-3 text-[10px] text-[#3c494e]">
                    <span className="flex items-center gap-1">
                      <ExternalLink className="h-2.5 w-2.5" />
                      VT: {alert.intel.virustotal.substring(0, 35)}...
                    </span>
                    <span>•</span>
                    <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#3c494e] group-hover:text-[#859398] group-hover:translate-x-0.5 transition-all duration-300 mt-1" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}