import { useState } from "react";
import { Mail, Phone, MapPin, Send, MessageSquare, Clock, Loader2, CheckCircle2 } from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import ParticleField from "@/components/landing/ParticleField";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0f131d] text-[#dfe2f1] relative">
      <div className="fixed inset-0 z-0 pointer-events-none"><ParticleField /></div>
      <div className="relative z-10">
        <LandingNavbar />

        {/* Hero */}
        <section className="relative pt-32 pb-16 overflow-hidden">
          <div className="absolute top-20 left-1/3 w-[500px] h-[300px] bg-[#00d4ff]/[0.04] rounded-full blur-[120px] pointer-events-none" />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#3cd7ff] mb-3">Contact Us</span>
            <h1 className="text-4xl sm:text-5xl font-bold font-['Space_Grotesk',sans-serif] tracking-tight mb-4">
              Get in{" "}
              <span className="bg-gradient-to-r from-[#00d4ff] to-[#9400D3] bg-clip-text text-transparent">Touch</span>
            </h1>
            <p className="text-lg text-[#859398] max-w-xl mx-auto">
              Questions about Intellihunt? Our team is here to help you find the right security solution.
            </p>
          </div>
        </section>

        {/* Contact Info + Form */}
        <section className="pb-24 lg:pb-32">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-5 gap-10">
              {/* Info Panel */}
              <div className="lg:col-span-2 space-y-6">
                {[
                  { icon: Mail, label: "Email Us", info: "saniashaukat@intellihunt.io", sub: "We reply within 24 hours" },
                  { icon: Phone, label: "Call Us", info: "+1 (555) 123-4567", sub: "Mon-Fri, 9am-6pm EST" },
                  { icon: MapPin, label: "Visit Us", info: "123 Cyber Tower, Suite 400", sub: "Islamabad, Pakistan" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-5 rounded-xl bg-[#1c1f2a]/50 border border-white/[0.03]">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#3cd7ff]/10 shrink-0">
                      <item.icon className="w-5 h-5 text-[#3cd7ff]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-[#dfe2f1] mb-0.5">{item.label}</h3>
                      <p className="text-sm text-[#bbc9cf]">{item.info}</p>
                      <p className="text-xs text-[#3c494e] mt-1">{item.sub}</p>
                    </div>
                  </div>
                ))}

                <div className="p-5 rounded-xl bg-gradient-to-br from-[#1c1f2a] to-[#171b26] border border-white/[0.03]">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-[#e8b3ff]" />
                    <span className="text-sm font-medium text-[#dfe2f1]">Live Chat</span>
                  </div>
                  <p className="text-sm text-[#859398] mb-3">Get instant answers from our support team.</p>
                  <button className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#e8b3ff] rounded-lg bg-[#e8b3ff]/10 hover:bg-[#e8b3ff]/15 transition-colors">
                    <Clock className="w-3 h-3" />
                    Available now
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="lg:col-span-3">
                <div className="p-8 rounded-2xl bg-[#1c1f2a]/60 backdrop-blur-xl border border-white/[0.04]">
                  {sent ? (
                    <div className="text-center py-16">
                      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#22c55e]/10 mx-auto mb-4">
                        <CheckCircle2 className="w-7 h-7 text-[#22c55e]" />
                      </div>
                      <h3 className="text-xl font-semibold font-['Space_Grotesk',sans-serif] mb-2">Message Sent!</h3>
                      <p className="text-sm text-[#859398]">Thank you for reaching out. We'll respond within 24 hours.</p>
                      <button
                        onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                        className="mt-6 px-6 py-2 text-sm text-[#3cd7ff] rounded-lg border border-[#3cd7ff]/20 hover:bg-[#3cd7ff]/5 transition-colors"
                      >
                        Send Another Message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-medium text-[#859398] mb-1.5">Full Name</label>
                          <input
                            type="text"
                            value={form.name}
                            onChange={(e) => update("name", e.target.value)}
                            placeholder="John Doe"
                            className="w-full px-4 py-3 text-sm text-[#dfe2f1] bg-[#171b26] border border-white/[0.05] rounded-xl placeholder:text-[#3c494e] focus:outline-none focus:border-[#3cd7ff]/40 focus:shadow-[0_0_0_3px_rgba(60,215,255,0.08)] transition-all duration-200"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#859398] mb-1.5">Email Address</label>
                          <input
                            type="email"
                            value={form.email}
                            onChange={(e) => update("email", e.target.value)}
                            placeholder="you@company.com"
                            className="w-full px-4 py-3 text-sm text-[#dfe2f1] bg-[#171b26] border border-white/[0.05] rounded-xl placeholder:text-[#3c494e] focus:outline-none focus:border-[#3cd7ff]/40 focus:shadow-[0_0_0_3px_rgba(60,215,255,0.08)] transition-all duration-200"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#859398] mb-1.5">Subject</label>
                        <input
                          type="text"
                          value={form.subject}
                          onChange={(e) => update("subject", e.target.value)}
                          placeholder="How can we help?"
                          className="w-full px-4 py-3 text-sm text-[#dfe2f1] bg-[#171b26] border border-white/[0.05] rounded-xl placeholder:text-[#3c494e] focus:outline-none focus:border-[#3cd7ff]/40 focus:shadow-[0_0_0_3px_rgba(60,215,255,0.08)] transition-all duration-200"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#859398] mb-1.5">Message</label>
                        <textarea
                          value={form.message}
                          onChange={(e) => update("message", e.target.value)}
                          placeholder="Tell us about your security needs..."
                          rows={5}
                          className="w-full px-4 py-3 text-sm text-[#dfe2f1] bg-[#171b26] border border-white/[0.05] rounded-xl placeholder:text-[#3c494e] focus:outline-none focus:border-[#3cd7ff]/40 focus:shadow-[0_0_0_3px_rgba(60,215,255,0.08)] transition-all duration-200 resize-none"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#9400D3] shadow-[0_0_24px_rgba(0,212,255,0.2)] hover:shadow-[0_0_40px_rgba(0,212,255,0.35)] transition-all duration-300 hover:scale-[1.01] disabled:opacity-70"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send Message</>}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <LandingFooter />
      </div>
    </div>
  );
}
