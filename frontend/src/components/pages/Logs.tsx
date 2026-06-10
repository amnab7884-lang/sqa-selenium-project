import { useState, useEffect } from "react";
import {
  Search, Filter, Download, RefreshCw, Trash2, FileJson, Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const API_BASE = "http://localhost:8000";

interface LogEntry {
  risk_score: number;
  is_anomaly: boolean;
  timestamp: string;
  original_log: {
    "SRC_IP"?: string;
    "DST_IP"?: string;
    "FLOW DURATION"?: number;
    "FLOW_DURATION"?: number;
    "FLOW PACKETS/S"?: number;
    "FLOW_PACKETS_S"?: number;
    "FWD PACKET LENGTH MEAN"?: number;
    "FWD_PACKET_LENGTH_MEAN"?: number;
    "BWD PACKET LENGTH MEAN"?: number;
    "BWD_PACKET_LENGTH_MEAN"?: number;
    [key: string]: any;
  };
}

export default function Logs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [clearing, setClearing] = useState(false);

  const fetchLogs = async () => {
    try {
      const response = await fetch(`${API_BASE}/logs`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const srcIp = log.original_log["SRC_IP"] || "";
      const dstIp = log.original_log["DST_IP"] || "";
      if (!srcIp.toLowerCase().includes(query) && !dstIp.toLowerCase().includes(query)) {
        return false;
      }
    }
    // Risk filter
    if (riskFilter === "high" && log.risk_score <= 0.5) return false;
    if (riskFilter === "medium" && (log.risk_score <= 0.2 || log.risk_score > 0.5)) return false;
    if (riskFilter === "low" && log.risk_score > 0.2) return false;
    if (riskFilter === "anomaly" && !log.is_anomaly) return false;
    return true;
  });

  // Export logs as JSON
  const handleExport = () => {
    const data = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intellihunt_logs_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLogs.length} logs`);
  };

  // Export as CSV
  const handleExportCSV = () => {
    const headers = ["Timestamp", "Source IP", "Dest IP", "Risk Score", "Anomaly", "Duration", "Pkts/s"];
    const rows = filteredLogs.map((log) => [
      log.timestamp,
      log.original_log["SRC_IP"] || "",
      log.original_log["DST_IP"] || "",
      log.risk_score.toFixed(4),
      log.is_anomaly ? "YES" : "NO",
      log.original_log["FLOW DURATION"] ?? log.original_log["FLOW_DURATION"] ?? "",
      (log.original_log["FLOW PACKETS/S"] ?? log.original_log["FLOW_PACKETS_S"] ?? "").toString(),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intellihunt_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLogs.length} logs as CSV`);
  };

  // Clear all logs
  const handleClear = async () => {
    if (!confirm("Are you sure you want to clear all logs? This cannot be undone.")) return;
    setClearing(true);
    try {
      const resp = await fetch(`${API_BASE}/logs/clear`, { method: "DELETE" });
      if (resp.ok) {
        setLogs([]);
        toast.success("All logs cleared");
      } else {
        toast.error("Failed to clear logs");
      }
    } catch {
      toast.error("Failed to clear logs");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Network Log Explorer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filteredLogs.length} of {logs.length} logs · ML-powered threat detection
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={autoRefresh ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "Live" : "Paused"}
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchLogs} className="h-8 px-2">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-3 rounded-lg">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
          <p className="text-xl font-semibold font-mono text-foreground">{logs.length}</p>
        </div>
        <div className="glass-card p-3 rounded-lg">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">High Risk</p>
          <p className="text-xl font-semibold font-mono text-destructive">
            {logs.filter((l) => l.risk_score > 0.5).length}
          </p>
        </div>
        <div className="glass-card p-3 rounded-lg">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Anomalies</p>
          <p className="text-xl font-semibold font-mono text-warning">
            {logs.filter((l) => l.is_anomaly).length}
          </p>
        </div>
        <div className="glass-card p-3 rounded-lg">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Safe</p>
          <p className="text-xl font-semibold font-mono text-success">
            {logs.filter((l) => l.risk_score <= 0.5 && !l.is_anomaly).length}
          </p>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="glass-card rounded-lg p-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by IP address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted border-border h-9 text-sm"
              />
            </div>
          </div>

          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[140px] bg-muted border-border h-9 text-sm">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low Risk</SelectItem>
              <SelectItem value="anomaly">Anomalies</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-9 text-xs" onClick={handleExportCSV}>
              <Download className="h-3.5 w-3.5 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-xs" onClick={handleExport}>
              <FileJson className="h-3.5 w-3.5 mr-1" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleClear}
              disabled={clearing || logs.length === 0}
            >
              {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Log Table */}
      <div className="glass-card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Source IP</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Dest IP</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Duration</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pkts/s</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Anomaly</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Risk</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    {logs.length === 0 ? "No logs ingested yet." : "No logs match your filters."}
                  </td>
                </tr>
              ) : (
                filteredLogs.slice().reverse().slice(0, 200).map((log, index) => (
                  <tr
                    key={index}
                    className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-2 text-xs font-mono text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2 text-xs font-mono text-foreground">
                      {log.original_log["SRC_IP"] || "-"}
                    </td>
                    <td className="px-4 py-2 text-xs font-mono text-foreground">
                      {log.original_log["DST_IP"] || "-"}
                    </td>
                    <td className="px-4 py-2 text-xs font-mono text-foreground">
                      {log.original_log["FLOW DURATION"] ?? log.original_log["FLOW_DURATION"] ?? "0"}
                    </td>
                    <td className="px-4 py-2 text-xs font-mono text-foreground">
                      {(log.original_log["FLOW PACKETS/S"] ?? log.original_log["FLOW_PACKETS_S"] ?? 0).toFixed(1)}
                    </td>
                    <td className="px-4 py-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${log.is_anomaly
                          ? "bg-destructive/20 text-destructive border-destructive/30"
                          : "bg-success/20 text-success border-success/30"
                          }`}
                      >
                        {log.is_anomaly ? "YES" : "NO"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${log.risk_score > 0.5
                          ? "bg-destructive/20 text-destructive border-destructive/30 font-bold"
                          : "bg-success/20 text-success border-success/30"
                          }`}
                      >
                        {(log.risk_score * 100).toFixed(0)}%
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filteredLogs.length > 200 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Showing 200 of {filteredLogs.length} logs
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
