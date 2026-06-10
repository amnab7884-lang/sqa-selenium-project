import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
} from "@clerk/clerk-react";
import { MainLayout } from "@/components/layout/MainLayout";

// Dashboard Pages
// Login.tsx is no longer directly rendered — /login redirects to /auth/login
import Dashboard from "./components/pages/Dashboard";
import LogHistory from "./components/pages/LogHistory";
import Alerts from "./components/pages/Alerts";
import ThreatIntel from "./components/pages/ThreatIntel";
import Incidents from "./components/pages/Incidents";
import Settings from "./components/pages/Settings";
import Models from "./components/pages/Models";
import CopilotPage from "./components/pages/CopilotPage";
import UserManagement from "./components/pages/UserManagement";
import ForensicTimeline from "./components/pages/ForensicTimeline";
import IngestionPage from "./components/pages/IngestionPage";
import NotFound from "./components/pages/NotFound";

// Landing / Public Pages
import LandingPage from "./components/pages/LandingPage";
import AuthLogin from "./components/pages/AuthLogin";
import AuthSignup from "./components/pages/AuthSignup";
import PricingPage from "./components/pages/PricingPage";
import AboutPage from "./components/pages/AboutPage";
import ContactPage from "./components/pages/ContactPage";
import DocsPage from "./components/pages/DocsPage";
import FeaturesPage from "./components/pages/FeaturesPage";
import HowItWorksPage from "./components/pages/HowItWorksPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 min — cached data stays fresh
      gcTime: 10 * 60 * 1000,      // 10 min — cache kept in memory after unmount
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Clerk publishable key — set in .env as VITE_CLERK_PUBLISHABLE_KEY
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Check for session from our own auth system (localStorage)
  const localUser = localStorage.getItem("intellihunt_user");
  if (localUser) {
    return <>{children}</>;
  }

  if (!CLERK_KEY) {
    // If no Clerk key and no local session, redirect to login
    return <Navigate to="/auth/login" replace />;
  }
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to="/auth/login" replace />
      </SignedOut>
    </>
  );
}

function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ─── Public / Landing Pages ───────────────────── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/login" element={<AuthLogin />} />
        <Route path="/auth/signup" element={<AuthSignup />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />

        {/* ─── Unified Login — all login paths go to AuthLogin ── */}
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />

        {/* ─── Protected Dashboard Pages ─────────────────── */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainLayout><Dashboard /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <MainLayout><LogHistory /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/alerts"
          element={
            <ProtectedRoute>
              <MainLayout><Alerts /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/threat-intel"
          element={
            <ProtectedRoute>
              <MainLayout><ThreatIntel /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/incidents"
          element={
            <ProtectedRoute>
              <MainLayout><Incidents /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/copilot"
          element={
            <ProtectedRoute>
              <MainLayout><CopilotPage /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/models"
          element={
            <ProtectedRoute>
              <MainLayout><Models /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <MainLayout><Settings /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <MainLayout><UserManagement /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ingestion"
          element={
            <ProtectedRoute>
              <MainLayout><IngestionPage /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/forensics/:ip"
          element={
            <ProtectedRoute>
              <MainLayout><ForensicTimeline /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => {
  // If Clerk key is not configured, render without ClerkProvider
  if (!CLERK_KEY) {
    return (
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_KEY}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
};

export default App;
