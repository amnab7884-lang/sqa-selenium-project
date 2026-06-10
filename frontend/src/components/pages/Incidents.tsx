import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Download,
  Calendar,
  AlertTriangle,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/components/lib/utils";
import { toast } from "sonner";

const API_BASE = "http://localhost:8000";

interface Incident {
  incident_id: string;
  title: string;
  status: string;
  severity: string;
  timestamp: string;
  alert_count: number;
  summary: string;
}

const statusConfig: Record<string, string> = {
  open: "bg-destructive/20 text-destructive border-destructive/30",
  investigating: "bg-warning/20 text-warning border-warning/30",
  resolved: "bg-success/20 text-success border-success/30",
};

const severityConfig: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  high: "bg-warning/20 text-warning border-warning/30",
  medium: "bg-primary/20 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
};

export default function Incidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [summary, setSummary] = useState("");

  const fetchIncidents = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/incidents`);
      if (response.ok) {
        const data = await response.json();
        setIncidents(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching incidents:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Please enter an incident title");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`${API_BASE}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, severity, summary }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Incident ${data.incident_id} created with PDF report`);
        setDialogOpen(false);
        setTitle("");
        setSummary("");
        fetchIncidents();
      } else {
        toast.error("Failed to create incident");
      }
    } catch (error) {
      toast.error("Error creating incident");
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadPDF = async (incidentId: string) => {
    try {
      const response = await fetch(`${API_BASE}/reports/${incidentId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${incidentId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${incidentId}.pdf`);
      } else {
        toast.error("Report not found");
      }
    } catch (error) {
      toast.error("Error downloading report");
    }
  };

  const openCount = incidents.filter((i) => i.status === "open").length;
  const investigatingCount = incidents.filter(
    (i) => i.status === "investigating"
  ).length;
  const resolvedCount = incidents.filter((i) => i.status === "resolved").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Incidents & Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Track security incidents and generate PDF reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchIncidents}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/80 glow-primary">
                <Plus className="h-4 w-4 mr-2" />
                Create Incident
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Incident</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    placeholder="e.g. Suspicious Traffic from External IP"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Severity</Label>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Summary (optional)</Label>
                  <Input
                    placeholder="Leave blank for auto-generated summary"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Create Incident & Generate PDF
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Open</p>
          <p className="text-2xl font-bold text-destructive">{openCount}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Investigating</p>
          <p className="text-2xl font-bold text-warning">
            {investigatingCount}
          </p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Resolved</p>
          <p className="text-2xl font-bold text-success">{resolvedCount}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Incidents</p>
          <p className="text-2xl font-bold text-foreground">
            {incidents.length}
          </p>
        </div>
      </div>

      {/* Incident List */}
      <div className="space-y-4">
        {loading ? (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
            Loading incidents...
          </div>
        ) : incidents.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No incidents yet.</p>
            <p className="text-sm">
              Create one to auto-generate an incident report PDF.
            </p>
          </div>
        ) : (
          incidents.map((incident) => (
            <div
              key={incident.incident_id}
              className="glass-card rounded-xl p-6 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-mono text-muted-foreground">
                      {incident.incident_id}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs capitalize",
                        statusConfig[incident.status] || ""
                      )}
                    >
                      {incident.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs capitalize",
                        severityConfig[incident.severity] || ""
                      )}
                    >
                      {incident.severity}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {incident.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {incident.summary}
                  </p>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {new Date(incident.timestamp).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      {incident.alert_count} related alerts
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border"
                    onClick={() => handleDownloadPDF(incident.incident_id)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
