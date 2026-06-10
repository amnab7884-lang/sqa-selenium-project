import { useNavigate } from "react-router-dom";
import { Crosshair } from "lucide-react";
import { SignIn, useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";

export default function Login() {
  const navigate = useNavigate();

  // If no Clerk key, show a simple "Enter" button (dev mode)
  if (!CLERK_KEY) {
    return (
      <div className="min-h-screen bg-background cyber-grid flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        </div>
        <div className="relative w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 glow-primary">
              <Crosshair className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-2">INTELLIHUNT</h1>
          <p className="text-muted-foreground mb-8">Threat Hunting Copilot</p>
          <div className="glass-card rounded-2xl p-8">
            <p className="text-sm text-muted-foreground mb-4">
              Authentication not configured. Running in development mode.
            </p>
            <Button
              onClick={() => navigate("/dashboard")}
              className="w-full h-12 bg-primary hover:bg-primary/80 glow-primary text-base font-semibold"
            >
              Enter Dashboard
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Set <code className="text-primary">VITE_CLERK_PUBLISHABLE_KEY</code> in{" "}
              <code className="text-primary">frontend/.env</code> to enable Clerk authentication.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // With Clerk configured, show Clerk's SignIn component
  return (
    <div className="min-h-screen bg-background cyber-grid flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 glow-primary">
              <Crosshair className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-2">INTELLIHUNT</h1>
          <p className="text-muted-foreground">Threat Hunting Copilot</p>
        </div>
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-background/80 backdrop-blur-lg border border-border shadow-2xl",
                headerTitle: "text-foreground",
                headerSubtitle: "text-muted-foreground",
                formButtonPrimary: "bg-primary hover:bg-primary/80",
                formFieldInput: "bg-muted border-border text-foreground",
                formFieldLabel: "text-foreground",
                footerActionLink: "text-primary hover:text-primary/80",
                dividerLine: "bg-border",
                dividerText: "text-muted-foreground",
                socialButtonsBlockButton: "bg-muted border-border text-foreground hover:bg-muted/80",
              },
            }}
            redirectUrl="/dashboard"
            signUpUrl="/login"
          />
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          Protected by enterprise-grade security. All sessions are encrypted.
        </p>
      </div>
    </div>
  );
}
