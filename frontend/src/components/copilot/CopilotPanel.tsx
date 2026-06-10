import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/components/lib/utils";

const API_BASE = "http://localhost:8000";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const suggestedQuestions = [
  "Explain the latest critical alert",
  "What are today's top threats?",
  "Suggest mitigation for a DDoS attack",
  "Summarize the current security posture",
];

export function CopilotPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "I'm your **Threat Hunting Copilot** powered by Grok AI. I can explain alerts, suggest mitigations, and help you investigate threats. Ask me anything about your security posture.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    const query = input;
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/copilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
        };
        setMessages((prev) => [...prev, assistantMessage]);
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
          content: "⚠️ Connection error. Check that the backend is running on port 8000.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (question: string) => {
    setInput(question);
  };

  return (
    <aside className="fixed right-0 top-0 z-40 h-screen w-80 border-l border-sidebar-border flex flex-col bg-sidebar-background"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10"
        >
          <Bot className="h-4 w-4 text-secondary" />
        </div>
        <div>
          <h2 className="text-xs font-semibold text-foreground">AI Copilot</h2>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Grok · Ready
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 py-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "rounded-lg px-3 py-2.5 text-[13px] leading-relaxed animate-fade-in",
                message.role === "user"
                  ? "bg-primary/15 text-foreground ml-6"
                  : "bg-muted/60 text-foreground mr-2"
              )}
            >
              <div
                className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-1.5 [&_ul]:mb-1.5 [&_li]:text-[13px] [&_strong]:text-foreground [&_code]:text-primary [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded"
                dangerouslySetInnerHTML={{
                  __html: message.content
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\n- /g, "<br/>• ")
                    .replace(/\n\d\. /g, (m) => `<br/>${m.trim()} `)
                    .replace(/`(.*?)`/g, "<code>$1</code>")
                    .replace(/\n/g, "<br/>"),
                }}
              />
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Analyzing...
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="px-3 py-2.5 border-t border-sidebar-border">
          <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Quick actions
          </p>
          <div className="space-y-1">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                onClick={() => handleSuggestion(question)}
                className="w-full text-left text-[11px] px-2.5 py-1.5 rounded bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex gap-1.5">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about threats..."
            className="flex-1 bg-muted/40 border-border text-xs h-8"
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            size="icon"
            className="bg-primary hover:bg-primary/80 h-8 w-8"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}
