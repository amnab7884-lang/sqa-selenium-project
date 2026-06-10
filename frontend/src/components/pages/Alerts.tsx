import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Lightbulb,
  ChevronDown,
  Bell,
  ExternalLink,
  ShieldBan,
  CheckCircle2,
  Loader2,
  Bot,
  Play,
  Clock,
  Target,
  Zap,
  Search as SearchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";

const API_BASE = "http://localhost:8000";

interface BackendAlert {
  id: number;
  type: string;
  attack_category?: string;
  classification_confidence?: string;
  source: string;
  destination: string;
  score: number;
  anomaly: boolean;
  intel: { virustotal: string; abuseipdb: string };
  timestamp: string;
  status?: string;
  mitre?: { technique_id: string; technique_name: string; tactic: string; description: string };
  // Consensus Engine fields (populated by backend — no weights, pure vote-based)
  verdict?: string;
  severity?: string;
  explanation?: string;
  agreement?: string;
  detection_layers?: {
    random_forest: { score: number; verdict: string; method: string };
    isolation_forest: { verdict: string; method: string };
    threat_intel: { score: number; verdict: string; included_in_vote: boolean; method: string };
  };
  votes?: string;
  consensus_score?: number;
}

interface Alert {
  id: number;
  title: string;
  attackType: string;
  attackCategory: string;
  classificationConfidence: string;
  severity: "critical" | "high" | "medium" | "low";
  time: string;
  source: string;
  sourceIp: string;
  destination: string;
  explanation: string;
  recommendation: string;
  score: number;
  isAnomaly: boolean;
  intel: { virustotal: string; abuseipdb: string };
  status: string;
  mitre?: { technique_id: string; technique_name: string; tactic: string; description: string };
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    badge: "bg-destructive/20 text-destructive border-destructive/30",
    card: "border-l-2 border-l-destructive",
  },
  high: {
    icon: AlertCircle,
    badge: "bg-warning/20 text-warning border-warning/30",
    card: "border-l-2 border-l-warning",
  },
  medium: {
    icon: Info,
    badge: "bg-primary/20 text-primary border-primary/30",
    card: "border-l-2 border-l-primary",
  },
  low: {
    icon: Info,
    badge: "bg-muted text-muted-foreground border-border",
    card: "border-l-2 border-l-muted-foreground",
  },
};

function isPrivateIP(ip: string): boolean {
  return ip.startsWith("192.168.") || ip.startsWith("10.") ||
    ip.startsWith("172.16.") || ip.startsWith("172.17.") || ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") || ip.startsWith("172.2") || ip.startsWith("172.3") ||
    ip.startsWith("127.") || ip === "localhost";
}

function transformBackendAlert(b: BackendAlert): Alert {
  const intel = b.intel || { virustotal: "N/A", abuseipdb: "N/A" };

  const timeDiff = Date.now() - new Date(b.timestamp).getTime();
  const minutes = Math.floor(timeDiff / 60000);
  const timeStr =
    minutes < 1
      ? "just now"
      : minutes < 60
        ? `${minutes}m ago`
        : `${Math.floor(minutes / 60)}h ago`;

  const mlScore = b.score;
  const isAnomaly = b.anomaly;
  const isPrivate = isPrivateIP(b.source);

  // Use Consensus Engine fields if available from backend
  const hasCEData = !!b.severity && !!b.explanation;

  // Severity: trust backend, fallback to local calc
  const severity: "critical" | "high" | "medium" | "low" = hasCEData
    ? (b.severity as "critical" | "high" | "medium" | "low")
    : mlScore > 0.8 && isAnomaly ? "critical"
    : mlScore > 0.8 || (mlScore > 0.5 && isAnomaly) ? "high"
    : mlScore > 0.5 || isAnomaly ? "medium"
    : "low";

  // Model verdicts for display
  const rfVerdict = mlScore > 0.5 ? "MALICIOUS" : "BENIGN";
  const ifVerdict = isAnomaly ? "ANOMALOUS" : "NORMAL";

  // Derive agreement from actual model outputs when backend field is missing
  const bothAgree = (mlScore > 0.5 && isAnomaly) || (mlScore <= 0.5 && !isAnomaly);
  const agreement = b.agreement || (bothAgree ? "all_agree" : "split");

  const agreementLabel = agreement === "all_agree"
    ? "Both ML models confirm this verdict."
    : agreement === "majority"
    ? "Majority of detection layers agree."
    : `RF: ${rfVerdict}, IF: ${ifVerdict} — analyst review recommended.`;

  // Explanation: use backend CE data when available, build locally otherwise
  const explanation = hasCEData
    ? `${b.source} \u2192 ${b.destination} \u00b7 ${b.explanation}`
    : `${b.source} \u2192 ${b.destination} \u00b7 RF: ${rfVerdict} (${(mlScore * 100).toFixed(0)}%) \u00b7 IF: ${ifVerdict} \u00b7 ${agreementLabel}${isPrivate ? " \u00b7 Private IP \u2014 TI not applicable." : ""}`;

  // Recommendation: severity-based, context-aware
  let recommendation: string;
  if (severity === "critical") {
    recommendation = "URGENT: Both ML models confirm malicious activity. Block the source IP immediately, isolate the endpoint, and investigate for lateral movement.";
  } else if (severity === "high" && agreement === "split") {
    recommendation = `Signature detection (RF) flags this at ${(mlScore * 100).toFixed(0)}% confidence, but anomaly model sees normal behaviour. May be a known attack pattern that blends in statistically. Investigate traffic and check endpoint logs.`;
  } else if (severity === "high") {
    recommendation = "High-risk traffic confirmed by ML models. Investigate the source IP, compare against baselines, and check endpoint logs.";
  } else if (severity === "medium") {
    recommendation = isAnomaly
      ? "Anomalous traffic detected but no known attack signature matched. Could indicate a zero-day or unusual legitimate activity. Monitor and investigate if repeated."
      : "Moderate risk detected. Verify traffic against expected baselines and check the source IP reputation.";
  } else {
    recommendation = "Low-risk traffic. No immediate action needed. Continue monitoring.";
  }

  return {
    id: b.id,
    title: `${b.type} — ${b.source}`,
    attackType: b.type,
    attackCategory: b.attack_category || "Unclassified",
    classificationConfidence: b.classification_confidence || "low",
    severity,
    time: timeStr,
    source: "ML Detection Engine",
    sourceIp: b.source,
    destination: b.destination,
    explanation,
    recommendation,
    score: b.consensus_score ?? b.score,
    isAnomaly: b.anomaly,
    intel,
    status: b.status || "active",
    mitre: b.mitre,
  };
}

// ─── Playbook Step Component ────────────────────────────────────────

interface PlaybookStep {
  step: number;
  action: string;
  description: string;
  auto: boolean;
}

function PlaybookExecution({ alertId, onClose }: { alertId: number; onClose: () => void }) {
  const [steps, setSteps] = useState<PlaybookStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<number | null>(null);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchPlaybook = async () => {
      try {
        const res = await fetch(`${API_BASE}/alerts/${alertId}/playbook`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          setSteps(data.playbook || []);
        }
      } catch { } finally {
        setLoading(false);
      }
    };
    fetchPlaybook();
  }, [alertId]);

  const executeStep = async (step: PlaybookStep) => {
    setExecuting(step.step);
    try {
      const res = await fetch(`${API_BASE}/alerts/${alertId}/playbook/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: step.step, action: step.action }),
      });
      if (res.ok) {
        const data = await res.json();
        setCompleted((prev) => new Set([...prev, step.step]));
        toast.success(`Step ${step.step}: ${data.detail || "Completed"}`);
      }
    } catch {
      toast.error("Failed to execute step");
    } finally {
      setExecuting(null);
    }
  };

  const executeAll = async () => {
    for (const step of steps) {
      if (step.auto && !completed.has(step.step)) {
        await executeStep(step);
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs py-3">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Generating response playbook...
      </div>
    );
  }

  if (steps.length === 0 || (steps.length === 1 && steps[0].action === "Error")) {
    const errMsg = steps[0]?.description || "Could not generate playbook.";
    return (
      <div className="py-3 space-y-2">
        <h4 className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-primary" /> Response Playbook
        </h4>
        <p className="text-xs text-muted-foreground">{errMsg}</p>
        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={onClose}>Dismiss</Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 py-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-primary" />
          Response Playbook
        </h4>
        <div className="flex gap-1.5">
          <Button size="sm" className="h-6 text-[10px] px-2" onClick={executeAll}>
            <Zap className="h-3 w-3 mr-1" /> Execute Auto Steps
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        {steps.map((step) => {
          const isDone = completed.has(step.step);
          const isRunning = executing === step.step;
          return (
            <div
              key={step.step}
              className={cn(
                "flex items-start gap-2.5 p-2 rounded-lg text-xs transition-all",
                isDone ? "bg-success/10 border border-success/20" :
                  isRunning ? "bg-primary/10 border border-primary/20" :
                    "bg-muted/30 border border-border/30"
              )}
            >
              <div className={cn(
                "flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                isDone ? "bg-success text-success-foreground" :
                  isRunning ? "bg-primary text-primary-foreground" :
                    "bg-muted text-muted-foreground"
              )}>
                {isDone ? "✓" : isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : step.step}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{step.action}</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">{step.description}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {step.auto && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-primary/5 text-primary border-primary/20">
                    Auto
                  </Badge>
                )}
                {!isDone && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0"
                    onClick={() => executeStep(step)}
                    disabled={isRunning}
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Alert Card Component ───────────────────────────────────────────

function AlertCard({ alert, onRefresh }: { alert: Alert; onRefresh: () => void }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [showPlaybook, setShowPlaybook] = useState(false);
  const [mitre, setMitre] = useState(alert.mitre || null);
  const [classifying, setClassifying] = useState(false);
  const config = severityConfig[alert.severity];
  const Icon = config.icon;
  const isResolved = alert.status === "resolved" || alert.status === "false_positive" || alert.status === "blocked";

  // Auto-classify MITRE on first open
  useEffect(() => {
    if (isOpen && !mitre && !classifying) {
      setClassifying(true);
      fetch(`${API_BASE}/alerts/${alert.id}/mitre`, { method: "POST" })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) setMitre(data); })
        .catch(() => { })
        .finally(() => setClassifying(false));
    }
  }, [isOpen]);

  const handleBlockIP = async () => {
    setBlocking(true);
    try {
      const resp = await fetch(`${API_BASE}/blocklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: alert.sourceIp, reason: `Blocked from alert #${alert.id}: ${alert.title}` }),
      });
      if (resp.ok) {
        const data = await resp.json();
        toast[data.status === "already_blocked" ? "info" : "success"](
          data.status === "already_blocked" ? `${alert.sourceIp} already blocked` : `Blocked ${alert.sourceIp}`
        );
        // Also update alert status to blocked so it removes from active list
        await fetch(`${API_BASE}/alerts/${alert.id}/resolve`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "blocked" }),
        });
        onRefresh();
      }
    } catch { toast.error("Failed to block IP"); }
    finally { setBlocking(false); }
  };

  const handleResolve = async (status: string) => {
    setResolving(true);
    try {
      const resp = await fetch(`${API_BASE}/alerts/${alert.id}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (resp.ok) { toast.success(`Alert #${alert.id} marked as ${status}`); onRefresh(); }
    } catch { toast.error("Failed to update alert"); }
    finally { setResolving(false); }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn("glass-card overflow-hidden", config.card, isResolved && "opacity-50")}>
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-muted/20 transition-colors">
            <div className="flex items-start gap-3">
              <div className={cn("p-2 rounded-lg", config.badge)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-sm font-medium text-foreground truncate">{alert.title}</h3>
                  <Badge variant="outline" className={cn("text-[10px]", config.badge)}>
                    {alert.severity}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20 font-medium">
                    {alert.attackCategory}
                  </Badge>
                  <span className="risk-high font-mono text-[10px]">
                    {(alert.score * 100).toFixed(0)}%
                  </span>
                  {alert.isAnomaly && (
                    <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20">
                      Anomaly
                    </Badge>
                  )}
                  {mitre && mitre.technique_id !== "Error" && (
                    <Badge variant="outline" className="text-[10px] bg-secondary/10 text-secondary border-secondary/20 font-mono">
                      {mitre.technique_id} · {mitre.tactic}
                    </Badge>
                  )}
                  {isResolved && (
                    <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
                      <CheckCircle2 className="h-3 w-3 mr-1" />{alert.status}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{alert.sourceIp}</span>
                  <span>→</span>
                  <span className="font-mono">{alert.destination}</span>
                  <span className="opacity-40">·</span>
                  <span>{alert.time}</span>
                </div>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform mt-1", isOpen && "rotate-180")} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
            {/* MITRE ATT&CK Classification */}
            {classifying ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Classifying via MITRE ATT&CK...
              </div>
            ) : mitre && mitre.technique_id !== "Error" ? (
              <div className="bg-secondary/5 border border-secondary/15 rounded-lg p-2.5">
                <h4 className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-1">
                  <Target className="h-3.5 w-3.5 text-secondary" />
                  MITRE ATTACK
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-secondary/15 text-secondary border-secondary/20 font-mono text-[11px]">
                    {mitre.technique_id}
                  </Badge>
                  <span className="text-xs font-medium text-foreground">{mitre.technique_name}</span>
                  <Badge variant="outline" className="text-[10px]">{mitre.tactic}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{mitre.description}</p>
              </div>
            ) : null}

            {/* Analysis */}
            <div>
              <h4 className="text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-primary" /> Analysis
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{alert.explanation}</p>
            </div>

            {/* Recommendation */}
            <div>
              <h4 className="text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-warning" /> Recommended Action
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{alert.recommendation}</p>
            </div>

            {/* Playbook */}
            {showPlaybook && (
              <PlaybookExecution alertId={alert.id} onClose={() => setShowPlaybook(false)} />
            )}

            {/* Action Buttons */}
            {!isResolved && (
              <div className="flex gap-2 pt-1 flex-wrap">
                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={handleBlockIP} disabled={blocking}>
                  {blocking ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ShieldBan className="h-3 w-3 mr-1" />}
                  Block IP
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => setShowPlaybook(!showPlaybook)}
                >
                  <Target className="h-3 w-3 mr-1" />
                  {showPlaybook ? "Hide Playbook" : "Response Playbook"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-secondary/30 text-secondary hover:bg-secondary/10"
                  onClick={() => navigate(`/copilot?alert_id=${alert.id}`)}
                >
                  <Bot className="h-3 w-3 mr-1" /> Ask Copilot
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => navigate(`/forensics/${encodeURIComponent(alert.sourceIp)}`)}
                >
                  <SearchIcon className="h-3 w-3 mr-1" /> Forensic Timeline
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ─── Main Alerts Page ───────────────────────────────────────────────

export default function Alerts() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");

  const { data: rawAlerts = [], isLoading: loading } = useQuery({
    queryKey: ["alerts-page"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/alerts`);
      if (res.ok) {
        const data: BackendAlert[] = await res.json();
        return data.map(transformBackendAlert);
      }
      return [];
    },
    refetchInterval: 5000,
  });

  const alerts = rawAlerts;

  const fetchAlerts = () => {
    queryClient.invalidateQueries({ queryKey: ["alerts-page"] });
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === "all") return true;
    if (filter === "active") return a.status === "active";
    if (filter === "resolved") return a.status === "resolved";
    if (filter === "false_positive") return a.status === "false_positive";
    if (filter === "blocked") return a.status === "blocked"; // if block is marked as a status on alerts
    return a.severity === filter; // fallback for "critical" and "high" etc
  });

  const counts = {
    all: alerts.length,
    active: alerts.filter((a) => a.status === "active").length,
    critical: alerts.filter((a) => a.severity === "critical" && a.status === "active").length,
    high: alerts.filter((a) => a.severity === "high" && a.status === "active").length,
    medium: alerts.filter((a) => a.severity === "medium" && a.status === "active").length,
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Security Alerts</h1>
          <p className="text-muted-foreground mt-1">
            AI-classified threats with MITRE ATT&CK mapping and automated response playbooks
          </p>
        </div>
        <Button variant="outline" onClick={fetchAlerts}>
          <Bell className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "all", label: `All (${counts.all})` },
          { value: "active", label: `Active (${counts.active})` },
          { value: "critical", label: `Critical (${counts.critical})` },
          { value: "high", label: `High (${counts.high})` },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              filter === f.value
                ? "bg-primary/15 text-primary border border-primary/20"
                : "bg-muted/40 text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Alert Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading alerts...
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No alerts</p>
          <p className="text-xs mt-1">Ingest network data to trigger ML-based threat detection</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onRefresh={fetchAlerts} />
          ))}
        </div>
      )}
    </div>
  );
}
