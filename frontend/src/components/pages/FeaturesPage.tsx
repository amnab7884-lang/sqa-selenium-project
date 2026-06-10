import { Link } from "react-router-dom";
import {
  Shield, Brain, Activity, Lock, FileSearch, MessageSquare,
  ArrowRight, CheckCircle2, BarChart3, Zap, Eye, Server,
  AlertTriangle, Network, Database, Cpu
} from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import ParticleField from "@/components/landing/ParticleField";
import { motion } from "framer-motion";

const coreFeatures = [
  {
    icon: Shield,
    title: "Real-Time DDoS Detection",
    desc: "Identify volumetric, application-layer, and amplification attacks instantly with dual ML models — Random Forest and Isolation Forest working in ensemble.",
    color: "#00d4ff",
    details: [
      "SYN Flood, UDP Flood, Slowloris detection",
      "Sub-50ms classification latency",
      "15+ attack type categories",
      "CICIDS2017-trained models"
    ]
  },
  {
    icon: Brain,
    title: "ML-Based Threat Analysis",
    desc: "Advanced machine learning using ensemble models trained on the CICIDS2017 dataset with 77 network flow features for 99.7% detection accuracy.",
    color: "#e8b3ff",
    details: [
      "Random Forest classifier (supervised)",
      "Isolation Forest anomaly detector",
      "77-feature network flow analysis",
      "Real-time risk scoring (0.0 – 1.0)"
    ]
  },
  {
    icon: MessageSquare,
    title: "AI Copilot for Response",
    desc: "Grok-powered AI assistant for real-time incident investigation, contextual threat summaries, and automated remediation playbooks.",
    color: "#3cd7ff",
    details: [
      "Natural language threat queries",
      "Auto-generated forensic reports",
      "MITRE ATT&CK technique mapping",
      "Remediation action suggestions"
    ]
  },
  {
    icon: FileSearch,
    title: "Network Forensic Timeline",
    desc: "Deep-dive into IP-level forensic timelines with packet-level analysis, behavioral pattern detection, and complete audit trails.",
    color: "#f4d4ff",
    details: [
      "IP-to-IP communication graphs",
      "Temporal attack pattern analysis",
      "Full session reconstruction",
      "Evidence-grade logging"
    ]
  },
  {
    icon: Activity,
    title: "Live Traffic Monitoring",
    desc: "Ingest live network captures or PCAP files with real-time analysis, protocol breakdown, and continuous anomaly scoring.",
    color: "#00d4ff",
    details: [
      "PCAP file upload & analysis",
      "CI/CD pipeline integration",
      "Real-time flow ingestion API",
      "Protocol-level breakdown"
    ]
  },
  {
    icon: Lock,
    title: "Enterprise-Grade Security",
    desc: "SOC 2 Type II compliant with end-to-end encryption, role-based access control, audit logging, and team-based access management.",
    color: "#e8b3ff",
    details: [
      "Role-based access control (RBAC)",
      "Full audit trail & activity logs",
      "Team management & invitations",
      "Encrypted data at rest & transit"
    ]
  },
];

const additionalCapabilities = [
  { icon: AlertTriangle, title: "Smart Alert Classification", desc: "Rule-based engine classifies attacks into 15+ categories with confidence scoring." },
  { icon: Network, title: "IP Blocklist Management", desc: "One-click blocking with automated firewall rule integration and allowlist management." },
  { icon: Database, title: "Threat Intelligence Feeds", desc: "Built-in threat intel with MITRE ATT&CK mapping and IOC correlation." },
  { icon: BarChart3, title: "Executive Dashboards", desc: "Real-time KPI cards, anomaly charts, and trend analysis with glassmorphic UI." },
  { icon: Cpu, title: "ML Model Observatory", desc: "Monitor model performance, drift metrics, and retrain triggers from one view." },
  { icon: Eye, title: "Incident Workflow", desc: "Severity-based triage, status tracking, and team assignment for every alert." },
  { icon: Server, title: "REST API & Webhooks", desc: "Full REST API for integration with SIEM, SOAR, and custom workflows." },
  { icon: Zap, title: "Automated Weekly Reports", desc: "AI-generated threat trend reports delivered to your inbox every Monday." },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#0f131d] text-[#dfe2f1] overflow-x-hidden noise-overlay relative">
      <div className="fixed inset-0 z-0 pointer-events-none"><ParticleField /></div>
      
      <div className="relative z-10">
        <LandingNavbar />

        {/* Hero */}
        <section className="pt-32 pb-20 text-center px-4">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#3cd7ff] mb-4 font-['Space_Grotesk',sans-serif]">Platform Capabilities</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-['Space_Grotesk',sans-serif] tracking-[-0.02em] leading-tight mb-6">
            Every Feature You Need to{" "}
            <span className="bg-gradient-to-r from-[#00d4ff] to-[#9400D3] bg-clip-text text-transparent">Hunt Threats</span>
          </h1>
          <p className="text-lg text-[#859398] max-w-2xl mx-auto">
            A complete AI-powered cybersecurity platform built for modern SOC teams. From ingestion to resolution.
          </p>
        </section>

        {/* Core Features Grid */}
        <section className="pb-28 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coreFeatures.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  className="glass-card glass-frosted p-8 group hover:border-white/[0.18] transition-all duration-500"
                >
                  <div
                    className="flex items-center justify-center w-14 h-14 rounded-xl mb-6 transition-all duration-500 group-hover:scale-110"
                    style={{ background: `${f.color}12`, boxShadow: `0 0 0 1px ${f.color}18, 0 0 20px ${f.color}08` }}
                  >
                    <f.icon className="w-6 h-6" style={{ color: f.color }} />
                  </div>
                  <h3 className="text-xl font-semibold text-[#dfe2f1] mb-3 font-['Space_Grotesk',sans-serif]">{f.title}</h3>
                  <p className="text-sm text-[#859398] leading-relaxed mb-5">{f.desc}</p>
                  <ul className="space-y-2.5">
                    {f.details.map((d, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-[#bbc9cf]">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: f.color }} />
                        {d}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Additional Capabilities */}
        <section className="py-28 bg-[#0a0e18]/60 backdrop-blur-sm px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#e8b3ff] mb-4 font-['Space_Grotesk',sans-serif]">And More</span>
              <h2 className="text-3xl sm:text-4xl font-bold font-['Space_Grotesk',sans-serif] tracking-[-0.02em]">
                Additional Capabilities
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {additionalCapabilities.map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  viewport={{ once: true }}
                  className="glass-card glass-frosted p-6 group hover:border-white/[0.18] transition-all duration-500"
                >
                  <c.icon className="w-5 h-5 text-[#3cd7ff] mb-4" />
                  <h4 className="text-sm font-semibold text-[#dfe2f1] mb-2 font-['Space_Grotesk',sans-serif]">{c.title}</h4>
                  <p className="text-xs text-[#859398] leading-relaxed">{c.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-28 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="glass-thick glass-frosted p-14 relative overflow-hidden">
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[#00d4ff]/[0.06] rounded-full blur-[100px] pointer-events-none" />
              <h2 className="relative text-3xl sm:text-4xl font-bold font-['Space_Grotesk',sans-serif] mb-4 tracking-[-0.02em]">
                Ready to See It in Action?
              </h2>
              <p className="relative text-[#859398] mb-8 max-w-lg mx-auto">
                Start your free 14-day trial with full access to every feature.
              </p>
              <Link
                to="/auth/signup"
                className="relative inline-flex items-center gap-2 px-8 py-4 text-sm font-semibold text-white rounded-2xl bg-gradient-to-r from-[#00d4ff] to-[#9400D3] shadow-[0_0_40px_rgba(0,212,255,0.25)] hover:shadow-[0_0_60px_rgba(0,212,255,0.4)] transition-all duration-500 hover:scale-[1.03]"
              >
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        <LandingFooter />
      </div>
    </div>
  );
}
