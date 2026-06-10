import { useState, useEffect } from "react";
import {
  Search, Globe, Shield, AlertTriangle, CheckCircle, XCircle,
  Ban, Loader2, Trash2, Clock, RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/lib/utils";
import { toast } from "sonner";

const API_BASE = "http://localhost:8000";

interface BlockedIP {
  ip: string;
  reason: string;
  timestamp: string;
}

interface IntelResult {
  ip: string;
  total_logs: number;
  total_alerts: number;
  is_blocked: boolean;
  blocked_at: string | null;
  risk_timeline: { timestamp: string; risk_score: number; is_anomaly: boolean }[];
  alerts: any[];
  intel: any;
  first_seen: string | null;
  last_seen: string | null;
}

export default function ThreatIntel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [result, setResult] = useState<IntelResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [loadingBlocklist, setLoadingBlocklist] = useState(true);

  // Fetch blocked IPs on mount
  const fetchBlockedIPs = async () => {
    try {
      const res = await fetch(`${API_BASE}/blocklist`);
      if (res.ok) {
        const data = await res.json();
        setBlockedIPs(Array.isArray(data) ? data : (data.data || []));
      }
    } catch { } finally {
      setLoadingBlocklist(false);
    }
  };

  useEffect(() => {
    fetchBlockedIPs();
    const interval = setInterval(fetchBlockedIPs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`${API_BASE}/forensics/${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        setResult(await res.json());
      } else {
        toast.error("IP not found in logs");
      }
    } catch {
      toast.error("Backend unreachable");
    } finally {
      setIsSearching(false);
    }
  };

  const handleBlockIP = async (ip: string) => {
    try {
      const res = await fetch(`${API_BASE}/blocklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip, reason: "Manually blocked from Threat Intel page" }),
      });
      if (res.ok) {
        toast.success(`Blocked ${ip}`);
        fetchBlockedIPs();
      }
    } catch {
      toast.error("Failed to block IP");
    }
  };

  const handleUnblock = async (ip: string) => {
    try {
      const res = await fetch(`${API_BASE}/blocklist/${encodeURIComponent(ip)}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`Unblocked ${ip}`);
        fetchBlockedIPs();
      }
    } catch {
      toast.error("Failed to unblock IP");
    }
  };

  const avgRisk = result && result.risk_timeline.length > 0
    ? result.risk_timeline.reduce((s, r) => s + r.risk_score, 0) / result.risk_timeline.length
    : 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Threat Intelligence & Blocklist</h1>
        <p className="text-muted-foreground mt-1">
          Look up IP addresses, view forensic data, and manage your blocklist
        </p>
      </div>

      {/* Search */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter IP address to investigate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-11 h-11 text-sm bg-muted border-border font-mono"
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching} className="h-11 px-6">
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            {isSearching ? "Searching..." : "Investigate"}
          </Button>
        </div>
      </div>

      {/* Search Result */}
      {result && (
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-xl",
                result.is_blocked ? "bg-destructive/20" : avgRisk > 0.5 ? "bg-warning/20" : "bg-success/20"
              )}>
                {result.is_blocked ? (
                  <Ban className="h-6 w-6 text-destructive" />
                ) : avgRisk > 0.5 ? (
                  <AlertTriangle className="h-6 w-6 text-warning" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-success" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-mono font-semibold text-foreground">{result.ip}</h2>
                <p className={cn(
                  "text-sm font-medium",
                  result.is_blocked ? "text-destructive" : avgRisk > 0.5 ? "text-warning" : "text-success"
                )}>
                  {result.is_blocked ? "Blocked" : avgRisk > 0.5 ? "Suspicious" : "Clean"}
                </p>
              </div>
            </div>
            {!result.is_blocked && result.total_alerts > 0 && (
              <Button variant="destructive" size="sm" onClick={() => handleBlockIP(result.ip)}>
                <Ban className="h-3.5 w-3.5 mr-1.5" /> Block This IP
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-muted/30 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Logs</p>
              <p className="text-lg font-bold text-foreground">{result.total_logs}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Alerts</p>
              <p className="text-lg font-bold text-destructive">{result.total_alerts}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Avg Risk</p>
              <p className="text-lg font-bold" style={{ color: avgRisk > 0.5 ? '#e94560' : '#10b981' }}>
                {(avgRisk * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">First Seen</p>
              <p className="text-xs font-mono text-foreground">
                {result.first_seen ? new Date(result.first_seen).toLocaleDateString() : "—"}
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Last Seen</p>
              <p className="text-xs font-mono text-foreground">
                {result.last_seen ? new Date(result.last_seen).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>

          {/* Threat Intel */}
          {result.intel && typeof result.intel === "object" && Object.keys(result.intel).length > 0 && (
            <div className="bg-muted/20 rounded-lg p-3">
              <h4 className="text-xs font-medium text-foreground mb-1.5">External Threat Intel</h4>
              <div className="text-[11px] font-mono text-muted-foreground space-y-0.5">
                {Object.entries(result.intel).map(([key, val]) => (
                  <p key={key}><span className="text-foreground">{key}:</span> {String(val)}</p>
                ))}
              </div>
            </div>
          )}

          {/* Risk Timeline */}
          {result.risk_timeline.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-foreground mb-2">Risk Timeline</h4>
              <div className="flex items-end gap-0.5 h-12">
                {result.risk_timeline.slice(0, 60).map((p, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{
                      height: `${Math.max(4, p.risk_score * 100)}%`,
                      backgroundColor: p.risk_score > 0.8 ? '#e94560' : p.risk_score > 0.5 ? '#f59e0b' : '#10b981',
                      opacity: p.is_anomaly ? 1 : 0.5,
                    }}
                    title={`${(p.risk_score * 100).toFixed(0)}%${p.is_anomaly ? " ⚠️" : ""}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Blocked IPs (Blocklist) ─── */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            <h2 className="text-lg font-semibold text-foreground">Blocklist</h2>
            <Badge variant="outline" className="text-[10px] ml-1">{blockedIPs.length} IPs</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchBlockedIPs} className="text-xs">
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>

        {loadingBlocklist ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading blocklist...
          </div>
        ) : blockedIPs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No blocked IPs</p>
            <p className="text-xs mt-1">IPs are added here when you click "Block IP" on alerts or run playbook auto-steps</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {blockedIPs.map((item) => (
              <div key={item.ip} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Ban className="h-4 w-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono font-medium text-foreground">{item.ip}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.reason}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => handleUnblock(item.ip)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { setSearchQuery(item.ip); handleSearch(); }}
                  >
                    <Search className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty search state */}
      {!result && !isSearching && (
        <div className="glass-card rounded-xl p-10 text-center">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <h3 className="text-base font-semibold text-foreground mb-1">Investigate an IP</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Enter an IP address to see its full forensic timeline, risk history, threat intel, and related alerts.
          </p>
        </div>
      )}
    </div>
  );
}
