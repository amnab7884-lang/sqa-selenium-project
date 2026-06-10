import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ReactNode } from "react";

interface ThemeProviderProps {
    children: ReactNode;
}

/**
 * Theme provider using next-themes.
 * – Detects system preference
 * – Persists choice in localStorage
 * – Prevents flash of wrong theme (FOUC)
 * – Adds/removes "dark" class on <html>
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange={false}
        >
            {children}
        </NextThemesProvider>
    );
}
