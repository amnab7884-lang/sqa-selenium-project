import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Shield, Crosshair, Brain, Activity,
  ChevronRight, Play, CheckCircle2, ArrowRight,
  BarChart3, Lock, Globe, Zap,
  FileSearch, MessageSquare, LifeBuoy, Star
} from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import ParticleField from "@/components/landing/ParticleField";

/* ─── Intersection Observer Hook ──────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── Animated Counter ────────────────────────────────────── */
function Counter({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useInView();
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [visible, end, duration]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}



/* ─── Section with Scroll Reveal ──────────────────────────── */
function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  const { ref, visible } = useInView(0.08);
  return (
    <section
      id={id}
      ref={ref}
      className={`transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"} ${className}`}
    >
      {children}
    </section>
  );
}

/* ─── 3D Tilt Card ────────────────────────────────────────── */
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouse = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
  }, []);

  const handleLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) translateY(0px)";
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      className={`transition-transform duration-300 ease-out ${className}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}

/* ─── Data ────────────────────────────────────────────────── */
const features = [
  { icon: Shield, title: "Real-time DDoS Detection", desc: "Identify volumetric, application-layer, and amplification attacks instantly with dual ML models — Random Forest and Isolation Forest.", color: "#00d4ff", size: "large" },
  { icon: Brain, title: "ML-Based Threat Analysis", desc: "Advanced machine learning using ensemble models trained on CICIDS2017 dataset for 99.7% detection accuracy.", color: "#e8b3ff", size: "normal" },
  { icon: MessageSquare, title: "AI Copilot for Response", desc: "Grok-powered AI assistant for real-time incident investigation, threat summaries, and remediation playbooks.", color: "#3cd7ff", size: "normal" },
  { icon: FileSearch, title: "Network Forensic Timeline", desc: "Deep-dive into IP-level forensic timelines with packet-level analysis and behavioral pattern detection.", color: "#f4d4ff", size: "normal" },
  { icon: Activity, title: "Live Traffic Monitoring", desc: "Ingest live network captures or PCAP files with real-time analysis, protocol breakdown, and anomaly scoring.", color: "#00d4ff", size: "normal" },
  { icon: Lock, title: "Enterprise-Grade Security", desc: "SOC 2 Type II compliant with end-to-end encryption, RBAC, audit logging, and team-based access controls.", color: "#e8b3ff", size: "large" },
];

const steps = [
  { icon: Globe, title: "Ingest Traffic", desc: "Upload PCAP files, connect live network feeds, or import CICIDS2017 dataset." },
  { icon: BarChart3, title: "AI Analyzes Threats", desc: "Dual ML models analyze each flow. Risk scores generated in <50ms." },
  { icon: Zap, title: "Instant Alerts", desc: "Real-time alerts with severity levels and AI-generated remediation." },
  { icon: LifeBuoy, title: "AI Copilot Responds", desc: "Contextual analysis, forensic reports, and remediation actions." },
];

const stats = [
  { value: 99.7, suffix: "%", label: "Detection Rate" },
  { value: 50, suffix: "ms", label: "Response Time" },
  { value: 10, suffix: "K+", label: "Threats Blocked" },
  { value: 0, suffix: "+", label: "Enterprise Clients" },
];



/* ═══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f131d] text-[#dfe2f1] overflow-x-hidden noise-overlay relative">
      {/* Global Particle Background for all sections */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ParticleField />
      </div>

      <div className="relative z-10">
        <LandingNavbar />

        {/* ═══ HERO ═══════════════════════════════════════════ */}
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
          {/* Video Background — ONLY for Hero */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-0"
            style={{ filter: "brightness(0.25) saturate(1.2)" }}
          >
            <source src="/Generate_Moving_Background_Video 2.mov" type="video/quicktime" />
          </video>
          <div className="absolute inset-0 bg-[#0f131d]/50 z-0" />
          {/* Parallax orbs */}
          <div className="absolute inset-0 pointer-events-none z-[1]">
            <div className="absolute top-1/4 left-1/5 w-[600px] h-[600px] bg-[#00d4ff]/[0.05] rounded-full blur-[180px]" style={{ transform: `translateY(${scrollY * 0.15}px)` }} />
            <div className="absolute bottom-1/3 right-1/5 w-[450px] h-[450px] bg-[#9400D3]/[0.05] rounded-full blur-[140px]" style={{ transform: `translateY(${scrollY * -0.1}px)` }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[#e8b3ff]/[0.03] rounded-full blur-[100px]" style={{ transform: `translateY(${scrollY * 0.08}px)` }} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f131d] via-transparent to-[#0f131d] pointer-events-none z-[2]" />

          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass-thin text-xs font-medium text-[#3cd7ff] mb-10" style={{ animation: "fadeInDown 0.6s cubic-bezier(0.22,1,0.36,1) forwards", borderRadius: "999px" }}>
              <span className="w-2 h-2 rounded-full bg-[#3cd7ff] animate-pulse shadow-[0_0_8px_rgba(60,215,255,0.6)]" />
              Now with Grok AI Copilot Integration
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-bold leading-[1.05] tracking-[-0.02em] font-['Space_Grotesk',sans-serif] mb-7" style={{ animation: "fadeInUp 0.8s cubic-bezier(0.22,1,0.36,1) forwards" }}>
              <span className="text-[#dfe2f1]">AI-Powered</span>
              <br />
              <span className="bg-gradient-to-r from-[#00d4ff] via-[#3cd7ff] to-[#9400D3] bg-clip-text text-transparent">
                Cyber Threat Hunting
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-[#859398] max-w-2xl mx-auto mb-12 leading-relaxed" style={{ animation: "fadeInUp 1s cubic-bezier(0.22,1,0.36,1) forwards" }}>
              Detect DDoS attacks, analyze network threats with machine learning, and respond with an AI-powered copilot — all in real-time.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animation: "fadeInUp 1.2s cubic-bezier(0.22,1,0.36,1) forwards" }}>
              <Link
                to="/auth/signup"
                className="group relative inline-flex items-center gap-2 px-8 py-4 text-sm font-semibold text-white rounded-2xl overflow-hidden btn-press"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#00d4ff] to-[#9400D3]" />
                <div className="absolute inset-0 shadow-[0_0_40px_rgba(0,212,255,0.3)] group-hover:shadow-[0_0_60px_rgba(0,212,255,0.45)] transition-shadow duration-500" />
                <span className="relative flex items-center gap-2">
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              </Link>
              <button className="group inline-flex items-center gap-2.5 px-8 py-4 text-sm font-medium text-[#bbc9cf] rounded-2xl border border-white/[0.06] hover:border-[#3cd7ff]/20 hover:text-[#dfe2f1] hover:bg-white/[0.02] transition-all duration-400">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#3cd7ff]/10 group-hover:bg-[#3cd7ff]/20 transition-colors duration-300">
                  <Play className="w-3.5 h-3.5 text-[#3cd7ff] ml-0.5" />
                </div>
                Watch Demo
              </button>
            </div>

            {/* Trust */}
            <div className="mt-20 flex flex-wrap items-center justify-center gap-8 text-xs text-[#3c494e]" style={{ animation: "fadeInUp 1.5s cubic-bezier(0.22,1,0.36,1) forwards" }}>
              {["SOC 2 Compliant", "14-day Free Trial", "No Credit Card Required"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />{t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ STATS ══════════════════════════════════════════ */}
        <Section className="py-20 bg-[#0a0e18]/60 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 lg:gap-8" style={{ perspective: '1200px' }}>
              {stats.map((s, i) => (
                <div key={i} className="text-center p-8 rounded-[1.25rem] glass-card glass-frosted relative hover:scale-[1.02] transition-all duration-500 group">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-bold font-['Space_Grotesk',sans-serif] bg-gradient-to-r from-[#3cd7ff] to-[#e8b3ff] bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-500">
                    <Counter end={s.value} suffix={s.suffix} />
                  </div>
                  <div className="text-sm text-[#859398] mt-3 font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══ FEATURES (Bento Grid) ══════════════════════════ */}
        <Section id="features" className="py-28 lg:py-36">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#3cd7ff] mb-4 font-['Space_Grotesk',sans-serif]">Core Capabilities</span>
              <h2 className="text-3xl sm:text-4xl lg:text-[3.25rem] font-bold font-['Space_Grotesk',sans-serif] tracking-[-0.02em] leading-tight">
                Everything You Need to{" "}
                <span className="bg-gradient-to-r from-[#00d4ff] to-[#9400D3] bg-clip-text text-transparent">Hunt Threats</span>
              </h2>
              <p className="mt-5 text-[#859398] text-lg max-w-2xl mx-auto">
                A complete AI-powered cybersecurity platform built for modern SOC teams.
              </p>
            </div>

            {/* Bento Grid — Asymmetric */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f, i) => (
                <TiltCard key={i} className={f.size === "large" ? "lg:col-span-1" : ""}>
                  <div className="relative p-8 rounded-[1.25rem] glass-card glass-frosted transition-all duration-500 h-full group overflow-hidden">
                    {/* Hover glow */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ background: `radial-gradient(circle at 30% 30%, ${f.color}08 0%, transparent 70%)` }} />

                    <div
                      className="flex items-center justify-center w-12 h-12 rounded-xl mb-6 transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg"
                      style={{ background: `${f.color}12`, boxShadow: `0 0 0 1px ${f.color}18` }}
                    >
                      <f.icon className="w-5 h-5" style={{ color: f.color }} />
                    </div>
                    <h3 className="text-lg font-semibold text-[#dfe2f1] mb-3 font-['Space_Grotesk',sans-serif]">{f.title}</h3>
                    <p className="text-sm text-[#859398] leading-relaxed">{f.desc}</p>

                    {/* Bottom accent line */}
                    <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:from-transparent group-hover:via-[#3cd7ff]/20 group-hover:to-transparent transition-all duration-700" />
                  </div>
                </TiltCard>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══ HOW IT WORKS ═══════════════════════════════════ */}
        <Section id="how-it-works" className="py-28 lg:py-36 bg-[#0a0e18]/60 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#e8b3ff] mb-4 font-['Space_Grotesk',sans-serif]">How It Works</span>
              <h2 className="text-3xl sm:text-4xl lg:text-[3.25rem] font-bold font-['Space_Grotesk',sans-serif] tracking-[-0.02em] leading-tight">
                From Ingestion to{" "}
                <span className="bg-gradient-to-r from-[#e8b3ff] to-[#3cd7ff] bg-clip-text text-transparent">Resolution</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((s, i) => (
                <div key={i} className="relative group">
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-14 left-[calc(100%+2px)] w-[calc(100%-64px)] h-[1px] bg-gradient-to-r from-[#3cd7ff]/20 to-transparent z-0" />
                  )}
                  <div className="relative p-7 rounded-[1.25rem] glass-card glass-frosted transition-all duration-500 group-hover:shadow-[0_8px_48px_rgba(0,212,255,0.05)]">
                    <div className="flex items-center gap-3 mb-5">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#9400D3] text-xs font-bold text-white shadow-[0_0_16px_rgba(0,212,255,0.25)]">
                        {i + 1}
                      </span>
                      <s.icon className="w-5 h-5 text-[#3cd7ff]" />
                    </div>
                    <h3 className="text-base font-semibold text-[#dfe2f1] font-['Space_Grotesk',sans-serif] mb-2">{s.title}</h3>
                    <p className="text-sm text-[#859398] leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>


        {/* ═══ CTA ════════════════════════════════════════════ */}
        <Section className="py-28 lg:py-36 bg-[#0a0e18]/60 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <div className="relative p-14 md:p-20 rounded-[1.5rem] glass-thick glass-frosted overflow-hidden">
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-[#00d4ff]/[0.07] rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute -bottom-20 right-1/4 w-[300px] h-[200px] bg-[#9400D3]/[0.05] rounded-full blur-[80px] pointer-events-none" />
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-['Space_Grotesk',sans-serif] mb-5 tracking-[-0.02em]">
                  Ready to Defend Your Network?
                </h2>
                <p className="text-[#859398] text-lg max-w-xl mx-auto mb-10">
                  Start your 14-day free trial. No credit card required. Full access to all features including AI Copilot.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    to="/auth/signup"
                    className="group inline-flex items-center gap-2 px-8 py-4 text-sm font-semibold text-white rounded-2xl bg-gradient-to-r from-[#00d4ff] to-[#9400D3] shadow-[0_0_40px_rgba(0,212,255,0.25)] hover:shadow-[0_0_60px_rgba(0,212,255,0.4)] transition-all duration-500 hover:scale-[1.03] btn-press"
                  >
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 px-8 py-4 text-sm font-medium text-[#bbc9cf] rounded-2xl border border-white/[0.06] hover:border-[#3cd7ff]/20 hover:text-[#dfe2f1] transition-all duration-400"
                  >
                    Talk to Sales
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <LandingFooter />

        <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      </div>{/* end relative z-10 wrapper */}
    </div>
  );
}
