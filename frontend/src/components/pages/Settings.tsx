import { useState, useEffect } from "react";
import {
  Moon, Sun, Bell, Bot, Shield, Key, Loader2, Save, Database, Trash2,
  AlertTriangle, Activity, User, RefreshCw, HardDrive, Sliders, Clock,
  Mail, MessageSquare, Webhook, Eye, Zap, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// Conditionally import Clerk components
let UserProfile: any = null;
let useUser: any = null;
try {
  const clerk = require("@clerk/clerk-react");
  UserProfile = clerk.UserProfile;
  useUser = clerk.useUser;
} catch { }

const API_BASE = "http://localhost:8000";
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";

interface SystemSettings {
  dark_mode: boolean;
  email_notifications: boolean;
  slack_integration: boolean;
  webhook_notifications: boolean;
  copilot_explanation_level: string;
  copilot_auto_suggest: boolean;
  risk_threshold_high: number;
  risk_threshold_medium: number;
  auto_block_high_risk: boolean;
  log_retention_days: number;
}

interface SystemStats {
  total_logs: number;
  total_alerts: number;
  anomaly_count: number;
  high_risk_count: number;
}

export default function Settings() {
  const [settings, setSettings] = useState<SystemSettings>({
    dark_mode: true,
    email_notifications: true,
    slack_integration: false,
    webhook_notifications: false,
    copilot_explanation_level: "simple",
    copilot_auto_suggest: true,
    risk_threshold_high: 0.7,
    risk_threshold_medium: 0.3,
    auto_block_high_risk: false,
    log_retention_days: 90,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [clearing, setClearing] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [settingsRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/settings`),
          fetch(`${API_BASE}/stats`),
        ]);
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings((prev) => ({ ...prev, ...data }));
          if (data.dark_mode) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }
        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleUpdate = (key: keyof SystemSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (key === "dark_mode") {
      if (value) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (response.ok) {
        toast.success("Settings saved successfully");
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleClearData = async (type: string) => {
    const label = type === "all" ? "all logs and alerts" : type;
    if (!confirm(`Are you sure you want to clear ${label}? This cannot be undone.`)) return;
    setClearing(true);
    try {
      if (type === "all" || type === "logs") {
        await fetch(`${API_BASE}/logs/clear`, { method: "DELETE" });
      }
      if (type === "all") {
        await fetch(`${API_BASE}/clear`, { method: "POST" });
      }
      toast.success(`Cleared ${label}`);
      // Refresh stats
      const statsRes = await fetch(`${API_BASE}/stats`);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {
      toast.error("Failed to clear data");
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading settings...
      </div>
    );
  }

  const tabs = [
    { id: "general", label: "General", icon: Sliders },
    { id: "notifications", label: "Alerts", icon: Bell },
    { id: "copilot", label: "AI Copilot", icon: Bot },
    { id: "security", label: "Security", icon: Shield },
    { id: "data", label: "Data", icon: Database },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your threat hunting environment
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/50 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── General Tab ─── */}
      {activeTab === "general" && (
        <div className="space-y-6">
          {/* Appearance */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-primary/20">
                {settings.dark_mode ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
                <p className="text-sm text-muted-foreground">Customize the look and feel</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-foreground">Dark Mode</Label>
                  <p className="text-xs text-muted-foreground">Use dark theme for reduced eye strain</p>
                </div>
              </div>
              <Switch checked={settings.dark_mode} onCheckedChange={(val) => handleUpdate("dark_mode", val)} />
            </div>
          </div>

          {/* Risk Thresholds */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Risk Thresholds</h2>
                <p className="text-sm text-muted-foreground">Configure threat detection sensitivity</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="flex justify-between mb-2">
                  <Label className="text-foreground">High Risk Threshold</Label>
                  <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30 font-mono">
                    {(settings.risk_threshold_high * 100).toFixed(0)}%
                  </Badge>
                </div>
                <Input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={settings.risk_threshold_high}
                  onChange={(e) => handleUpdate("risk_threshold_high", parseFloat(e.target.value))}
                  className="w-full accent-destructive cursor-pointer h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">Logs above this score are flagged as high risk</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/30">
                <div className="flex justify-between mb-2">
                  <Label className="text-foreground">Medium Risk Threshold</Label>
                  <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30 font-mono">
                    {(settings.risk_threshold_medium * 100).toFixed(0)}%
                  </Badge>
                </div>
                <Input
                  type="range"
                  min="0.1"
                  max="0.5"
                  step="0.05"
                  value={settings.risk_threshold_medium}
                  onChange={(e) => handleUpdate("risk_threshold_medium", parseFloat(e.target.value))}
                  className="w-full accent-warning cursor-pointer h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">Logs above this score are flagged as medium risk</p>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <Label className="text-foreground">Auto-Block High Risk IPs</Label>
                  <p className="text-xs text-muted-foreground">Automatically add IPs with score above high threshold to blocklist</p>
                </div>
                <Switch
                  checked={settings.auto_block_high_risk}
                  onCheckedChange={(val) => handleUpdate("auto_block_high_risk", val)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Notifications Tab ─── */}
      {activeTab === "notifications" && (
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg bg-warning/20">
              <Bell className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Alert Integrations</h2>
              <p className="text-sm text-muted-foreground">Configure where threat alerts are sent</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-foreground">Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive critical alerts via Gmail SMTP</p>
                </div>
              </div>
              <Switch
                checked={settings.email_notifications}
                onCheckedChange={(val) => handleUpdate("email_notifications", val)}
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-foreground">Slack Integration</Label>
                  <p className="text-xs text-muted-foreground">Send alerts to a Slack webhook channel</p>
                </div>
              </div>
              <Switch
                checked={settings.slack_integration}
                onCheckedChange={(val) => handleUpdate("slack_integration", val)}
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Webhook className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-foreground">Webhook Notifications</Label>
                  <p className="text-xs text-muted-foreground">Send alerts to custom webhook endpoints (SIEM, Teams)</p>
                </div>
              </div>
              <Switch
                checked={settings.webhook_notifications}
                onCheckedChange={(val) => handleUpdate("webhook_notifications", val)}
              />
            </div>

            <Separator className="my-2" />

            <div className="p-4 rounded-lg bg-muted/30">
              <Label className="text-foreground mb-2 block">Test Alerting</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Send a test alert to all enabled channels to verify connectivity
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_BASE}/alerts/test`, { method: "POST" });
                    if (res.ok) toast.success("Test alert sent to all channels");
                    else toast.error("Failed to send test alert");
                  } catch {
                    toast.error("Backend unreachable");
                  }
                }}
              >
                <Zap className="h-4 w-4 mr-2" />
                Send Test Alert
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── AI Copilot Tab ─── */}
      {activeTab === "copilot" && (
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg bg-secondary/20">
              <Bot className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">AI Copilot Settings</h2>
              <p className="text-sm text-muted-foreground">Customize your threat hunting assistant</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-foreground">Explanation Level</Label>
                    <p className="text-xs text-muted-foreground">How technical should copilot responses be?</p>
                  </div>
                </div>
              </div>
              <Select
                value={settings.copilot_explanation_level}
                onValueChange={(val) => handleUpdate("copilot_explanation_level", val)}
              >
                <SelectTrigger className="w-full bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple — Non-technical, high-level summaries</SelectItem>
                  <SelectItem value="moderate">Moderate — Some technical terms, balanced</SelectItem>
                  <SelectItem value="technical">Technical — Full technical detail, CVEs, MITRE ATT&CK</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-foreground">Auto-suggest Mitigations</Label>
                  <p className="text-xs text-muted-foreground">Automatically show recommended actions for alerts</p>
                </div>
              </div>
              <Switch
                checked={settings.copilot_auto_suggest}
                onCheckedChange={(val) => handleUpdate("copilot_auto_suggest", val)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Security Tab ─── */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* User Profile */}
          {CLERK_KEY && (
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-lg bg-primary/20">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">User Account</h2>
                  <p className="text-sm text-muted-foreground">Manage your profile, email, and MFA</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProfile(!showProfile)}
                >
                  {showProfile ? "Hide" : "Manage Profile"}
                </Button>
              </div>
              {showProfile && UserProfile && (
                <div className="mt-4 rounded-lg overflow-hidden">
                  <UserProfile
                    appearance={{
                      elements: {
                        rootBox: "w-full",
                        card: "bg-background/80 backdrop-blur border border-border shadow-none",
                        headerTitle: "text-foreground",
                        headerSubtitle: "text-muted-foreground",
                        formButtonPrimary: "bg-primary hover:bg-primary/80",
                        formFieldInput: "bg-muted border-border text-foreground",
                        formFieldLabel: "text-foreground",
                        navbarButton: "text-foreground",
                      },
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Security Info */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-success/20">
                <Shield className="h-5 w-5 text-success" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Security</h2>
                <p className="text-sm text-muted-foreground">Authentication and API key management</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-foreground">Authentication Provider</Label>
                    <p className="text-xs text-muted-foreground">
                      {CLERK_KEY ? "Clerk Auth (Google SSO + Email)" : "Development mode (no auth)"}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={CLERK_KEY ? "bg-success/20 text-success border-success/30" : "bg-warning/20 text-warning border-warning/30"}>
                  {CLERK_KEY ? "Active" : "Dev Mode"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-foreground">API Keys</Label>
                    <p className="text-xs text-muted-foreground">
                      Grok AI, VirusTotal, AbuseIPDB — configured in server .env
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const res = await fetch(`${API_BASE}/alerts/config`);
                      if (res.ok) {
                        const cfg = await res.json();
                        const channels = Object.entries(cfg)
                          .map(([k, v]: [string, any]) => `${k}: ${v.configured ? "✅" : "❌"}`)
                          .join(", ");
                        toast.info(`Alert channels: ${channels}`);
                      }
                    } catch {
                      toast.error("Backend unreachable");
                    }
                  }}
                >
                  Check Status
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Data Tab ─── */}
      {activeTab === "data" && (
        <div className="space-y-6">
          {/* System Stats */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-primary/20">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">System Overview</h2>
                <p className="text-sm text-muted-foreground">Current database statistics</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const res = await fetch(`${API_BASE}/stats`);
                  if (res.ok) setStats(await res.json());
                  toast.success("Stats refreshed");
                }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Refresh
              </Button>
            </div>
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="text-2xl font-bold font-mono text-foreground">{stats.total_logs.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Total Logs</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="text-2xl font-bold font-mono text-warning">{stats.total_alerts.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Alerts</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="text-2xl font-bold font-mono text-destructive">{stats.high_risk_count.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">High Risk</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="text-2xl font-bold font-mono text-secondary">{stats.anomaly_count.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Anomalies</p>
                </div>
              </div>
            )}
          </div>

          {/* Log Retention */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-secondary/20">
                <Clock className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Log Retention</h2>
                <p className="text-sm text-muted-foreground">Configure how long data is kept</p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="flex justify-between mb-2">
                <Label className="text-foreground">Retention Period</Label>
                <Badge variant="outline" className="font-mono">
                  {settings.log_retention_days} days
                </Badge>
              </div>
              <Select
                value={String(settings.log_retention_days)}
                onValueChange={(val) => handleUpdate("log_retention_days", parseInt(val))}
              >
                <SelectTrigger className="w-full bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days (default)</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data Management */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-destructive/20">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Data Management</h2>
                <p className="text-sm text-muted-foreground">Clear stored data from MongoDB</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <Label className="text-foreground">Clear Network Logs</Label>
                  <p className="text-xs text-muted-foreground">
                    Remove all {stats?.total_logs.toLocaleString() || 0} ingested logs
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  disabled={clearing}
                  onClick={() => handleClearData("logs")}
                >
                  {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                  Clear Logs
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <div>
                  <Label className="text-destructive font-semibold">Clear Everything</Label>
                  <p className="text-xs text-muted-foreground">
                    Remove all logs, alerts, and incidents — cannot be undone
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={clearing}
                  onClick={() => handleClearData("all")}
                >
                  {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                  Clear All
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
