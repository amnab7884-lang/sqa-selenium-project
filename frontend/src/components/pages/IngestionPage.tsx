import { useState, useEffect, useCallback, useRef } from "react";
import {
  Radio, Upload, Play, Square, Wifi, WifiOff,
  FileUp, CheckCircle2, AlertTriangle, Loader2,
  Shield, Activity, X, Eye, Clock, Zap, Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API_BASE = "http://localhost:8000";

/* ─── Types ───────────────────────────────────────────────── */
interface CaptureStatus {
  active: boolean;
  interface: string | null;
  started_at: string | null;
  flows_captured: number;
}

interface UploadResult {
  status: string;
  filename: string;
  results: { total: number; processed: number; alerts: number; errors: number };
}

/* ─── Elapsed Timer ───────────────────────────────────────── */
function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, "0");
      const s = (diff % 60).toString().padStart(2, "0");
      setElapsed(`${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return <span className="font-mono text-[#3cd7ff] text-lg">{elapsed}</span>;
}

/* ═══════════════════════════════════════════════════════════ */
/* ═══ MAIN INGESTION PAGE ═════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════ */
export default function IngestionPage() {
  /* ─── Live Capture State ──────────────────────────────── */
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>({
    active: false, interface: null, started_at: null, flows_captured: 0,
  });
  const [password, setPassword] = useState("");
  const [iface, setIface] = useState("en0");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [captureLoading, setCaptureLoading] = useState(false);

  /* ─── File Upload State ──────────────────────────────── */
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ─── Poll capture status ────────────────────────────── */
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/capture/status`);
        if (res.ok) setCaptureStatus(await res.json());
      } catch { /* backend offline */ }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

  /* ─── Live Capture Handlers ──────────────────────────── */
  const handleStartCapture = async () => {
    setCaptureLoading(true);
    try {
      const form = new FormData();
      form.append("interface", iface);
      form.append("password", password);

      const res = await fetch(`${API_BASE}/capture/start`, { method: "POST", body: form });
      if (res.ok) {
        toast.success("Live capture started!", { description: `Listening on ${iface}` });
        setShowPasswordModal(false);
        setPassword("");
      } else {
        const err = await res.json();
        toast.error("Failed to start capture", { description: err.detail || "Unknown error" });
      }
    } catch {
      toast.error("Backend unreachable");
    } finally {
      setCaptureLoading(false);
    }
  };

  const handleStopCapture = async () => {
    setCaptureLoading(true);
    try {
      const res = await fetch(`${API_BASE}/capture/stop`, { method: "POST" });
      if (res.ok) {
        toast.success("Live capture stopped");
      } else {
        const err = await res.json();
        toast.error("Failed to stop", { description: err.detail });
      }
    } catch {
      toast.error("Backend unreachable");
    } finally {
      setCaptureLoading(false);
    }
  };

  /* ─── File Upload Handlers ───────────────────────────── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) { setUploadFile(file); setUploadResult(null); }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setUploadFile(file); setUploadResult(null); }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadResult(null);

    try {
      const form = new FormData();
      form.append("file", uploadFile);

      const res = await fetch(`${API_BASE}/upload-file`, { method: "POST", body: form });

      if (res.ok) {
        const data: UploadResult = await res.json();
        setUploadResult(data);
        if (data.results && (data.results as any).status === "cancelled") {
            toast.warning(`Processing cancelled after ${data.results.processed} flows`, {
                description: `${data.results.alerts} alerts generated`,
            });
        } else {
            toast.success(`Processed ${data.results.processed} flows`, {
            description: `${data.results.alerts} alerts generated`,
            });
        }
      } else {
        const err = await res.json();
        toast.error("Upload failed", { description: err.detail });
      }
    } catch {
      toast.error("Backend unreachable");
    } finally {
      setUploading(false);
    }
  };

  const handleCancelUpload = async () => {
    try {
      const res = await fetch(`${API_BASE}/upload-file/cancel`, { method: "POST" });
      if (res.ok) {
        toast.info("Sent cancellation request to server...");
      } else {
        toast.error("Failed to cancel upload");
      }
    } catch {
      toast.error("Backend unreachable");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /* ─── Render ─────────────────────────────────────────── */
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#dfe2f1] font-['Space_Grotesk',sans-serif] tracking-[-0.02em]">
          Traffic Ingestion
        </h1>
        <p className="text-sm text-[#859398] mt-1">
          Capture live network traffic or upload files for ML-powered threat analysis
        </p>
      </div>

      {/* ═══ Two-Column Layout ══════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ─── LIVE CAPTURE CARD ───────────────────────────── */}
        <div className="glass-thick glass-frosted p-6 space-y-5" style={{ borderRadius: "1.25rem" }}>
          {/* Card header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#3cd7ff]/10">
                <Radio className="h-5 w-5 text-[#3cd7ff]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#dfe2f1] font-['Space_Grotesk',sans-serif]">
                  Live Traffic Capture
                </h2>
                <p className="text-[11px] text-[#859398]">
                  Monitor your network interface in real-time
                </p>
              </div>
            </div>
            {/* Status badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold ${
              captureStatus.active
                ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20"
                : "bg-[#3c494e]/20 text-[#859398] border border-white/5"
            }`}>
              {captureStatus.active ? (
                <><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]" /></span> Capturing</>
              ) : (
                <><WifiOff className="h-3 w-3" /> Idle</>
              )}
            </div>
          </div>

          {/* Separator */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

          {/* Active Capture Panel */}
          {captureStatus.active ? (
            <div className="space-y-4">
              {/* Live metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="glass-thin p-3 text-center" style={{ borderRadius: "0.75rem" }}>
                  <Wifi className="h-4 w-4 text-[#22c55e] mx-auto mb-1" />
                  <p className="text-[10px] text-[#859398] uppercase tracking-wider">Interface</p>
                  <p className="text-sm font-bold text-[#dfe2f1] font-mono">{captureStatus.interface}</p>
                </div>
                <div className="glass-thin p-3 text-center" style={{ borderRadius: "0.75rem" }}>
                  <Clock className="h-4 w-4 text-[#3cd7ff] mx-auto mb-1" />
                  <p className="text-[10px] text-[#859398] uppercase tracking-wider">Elapsed</p>
                  {captureStatus.started_at && <ElapsedTimer startedAt={captureStatus.started_at} />}
                </div>
                <div className="glass-thin p-3 text-center" style={{ borderRadius: "0.75rem" }}>
                  <Activity className="h-4 w-4 text-[#e8b3ff] mx-auto mb-1" />
                  <p className="text-[10px] text-[#859398] uppercase tracking-wider">Status</p>
                  <p className="text-sm font-bold text-[#22c55e]">Analyzing</p>
                </div>
              </div>

              {/* Animated scanning bar */}
              <div className="relative overflow-hidden rounded-lg h-1.5 bg-white/[0.03]">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#3cd7ff]/40 to-transparent animate-scan" />
              </div>

              <p className="text-center text-[11px] text-[#859398]">
                Flows are being captured from <span className="text-[#3cd7ff] font-mono">{captureStatus.interface}</span> and analyzed by the dual ML engine in real-time.
                Check your <span className="text-[#e8b3ff]">Dashboard</span> and <span className="text-[#e8b3ff]">Alerts</span> pages for results.
              </p>

              {/* Stop button */}
              <Button
                onClick={handleStopCapture}
                disabled={captureLoading}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 transition-all"
              >
                {captureLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Square className="h-4 w-4 mr-2" />}
                Stop Capture
              </Button>
            </div>
          ) : (
            /* Idle Panel */
            <div className="space-y-4">
              {/* Interface selector */}
              <div>
                <label className="text-[11px] text-[#859398] uppercase tracking-wider mb-1.5 block">
                  Network Interface
                </label>
                <select
                  value={iface}
                  onChange={(e) => setIface(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-[#dfe2f1] bg-white/[0.03] border border-white/[0.06] focus:border-[#3cd7ff]/30 focus:outline-none transition-all appearance-none"
                >
                  <option value="en0">en0 — Wi-Fi (Default)</option>
                  <option value="en1">en1 — Ethernet</option>
                  <option value="lo0">lo0 — Loopback</option>
                  <option value="any">any — All Interfaces</option>
                </select>
              </div>

              {/* Info box */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#3cd7ff]/[0.04] border border-[#3cd7ff]/10">
                <Shield className="h-4 w-4 text-[#3cd7ff] mt-0.5 shrink-0" />
                <p className="text-[11px] text-[#859398] leading-relaxed">
                  Live capture requires <span className="text-[#dfe2f1]">administrator privileges</span> to access the network interface. 
                  You will be prompted for your system password.
                </p>
              </div>

              {/* Start button */}
              <Button
                onClick={() => setShowPasswordModal(true)}
                className="w-full bg-gradient-to-r from-[#00d4ff]/20 to-[#9400D3]/20 hover:from-[#00d4ff]/30 hover:to-[#9400D3]/30 text-[#dfe2f1] border border-[#3cd7ff]/15 hover:border-[#3cd7ff]/30 transition-all"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Analyzing Live Traffic
              </Button>
            </div>
          )}
        </div>

        {/* ─── FILE UPLOAD CARD ────────────────────────────── */}
        <div className="glass-thick glass-frosted p-6 space-y-5" style={{ borderRadius: "1.25rem" }}>
          {/* Card header */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#e8b3ff]/10">
              <Upload className="h-5 w-5 text-[#e8b3ff]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#dfe2f1] font-['Space_Grotesk',sans-serif]">
                Upload File
              </h2>
              <p className="text-[11px] text-[#859398]">
                Ingest PCAP, JSON, or CSV files into the system
              </p>
            </div>
          </div>

          {/* Separator */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
              isDragging
                ? "border-[#e8b3ff]/40 bg-[#e8b3ff]/[0.04] scale-[1.01]"
                : uploadFile
                ? "border-[#22c55e]/20 bg-[#22c55e]/[0.02]"
                : "border-white/[0.06] bg-white/[0.01] hover:border-[#e8b3ff]/20 hover:bg-[#e8b3ff]/[0.02]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pcap,.pcapng,.json,.csv,.bz2"
              onChange={handleFileSelect}
              className="hidden"
            />

            {uploadFile ? (
              <div className="space-y-2">
                <CheckCircle2 className="h-10 w-10 text-[#22c55e] mx-auto" />
                <p className="text-sm font-medium text-[#dfe2f1]">{uploadFile.name}</p>
                <p className="text-[11px] text-[#859398]">{formatFileSize(uploadFile.size)}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setUploadFile(null); setUploadResult(null); }}
                  className="text-[11px] text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-[#e8b3ff]/[0.06] flex items-center justify-center">
                  <FileUp className="h-7 w-7 text-[#e8b3ff]/60" />
                </div>
                <div>
                  <p className="text-sm text-[#dfe2f1]">
                    Drop file here or <span className="text-[#e8b3ff]">browse</span>
                  </p>
                  <p className="text-[11px] text-[#3c494e] mt-1">
                    Supports .pcap, .pcapng, .json, .csv, .bz2
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Upload Button */}
          {uploadFile && !uploadResult && !uploading && (
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-gradient-to-r from-[#e8b3ff]/20 to-[#9400D3]/20 hover:from-[#e8b3ff]/30 hover:to-[#9400D3]/30 text-[#dfe2f1] border border-[#e8b3ff]/15 hover:border-[#e8b3ff]/30 transition-all"
            >
              <Zap className="h-4 w-4 mr-2" /> Analyze File
            </Button>
          )}

          {uploadFile && !uploadResult && uploading && (
            <div className="space-y-3">
              <Button
                disabled
                className="w-full bg-gradient-to-r from-[#e8b3ff]/20 to-[#9400D3]/20 text-[#dfe2f1] border border-[#e8b3ff]/15 transition-all"
              >
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing {uploadFile.name}...
              </Button>
              <Button
                onClick={handleCancelUpload}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 transition-all"
              >
                <Square className="h-4 w-4 mr-2" /> Stop Processing
              </Button>
            </div>
          )}

          {/* Upload Results */}
          {uploadResult && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-[#22c55e]">
                {uploadResult.results && (uploadResult.results as any).status === "cancelled" ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-[#f59e0b]" />
                    <span className="text-sm font-semibold text-[#f59e0b]">Analysis Cancelled</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-semibold">Analysis Complete</span>
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-thin p-3 text-center" style={{ borderRadius: "0.75rem" }}>
                  <p className="text-[10px] text-[#859398] uppercase">Flows Processed</p>
                  <p className="text-lg font-bold text-[#3cd7ff] font-mono">{uploadResult.results.processed}</p>
                </div>
                <div className="glass-thin p-3 text-center" style={{ borderRadius: "0.75rem" }}>
                  <p className="text-[10px] text-[#859398] uppercase">Alerts Generated</p>
                  <p className="text-lg font-bold text-[#ef4444] font-mono">{uploadResult.results.alerts}</p>
                </div>
                <div className="glass-thin p-3 text-center" style={{ borderRadius: "0.75rem" }}>
                  <p className="text-[10px] text-[#859398] uppercase">Total in File</p>
                  <p className="text-lg font-bold text-[#dfe2f1] font-mono">{uploadResult.results.total}</p>
                </div>
                <div className="glass-thin p-3 text-center" style={{ borderRadius: "0.75rem" }}>
                  <p className="text-[10px] text-[#859398] uppercase">Errors</p>
                  <p className={`text-lg font-bold font-mono ${uploadResult.results.errors > 0 ? "text-[#f59e0b]" : "text-[#22c55e]"}`}>
                    {uploadResult.results.errors}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setUploadFile(null); setUploadResult(null); }}
                className="w-full text-xs border-white/[0.06] hover:border-[#e8b3ff]/20 bg-transparent text-[#bbc9cf]"
              >
                Upload Another File
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Supported Formats Info ────────────────────────── */}
      <div className="glass-thick glass-frosted p-5" style={{ borderRadius: "1.25rem" }}>
        <h3 className="text-sm font-bold text-[#dfe2f1] mb-3 font-['Space_Grotesk',sans-serif]">
          Supported Ingestion Methods
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Radio, color: "#3cd7ff", title: "Live Capture (NFStream)",
              desc: "Hooks into your NIC to capture & analyze packets in real-time. Requires root.",
            },
            {
              icon: FileUp, color: "#e8b3ff", title: "PCAP / PCAPNG Files",
              desc: "Upload packet capture files from Wireshark, tcpdump, or other tools.",
            },
            {
              icon: Server, color: "#22c55e", title: "JSON / CSV Log Files",
              desc: "Upload structured network flow data with CICIDS2017-compatible columns.",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.01]">
              <div className="p-2 rounded-lg shrink-0" style={{ background: `${item.color}10` }}>
                <item.icon className="h-4 w-4" style={{ color: item.color }} />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#dfe2f1]">{item.title}</p>
                <p className="text-[11px] text-[#859398] leading-relaxed mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Password Modal ═══════════════════════════════════ */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md" style={{ animation: "fadeInUp 0.3s cubic-bezier(0.22,1,0.36,1) forwards" }}>
          <div className="w-full max-w-md glass-thick glass-frosted p-6 space-y-5" style={{ borderRadius: "1.5rem" }}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#3cd7ff]/10">
                  <Shield className="h-5 w-5 text-[#3cd7ff]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#dfe2f1] font-['Space_Grotesk',sans-serif]">
                    Authentication Required
                  </h2>
                  <p className="text-[11px] text-[#859398]">
                    Enter your system password to enable packet capture
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowPasswordModal(false); setPassword(""); }} className="p-2 rounded-lg text-[#3c494e] hover:text-[#dfe2f1] hover:bg-white/[0.04] transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="h-[1px] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

            {/* Info */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#f59e0b]/[0.04] border border-[#f59e0b]/10">
              <AlertTriangle className="h-4 w-4 text-[#f59e0b] mt-0.5 shrink-0" />
              <p className="text-[11px] text-[#859398] leading-relaxed">
                Your password is used <span className="text-[#dfe2f1]">only once</span> to start the capture process with elevated privileges.
                It is <span className="text-[#dfe2f1]">never stored</span> anywhere.
              </p>
            </div>

            {/* Interface display */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <Wifi className="h-3.5 w-3.5 text-[#3cd7ff]" />
              <span className="text-[11px] text-[#859398]">Interface:</span>
              <span className="text-[12px] text-[#dfe2f1] font-mono">{iface}</span>
            </div>

            {/* Password input */}
            <div>
              <label className="text-[11px] text-[#859398] uppercase tracking-wider mb-1.5 block">
                System Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && password && handleStartCapture()}
                placeholder="Enter your macOS password"
                autoFocus
                className="w-full px-3 py-2.5 rounded-lg text-sm text-[#dfe2f1] bg-white/[0.03] border border-white/[0.06] focus:border-[#3cd7ff]/30 focus:outline-none placeholder:text-[#3c494e] transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setShowPasswordModal(false); setPassword(""); }}
                className="flex-1 border-white/[0.06] bg-transparent text-[#bbc9cf] hover:text-[#dfe2f1]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStartCapture}
                disabled={!password || captureLoading}
                className="flex-1 bg-gradient-to-r from-[#00d4ff]/20 to-[#9400D3]/20 hover:from-[#00d4ff]/30 hover:to-[#9400D3]/30 text-[#dfe2f1] border border-[#3cd7ff]/15 hover:border-[#3cd7ff]/30 transition-all disabled:opacity-40"
              >
                {captureLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting...</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" /> Start Capture</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
