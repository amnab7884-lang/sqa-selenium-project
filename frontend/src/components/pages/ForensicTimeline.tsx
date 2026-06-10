import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft, Shield, AlertTriangle, Clock, Globe, Ban,
    Loader2, Activity, Search, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const API_BASE = "http://localhost:8000";

interface ForensicData {
    ip: string;
    total_logs: number;
    total_alerts: number;
    is_blocked: boolean;
    blocked_at: string | null;
    risk_timeline: { timestamp: string; risk_score: number; is_anomaly: boolean }[];
    recent_logs: any[];
    alerts: any[];
    intel: any;
    first_seen: string | null;
    last_seen: string | null;
}

export default function ForensicTimeline() {
    const { ip } = useParams<{ ip: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<ForensicData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!ip) return;
        const fetchData = async () => {
            try {
                const res = await fetch(`${API_BASE}/forensics/${encodeURIComponent(ip)}`);
                if (res.ok) setData(await res.json());
            } catch { } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [ip]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading forensic data for {ip}...
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                <Search className="h-10 w-10 mb-3 opacity-30" />
                <p className="font-medium">No data found for {ip}</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
                </Button>
            </div>
        );
    }

    const avgRisk = data.risk_timeline.length > 0
        ? data.risk_timeline.reduce((sum, r) => sum + r.risk_score, 0) / data.risk_timeline.length
        : 0;
    const anomalyCount = data.risk_timeline.filter((r) => r.is_anomaly).length;

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl pb-10">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Search className="h-6 w-6 text-primary" />
                        Forensic Timeline
                    </h1>
                    <p className="text-muted-foreground mt-0.5 font-mono">{data.ip}</p>
                </div>
                {data.is_blocked && (
                    <Badge className="bg-destructive/15 text-destructive border-destructive/20">
                        <Ban className="h-3 w-3 mr-1" /> Blocked
                    </Badge>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="glass-card p-3 rounded-xl text-center">
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Total Logs</p>
                    <p className="text-xl font-bold text-foreground">{data.total_logs}</p>
                </div>
                <div className="glass-card p-3 rounded-xl text-center">
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Alerts</p>
                    <p className="text-xl font-bold text-destructive">{data.total_alerts}</p>
                </div>
                <div className="glass-card p-3 rounded-xl text-center">
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Avg Risk</p>
                    <p className="text-xl font-bold" style={{ color: avgRisk > 0.5 ? 'hsl(0,70%,60%)' : 'hsl(120,50%,50%)' }}>
                        {(avgRisk * 100).toFixed(0)}%
                    </p>
                </div>
                <div className="glass-card p-3 rounded-xl text-center">
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Anomalies</p>
                    <p className="text-xl font-bold text-warning">{anomalyCount}</p>
                </div>
                <div className="glass-card p-3 rounded-xl text-center">
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Status</p>
                    <p className="text-xl font-bold">{data.is_blocked ? "🚫" : "✅"}</p>
                </div>
            </div>

            {/* Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* First/Last Seen */}
                <div className="glass-card rounded-xl p-4">
                    <h3 className="text-xs font-medium text-foreground mb-3 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" /> Activity Period
                    </h3>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">First Seen</span>
                            <span className="font-mono text-foreground">{data.first_seen ? new Date(data.first_seen).toLocaleString() : "—"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Last Seen</span>
                            <span className="font-mono text-foreground">{data.last_seen ? new Date(data.last_seen).toLocaleString() : "—"}</span>
                        </div>
                        {data.blocked_at && (
                            <div className="flex justify-between">
                                <span className="text-destructive">Blocked At</span>
                                <span className="font-mono text-destructive">{new Date(data.blocked_at).toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Threat Intel */}
                <div className="glass-card rounded-xl p-4">
                    <h3 className="text-xs font-medium text-foreground mb-3 flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-primary" /> Threat Intelligence
                    </h3>
                    {data.intel && Object.keys(data.intel).length > 0 ? (
                        <div className="space-y-1.5 text-[11px] font-mono text-muted-foreground bg-muted/20 p-2 rounded">
                            {Object.entries(data.intel).map(([key, value]) => (
                                <p key={key}><span className="text-foreground">{key}:</span> {String(value)}</p>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">No threat intel data available</p>
                    )}
                </div>
            </div>

            {/* Risk Score Timeline */}
            {data.risk_timeline.length > 0 && (
                <div className="glass-card rounded-xl p-4">
                    <h3 className="text-xs font-medium text-foreground mb-3 flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-primary" /> Risk Score Over Time
                    </h3>
                    <div className="flex items-end gap-0.5 h-20">
                        {data.risk_timeline.slice(0, 80).map((point, i) => (
                            <div
                                key={i}
                                className="flex-1 rounded-t transition-all"
                                style={{
                                    height: `${Math.max(4, point.risk_score * 100)}%`,
                                    backgroundColor: point.risk_score > 0.8 ? 'hsl(0,70%,55%)' :
                                        point.risk_score > 0.5 ? 'hsl(40,80%,55%)' :
                                            point.risk_score > 0.2 ? 'hsl(200,60%,55%)' : 'hsl(120,50%,50%)',
                                    opacity: point.is_anomaly ? 1 : 0.6,
                                }}
                                title={`${new Date(point.timestamp).toLocaleString()} — Risk: ${(point.risk_score * 100).toFixed(0)}%${point.is_anomaly ? " ⚠️ Anomaly" : ""}`}
                            />
                        ))}
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                        <span>Oldest</span>
                        <span>Most Recent</span>
                    </div>
                </div>
            )}

            {/* Alert History */}
            {data.alerts.length > 0 && (
                <div className="glass-card rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-border">
                        <h3 className="text-xs font-medium text-foreground flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                            Alerts Involving {data.ip}
                            <Badge variant="outline" className="ml-1 text-[10px]">{data.alerts.length}</Badge>
                        </h3>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Type</th>
                                <th>Risk</th>
                                <th>Direction</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.alerts.map((alert: any, i: number) => (
                                <tr key={i}>
                                    <td><span className="font-mono text-xs">#{alert.id}</span></td>
                                    <td><span className="text-xs">{alert.type}</span></td>
                                    <td>
                                        <Badge variant="outline" className={
                                            alert.score > 0.8 ? "bg-destructive/20 text-destructive border-destructive/30 text-[10px]" :
                                                alert.score > 0.5 ? "bg-warning/20 text-warning border-warning/30 text-[10px]" :
                                                    "bg-muted text-muted-foreground text-[10px]"
                                        }>
                                            {(alert.score * 100).toFixed(0)}%
                                        </Badge>
                                    </td>
                                    <td>
                                        <span className="text-xs font-mono text-muted-foreground">
                                            {alert.source} → {alert.destination}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="text-xs text-muted-foreground font-mono">
                                            {new Date(alert.timestamp).toLocaleString()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
