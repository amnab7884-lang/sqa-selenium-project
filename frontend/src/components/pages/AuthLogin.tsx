import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Crosshair, Lock, Eye, EyeOff, ArrowRight, User, Loader2, AlertCircle, Shield } from "lucide-react";

const API_BASE = "http://localhost:8000";

export default function AuthLogin() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("intellihunt_user", JSON.stringify(data.user));
        localStorage.setItem("intellihunt_role", data.role);
        navigate("/dashboard");
      } else {
        const err = await res.json();
        setError(err.detail || "Invalid credentials");
      }
    } catch {
      setError("Cannot connect to server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: "brightness(0.35) saturate(1.3)" }}
      >
        <source src="/Generate_Moving_Background_Video 2.mov" type="video/quicktime" />
      </video>
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-[#0f131d]/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-[420px]" style={{ animation: "fadeInUp 0.6s cubic-bezier(0.22,1,0.36,1) forwards" }}>
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-3 mb-8 group">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#9400D3] shadow-[0_0_32px_rgba(0,212,255,0.3)] group-hover:shadow-[0_0_48px_rgba(0,212,255,0.5)] transition-all duration-500">
              <Crosshair className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#dfe2f1] font-['Space_Grotesk',sans-serif]">
              INTELLI<span className="text-[#3cd7ff]">HUNT</span>
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-[#dfe2f1] font-['Space_Grotesk',sans-serif] tracking-[-0.02em] mb-2">Welcome Back</h1>
          <p className="text-sm text-[#859398]">Sign in to your threat hunting dashboard</p>
        </div>

        {/* Card */}
        <div className="rounded-[1.5rem] glass-thick glass-frosted relative p-8">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 mb-6 text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl" style={{ animation: "scaleIn 0.3s cubic-bezier(0.22,1,0.36,1) forwards" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email or Username */}
            <div>
              <label className="block text-xs font-medium text-[#859398] mb-2 tracking-wide">Email or Username</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3c494e] group-focus-within:text-[#3cd7ff] transition-colors duration-300" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
                  placeholder="you@company.com or username"
                  className="w-full pl-11 pr-4 py-3.5 text-sm text-[#dfe2f1] bg-[#111524] border border-white/[0.04] rounded-xl placeholder:text-[#3c494e] focus:outline-none focus:border-[#3cd7ff]/30 focus:shadow-[0_0_0_3px_rgba(60,215,255,0.06),0_0_16px_rgba(0,212,255,0.06)] transition-all duration-400"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[#859398] tracking-wide">Password</label>
                <Link to="#" className="text-xs text-[#3cd7ff]/70 hover:text-[#3cd7ff] transition-colors duration-300">Forgot password?</Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3c494e] group-focus-within:text-[#3cd7ff] transition-colors duration-300" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 text-sm text-[#dfe2f1] bg-[#111524] border border-white/[0.04] rounded-xl placeholder:text-[#3c494e] focus:outline-none focus:border-[#3cd7ff]/30 focus:shadow-[0_0_0_3px_rgba(60,215,255,0.06),0_0_16px_rgba(0,212,255,0.06)] transition-all duration-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3c494e] hover:text-[#859398] transition-colors duration-200"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-white rounded-xl overflow-hidden btn-press disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#00d4ff] to-[#9400D3]" />
              <div className="absolute inset-0 shadow-[0_0_24px_rgba(0,212,255,0.2)] group-hover:shadow-[0_0_40px_rgba(0,212,255,0.35)] transition-shadow duration-500" />
              <span className="relative flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" /></>}
              </span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-3">
          <p className="text-sm text-[#3c494e]">
            Don't have an account?{" "}
            <Link to="/auth/signup" className="text-[#3cd7ff] hover:text-[#a8e8ff] font-medium transition-colors duration-300">
              Sign Up
            </Link>
          </p>
          <p className="flex items-center justify-center gap-1.5 text-xs text-[#3c494e]/50">
            <Shield className="w-3 h-3" />
            Protected by enterprise-grade encryption
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes floatGlow {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { transform: translateY(-20px) scale(1.05); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
