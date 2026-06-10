import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  status?: "success" | "warning" | "danger" | "default";
}

const statusConfig = {
  success: { text: "text-[#22c55e]", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.15)", glow: "0 0 20px rgba(34,197,94,0.1)" },
  warning: { text: "text-[#f59e0b]", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.15)", glow: "0 0 20px rgba(245,158,11,0.1)" },
  danger: { text: "text-[#ef4444]", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.15)", glow: "0 0 20px rgba(239,68,68,0.1)" },
  default: { text: "text-[#3cd7ff]", bg: "rgba(60,215,255,0.08)", border: "rgba(60,215,255,0.12)", glow: "0 0 20px rgba(0,212,255,0.08)" },
};

export function StatCard({ title, value, icon: Icon, subtitle, status = "default" }: StatCardProps) {
  const config = statusConfig[status];

  return (
    <div className="relative p-6 rounded-[1.25rem] glass-card glass-frosted overflow-hidden group transition-all duration-500 hover:shadow-lg" style={{ boxShadow: `${config.glow}, var(--glass-inner-shadow), 0 8px 32px rgba(0,0,0,0.12)` }}>
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, transparent, ${config.border}, transparent)` }} />

      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-[#859398] uppercase tracking-[0.12em] font-['Space_Grotesk',sans-serif]">{title}</p>
          <p className={`text-3xl font-bold font-['JetBrains_Mono','monospace'] tracking-tight ${config.text}`}>{value}</p>
          {subtitle && (
            <p className="text-[11px] text-[#3c494e]">{subtitle}</p>
          )}
        </div>
        <div
          className="p-3 rounded-xl transition-all duration-500 group-hover:scale-110"
          style={{ background: config.bg, border: `1px solid ${config.border}` }}
        >
          <Icon className={`h-5 w-5 ${config.text}`} />
        </div>
      </div>
    </div>
  );
}
