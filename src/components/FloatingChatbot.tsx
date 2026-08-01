"use client";

import { useState, useRef, useEffect } from "react";
import { X, Sparkles, Send, Loader2, MessageCircle, GraduationCap, RotateCcw } from "lucide-react";
import { useSession } from "next-auth/react";

interface Message {
  role: "user" | "ai";
  content: string;
}

const guestSuggestions = [
  "What programs do you offer?",
  "How do I register?",
  "What is the Placement Test?",
  "What is the difference between Regular and Competition Class?",
  "How much are the tuition fees?",
];

const studentSuggestions = [
  "How am I doing overall?",
  "What are my weak topics?",
  "Analyze my Placement Test results",
  "Explain my latest quiz mistakes",
  "What should I study next?",
  "Which class should I take?",
];

const parentSuggestions = [
  "How is my child progressing?",
  "What subjects need more practice?",
  "Should my child move to Competition Class?",
  "Show me my child's recent scores",
  "What should my child focus on?",
];

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const userRole = (session?.user as any)?.role || "GUEST";
  const userName = session?.user?.name || "there";

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [messages, isOpen]);

  const getSuggestions = () => {
    if (!isLoggedIn) return guestSuggestions;
    if (userRole === "PARENT") return parentSuggestions;
    return studentSuggestions;
  };

  const getGreeting = () => {
    if (!isLoggedIn) {
      return "Hi! I'm Kaputra AI. Ask me anything about our programs, classes, and registration.";
    }
    if (userRole === "PARENT") {
      return `Hi ${userName}! 👋 I'm your personal learning assistant. I can help you track your children's progress, analyze their test results, and provide study recommendations.`;
    }
    return `Hi ${userName}! 👋 I'm your personal learning assistant. I can analyze your test results, track your progress, and help you study smarter. Ask me anything!`;
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          history: newMessages,
        }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "ai", content: data.answer }]);
    } catch (error) {
      setMessages([
        ...newMessages,
        {
          role: "ai",
          content:
            "Sorry, I am currently unavailable. Please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
  };

  // Simple markdown-like rendering for AI responses
  const renderContent = (content: string) => {
    if (!content) return null;

    // Split by double newline for paragraphs, handle bullet points and bold
    const lines = content.split("\n");

    return lines.map((line, idx) => {
      // Bold text **text**
      let processed = line.replace(
        /\*\*(.*?)\*\*/g,
        '<strong class="font-semibold">$1</strong>'
      );

      // Bullet points
      if (processed.trim().startsWith("- ") || processed.trim().startsWith("• ")) {
        const bulletContent = processed.trim().replace(/^[-•]\s/, "");
        return (
          <div key={idx} className="flex gap-2 ml-1">
            <span className="text-[#CA8E25] shrink-0 mt-0.5">•</span>
            <span dangerouslySetInnerHTML={{ __html: bulletContent }} />
          </div>
        );
      }

      // Empty lines as spacing
      if (processed.trim() === "") {
        return <div key={idx} className="h-2" />;
      }

      return (
        <div
          key={idx}
          dangerouslySetInnerHTML={{ __html: processed }}
        />
      );
    });
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 p-4 bg-[#CA8E25] text-black rounded-full shadow-lg hover:scale-110 transition-transform duration-300 flex items-center justify-center ${
          isOpen
            ? "scale-0 opacity-0 pointer-events-none"
            : "scale-100 opacity-100"
        }`}
        aria-label="Open Kaputra AI Chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 z-50 w-[calc(100vw-48px)] sm:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col transition-all duration-300 origin-bottom-right ${
          isOpen
            ? "scale-100 opacity-100 pointer-events-auto"
            : "scale-50 opacity-0 pointer-events-none"
        }`}
        style={{ maxHeight: "calc(100vh - 48px)" }}
      >
        {/* Header */}
        <div className="bg-[#072147] p-4 flex items-center justify-between rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#CA8E25]/20 p-1.5 rounded-full">
              <GraduationCap className="w-4 h-4 text-[#CA8E25]" />
            </div>
            <div>
              <h3 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base leading-tight">
                Kaputra AI
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                  {isLoggedIn ? "Personal" : "Beta"}
                </span>
              </h3>
              {isLoggedIn && (
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  Learning Assistant for {userName}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleNewChat}
                className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                aria-label="New Chat"
                title="Start New Chat"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
              aria-label="Close Chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto min-h-[300px] max-h-[500px] bg-slate-50 flex flex-col gap-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-6">
              <div className="w-14 h-14 bg-gradient-to-br from-[#072147]/10 to-[#CA8E25]/10 rounded-full flex items-center justify-center mb-1">
                <Sparkles className="w-7 h-7 text-[#CA8E25]" />
              </div>
              <p className="text-slate-600 text-sm max-w-[280px] leading-relaxed">
                {getGreeting()}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {getSuggestions().map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(suggestion)}
                    className="text-[11px] bg-white border border-[#CA8E25]/25 text-[#072147] px-3 py-1.5 rounded-full hover:bg-[#CA8E25]/10 hover:border-[#CA8E25]/50 transition-all text-left leading-tight shadow-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#072147] text-white rounded-tr-sm"
                        : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm"
                    }`}
                  >
                    {msg.role === "ai"
                      ? renderContent(msg.content)
                      : msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2.5">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-[#CA8E25] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-[#CA8E25] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-[#CA8E25] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Analyzing your data...
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white border-t border-slate-100 rounded-b-2xl shrink-0">
          <div className="flex items-center gap-2 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) handleSend(input);
              }}
              placeholder={
                isLoggedIn
                  ? "Ask about your progress, test results..."
                  : "Ask anything about Kaputra Academy..."
              }
              className="flex-1 bg-slate-50 border border-slate-200 rounded-full pl-4 pr-10 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#CA8E25] focus:ring-1 focus:ring-[#CA8E25] placeholder:text-slate-400"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={isLoading || !input.trim()}
              className="absolute right-1 top-1 bottom-1 w-8 flex items-center justify-center bg-[#CA8E25] hover:bg-[#D89A2B] text-black rounded-full disabled:opacity-50 disabled:hover:bg-[#CA8E25] transition-colors"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
          {isLoggedIn && messages.length === 0 && (
            <p className="text-[10px] text-slate-400 text-center mt-2">
              🔒 Your data is private and never shared with others
            </p>
          )}
        </div>
      </div>
    </>
  );
}
