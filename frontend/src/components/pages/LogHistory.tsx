import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Search,
    Filter,
    Calendar,
    Download,
    FileJson,
    Trash2,
    ChevronLeft,
    ChevronRight,
    History,
    RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const API_BASE = "http://localhost:8000";

interface LogEntry {
    risk_score: number;
    is_anomaly: boolean;
    timestamp: string;
    original_log: {
        SRC_IP?: string;
        DST_IP?: string;
        "FLOW DURATION"?: number;
        FLOW_DURATION?: number;
        "FLOW PACKETS/S"?: number;
        FLOW_PACKETS_S?: number;
        "FWD PACKET LENGTH MEAN"?: number;
        FWD_PACKET_LENGTH_MEAN?: number;
        "BWD PACKET LENGTH MEAN"?: number;
        BWD_PACKET_LENGTH_MEAN?: number;
        [key: string]: any;
    };
}

interface HistoryResponse {
    data: LogEntry[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export default function LogHistory() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [riskLevel, setRiskLevel] = useState("all");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    // Separate state for the committed search (only updates on Enter/Search click)
    const [committedSearch, setCommittedSearch] = useState("");

    const { data: historyData = null, isLoading: loading } = useQuery({
        queryKey: ["log-history", page, pageSize, committedSearch, riskLevel],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: pageSize.toString(),
            });

            if (committedSearch) {
                params.set("src_ip", committedSearch);
            }
            if (riskLevel !== "all") {
                params.set("risk_level", riskLevel);
            }

            const response = await fetch(`${API_BASE}/logs/history?${params}`);
            if (response.ok) {
                return await response.json();
            }
            return null;
        },
    });

    const fetchHistory = () => {
        queryClient.invalidateQueries({ queryKey: ["log-history"] });
    };

    const handleSearch = () => {
        setPage(1);
        setCommittedSearch(searchQuery);
    };

    const handleExportCSV = () => {
        if (!historyData?.data?.length) return;

        const headers = [
            "Timestamp",
            "Source IP",
            "Dest IP",
            "Duration (ms)",
            "Pkts/s",
            "Fwd Mean",
            "Bwd Mean",
            "Anomaly",
            "Risk Score",
        ];

        const rows = historyData.data.map((log) => [
            log.timestamp,
            log.original_log["SRC_IP"] || "",
            log.original_log["DST_IP"] || "",
            log.original_log["FLOW DURATION"] ??
            log.original_log["FLOW_DURATION"] ??
            0,
            (
                log.original_log["FLOW PACKETS/S"] ??
                log.original_log["FLOW_PACKETS_S"] ??
                0
            ).toFixed(2),
            (
                log.original_log["FWD PACKET LENGTH MEAN"] ??
                log.original_log["FWD_PACKET_LENGTH_MEAN"] ??
                0
            ).toFixed(2),
            (
                log.original_log["BWD PACKET LENGTH MEAN"] ??
                log.original_log["BWD_PACKET_LENGTH_MEAN"] ??
                0
            ).toFixed(2),
            log.is_anomaly ? "YES" : "NO",
            log.risk_score.toFixed(4),
        ]);

        const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `intellihunt_logs_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportJSON = () => {
        if (!historyData?.data?.length) return;
        const blob = new Blob([JSON.stringify(historyData.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `intellihunt_logs_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleClear = async () => {
        if (!confirm("Clear ALL network logs? This cannot be undone.")) return;
        try {
            await fetch(`${API_BASE}/logs/clear`, { method: "DELETE" });
            toast.success("All logs cleared");
            fetchHistory();
        } catch {
            toast.error("Failed to clear logs");
        }
    };

    const logs = historyData?.data || [];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <History className="h-6 w-6 text-primary" />
                        Log History
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Browse and search through all historical network log data stored in
                        MongoDB
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                        {historyData
                            ? `${historyData.total.toLocaleString()} total records`
                            : "Loading..."}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={fetchHistory}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-xl">
                    <p className="text-sm text-muted-foreground">Total Records</p>
                    <p className="text-2xl font-bold text-foreground">
                        {historyData?.total?.toLocaleString() || "—"}
                    </p>
                </div>
                <div className="glass-card p-4 rounded-xl">
                    <p className="text-sm text-muted-foreground">Current Page</p>
                    <p className="text-2xl font-bold text-primary">
                        {historyData
                            ? `${historyData.page} / ${historyData.total_pages}`
                            : "—"}
                    </p>
                </div>
                <div className="glass-card p-4 rounded-xl">
                    <p className="text-sm text-muted-foreground">Showing</p>
                    <p className="text-2xl font-bold text-foreground">
                        {logs.length} rows
                    </p>
                </div>
                <div className="glass-card p-4 rounded-xl">
                    <p className="text-sm text-muted-foreground">High Risk</p>
                    <p className="text-2xl font-bold text-destructive">
                        {logs.filter((l) => l.risk_score > 0.5).length}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card rounded-xl p-4">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[300px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by IP address..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                className="pl-10 bg-muted border-border"
                            />
                        </div>
                    </div>

                    <Select
                        value={riskLevel}
                        onValueChange={(val) => {
                            setRiskLevel(val);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[140px] bg-muted border-border">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Risk Level" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Levels</SelectItem>
                            <SelectItem value="high">High Risk</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low Risk</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={pageSize.toString()}
                        onValueChange={(val) => {
                            setPageSize(parseInt(val));
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[120px] bg-muted border-border">
                            <SelectValue placeholder="Page Size" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="25">25 rows</SelectItem>
                            <SelectItem value="50">50 rows</SelectItem>
                            <SelectItem value="100">100 rows</SelectItem>
                            <SelectItem value="200">200 rows</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        className="border-border"
                        onClick={handleExportCSV}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        CSV
                    </Button>

                    <Button
                        variant="outline"
                        className="border-border"
                        onClick={handleExportJSON}
                    >
                        <FileJson className="h-4 w-4 mr-2" />
                        JSON
                    </Button>

                    <Button
                        variant="outline"
                        className="border-border text-destructive hover:bg-destructive/10"
                        onClick={handleClear}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear
                    </Button>
                </div>
            </div>

            {/* Log Table */}
            <div className="glass-card rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Timestamp
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Source IP
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Dest IP
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Duration (ms)
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Pkts/s
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Fwd Mean
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Bwd Mean
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Anomaly
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Risk Score
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="px-4 py-8 text-center text-muted-foreground"
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Loading history...
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="px-4 py-8 text-center text-muted-foreground"
                                    >
                                        No logs found. Try adjusting your filters or ingest some
                                        data first.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log, index) => (
                                    <tr
                                        key={index}
                                        className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                                    >
                                        <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-foreground">
                                            {log.original_log["SRC_IP"] || "—"}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-foreground">
                                            {log.original_log["DST_IP"] || "—"}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-foreground">
                                            {log.original_log["FLOW DURATION"] ??
                                                log.original_log["FLOW_DURATION"] ??
                                                "0"}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-foreground">
                                            {(
                                                log.original_log["FLOW PACKETS/S"] ??
                                                log.original_log["FLOW_PACKETS_S"] ??
                                                0
                                            ).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-foreground">
                                            {(
                                                log.original_log["FWD PACKET LENGTH MEAN"] ??
                                                log.original_log["FWD_PACKET_LENGTH_MEAN"] ??
                                                0
                                            ).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-foreground">
                                            {(
                                                log.original_log["BWD PACKET LENGTH MEAN"] ??
                                                log.original_log["BWD_PACKET_LENGTH_MEAN"] ??
                                                0
                                            ).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant="outline"
                                                className={
                                                    log.is_anomaly
                                                        ? "bg-destructive/20 text-destructive border-destructive/30"
                                                        : "bg-success/20 text-success border-success/30"
                                                }
                                            >
                                                {log.is_anomaly ? "YES" : "NO"}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant="outline"
                                                className={
                                                    log.risk_score > 0.5
                                                        ? "bg-destructive/20 text-destructive border-destructive/30 font-bold"
                                                        : "bg-success/20 text-success border-success/30"
                                                }
                                            >
                                                {log.risk_score.toFixed(2)}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {historyData && historyData.total_pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-4 border-t border-border">
                        <p className="text-sm text-muted-foreground">
                            Showing {(page - 1) * pageSize + 1}–
                            {Math.min(page * pageSize, historyData.total)} of{" "}
                            {historyData.total.toLocaleString()} records
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>
                            <div className="flex items-center gap-1">
                                {Array.from(
                                    { length: Math.min(5, historyData.total_pages) },
                                    (_, i) => {
                                        let pageNum: number;
                                        if (historyData.total_pages <= 5) {
                                            pageNum = i + 1;
                                        } else if (page <= 3) {
                                            pageNum = i + 1;
                                        } else if (page >= historyData.total_pages - 2) {
                                            pageNum = historyData.total_pages - 4 + i;
                                        } else {
                                            pageNum = page - 2 + i;
                                        }
                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={pageNum === page ? "default" : "outline"}
                                                size="sm"
                                                className="w-8 h-8 p-0"
                                                onClick={() => setPage(pageNum)}
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    }
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= historyData.total_pages}
                                onClick={() =>
                                    setPage((p) => Math.min(historyData.total_pages, p + 1))
                                }
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
