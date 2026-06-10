import { useState, useEffect } from "react";
import {
    Brain, TreePine, Activity, Target, Crosshair, BarChart3,
    RefreshCw, Loader2, CheckCircle2, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, RadarChart, Radar, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell,
} from "recharts";

const API_BASE = "http://localhost:8000";

interface DatasetMetrics {
    dataset: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    roc_auc: number;
    confusion_matrix: number[][];
    total_samples?: number;
    benign?: number;
    attack?: number;
}

interface ModelMetrics {
    validated_at: string;
    datasets: DatasetMetrics[];
    aggregate: {
        total_samples: number;
        attack_types_tested: string[];
    };
}

const CHART_COLORS = [
    "hsl(210, 100%, 56%)", // Blue
    "hsl(265, 90%, 64%)",  // Purple
    "hsl(142, 71%, 45%)",  // Green
    "hsl(38, 92%, 50%)",   // Orange
    "hsl(350, 89%, 60%)",  // Red
    "hsl(180, 100%, 40%)", // Teal
    "hsl(300, 100%, 65%)", // Pink
    "hsl(60, 100%, 40%)",  // Yellow
];

function MetricCard({ label, value, icon: Icon, color = "primary" }: {
    label: string; value: string; icon: any; color?: string;
}) {
    const colors: Record<string, string> = {
        primary: "text-primary bg-primary/10 border-primary/15",
        success: "text-success bg-success/10 border-success/15",
        warning: "text-warning bg-warning/10 border-warning/15",
    };
    return (
        <div className="glass-card p-4">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg border ${colors[color]}`}>
                    <Icon className="h-4 w-4" />
                </div>
                <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className="text-xl font-semibold font-mono text-foreground">{value}</p>
                </div>
            </div>
        </div>
    );
}

function ConfusionMatrix({ cm, title }: { cm: number[][]; title: string }) {
    const total = cm[0][0] + cm[0][1] + cm[1][0] + cm[1][1];
    return (
        <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">{title}</h4>
            <div className="grid grid-cols-3 gap-1.5 max-w-xs">
                <div />
                <div className="text-center text-[10px] text-muted-foreground py-1">Pred: Benign</div>
                <div className="text-center text-[10px] text-muted-foreground py-1">Pred: Attack</div>
                <div className="text-[10px] text-muted-foreground flex items-center">True: Benign</div>
                <div className="bg-success/15 text-success font-mono text-xs p-2.5 rounded text-center font-bold">
                    {cm[0][0].toLocaleString()}
                    <span className="block text-[9px] opacity-60">{(cm[0][0] / total * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-destructive/15 text-destructive font-mono text-xs p-2.5 rounded text-center font-bold">
                    {cm[0][1].toLocaleString()}
                    <span className="block text-[9px] opacity-60">FP</span>
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center">True: Attack</div>
                <div className="bg-destructive/15 text-destructive font-mono text-xs p-2.5 rounded text-center font-bold">
                    {cm[1][0].toLocaleString()}
                    <span className="block text-[9px] opacity-60">FN</span>
                </div>
                <div className="bg-success/15 text-success font-mono text-xs p-2.5 rounded text-center font-bold">
                    {cm[1][1].toLocaleString()}
                    <span className="block text-[9px] opacity-60">{(cm[1][1] / total * 100).toFixed(1)}%</span>
                </div>
            </div>
        </div>
    );
}

export default function Models() {
    const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [liveStats, setLiveStats] = useState<any>({});

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [metricsRes, statsRes] = await Promise.all([
                fetch(`${API_BASE}/models/metrics`),
                fetch(`${API_BASE}/stats`),
            ]);
            if (metricsRes.ok) setMetrics(await metricsRes.json());
            if (statsRes.ok) setLiveStats(await statsRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading model metrics...
            </div>
        );
    }

    if (!metrics || metrics.datasets?.length === 0) {
        return (
            <div className="glass-card p-8 text-center">
                <Brain className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-foreground font-medium">No validation results yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                    Run: <code className="text-primary">.venv/bin/python ml/validate_model.py</code>
                </p>
            </div>
        );
    }

    // Prepare chart data
    const barData = metrics.datasets.map((d) => ({
        name: d.dataset,
        Accuracy: +(d.accuracy * 100).toFixed(2),
        Precision: +(d.precision * 100).toFixed(2),
        Recall: +(d.recall * 100).toFixed(2),
        "F1-Score": +(d.f1 * 100).toFixed(2),
        "ROC-AUC": +(d.roc_auc * 100).toFixed(2),
    }));

    const radarData = [
        { metric: "Accuracy", ...Object.fromEntries(metrics.datasets.map(d => [d.dataset, +(d.accuracy * 100).toFixed(1)])) },
        { metric: "Precision", ...Object.fromEntries(metrics.datasets.map(d => [d.dataset, +(d.precision * 100).toFixed(1)])) },
        { metric: "Recall", ...Object.fromEntries(metrics.datasets.map(d => [d.dataset, +(d.recall * 100).toFixed(1)])) },
        { metric: "F1", ...Object.fromEntries(metrics.datasets.map(d => [d.dataset, +(d.f1 * 100).toFixed(1)])) },
        { metric: "AUC", ...Object.fromEntries(metrics.datasets.map(d => [d.dataset, +(d.roc_auc * 100).toFixed(1)])) },
    ];

    const pieData = metrics.datasets.map((d, i) => ({
        name: d.dataset,
        value: d.total_samples || d.confusion_matrix.flat().reduce((a, b) => a + b, 0),
        fill: CHART_COLORS[i],
    }));

    const primary = metrics.datasets[0]; // DDoS

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-foreground">ML Model Performance</h1>
                    <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        Last validated: {new Date(metrics.validated_at).toLocaleString()}
                        <span className="opacity-30">·</span>
                        {metrics.aggregate.total_samples.toLocaleString()} samples
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAll} className="text-xs">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                </Button>
            </div>

            {/* Top Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <MetricCard label="Accuracy" value={`${(primary.accuracy * 100).toFixed(2)}%`} icon={Target} color="success" />
                <MetricCard label="Precision" value={`${(primary.precision * 100).toFixed(2)}%`} icon={Crosshair} color="primary" />
                <MetricCard label="Recall" value={`${(primary.recall * 100).toFixed(2)}%`} icon={Activity} color="primary" />
                <MetricCard label="F1 Score" value={`${(primary.f1 * 100).toFixed(2)}%`} icon={BarChart3} color="primary" />
                <MetricCard label="ROC-AUC" value={primary.roc_auc.toFixed(4)} icon={Brain} color="success" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Metrics Comparison Bar Chart */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Metrics by Dataset</h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} barGap={4}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 14%)" vertical={false} />
                                <XAxis dataKey="name" stroke="hsl(220, 12%, 40%)" fontSize={11} tickLine={false} />
                                <YAxis domain={[90, 100]} stroke="hsl(220, 12%, 40%)" fontSize={10} tickLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(222, 48%, 9%)",
                                        border: "1px solid hsl(222, 30%, 18%)",
                                        borderRadius: "8px",
                                        fontSize: "12px",
                                    }}
                                    formatter={(v: number) => `${v}%`}
                                />
                                <Bar dataKey="Accuracy" fill="hsl(210, 100%, 56%)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Precision" fill="hsl(265, 90%, 64%)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Recall" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="F1-Score" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="ROC-AUC" fill="hsl(350, 89%, 60%)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Radar Chart */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Model Capability Radar</h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                                <PolarGrid stroke="hsl(222, 30%, 18%)" />
                                <PolarAngleAxis dataKey="metric" stroke="hsl(220, 12%, 50%)" fontSize={10} />
                                <PolarRadiusAxis domain={[95, 100]} tick={false} axisLine={false} />
                                {metrics.datasets.map((d, i) => (
                                    <Radar
                                        key={d.dataset}
                                        name={d.dataset}
                                        dataKey={d.dataset}
                                        stroke={CHART_COLORS[i]}
                                        fill={CHART_COLORS[i]}
                                        fillOpacity={0.15}
                                        strokeWidth={2}
                                    />
                                ))}
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(222, 48%, 9%)",
                                        border: "1px solid hsl(222, 30%, 18%)",
                                        borderRadius: "8px",
                                        fontSize: "12px",
                                    }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Confusion Matrices + Dataset Distribution */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {metrics.datasets.map((d, i) => (
                    <div key={d.dataset} className="glass-card p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded" style={{ background: `${CHART_COLORS[i]}20` }}>
                                <TreePine className="h-4 w-4" style={{ color: CHART_COLORS[i] }} />
                            </div>
                            <h3 className="text-sm font-semibold text-foreground">{d.dataset}</h3>
                        </div>
                        <ConfusionMatrix cm={d.confusion_matrix} title="Confusion Matrix" />
                    </div>
                ))}

                {/* Dataset Distribution Pie */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Dataset Distribution</h3>
                    <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={65}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${(value / 1000).toFixed(0)}K`}
                                    fontSize={10}
                                >
                                    {pieData.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(222, 48%, 9%)",
                                        border: "1px solid hsl(222, 30%, 18%)",
                                        borderRadius: "8px",
                                        fontSize: "12px",
                                    }}
                                    formatter={(v: number) => v.toLocaleString()}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Live System Stats */}
            <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Live Detection Stats
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-mono font-semibold text-foreground">{(liveStats.total_logs || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Logs Processed</p>
                    </div>
                    <div>
                        <p className="text-2xl font-mono font-semibold text-destructive">{liveStats.total_alerts || 0}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Alerts Generated</p>
                    </div>
                    <div>
                        <p className="text-2xl font-mono font-semibold text-warning">{liveStats.anomaly_count || 0}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Anomalies Found</p>
                    </div>
                    <div>
                        <p className="text-2xl font-mono font-semibold text-primary">{liveStats.high_risk_count || 0}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">High Risk Events</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
