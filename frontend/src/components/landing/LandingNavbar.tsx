import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Crosshair, Menu, X, ChevronRight } from "lucide-react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Docs", href: "/docs" },
  { label: "Contact", href: "/contact" },
];

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(href);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        scrolled
          ? "py-2 glass-ultra shadow-[0_4px_48px_rgba(0,0,0,0.3)]"
          : "py-4 bg-transparent"
      }`}
      style={scrolled ? { borderBottom: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 0 } : {}}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#9400D3] shadow-[0_0_20px_rgba(0,212,255,0.35)] group-hover:shadow-[0_0_32px_rgba(0,212,255,0.5)] transition-all duration-500">
              <Crosshair className="w-5 h-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#dfe2f1] font-['Space_Grotesk',sans-serif]">
              INTELLI<span className="text-[#3cd7ff]">HUNT</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="relative px-4 py-2 text-[13px] font-medium text-[#859398] hover:text-[#dfe2f1] transition-colors duration-300 rounded-lg group"
              >
                {link.label}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-[#00d4ff] to-[#9400D3] rounded-full group-hover:w-3/4 transition-all duration-400 ease-out" />
              </button>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/auth/login"
              className="px-5 py-2 text-[13px] font-medium text-[#bbc9cf] hover:text-[#dfe2f1] transition-colors duration-300"
            >
              Log In
            </Link>
            <Link
              to="/auth/signup"
              className="group relative px-6 py-2.5 text-[13px] font-semibold text-white rounded-xl overflow-hidden btn-press"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#00d4ff] to-[#9400D3] transition-all duration-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#00d4ff] via-[#6c5ce7] to-[#9400D3] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute inset-0 shadow-[0_0_20px_rgba(0,212,255,0.3)] group-hover:shadow-[0_0_32px_rgba(0,212,255,0.5)] transition-shadow duration-500" />
              <span className="relative flex items-center gap-1.5">
                Start Free Trial
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-300" />
              </span>
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-[#bbc9cf] hover:text-[#3cd7ff] transition-colors"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          mobileOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="glass-thin px-4 py-6 space-y-1" style={{ borderTop: '0.5px solid rgba(255,255,255,0.04)', borderRadius: 0 }}>
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavClick(link.href)}
              className="block w-full text-left px-4 py-3 text-sm font-medium text-[#bbc9cf] hover:text-[#3cd7ff] hover:bg-white/[0.03] rounded-lg transition-all duration-200"
            >
              {link.label}
            </button>
          ))}
          <div className="pt-4 flex flex-col gap-3 border-t border-white/[0.06] mt-4">
            <Link
              to="/auth/login"
              onClick={() => setMobileOpen(false)}
              className="block text-center px-4 py-3 text-sm font-medium text-[#bbc9cf] rounded-xl border border-white/[0.08] hover:border-[#3cd7ff]/30 transition-all"
            >
              Log In
            </Link>
            <Link
              to="/auth/signup"
              onClick={() => setMobileOpen(false)}
              className="block text-center px-4 py-3 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#9400D3]"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
