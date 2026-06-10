import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Database, Activity, AlertTriangle, Shield, Zap,
  FileBarChart, X, Download, TrendingUp, Clock, Target,
  Radio, Square, Wifi, Loader2, FileUp,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { StatCard } from "@/components/dashboard/StatCard";
import { AnomalyChart } from "@/components/dashboard/AnomalyChart";
import { RecentAlerts } from "@/components/dashboard/RecentAlerts";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API_BASE = "http://localhost:8000";

const CHART_COLORS = ["#3cd7ff", "#e8b3ff", "#00d4ff", "#f4d4ff", "#a8e8ff", "#9400D3", "#6c5ce7", "#f59e0b"];
const RISK_COLORS = { critical: "#ef4444", high: "#f59e0b", medium: "#3cd7ff", low: "#22c55e" };

/* ─── Tooltip Style ───────────────────────────────────────── */
const tooltipStyle = {
  background: "rgba(28,31,42,0.95)",
  border: "1px solid rgba(60,215,255,0.1)",
  borderRadius: "12px",
  fontSize: "12px",
  color: "#dfe2f1",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  backdropFilter: "blur(12px)",
};

/* ─── Report Modal ────────────────────────────────────────── */
function ReportModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "analysis">("overview");

  useEffect(() => {
    const generate = async () => {
      try {
        const res = await fetch(`${API_BASE}/reports/attack-analysis`, { method: "POST" });
        if (res.ok) setReportData(await res.json());
        else toast.error("Failed to generate report");
      } catch {
        toast.error("Backend unreachable");
      } finally {
        setLoading(false);
      }
    };
    generate();
  }, []);

  const handleDownload = () => {
    if (!reportData) return;
    const content = `# INTELLIHUNT Security Report\nGenerated: ${reportData.generated_at}\n\n${reportData.report}\n\n---\n## Raw Statistics\n${JSON.stringify(reportData.stats, null, 2)}`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intellihunt_report_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  const attackData = reportData?.stats?.attack_types
    ? Object.entries(reportData.stats.attack_types)
      .map(([name, value]) => ({ name, count: value as number }))
      .sort((a, b) => b.count - a.count)
    : [];

  const riskData = reportData?.stats?.risk_distribution
    ? Object.entries(reportData.stats.risk_distribution)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: value as number }))
      .filter((d) => d.value > 0)
    : [];

  const hourlyData = reportData?.stats?.hourly_distribution
    ? Object.entries(reportData.stats.hourly_distribution)
      .map(([hour, count]) => ({ hour: `${hour.padStart(2, "0")}:00`, attacks: count as number }))
      .filter((d) => d.attacks > 0)
    : [];

  const topIPData = reportData?.stats?.top_source_ips?.slice(0, 8) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md" style={{ animation: "fadeInUp 0.3s cubic-bezier(0.22,1,0.36,1) forwards" }}>
      <div className="w-full max-w-5xl max-h-[90vh] glass-thick glass-frosted relative flex flex-col overflow-hidden" style={{ borderRadius: '1.5rem' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.04]" style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.04), rgba(148,0,211,0.04))" }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#3cd7ff]/10">
              <FileBarChart className="h-5 w-5 text-[#3cd7ff]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#dfe2f1] font-['Space_Grotesk',sans-serif]">Security Analysis Report</h2>
              <p className="text-[11px] text-[#859398]">
                {reportData ? `Generated ${new Date(reportData.generated_at).toLocaleString()}` : "Generating..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {reportData && (
              <Button size="sm" variant="outline" onClick={handleDownload} className="text-xs border-white/[0.06] hover:border-[#3cd7ff]/20 bg-transparent text-[#bbc9cf] hover:text-[#dfe2f1]">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Export
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose} className="text-[#859398] hover:text-[#dfe2f1]">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        {reportData && (
          <div className="flex border-b border-white/[0.04] px-5">
            {[
              { key: "overview" as const, label: "Dashboard", icon: TrendingUp },
              { key: "analysis" as const, label: "AI Analysis", icon: Zap },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium transition-all duration-300 border-b-2 ${activeTab === key
                    ? "border-[#3cd7ff] text-[#3cd7ff]"
                    : "border-transparent text-[#859398] hover:text-[#dfe2f1]"
                  }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-80 text-[#859398]">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-2 border-[#3cd7ff]/20 border-t-[#3cd7ff] animate-spin" />
                <FileBarChart className="h-6 w-6 text-[#3cd7ff] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="font-medium mt-4 text-[#dfe2f1]">Analyzing attack patterns...</p>
              <p className="text-xs mt-1">Grok AI is crunching your security data</p>
            </div>
          ) : reportData ? (
            <>
              {activeTab === "overview" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { label: "Total Logs", value: reportData.stats.total_logs?.toLocaleString(), color: "text-[#dfe2f1]" },
                      { label: "Alerts", value: reportData.stats.total_alerts, color: "text-[#ef4444]" },
                      { label: "Anomaly Rate", value: reportData.stats.anomaly_rate, color: "text-[#f59e0b]" },
                      { label: "Blocked IPs", value: reportData.stats.blocked_ips, color: "text-[#3cd7ff]" },
                      { label: "High Risk", value: reportData.stats.high_risk_count, color: "text-[#ef4444]" },
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-[#111524]/60 rounded-xl p-4 text-center">
                        <p className="text-[10px] uppercase text-[#3c494e] tracking-[0.15em] font-semibold mb-1">{kpi.label}</p>
                        <p className={`text-2xl font-bold font-['Space_Grotesk',sans-serif] ${kpi.color}`}>{kpi.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {attackData.length > 0 && (
                      <div className="bg-[#111524]/40 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-[#dfe2f1] mb-4 flex items-center gap-2 font-['Space_Grotesk',sans-serif]">
                          <Target className="h-4 w-4 text-[#3cd7ff]" /> Attack Type Distribution
                        </h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={attackData} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis type="number" tick={{ fontSize: 11, fill: "#859398" }} />
                            <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "#859398" }} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                              {attackData.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {riskData.length > 0 && (
                      <div className="bg-[#111524]/40 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-[#dfe2f1] mb-4 flex items-center gap-2 font-['Space_Grotesk',sans-serif]">
                          <Shield className="h-4 w-4 text-[#3cd7ff]" /> Risk Level Breakdown
                        </h3>
                        <div className="flex items-center">
                          <ResponsiveContainer width="55%" height={200}>
                            <PieChart>
                              <Pie data={riskData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3} stroke="none">
                                {riskData.map((entry) => (
                                  <Cell key={entry.name} fill={RISK_COLORS[entry.name.toLowerCase() as keyof typeof RISK_COLORS] || "#888"} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={tooltipStyle} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex-1 space-y-2.5">
                            {riskData.map((item) => (
                              <div key={item.name} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS[item.name.toLowerCase() as keyof typeof RISK_COLORS] || "#888" }} />
                                <span className="text-xs text-[#859398] flex-1">{item.name}</span>
                                <span className="text-xs font-bold text-[#dfe2f1] font-mono">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {hourlyData.length > 0 && (
                    <div className="bg-[#111524]/40 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-[#dfe2f1] mb-4 flex items-center gap-2 font-['Space_Grotesk',sans-serif]">
                        <Clock className="h-4 w-4 text-[#3cd7ff]" /> Attack Frequency by Hour
                      </h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={hourlyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <defs>
                            <linearGradient id="attackGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#859398" }} />
                          <YAxis tick={{ fontSize: 11, fill: "#859398" }} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Area type="monotone" dataKey="attacks" stroke="#ef4444" strokeWidth={2} fill="url(#attackGradient)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {topIPData.length > 0 && (
                    <div className="bg-[#111524]/40 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-[#dfe2f1] mb-4 flex items-center gap-2 font-['Space_Grotesk',sans-serif]">
                        <AlertTriangle className="h-4 w-4 text-[#ef4444]" /> Top Threat Source IPs
                      </h3>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={topIPData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="ip" tick={{ fontSize: 9, fill: "#859398", angle: -20 }} height={50} />
                          <YAxis tick={{ fontSize: 11, fill: "#859398" }} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                            {topIPData.map((_: any, i: number) => (
                              <Cell key={i} fill={i < 3 ? "#ef4444" : i < 6 ? "#f59e0b" : "#3cd7ff"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "analysis" && (
                <div className="space-y-4">
                  <div className="rounded-xl p-6" style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.04), rgba(148,0,211,0.04))" }}>
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="p-2 rounded-lg bg-[#3cd7ff]/10">
                        <Zap className="h-4 w-4 text-[#3cd7ff]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#dfe2f1] font-['Space_Grotesk',sans-serif]">AI-Powered Security Analysis</h3>
                        <p className="text-[10px] text-[#859398]">Generated by Grok AI based on your live data</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {reportData.report.split("\n").map((line: string, i: number) => {
                        const trimmed = line.trim();
                        if (!trimmed) return <div key={i} className="h-2" />;
                        if (trimmed.startsWith("## ")) return <h2 key={i} className="text-base font-bold text-[#dfe2f1] mt-5 mb-2 pb-1 border-b border-white/[0.04] font-['Space_Grotesk',sans-serif]">{trimmed.replace("## ", "")}</h2>;
                        if (trimmed.startsWith("### ")) return <h3 key={i} className="text-sm font-semibold text-[#dfe2f1] mt-3 mb-1">{trimmed.replace("### ", "")}</h3>;
                        if (trimmed.startsWith("**")) {
                          const match = trimmed.match(/^\*\*(.+?)\*\*:?\s*(.*)/);
                          if (match) return <div key={i} className="flex gap-2 py-1"><span className="text-xs font-semibold text-[#dfe2f1] whitespace-nowrap">{match[1]}:</span><span className="text-xs text-[#859398]">{match[2]}</span></div>;
                        }
                        if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) return <div key={i} className="flex gap-2 py-0.5 pl-2"><span className="text-[#3cd7ff] text-xs mt-0.5">●</span><span className="text-xs text-[#859398] leading-relaxed">{trimmed.replace(/^[-•]\s*/, "").replace(/\*\*(.+?)\*\*/g, "$1")}</span></div>;
                        if (trimmed.match(/^\d+\./)) return <div key={i} className="flex gap-2 py-0.5 pl-2"><span className="text-[#3cd7ff] text-xs font-bold w-4 flex-shrink-0">{trimmed.match(/^(\d+)\./)?.[1]}.</span><span className="text-xs text-[#859398] leading-relaxed">{trimmed.replace(/^\d+\.\s*/, "").replace(/\*\*(.+?)\*\*/g, "$1")}</span></div>;
                        return <p key={i} className="text-xs text-[#859398] leading-relaxed">{trimmed.replace(/\*\*(.+?)\*\*/g, "$1")}</p>;
                      })}
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-[#3c494e] text-center mt-5 pt-3 border-t border-white/[0.04]">
                Generated {new Date(reportData.generated_at).toLocaleString()} · Powered by Grok AI · INTELLIHUNT
              </p>
            </>
          ) : (
            <div className="text-center text-[#859398] py-12">
              <p>Failed to generate report. Check backend logs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* ═══ MAIN DASHBOARD ═══════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════ */

export default function Dashboard() {
  const [showReport, setShowReport] = useState(false);
  const previousLogsCount = useRef(0);
  const previousAlertsCount = useRef(0);

  /* ─── Ingestion status state ─────────────────────────── */
  const [captureStatus, setCaptureStatus] = useState<{
    active: boolean; interface: string | null; started_at: string | null; flows_captured: number;
  }>({ active: false, interface: null, started_at: null, flows_captured: 0 });

  const [uploadStatus, setUploadStatus] = useState<{
    active: boolean; filename: string | null; started_at: string | null;
    total: number; processed: number; alerts: number; errors: number;
  }>({ active: false, filename: null, started_at: null, total: 0, processed: 0, alerts: 0, errors: 0 });

  const [stoppingCapture, setStoppingCapture] = useState(false);
  const [stoppingUpload, setStoppingUpload] = useState(false);

  /* ─── Poll ingestion statuses ────────────────────────── */
  useEffect(() => {
    const poll = async () => {
      try {
        const [capRes, upRes] = await Promise.all([
          fetch(`${API_BASE}/capture/status`),
          fetch(`${API_BASE}/upload-file/status`),
        ]);
        if (capRes.ok) setCaptureStatus(await capRes.json());
        if (upRes.ok) setUploadStatus(await upRes.json());
      } catch { /* backend offline */ }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  /* ─── Stop handlers ──────────────────────────────────── */
  const handleStopCapture = async () => {
    setStoppingCapture(true);
    try {
      const res = await fetch(`${API_BASE}/capture/stop`, { method: "POST" });
      if (res.ok) toast.success("Live capture stopped");
      else {
        const err = await res.json();
        toast.error("Failed to stop capture", { description: err.detail });
      }
    } catch { toast.error("Backend unreachable"); }
    finally { setStoppingCapture(false); }
  };

  const handleStopUpload = async () => {
    setStoppingUpload(true);
    try {
      const res = await fetch(`${API_BASE}/upload-file/cancel`, { method: "POST" });
      if (res.ok) toast.success("Cancellation request sent");
      else toast.error("Failed to cancel upload");
    } catch { toast.error("Backend unreachable"); }
    finally { setStoppingUpload(false); }
  };

  const { data: logs = [] } = useQuery({
    queryKey: ["dashboard-logs"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/logs`);
      return res.ok ? await res.json() : [];
    },
    refetchInterval: 3000,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["dashboard-alerts"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/alerts`);
      return res.ok ? await res.json() : [];
    },
    refetchInterval: 3000,
  });

  const { data: stats = {} } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/stats`);
      return res.ok ? await res.json() : {};
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (logs.length > previousLogsCount.current && previousLogsCount.current > 0) {
      const newCount = logs.length - previousLogsCount.current;
      toast.info(`${newCount} new log${newCount > 1 ? "s" : ""} ingested`, { duration: 3000 });
    }
    previousLogsCount.current = logs.length;
  }, [logs]);

  useEffect(() => {
    if (alerts.length > previousAlertsCount.current && previousAlertsCount.current > 0) {
      const latestAlert = alerts[alerts.length - 1];
      toast.error(`ALERT: ${latestAlert.type}`, {
        description: `${latestAlert.source} → Risk: ${(latestAlert.score * 100).toFixed(0)}%`,
        duration: 8000,
      });
    }
    previousAlertsCount.current = alerts.length;
  }, [alerts]);

  const avgRisk = logs.length > 0
    ? (logs.reduce((sum: number, l: any) => sum + (l.risk_score || 0), 0) / logs.length * 100).toFixed(1)
    : "0.0";

  const showIngestionBanner = captureStatus.active || uploadStatus.active;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ═══ Ingestion Status Banner ═══════════════════════════ */}
      {showIngestionBanner && (
        <div className="space-y-3">
          {/* Live Capture Banner */}
          {captureStatus.active && (
            <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl border border-[#22c55e]/15 animate-fade-in"
              style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.06), rgba(60,215,255,0.04))" }}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="p-2 rounded-lg bg-[#22c55e]/10">
                    <Radio className="h-4 w-4 text-[#22c55e]" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22c55e]" />
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#dfe2f1] font-['Space_Grotesk',sans-serif]">
                    Live Capture Active
                  </p>
                  <p className="text-[11px] text-[#859398]">
                    Listening on <span className="text-[#3cd7ff] font-mono">{captureStatus.interface}</span>
                    {captureStatus.started_at && (
                      <> · Started {new Date(captureStatus.started_at).toLocaleTimeString()}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/15">
                  <Wifi className="h-3 w-3 text-[#22c55e]" />
                  <span className="text-[10px] font-semibold text-[#22c55e] uppercase tracking-wider">Analyzing</span>
                </div>
                <Button
                  size="sm"
                  onClick={handleStopCapture}
                  disabled={stoppingCapture}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 transition-all text-xs px-4"
                >
                  {stoppingCapture
                    ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Stopping...</>
                    : <><Square className="h-3.5 w-3.5 mr-1.5" /> Stop Capture</>
                  }
                </Button>
              </div>
            </div>
          )}

          {/* File Upload Banner */}
          {uploadStatus.active && (
            <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl border border-[#e8b3ff]/15 animate-fade-in"
              style={{ background: "linear-gradient(135deg, rgba(232,179,255,0.06), rgba(148,0,211,0.04))" }}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="p-2 rounded-lg bg-[#e8b3ff]/10">
                    <FileUp className="h-4 w-4 text-[#e8b3ff]" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e8b3ff] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#e8b3ff]" />
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#dfe2f1] font-['Space_Grotesk',sans-serif]">
                    File Processing Active
                  </p>
                  <p className="text-[11px] text-[#859398]">
                    <span className="text-[#e8b3ff] font-mono">{uploadStatus.filename}</span>
                    {" · "}{uploadStatus.processed}/{uploadStatus.total} flows
                    {uploadStatus.alerts > 0 && <> · <span className="text-red-400">{uploadStatus.alerts} alerts</span></>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Progress indicator */}
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#e8b3ff] to-[#9400D3] transition-all duration-500"
                      style={{ width: uploadStatus.total > 0 ? `${(uploadStatus.processed / uploadStatus.total) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[#859398]">
                    {uploadStatus.total > 0 ? `${Math.round((uploadStatus.processed / uploadStatus.total) * 100)}%` : "0%"}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={handleStopUpload}
                  disabled={stoppingUpload}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 transition-all text-xs px-4"
                >
                  {stoppingUpload
                    ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Stopping...</>
                    : <><Square className="h-3.5 w-3.5 mr-1.5" /> Stop Processing</>
                  }
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#dfe2f1] font-['Space_Grotesk',sans-serif] tracking-[-0.02em]">Security Overview</h1>
          <p className="text-sm text-[#859398] mt-1">
            Monitoring {stats.total_logs?.toLocaleString() || 0} events across your network
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-white/[0.06] hover:border-[#3cd7ff]/20 bg-transparent text-[#bbc9cf] hover:text-[#dfe2f1]"
            onClick={() => setShowReport(true)}
          >
            <FileBarChart className="h-3.5 w-3.5 mr-1.5" />
            Generate Report
          </Button>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#3c494e]">
            <Zap className="h-3.5 w-3.5 text-[#22c55e]" />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Bento Grid Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Events"
          value={(stats.total_logs || 0).toLocaleString()}
          icon={Database}
          subtitle={logs.length > 0 ? "Ingestion active" : "Waiting for data"}
          status={logs.length > 0 ? "success" : "default"}
        />
        <StatCard
          title="Avg Risk Score"
          value={`${avgRisk}%`}
          icon={Activity}
          subtitle="Across all processed flows"
          status={parseFloat(avgRisk) > 50 ? "danger" : parseFloat(avgRisk) > 20 ? "warning" : "default"}
        />
        <StatCard
          title="Anomalies"
          value={(stats.anomaly_count || 0).toString()}
          icon={AlertTriangle}
          subtitle="ML anomaly detections"
          status={(stats.anomaly_count || 0) > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Active Alerts"
          value={(stats.total_alerts || 0).toString()}
          icon={Shield}
          subtitle={`${stats.high_risk_count || 0} high risk events`}
          status={(stats.total_alerts || 0) > 0 ? "danger" : "default"}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AnomalyChart logs={logs} />
        <RecentAlerts />
      </div>

      {showReport && <ReportModal onClose={() => setShowReport(false)} />}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}