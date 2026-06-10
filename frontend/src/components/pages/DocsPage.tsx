import { useState } from "react";
import {
  Book, Terminal, Shield, Database, Brain, Zap, Settings, Users,
  ChevronRight, Search, ExternalLink, Copy, CheckCircle2,
  FileText, Code, Network, MessageSquare
} from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import ParticleField from "@/components/landing/ParticleField";
import { motion } from "framer-motion";

const categories = [
  {
    title: "Getting Started",
    icon: Book,
    color: "#3cd7ff",
    docs: [
      { title: "Quick Start Guide", desc: "Set up Intellihunt in under 5 minutes", time: "5 min", code: "git clone https://github.com/intellihunt/intellihunt.git\ncd intellihunt\n./start_demo.sh" },
      { title: "Installation", desc: "Docker deployment options", time: "10 min", code: "docker-compose -f docker-compose.prod.yml up -d" },
      { title: "Configuration", desc: "Environment variables and .env setup", time: "8 min", code: "cp .env.example .env\nexport MONGO_URI='mongodb://localhost:27017/intellihunt'" },
      { title: "First Threat Hunt", desc: "Ingest your first PCAP and detect threats", time: "15 min", code: "curl -X POST http://localhost:8000/api/ingest -F 'file=@test_traffic.pcap'" },
    ],
  },
  {
    title: "Traffic Ingestion",
    icon: Network,
    color: "#e8b3ff",
    docs: [
      { title: "PCAP File Analysis", desc: "Upload and analyze network captures", time: "8 min", code: "import requests\n\nwith open('traffic.pcap', 'rb') as f:\n    res = requests.post('http://localhost:8000/api/analyze', files={'pcap': f})\n    print(res.json())" },
      { title: "Live Network Capture", desc: "Real-time packet capture with sudo access", time: "12 min", code: "sudo tcpdump -i eth0 -w live_capture.pcap -G 60" },
      { title: "REST API Push", desc: "Pushing JSON payloads from external sensors", time: "15 min", code: "curl -X POST http://localhost:8000/api/flow \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"src_ip\": \"192.168.1.5\", \"dst_port\": 80, \"protocol\": \"TCP\"}'" },
      { title: "CICIDS2017 Format", desc: "Data schema required for feature ingestion", time: "10 min", code: "{\n  \"Flow Duration\": 120000,\n  \"Total Fwd Packets\": 10,\n  \"Total Backward Packets\": 5\n}" },
    ],
  },
  {
    title: "ML Pipeline & Architecture",
    icon: Brain,
    color: "#3cd7ff",
    docs: [
      { title: "Dual Model Architecture", desc: "Random Forest + Isolation Forest explained", time: "15 min", code: "from sklearn.ensemble import RandomForestClassifier, IsolationForest\n\nrf = RandomForestClassifier(n_estimators=100)\niforest = IsolationForest(contamination=0.01)" },
      { title: "Feature Extraction", desc: "Extracting 77 network features per flow", time: "20 min", code: "def extract_features(pcap_file):\n    # Extracts CICFlowMeter compatible features\n    return flow_features" },
      { title: "Anomaly Scoring System", desc: "How risk scores (0.0 - 1.0) are calculated", time: "12 min", code: "def calculate_risk(rf_prob, iforest_score):\n    return (rf_prob * 0.7) + (normalize(iforest_score) * 0.3)" },
    ],
  },
  {
    title: "Attack Classifications",
    icon: Shield,
    color: "#f4d4ff",
    docs: [
      { title: "DDoS Categories", desc: "Volumetric, application-layer, and amplification", time: "10 min", code: "{\n  \"attack_type\": \"DDoS\",\n  \"sub_type\": \"SYN Flood\",\n  \"mitre_tactic\": \"TA0040\"\n}" },
      { title: "Port Scanning & Recon", desc: "Detecting NMAP and stealth scans", time: "8 min", code: "# Alert Triggered\n[WARNING] Excessive SYN packets from 10.0.0.5 to multiple destination ports." },
      { title: "Brute Force Attacks", desc: "SSH and FTP brute force detection mechanisms", time: "12 min", code: "# Detect SSH Brute Force\nfail2ban-client status sshd" },
    ],
  },
  {
    title: "API Reference",
    icon: Code,
    color: "#3cd7ff",
    docs: [
      { title: "REST API Overview", desc: "Base URLs, authentication, rate limits", time: "8 min", code: "Authorization: Bearer <YOUR_API_KEY>\nX-RateLimit-Limit: 1000" },
      { title: "/api/alerts", desc: "Endpoint for retrieving threat alerts", time: "10 min", code: "fetch('/api/alerts?severity=high')\n  .then(res => res.json())\n  .then(data => console.log(data));" },
      { title: "Webhooks", desc: "Real-time event notifications setup", time: "10 min", code: "app.post('/webhook', (req, res) => {\n  const alert = req.body;\n  notifySecurityTeam(alert);\n  res.sendStatus(200);\n});" },
    ],
  },
];

const quickLinks = [
  { icon: Terminal, label: "API Reference", desc: "REST API docs", href: "#" },
  { icon: Database, label: "Data Schemas", desc: "MongoDB schemas", href: "#" },
  { icon: Shield, label: "Security", desc: "Best practices", href: "#" },
  { icon: Users, label: "Community", desc: "Forums & Discord", href: "#" },
];

export default function DocsPage() {
  const [search, setSearch] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  const filteredCategories = search
    ? categories.map(cat => ({
        ...cat,
        docs: cat.docs.filter(
          d => d.title.toLowerCase().includes(search.toLowerCase()) ||
               d.desc.toLowerCase().includes(search.toLowerCase())
        )
      })).filter(cat => cat.docs.length > 0)
    : categories;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0f131d] text-[#dfe2f1] relative">
      <div className="fixed inset-0 z-0 pointer-events-none"><ParticleField /></div>
      <div className="relative z-10">
      <LandingNavbar />

      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute top-24 right-1/3 w-[500px] h-[300px] bg-[#00d4ff]/[0.04] rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#3cd7ff] mb-3">Documentation</span>
          <h1 className="text-4xl sm:text-5xl font-bold font-['Space_Grotesk',sans-serif] tracking-tight mb-4">
            Explore the{" "}
            <span className="bg-gradient-to-r from-[#00d4ff] to-[#9400D3] bg-clip-text text-transparent">Docs</span>
          </h1>
          <p className="text-lg text-[#859398] max-w-xl mx-auto mb-8">
            Everything you need to integrate, configure, and master Intellihunt.
          </p>

          {/* Search */}
          <div className="max-w-lg mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3c494e]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documentation..."
              className="w-full pl-11 pr-4 py-3.5 text-sm text-[#dfe2f1] bg-[#1c1f2a]/60 border border-white/[0.05] rounded-xl placeholder:text-[#3c494e] focus:outline-none focus:border-[#3cd7ff]/40 focus:shadow-[0_0_0_3px_rgba(60,215,255,0.08)] transition-all duration-200"
            />
          </div>
        </div>
      </section>

      {/* Quick Start Code Block */}
      <section className="pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="rounded-xl bg-[#0a0e18] border border-white/[0.04] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#171b26] border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ef4444]/80" />
                <div className="w-3 h-3 rounded-full bg-[#f59e0b]/80" />
                <div className="w-3 h-3 rounded-full bg-[#22c55e]/80" />
                <span className="ml-2 text-xs text-[#3c494e] font-mono">Quick Start</span>
              </div>
              <button
                onClick={() => handleCopy("git clone https://github.com/intellihunt/intellihunt.git\ncd intellihunt\ncp .env.example .env\n./start_demo.sh")}
                className="flex items-center gap-1 text-xs text-[#859398] hover:text-[#3cd7ff] transition-colors"
              >
                {copiedCode ? <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="p-5 text-sm font-mono text-[#bbc9cf] overflow-x-auto leading-relaxed">
              <code>
                <span className="text-[#859398]"># Clone & set up Intellihunt</span>{"\n"}
                <span className="text-[#22c55e]">$</span> git clone https://github.com/intellihunt/intellihunt.git{"\n"}
                <span className="text-[#22c55e]">$</span> cd intellihunt{"\n"}
                <span className="text-[#22c55e]">$</span> cp .env.example .env{"\n"}
                <span className="text-[#22c55e]">$</span> ./start_demo.sh{"\n"}
                {"\n"}
                <span className="text-[#859398]"># 🚀 Backend API:   http://localhost:8000</span>{"\n"}
                <span className="text-[#859398]"># 📊 Dashboard:     http://localhost:8080</span>
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link, i) => (
              <motion.a
                key={i}
                href={link.href}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                viewport={{ once: true }}
                className="flex items-center gap-3 p-4 rounded-xl bg-[#1c1f2a]/50 border border-white/[0.03] hover:border-[#3cd7ff]/10 transition-all duration-300 group"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#3cd7ff]/10">
                  <link.icon className="w-4 h-4 text-[#3cd7ff]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#dfe2f1]">{link.label}</div>
                  <div className="text-xs text-[#3c494e]">{link.desc}</div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[#3c494e] group-hover:text-[#3cd7ff] transition-colors" />
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Documentation Grid */}
      <section className="pb-24 lg:pb-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((cat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true, margin: "-50px" }}
                className="rounded-2xl bg-[#1c1f2a]/50 border border-white/[0.03] overflow-hidden"
              >
                <div className="p-6 border-b border-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: `${cat.color}15` }}>
                      <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
                    </div>
                    <h3 className="text-base font-semibold font-['Space_Grotesk',sans-serif]">{cat.title}</h3>
                  </div>
                </div>
                <div className="divide-y divide-white/[0.02]">
                  {cat.docs.map((doc, j) => (
                    <div key={j} className="flex flex-col">
                      <button
                        onClick={() => setExpandedDoc(expandedDoc === doc.title ? null : doc.title)}
                        className="flex items-center gap-3 px-6 py-3.5 hover:bg-white/[0.02] transition-colors group w-full text-left"
                      >
                        <FileText className="w-4 h-4 text-[#3c494e] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[#bbc9cf] group-hover:text-[#dfe2f1] transition-colors truncate">
                            {doc.title}
                          </div>
                          <div className="text-xs text-[#3c494e] truncate">{doc.desc}</div>
                        </div>
                        <span className="text-[10px] text-[#3c494e] shrink-0">{doc.time}</span>
                        <ChevronRight className={`w-3.5 h-3.5 text-[#3c494e] transition-transform ${expandedDoc === doc.title ? 'rotate-90' : 'opacity-0 group-hover:opacity-100'}`} />
                      </button>
                      {expandedDoc === doc.title && doc.code && (
                        <div className="px-6 py-4 bg-[#0a0e18]/80 border-t border-white/[0.02]">
                          <pre className="p-4 rounded-xl bg-[#171b26] border border-white/[0.04] text-xs font-mono text-[#3cd7ff] overflow-x-auto">
                            <code>{doc.code}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <LandingFooter />
      </div>
    </div>
  );
}
