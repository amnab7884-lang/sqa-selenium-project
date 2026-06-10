import { Link } from "react-router-dom";
import {
  Globe, BarChart3, Zap, LifeBuoy, ArrowRight,
  Upload, Cpu, Bell, Shield, Brain, Bot, FileSearch
} from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import ParticleField from "@/components/landing/ParticleField";
import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Ingest Network Traffic",
    desc: "Upload PCAP files, connect live network feeds, or push data through our REST API. Supports CICIDS2017 feature format with 77 network flow features.",
    color: "#00d4ff",
    details: [
      "Drag-and-drop PCAP file upload",
      "CI/CD pipeline integration via curl",
      "Real-time flow ingestion API",
      "Batch processing for historical data"
    ]
  },
  {
    number: "02",
    icon: Brain,
    title: "AI Analyzes Every Flow",
    desc: "Each network flow passes through a dual ML pipeline — Random Forest for supervised classification and Isolation Forest for unsupervised anomaly detection.",
    color: "#e8b3ff",
    details: [
      "Random Forest: 99.7% accuracy (supervised)",
      "Isolation Forest: zero-day anomaly detection",
      "Risk score generated in <50ms per flow",
      "77-feature vector analysis per packet"
    ]
  },
  {
    number: "03",
    icon: Zap,
    title: "Attack Classification",
    desc: "A rule-based classification engine evaluates flow features to categorize traffic into 15+ specific attack types with confidence scoring.",
    color: "#3cd7ff",
    details: [
      "SYN Flood, UDP Flood, DDoS detection",
      "Port Scan & Stealth Scan identification",
      "Slowloris & HTTP Flood recognition",
      "DNS Amplification & Brute Force alerts"
    ]
  },
  {
    number: "04",
    icon: Bell,
    title: "Real-Time Alerts",
    desc: "Threats trigger instant alerts with severity levels, MITRE ATT&CK technique tags, and the specific attack type classification.",
    color: "#f4d4ff",
    details: [
      "Color-coded severity badges",
      "Attack type & category labels",
      "Confidence score per classification",
      "One-click IP blocking from alerts"
    ]
  },
  {
    number: "05",
    icon: Bot,
    title: "AI Copilot Responds",
    desc: "The Grok-powered AI Copilot provides contextual analysis, generates forensic reports, and suggests remediation actions in natural language.",
    color: "#00d4ff",
    details: [
      "Ask questions about any alert",
      "Auto-generated incident reports",
      "Playbook-style remediation steps",
      "Historical threat pattern analysis"
    ]
  },
  {
    number: "06",
    icon: FileSearch,
    title: "Forensic Investigation",
    desc: "Deep-dive into any IP with a complete forensic timeline showing all connections, risk events, and behavioral patterns over time.",
    color: "#e8b3ff",
    details: [
      "IP-level activity timelines",
      "Network relationship mapping",
      "Session reconstruction",
      "Exportable forensic reports"
    ]
  },
];

const pipeline = [
  { icon: Globe, label: "Traffic Source", sub: "PCAP / Live Feed / API" },
  { icon: Cpu, label: "ML Pipeline", sub: "RF + Isolation Forest" },
  { icon: BarChart3, label: "Risk Scoring", sub: "0.0 → 1.0 Scale" },
  { icon: Shield, label: "Classification", sub: "15+ Attack Types" },
  { icon: Bell, label: "Alert Engine", sub: "Real-time Notifications" },
  { icon: LifeBuoy, label: "AI Response", sub: "Copilot + Playbooks" },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#0f131d] text-[#dfe2f1] overflow-x-hidden noise-overlay relative">
      <div className="fixed inset-0 z-0 pointer-events-none"><ParticleField /></div>

      <div className="relative z-10">
        <LandingNavbar />

        {/* Hero */}
        <section className="pt-32 pb-20 text-center px-4">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#e8b3ff] mb-4 font-['Space_Grotesk',sans-serif]">How It Works</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-['Space_Grotesk',sans-serif] tracking-[-0.02em] leading-tight mb-6">
            From Ingestion to{" "}
            <span className="bg-gradient-to-r from-[#e8b3ff] to-[#3cd7ff] bg-clip-text text-transparent">Resolution</span>
          </h1>
          <p className="text-lg text-[#859398] max-w-2xl mx-auto">
            See how Intellihunt processes network traffic through a 6-stage AI pipeline to detect, classify, and respond to threats.
          </p>
        </section>

        {/* Pipeline Visualization */}
        <section className="pb-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="glass-card glass-frosted p-8 rounded-[1.25rem]">
              <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-[#3cd7ff] mb-6 font-['Space_Grotesk',sans-serif] text-center">Detection Pipeline</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {pipeline.map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="relative text-center group"
                  >
                    <div className="flex items-center justify-center w-14 h-14 mx-auto mb-3 rounded-xl bg-[#3cd7ff]/[0.08] border border-[#3cd7ff]/[0.12] group-hover:bg-[#3cd7ff]/[0.15] group-hover:border-[#3cd7ff]/[0.25] transition-all duration-500">
                      <p.icon className="w-6 h-6 text-[#3cd7ff]" />
                    </div>
                    <p className="text-xs font-semibold text-[#dfe2f1] font-['Space_Grotesk',sans-serif]">{p.label}</p>
                    <p className="text-[10px] text-[#859398] mt-1">{p.sub}</p>
                    {i < pipeline.length - 1 && (
                      <div className="hidden lg:block absolute top-7 left-[calc(100%-8px)] w-4 text-[#3cd7ff]/30">→</div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Steps */}
        <section className="pb-28 px-4">
          <div className="max-w-6xl mx-auto space-y-8">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true, margin: "-100px" }}
                className="glass-card glass-frosted p-8 md:p-10 group hover:border-white/[0.18] transition-all duration-500"
              >
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Step Number & Icon */}
                  <div className="flex-shrink-0 flex md:flex-col items-center gap-4">
                    <span className="text-5xl font-bold font-['Space_Grotesk',sans-serif] bg-gradient-to-b from-[#3cd7ff]/30 to-transparent bg-clip-text text-transparent">{s.number}</span>
                    <div
                      className="flex items-center justify-center w-14 h-14 rounded-xl transition-all duration-500 group-hover:scale-110"
                      style={{ background: `${s.color}12`, boxShadow: `0 0 0 1px ${s.color}18, 0 0 24px ${s.color}08` }}
                    >
                      <s.icon className="w-6 h-6" style={{ color: s.color }} />
                    </div>
                  </div>
                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-[#dfe2f1] mb-3 font-['Space_Grotesk',sans-serif]">{s.title}</h3>
                    <p className="text-sm text-[#859398] leading-relaxed mb-5 max-w-2xl">{s.desc}</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {s.details.map((d, j) => (
                        <div key={j} className="flex items-center gap-2.5 text-sm text-[#bbc9cf]">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}60` }} />
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-28 bg-[#0a0e18]/60 backdrop-blur-sm px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="glass-thick glass-frosted p-14 relative overflow-hidden">
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[#e8b3ff]/[0.06] rounded-full blur-[100px] pointer-events-none" />
              <h2 className="relative text-3xl sm:text-4xl font-bold font-['Space_Grotesk',sans-serif] mb-4 tracking-[-0.02em]">
                See the Pipeline in Action
              </h2>
              <p className="relative text-[#859398] mb-8 max-w-lg mx-auto">
                Start your free trial and ingest your first PCAP file in under 2 minutes.
              </p>
              <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/auth/signup"
                  className="inline-flex items-center gap-2 px-8 py-4 text-sm font-semibold text-white rounded-2xl bg-gradient-to-r from-[#00d4ff] to-[#9400D3] shadow-[0_0_40px_rgba(0,212,255,0.25)] hover:shadow-[0_0_60px_rgba(0,212,255,0.4)] transition-all duration-500 hover:scale-[1.03]"
                >
                  Start Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/docs"
                  className="inline-flex items-center gap-2 px-8 py-4 text-sm font-medium text-[#bbc9cf] rounded-2xl border border-white/[0.06] hover:border-[#3cd7ff]/20 hover:text-[#dfe2f1] transition-all duration-400"
                >
                  Read the Docs
                </Link>
              </div>
            </div>
          </div>
        </section>

        <LandingFooter />
      </div>
    </div>
  );
}
