import { Link } from "react-router-dom";
import { Crosshair, Github, Twitter, Linkedin, Mail } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Documentation", href: "/docs" },
    { label: "Changelog", href: "#" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Careers", href: "#" },
    { label: "Blog", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
    { label: "GDPR", href: "#" },
  ],
  Support: [
    { label: "Help Center", href: "#" },
    { label: "Status Page", href: "#" },
    { label: "API Reference", href: "#" },
    { label: "Community", href: "#" },
  ],
};

const socials = [
  { Icon: Twitter, href: "#" },
  { Icon: Github, href: "#" },
  { Icon: Linkedin, href: "#" },
  { Icon: Mail, href: "/contact" },
];

export default function LandingFooter() {
  return (
    <footer className="relative bg-[#0a0e18] overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[250px] bg-[#00d4ff]/[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[300px] h-[200px] bg-[#9400D3]/[0.02] rounded-full blur-[100px] pointer-events-none" />

      {/* Top Separator - Gradient Line */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-[#3cd7ff]/15 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 relative">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 lg:gap-14">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6 group">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#9400D3] shadow-[0_0_16px_rgba(0,212,255,0.25)] group-hover:shadow-[0_0_24px_rgba(0,212,255,0.4)] transition-all duration-500">
                <Crosshair className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-[#dfe2f1] font-['Space_Grotesk',sans-serif]">
                INTELLI<span className="text-[#3cd7ff]">HUNT</span>
              </span>
            </Link>
            <p className="text-sm text-[#859398] leading-relaxed max-w-xs mb-8">
              AI-powered cyber threat hunting platform. Detect, analyze, and respond to threats in real-time with machine learning precision.
            </p>
            <div className="flex items-center gap-2.5">
              {socials.map(({ Icon, href }, i) => (
                <Link
                  key={i}
                  to={href}
                  className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/[0.03] text-[#859398] hover:text-[#3cd7ff] hover:bg-[#3cd7ff]/[0.08] hover:shadow-[0_0_12px_rgba(0,212,255,0.15)] transition-all duration-300"
                >
                  <Icon className="w-4 h-4" />
                </Link>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#3cd7ff]/70 mb-5 font-['Space_Grotesk',sans-serif]">
                {title}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-[#859398] hover:text-[#bbc9cf] transition-colors duration-300 hover:translate-x-0.5 inline-block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Separator */}
          <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" style={{ marginTop: '-2rem' }} />
          
          <p className="text-xs text-[#3c494e]">
            © {new Date().getFullYear()} Intellihunt. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-[#3c494e]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
