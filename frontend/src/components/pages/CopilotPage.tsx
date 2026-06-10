import { useState, useRef, useEffect } from "react";
import {
    Bot,
    Send,
    Loader2,
    Sparkles,
    ShieldAlert,
    Target,
    Lightbulb,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "react-router-dom";

const API_BASE = "http://localhost:8000";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    alertId?: number;
}

const quickActions = [
    { label: "Current security posture", icon: ShieldAlert },
    { label: "How to respond to a DDoS attack", icon: Target },
    { label: "Explain the difference between anomaly types", icon: Sparkles },
    { label: "List best practices for network hardening", icon: Lightbulb },
];

export default function CopilotPage() {
    const [searchParams] = useSearchParams();
    const alertId = searchParams.get("alert_id");

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Auto-analyze alert if redirected from Alerts page
    useEffect(() => {
        if (alertId && messages.length === 0) {
            sendMessage(
                `Analyze alert #${alertId}. Give me: (1) a brief summary of what happened, (2) the risk level and why, (3) top 3 mitigation steps I should take right now.`,
                parseInt(alertId)
            );
        }
    }, [alertId]);

    const sendMessage = async (text: string, forAlertId?: number) => {
        if (!text.trim() || loading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: text,
            alertId: forAlertId,
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const resp = await fetch(`${API_BASE}/copilot/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    alert_id: forAlertId || null,
                }),
            });

            if (resp.ok) {
                const data = await resp.json();
                setMessages((prev) => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        role: "assistant",
                        content: data.response,
                    },
                ]);
            } else {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        role: "assistant",
                        content: "⚠️ Failed to reach Copilot. Is the backend running?",
                    },
                ]);
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: "⚠️ Connection error. Check that the backend is running.",
                },
            ]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleSend = () => sendMessage(input);

    const clearChat = () => {
        setMessages([]);
    };

    function renderMarkdown(text: string) {
        return text
            .replace(/### (.*?)$/gm, '<h3 class="text-sm font-semibold text-foreground mt-3 mb-1">$1</h3>')
            .replace(/## (.*?)$/gm, '<h2 class="text-base font-semibold text-foreground mt-4 mb-1.5">$1</h2>')
            .replace(/# (.*?)$/gm, '<h1 class="text-lg font-bold text-foreground mt-4 mb-2">$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code class="text-primary bg-muted px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
            .replace(/^- (.*?)$/gm, '<li class="ml-4 text-sm text-muted-foreground list-disc">$1</li>')
            .replace(/^\d+\. (.*?)$/gm, '<li class="ml-4 text-sm text-muted-foreground list-decimal">$1</li>')
            .replace(/\n/g, "<br/>");
    }

    return (
        <div className="flex flex-col h-[calc(100vh-60px)] animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                        <Bot className="h-5 w-5 text-secondary" />
                        AI Copilot
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Powered by Grok · Analyzes threats and suggests mitigations
                    </p>
                </div>
                {messages.length > 0 && (
                    <Button variant="outline" size="sm" onClick={clearChat} className="text-xs">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                    </Button>
                )}
            </div>

            {/* Chat Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4"
            >
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="p-4 rounded-2xl mb-4" style={{ background: 'hsl(265 90% 64% / 0.08)' }}>
                            <Bot className="h-10 w-10 text-secondary" />
                        </div>
                        <h2 className="text-lg font-medium text-foreground mb-1">
                            How can I help?
                        </h2>
                        <p className="text-sm text-muted-foreground mb-6 max-w-md">
                            Ask me about alerts, threats, or security best practices.
                            I'll analyze your data and give concise, actionable advice.
                        </p>
                        <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
                            {quickActions.map((action) => (
                                <button
                                    key={action.label}
                                    onClick={() => sendMessage(action.label)}
                                    className="flex items-center gap-2 text-left text-xs px-3 py-2.5 rounded-lg bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors border border-border/30"
                                >
                                    <action.icon className="h-3.5 w-3.5 flex-shrink-0" />
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={
                                msg.role === "user"
                                    ? "flex justify-end"
                                    : "flex justify-start"
                            }
                        >
                            <div
                                className={
                                    msg.role === "user"
                                        ? "max-w-[80%] bg-primary/15 border border-primary/10 rounded-xl px-4 py-3 text-sm text-foreground"
                                        : "max-w-[85%] glass-card px-5 py-4"
                                }
                            >
                                {msg.role === "assistant" ? (
                                    <div
                                        className="text-sm text-muted-foreground leading-relaxed [&_strong]:text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_li]:my-0.5"
                                        dangerouslySetInnerHTML={{
                                            __html: renderMarkdown(msg.content),
                                        }}
                                    />
                                ) : (
                                    <p className="text-sm">{msg.content}</p>
                                )}
                            </div>
                        </div>
                    ))
                )}

                {loading && (
                    <div className="flex justify-start">
                        <div className="glass-card px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-secondary" />
                            Analyzing...
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="pt-3 border-t border-border/30">
                <div className="flex gap-2">
                    <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Ask about threats, mitigations, or security posture..."
                        className="flex-1 bg-muted/30 border-border text-sm h-10"
                        disabled={loading}
                    />
                    <Button
                        onClick={handleSend}
                        className="bg-secondary hover:bg-secondary/80 h-10 px-4"
                        disabled={loading || !input.trim()}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
