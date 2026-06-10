import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight, ChevronDown, Zap, Shield, Building2 } from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import ParticleField from "@/components/landing/ParticleField";
import { motion } from "framer-motion";

const tiers = [
  {
    name: "Starter",
    icon: Zap,
    price: 49,
    period: "/month",
    desc: "For small teams and startups getting started with threat detection.",
    cta: "Start Free Trial",
    popular: false,
    features: [
      "Up to 5 team members",
      "10 GB/day traffic ingestion",
      "PCAP file analysis",
      "Basic DDoS detection",
      "Email alerts",
      "7-day data retention",
      "Community support",
      "Dashboard & reports",
    ],
  },
  {
    name: "Professional",
    icon: Shield,
    price: 149,
    period: "/month",
    desc: "For growing security teams needing advanced AI-powered capabilities.",
    cta: "Start Free Trial",
    popular: true,
    features: [
      "Up to 25 team members",
      "100 GB/day traffic ingestion",
      "Live network capture",
      "Advanced ML threat analysis",
      "AI Copilot (Gemini-powered)",
      "Forensic timeline",
      "30-day data retention",
      "Priority support",
      "RBAC & audit logging",
      "Slack/Teams integration",
    ],
  },
  {
    name: "Enterprise",
    icon: Building2,
    price: null,
    period: "",
    desc: "For large organizations needing custom deployment and compliance.",
    cta: "Contact Sales",
    popular: false,
    features: [
      "Unlimited team members",
      "Unlimited traffic ingestion",
      "On-premise deployment option",
      "Custom ML model training",
      "Forensic timeline",
      "30-day data retention",
      "Priority support",
      "RBAC & audit logging",
      "Slack/Teams integration",
      "Advanced AI Copilot",
      "Full forensic suite",
      "1-year data retention",
      "Dedicated account manager",

    ],
  },
];

const faqs = [
  { q: "What happens after the 14-day trial?", a: "After your trial ends, you can choose a plan that fits your needs. No credit card required during the trial. Your data and configurations are preserved when you upgrade." },
  { q: "Can I switch plans anytime?", a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is prorated for the remainder of the billing cycle." },
  { q: "Do you offer annual billing?", a: "Yes! Annual billing saves you 20% compared to monthly. Contact our sales team for enterprise annual agreements with additional discounts." },
  { q: "How does traffic ingestion work?", a: "You can ingest traffic via PCAP file uploads, live network capture (requires sudo), or automated feeds. Our system supports 40+ protocol types and processes traffic in real-time." },
  { q: "What ML models do you use?", a: "Our platform uses a dual-model approach: Random Forest for classification and Isolation Forest for anomaly detection. Models are trained on the CICIDS2017 dataset with 99.7% detection accuracy." },
  { q: "Is my data secure?", a: "Absolutely. All data is encrypted at rest and in transit. We're SOC 2 Type II compliant with RBAC, audit logging, and enterprise-grade infrastructure. Data never leaves your region." },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0f131d] text-[#dfe2f1] relative">
      {/* Particle Network Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ParticleField />
      </div>
      <div className="relative z-10">
        <LandingNavbar />

        {/* Hero */}
        <section className="relative pt-32 pb-16 overflow-hidden">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-[#00d4ff]/[0.04] rounded-full blur-[120px] pointer-events-none" />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#3cd7ff] mb-3">Pricing</span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-['Space_Grotesk',sans-serif] tracking-tight mb-4">
              Choose Your{" "}
              <span className="bg-gradient-to-r from-[#00d4ff] to-[#9400D3] bg-clip-text text-transparent">Shield</span>
            </h1>
            <p className="text-lg text-[#859398] max-w-xl mx-auto mb-8">
              Start free. Scale with confidence. Enterprise-grade security at every tier.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-3 p-1 rounded-full bg-[#1c1f2a] border border-white/[0.04]">
              <button
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 text-sm rounded-full font-medium transition-all duration-200 ${!annual ? "bg-gradient-to-r from-[#00d4ff] to-[#9400D3] text-white shadow-[0_0_16px_rgba(0,212,255,0.2)]" : "text-[#859398] hover:text-[#bbc9cf]"
                  }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 text-sm rounded-full font-medium transition-all duration-200 ${annual ? "bg-gradient-to-r from-[#00d4ff] to-[#9400D3] text-white shadow-[0_0_16px_rgba(0,212,255,0.2)]" : "text-[#859398] hover:text-[#bbc9cf]"
                  }`}
              >
                Annual
                <span className="ml-1.5 text-[#22c55e] text-xs font-semibold">Save 20%</span>
              </button>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-24 lg:pb-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-6 items-start">
              {tiers.map((tier, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  viewport={{ once: true, margin: "-50px" }}
                  className={`relative rounded-2xl p-8 transition-all duration-300 ${tier.popular
                    ? "bg-[#1c1f2a]/80 border-2 border-[#3cd7ff]/30 shadow-[0_0_64px_rgba(0,212,255,0.1)] scale-[1.02] lg:scale-105"
                    : "bg-[#1c1f2a]/50 border border-white/[0.04] hover:border-white/[0.08]"
                    }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#00d4ff] to-[#9400D3] text-xs font-semibold text-white shadow-[0_0_16px_rgba(0,212,255,0.3)]">
                      Most Popular
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${tier.popular ? "bg-[#3cd7ff]/10" : "bg-white/[0.04]"}`}>
                      <tier.icon className={`w-5 h-5 ${tier.popular ? "text-[#3cd7ff]" : "text-[#859398]"}`} />
                    </div>
                    <h3 className="text-lg font-semibold font-['Space_Grotesk',sans-serif]">{tier.name}</h3>
                  </div>

                  <div className="mb-4">
                    {tier.price ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold font-['Space_Grotesk',sans-serif]">
                          ${annual ? Math.round(tier.price * 0.8) : tier.price}
                        </span>
                        <span className="text-sm text-[#859398]">{tier.period}</span>
                      </div>
                    ) : (
                      <div className="text-3xl font-bold font-['Space_Grotesk',sans-serif] bg-gradient-to-r from-[#3cd7ff] to-[#e8b3ff] bg-clip-text text-transparent">
                        Custom
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-[#859398] mb-6">{tier.desc}</p>

                  <Link
                    to={tier.price ? "/auth/signup" : "/contact"}
                    className={`flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold rounded-xl transition-all duration-300 mb-8 ${tier.popular
                      ? "bg-gradient-to-r from-[#00d4ff] to-[#9400D3] text-white shadow-[0_0_24px_rgba(0,212,255,0.2)] hover:shadow-[0_0_40px_rgba(0,212,255,0.35)] hover:scale-[1.02]"
                      : "bg-white/[0.04] text-[#dfe2f1] border border-white/[0.06] hover:border-[#3cd7ff]/20 hover:bg-white/[0.06]"
                      }`}
                  >
                    {tier.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <ul className="space-y-3">
                    {tier.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-[#bbc9cf]">
                        <Check className="w-4 h-4 text-[#22c55e] mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 lg:py-32 bg-[#0a0e18]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#e8b3ff] mb-3">FAQ</span>
              <h2 className="text-3xl sm:text-4xl font-bold font-['Space_Grotesk',sans-serif] tracking-tight">
                Common Questions
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-[#1c1f2a]/50 border border-white/[0.03] overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left"
                  >
                    <span className="text-sm font-medium text-[#dfe2f1]">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#859398] shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""
                        }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${openFaq === i ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
                      }`}
                  >
                    <p className="px-6 pb-4 text-sm text-[#859398] leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <LandingFooter />
      </div>{/* end z-10 wrapper */}
    </div>
  );
}
