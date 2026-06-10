import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface AnomalyChartProps {
  logs: any[];
}

export function AnomalyChart({ logs }: AnomalyChartProps) {
  const chartData = useMemo(() => {
    if (logs.length === 0) {
      return [
        { time: "00:00", risk: 0, events: 0 },
        { time: "06:00", risk: 0, events: 0 },
        { time: "12:00", risk: 0, events: 0 },
        { time: "18:00", risk: 0, events: 0 },
        { time: "24:00", risk: 0, events: 0 },
      ];
    }

    const buckets: Record<string, { totalRisk: number; count: number }> = {};
    logs.forEach((log) => {
      const ts = log.timestamp || log.created_at;
      if (!ts) return;
      const date = new Date(ts);
      const hour = date.getHours();
      const key = `${hour.toString().padStart(2, "0")}:00`;
      if (!buckets[key]) buckets[key] = { totalRisk: 0, count: 0 };
      buckets[key].totalRisk += log.risk_score || 0;
      buckets[key].count += 1;
    });

    const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);
    return hours.map((h) => ({
      time: h,
      risk: buckets[h] ? Math.round((buckets[h].totalRisk / buckets[h].count) * 100) : 0,
      events: buckets[h]?.count || 0,
    }));
  }, [logs]);

  return (
    <div className="relative p-6 rounded-[1.25rem] glass-card glass-frosted overflow-hidden">
      {/* Scan line */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#3cd7ff]/10 to-transparent" style={{ animation: "scan 6s linear infinite" }} />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-[#dfe2f1] font-['Space_Grotesk',sans-serif]">Risk Score Timeline</h3>
          <p className="text-[11px] text-[#859398] mt-0.5">
            Average risk score by hour · {logs.length} events
          </p>
        </div>
        <div className="flex gap-4 text-[11px] text-[#859398]">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[#3cd7ff]" />
            Risk %
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[#e8b3ff]" />
            Events
          </div>
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3cd7ff" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3cd7ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="eventsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e8b3ff" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#e8b3ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="time" stroke="#3c494e" fontSize={10} tickLine={false} axisLine={false} interval={3} />
            <YAxis stroke="#3c494e" fontSize={10} tickLine={false} axisLine={false} width={30} />
            <Tooltip
              contentStyle={{
                background: "rgba(28,31,42,0.95)",
                border: "1px solid rgba(60,215,255,0.1)",
                borderRadius: "12px",
                color: "#dfe2f1",
                fontSize: "12px",
                padding: "8px 14px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}
            />
            <Area type="monotone" dataKey="events" stroke="#e8b3ff" fill="url(#eventsGrad)" strokeWidth={1.5} />
            <Area type="monotone" dataKey="risk" stroke="#3cd7ff" fill="url(#riskGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
}
