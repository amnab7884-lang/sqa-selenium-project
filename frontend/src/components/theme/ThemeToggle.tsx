import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/components/lib/utils";

/**
 * Animated theme toggle with 3 states: Light / Dark / System
 */
export function ThemeToggle({ className }: { className?: string }) {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch — only render after mount
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    const modes = [
        { id: "light", icon: Sun, label: "Light" },
        { id: "dark", icon: Moon, label: "Dark" },
        { id: "system", icon: Monitor, label: "System" },
    ] as const;

    return (
        <div className={cn("flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/50", className)}>
            {modes.map((mode) => {
                const isActive = theme === mode.id;
                return (
                    <button
                        key={mode.id}
                        onClick={() => setTheme(mode.id)}
                        className={cn(
                            "relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-300",
                            isActive
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        title={mode.label}
                    >
                        <mode.icon className={cn(
                            "h-3.5 w-3.5 transition-transform duration-300",
                            isActive && mode.id === "light" && "rotate-0 scale-110 text-amber-500",
                            isActive && mode.id === "dark" && "rotate-0 scale-110 text-blue-400",
                            isActive && mode.id === "system" && "rotate-0 scale-110 text-primary",
                            !isActive && "scale-90"
                        )} />
                        <span className="hidden sm:inline">{mode.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Compact toggle button — just sun/moon icon, great for tight spaces
 */
export function ThemeToggleCompact({ className }: { className?: string }) {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    const isDark = resolvedTheme === "dark";

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={cn(
                "relative h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-300",
                "bg-muted/40 hover:bg-muted/80 text-foreground",
                className
            )}
            title={`Switch to ${isDark ? "light" : "dark"} mode`}
        >
            <Sun className={cn(
                "h-4 w-4 absolute transition-all duration-500 text-amber-500",
                isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
            )} />
            <Moon className={cn(
                "h-4 w-4 absolute transition-all duration-500 text-blue-400",
                isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
            )} />
        </button>
    );
}
