import { Shield, Target, Users, Lightbulb, Globe, Award, Linkedin, Github } from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import ParticleField from "@/components/landing/ParticleField";
import { motion } from "framer-motion";

const values = [
  { icon: Shield, title: "Security First", desc: "Every line of code, every decision, every feature is built with security as the foundational principle." },
  { icon: Target, title: "Precision Matters", desc: "99.7% detection accuracy isn't a marketing number — it's a commitment we measure and maintain daily." },
  { icon: Lightbulb, title: "AI-Driven Innovation", desc: "We leverage cutting-edge ML and Gemini AI to stay ahead of evolving cyber threats." },
  { icon: Globe, title: "Global Protection", desc: "Threats don't have borders. Our platform protects networks across every timezone and geography." },
];

const team = [
  { name: "Sania Shaukat", role: "Lead Developer", bio: "Cybersecurity researcher with a passion for building AI-driven defense systems." },
  { name: "Roshni Fareed", role: "ML Research Lead", bio: "Specializing in anomaly detection and network security." },
  { name: "Amna Irfan", role: "Head of Development", bio: "Building SaaS platforms and Machine Learning solutions." },
];

const milestones = [
  { period: "1-2", event: "Intellihunt founded — initial DDoS detection prototype built" },
  { period: "3-4", event: "Dual ML model (Random Forest + Isolation Forest) achieves 99.7% accuracy" },
  { period: "5-6", event: "Grok AI Copilot integrated for automated incident response" },
  { period: "7-8", event: "Testing and Deployment" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0f131d] text-[#dfe2f1] relative">
      <div className="fixed inset-0 z-0 pointer-events-none"><ParticleField /></div>
      <div className="relative z-10">
        <LandingNavbar />

        {/* Hero */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute top-20 right-1/4 w-[500px] h-[300px] bg-[#9400D3]/[0.04] rounded-full blur-[120px] pointer-events-none" />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#e8b3ff] mb-3">About Us</span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-['Space_Grotesk',sans-serif] tracking-tight mb-6">
              Building the Future of{" "}
              <span className="bg-gradient-to-r from-[#e8b3ff] to-[#3cd7ff] bg-clip-text text-transparent">
                Cyber Defense
              </span>
            </h1>
            <p className="text-lg text-[#859398] max-w-2xl mx-auto leading-relaxed">
              Intellihunt was born from a simple belief: every organization deserves access to AI-powered threat detection that was once reserved for billion-dollar security budgets. We're democratizing cybersecurity.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="py-20 bg-[#0a0e18]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#3cd7ff] mb-3">Our Mission</span>
                <h2 className="text-3xl sm:text-4xl font-bold font-['Space_Grotesk',sans-serif] tracking-tight mb-5">
                  AI That Hunts Threats<br />So You Don't Have To
                </h2>
                <p className="text-[#859398] leading-relaxed mb-4">
                  Traditional cybersecurity tools generate thousands of alerts, drowning SOC teams in noise. Intellihunt flips this paradigm — our dual ML model architecture proactively hunts for threats, classifies attack vectors, and uses AI to generate actionable response playbooks.
                </p>
                <p className="text-[#859398] leading-relaxed">
                  Built on the CICIDS2017 research dataset and hardened with real-world network traffic analysis, our platform detects 25+ DDoS attack variants including volumetric, application-layer, and amplification attacks — all with sub-50ms response times.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Detection Accuracy", value: "99.7%" },
                  { label: "Response Time", value: "<50ms" },
                  { label: "Attack Types Covered", value: "5+" },
                  { label: "Uptime SLA", value: "99.99%" },
                ].map((stat, i) => (
                  <div key={i} className="p-6 rounded-xl bg-[#1c1f2a]/60 border border-white/[0.03] text-center">
                    <div className="text-2xl font-bold font-['Space_Grotesk',sans-serif] bg-gradient-to-r from-[#3cd7ff] to-[#e8b3ff] bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-xs text-[#859398] mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#3cd7ff] mb-3">Our Values</span>
              <h2 className="text-3xl sm:text-4xl font-bold font-['Space_Grotesk',sans-serif] tracking-tight">
                What Drives Us
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((v, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  className="p-6 rounded-2xl bg-[#1c1f2a]/50 border border-white/[0.03] hover:border-[#3cd7ff]/10 transition-all duration-300"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#3cd7ff]/10 mb-4">
                    <v.icon className="w-5 h-5 text-[#3cd7ff]" />
                  </div>
                  <h3 className="text-base font-semibold font-['Space_Grotesk',sans-serif] mb-2">{v.title}</h3>
                  <p className="text-sm text-[#859398] leading-relaxed">{v.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-24 bg-[#0a0e18]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#e8b3ff] mb-3">The Team</span>
              <h2 className="text-3xl sm:text-4xl font-bold font-['Space_Grotesk',sans-serif] tracking-tight">
                Meet the Hunters
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {team.map((member, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  className="p-6 rounded-2xl bg-[#1c1f2a]/50 border border-white/[0.03] hover:border-[#e8b3ff]/10 transition-all duration-300 text-center group"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00d4ff]/20 to-[#9400D3]/20 mx-auto mb-4 flex items-center justify-center text-lg font-bold font-['Space_Grotesk',sans-serif] text-[#3cd7ff]">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <h3 className="text-base font-semibold">{member.name}</h3>
                  <p className="text-xs text-[#3cd7ff] mb-2">{member.role}</p>
                  <p className="text-xs text-[#859398] leading-relaxed">{member.bio}</p>
                  <div className="flex items-center justify-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href="#" className="p-1.5 rounded-lg hover:bg-white/[0.04] text-[#859398] hover:text-[#3cd7ff] transition-colors">
                      <Linkedin className="w-3.5 h-3.5" />
                    </a>
                    <a href="#" className="p-1.5 rounded-lg hover:bg-white/[0.04] text-[#859398] hover:text-[#3cd7ff] transition-colors">
                      <Github className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#3cd7ff] mb-3">Our Journey</span>
              <h2 className="text-3xl sm:text-4xl font-bold font-['Space_Grotesk',sans-serif] tracking-tight">
                Milestones
              </h2>
            </div>
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-4 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#00d4ff]/20 via-[#9400D3]/20 to-transparent" />
              <div className="space-y-8">
                {milestones.map((m, i) => (
                  <div key={i} className="relative pl-12">
                    <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-gradient-to-r from-[#00d4ff] to-[#9400D3] shadow-[0_0_8px_rgba(0,212,255,0.3)]" />
                    <span className="text-sm font-bold font-['Space_Grotesk',sans-serif] text-[#3cd7ff]">{m.period} Month</span>
                    <p className="text-sm text-[#bbc9cf] mt-1">{m.event}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <LandingFooter />
      </div>
    </div>
  );
}
