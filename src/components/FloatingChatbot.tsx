"use client";

import { useState, useRef, useEffect } from "react";
import { X, Sparkles, Send, Loader2, MessageCircle, GraduationCap, RotateCcw, ArrowLeft, HeadphonesIcon, FileText } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { createGuestSession, createAuthSession, sendChatMessage, getActiveUserSession } from "@/actions/chat";

interface Message {
  role: "user" | "ai";
  content: string;
}

interface LiveMessage {
  id: string;
  senderType: "USER" | "ADMIN";
  content: string;
  createdAt: Date;
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
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"SELECTION" | "AI" | "LIVE">("SELECTION");

  const [aiMessages, setAiMessages] = useState<Message[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const userRole = (session?.user as any)?.role || "GUEST";
  const userName = session?.user?.name || "there";

  const aiMessagesEndRef = useRef<HTMLDivElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);

  // Live Chat State
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [liveInput, setLiveInput] = useState("");
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [guestForm, setGuestForm] = useState({ name: "", email: "" });
  const liveMessagesEndRef = useRef<HTMLDivElement>(null);
  const livePollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === "AI") {
        aiMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => aiInputRef.current?.focus(), 300);
      } else if (mode === "LIVE") {
        liveMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [aiMessages, liveMessages, isOpen, mode]);

  // Handle restoring active live session on mount
  useEffect(() => {
    if (isLoggedIn) {
      getActiveUserSession().then((res) => {
        if (res.success && res.session) {
          setLiveSessionId(res.session.id);
          setLiveMessages(res.session.messages);
        }
      });
    } else {
      const stored = localStorage.getItem("kaputra_guest_chat_id");
      if (stored) {
        setLiveSessionId(stored);
        // Let polling pick it up
      }
    }
  }, [isLoggedIn]);

  // Polling for live chat updates
  useEffect(() => {
    if (isOpen && mode === "LIVE" && liveSessionId) {
      const poll = async () => {
        const res = await getActiveUserSession(); // This server action can fetch by session or we can create a fetch messages action
        // Actually, let's just make a simple API call if needed, or use a generic fetch
        try {
          const fetchRes = await fetch(`/api/chat/messages?sessionId=${liveSessionId}`);
          if (fetchRes.ok) {
            const data = await fetchRes.json();
            if (data.messages && data.messages.length > liveMessages.length) {
              setLiveMessages(data.messages);
            }
          }
        } catch(e) {}
      };
      
      livePollingRef.current = setInterval(poll, 3000);
    }
    return () => {
      if (livePollingRef.current) clearInterval(livePollingRef.current);
    };
  }, [isOpen, mode, liveSessionId, liveMessages.length]);

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

  const handleAiSend = async (text: string) => {
    if (!text.trim()) return;

    const newMessages: Message[] = [...aiMessages, { role: "user", content: text }];
    setAiMessages(newMessages);
    setAiInput("");
    setIsAiLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, history: newMessages }),
      });
      const data = await res.json();
      setAiMessages([...newMessages, { role: "ai", content: data.answer }]);
    } catch (error) {
      setAiMessages([...newMessages, { role: "ai", content: "Sorry, I am currently unavailable. Please try again later." }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleLiveSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!liveInput.trim() && !guestForm.name) return;

    setIsLiveLoading(true);
    let currentSessionId = liveSessionId;

    if (!currentSessionId) {
      if (isLoggedIn) {
        const res = await createAuthSession({ initialMessage: liveInput });
        if (res.success) currentSessionId = res.session.id;
      } else {
        if (!guestForm.name.trim() || !guestForm.email.trim()) {
          setIsLiveLoading(false);
          return;
        }
        const res = await createGuestSession({ name: guestForm.name, email: guestForm.email, initialMessage: liveInput });
        if (res.success) {
          currentSessionId = res.session.id;
          localStorage.setItem("kaputra_guest_chat_id", currentSessionId as string);
        }
      }
      setLiveSessionId(currentSessionId);
    } else {
      await sendChatMessage(currentSessionId, liveInput, "USER");
    }
    
    // Optimistic UI
    setLiveMessages([...liveMessages, { 
      id: Math.random().toString(), 
      senderType: "USER", 
      content: liveInput, 
      createdAt: new Date() 
    }]);
    
    setLiveInput("");
    setIsLiveLoading(false);
  };

  const renderAiContent = (content: string) => {
    if (!content) return null;
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
      if (processed.trim().startsWith("- ") || processed.trim().startsWith("• ")) {
        const bulletContent = processed.trim().replace(/^[-•]\s/, "");
        return (
          <div key={idx} className="flex gap-2 ml-1">
            <span className="text-[#CA8E25] shrink-0 mt-0.5">•</span>
            <span dangerouslySetInnerHTML={{ __html: bulletContent }} />
          </div>
        );
      }
      if (processed.trim() === "") return <div key={idx} className="h-2" />;
      return <div key={idx} dangerouslySetInnerHTML={{ __html: processed }} />;
    });
  };

  // Hide the chatbot on admin pages
  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 p-4 bg-[#CA8E25] text-black rounded-full shadow-lg hover:scale-110 transition-transform duration-300 flex items-center justify-center ${
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        }`}
        aria-label="Open Chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      <div
        className={`fixed bottom-6 right-6 z-50 w-[calc(100vw-48px)] sm:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col transition-all duration-300 origin-bottom-right ${
          isOpen ? "scale-100 opacity-100 pointer-events-auto" : "scale-50 opacity-0 pointer-events-none"
        }`}
        style={{ height: "600px", maxHeight: "calc(100vh - 48px)" }}
      >
        {/* Header - Shared across all modes */}
        <div className="bg-[#072147] p-4 flex items-center justify-between rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2.5">
            {mode === "SELECTION" ? (
              <div className="bg-[#CA8E25]/20 p-2 rounded-full">
                <MessageCircle className="w-4 h-4 text-[#CA8E25]" />
              </div>
            ) : mode === "AI" ? (
              <div className="bg-[#CA8E25]/20 p-1.5 rounded-full">
                <GraduationCap className="w-4 h-4 text-[#CA8E25]" />
              </div>
            ) : (
              <div className="bg-[#CA8E25]/20 p-1.5 rounded-full">
                <HeadphonesIcon className="w-4 h-4 text-[#CA8E25]" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base leading-tight">
                {mode === "SELECTION" && "Kaputra Support"}
                {mode === "AI" && (
                  <>Kaputra AI <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">{isLoggedIn ? "Personal" : "Beta"}</span></>
                )}
                {mode === "LIVE" && "Customer Service"}
              </h3>
              {mode === "LIVE" && <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> We usually reply immediately</p>}
              {mode === "AI" && isLoggedIn && <p className="text-[10px] text-slate-400 mt-0.5">Learning Assistant for {userName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {mode !== "SELECTION" && (
              <button
                onClick={() => setMode("SELECTION")}
                className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            {mode === "AI" && aiMessages.length > 0 && (
              <button
                onClick={() => setAiMessages([])}
                className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Body */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* SELECTION MODE */}
          {mode === "SELECTION" && (
            <div className="flex-1 bg-slate-50 p-6 flex flex-col gap-4 overflow-y-auto">
              <p className="text-sm font-semibold text-slate-700 mb-2">How can we help you today?</p>
              
              <div 
                onClick={() => setMode("AI")}
                className="bg-white border text-left border-slate-200 rounded-2xl p-5 hover:border-[#CA8E25] hover:shadow-md transition cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-[#072147]/5 p-3 rounded-full group-hover:bg-[#CA8E25]/10 shrink-0">
                    <Sparkles className="w-6 h-6 text-[#072147] group-hover:text-[#CA8E25]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-[#CA8E25]">Kaputra AI</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Get instant automated answers about classes, schedules, curriculum, and test analyses.
                    </p>
                    <span className="inline-block mt-3 text-[11px] font-bold text-[#072147] bg-slate-100 px-3 py-1.5 rounded-lg group-hover:bg-[#CA8E25] group-hover:text-black transition">
                      Chat with AI
                    </span>
                  </div>
                </div>
              </div>

              <div 
                onClick={() => setMode("LIVE")}
                className="bg-white border text-left border-slate-200 rounded-2xl p-5 hover:border-[#CA8E25] hover:shadow-md transition cursor-pointer group mt-2"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-[#072147]/5 p-3 rounded-full group-hover:bg-[#CA8E25]/10 shrink-0">
                    <HeadphonesIcon className="w-6 h-6 text-[#072147] group-hover:text-[#CA8E25]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-[#CA8E25]">Customer Service</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Need personal assistance? Chat directly with our human Customer Service team.
                    </p>
                    <span className="inline-block mt-3 text-[11px] font-bold text-[#072147] bg-slate-100 px-3 py-1.5 rounded-lg group-hover:bg-[#CA8E25] group-hover:text-black transition">
                      Chat with Customer Service
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI MODE */}
          {mode === "AI" && (
            <>
              <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3">
                {aiMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#072147]/10 to-[#CA8E25]/10 rounded-full flex items-center justify-center mb-1">
                      <Sparkles className="w-7 h-7 text-[#CA8E25]" />
                    </div>
                    <p className="text-slate-600 text-sm max-w-[280px] leading-relaxed">{getGreeting()}</p>
                    <div className="flex flex-wrap justify-center gap-2 mt-3">
                      {getSuggestions().map((s, i) => (
                        <button key={i} onClick={() => handleAiSend(s)} className="text-[11px] bg-white border border-[#CA8E25]/25 text-[#072147] px-3 py-1.5 rounded-full hover:bg-[#CA8E25]/10 transition-all text-left">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {aiMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user" ? "bg-[#072147] text-white rounded-tr-sm" : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm"}`}>
                          {msg.role === "ai" ? renderAiContent(msg.content) : msg.content}
                        </div>
                      </div>
                    ))}
                    {isAiLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2.5">
                          <span className="w-2 h-2 bg-[#CA8E25] rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-[#CA8E25] rounded-full animate-bounce" style={{animationDelay:"150ms"}} />
                          <span className="w-2 h-2 bg-[#CA8E25] rounded-full animate-bounce" style={{animationDelay:"300ms"}} />
                        </div>
                      </div>
                    )}
                    <div ref={aiMessagesEndRef} />
                  </>
                )}
              </div>
              <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                <div className="flex items-center gap-2 relative">
                  <input
                    ref={aiInputRef}
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAiSend(aiInput)}
                    placeholder="Ask Kaputra AI..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-full pl-4 pr-10 py-2.5 text-sm focus:border-[#CA8E25] outline-none"
                  />
                  <button onClick={() => handleAiSend(aiInput)} disabled={isAiLoading || !aiInput.trim()} className="absolute right-1 top-1 bottom-1 w-8 flex items-center justify-center bg-[#CA8E25] hover:bg-[#D89A2B] text-black rounded-full disabled:opacity-50 transition-colors">
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* LIVE CHAT MODE */}
          {mode === "LIVE" && (
            <>
              <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3 relative">
                {liveMessages.length === 0 && !liveSessionId && !isLoggedIn ? (
                  <form onSubmit={handleLiveSend} className="m-auto w-full max-w-sm bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="text-center">
                      <HeadphonesIcon className="w-10 h-10 mx-auto text-[#072147] mb-2" />
                      <h4 className="font-bold text-lg text-slate-900">Welcome</h4>
                      <p className="text-xs text-slate-500 mt-1">Please provide your details so we can assist you better.</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Name</label>
                      <input required type="text" value={guestForm.name} onChange={e => setGuestForm({...guestForm, name: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:border-[#CA8E25] outline-none" placeholder="Jordan" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                      <input required type="email" value={guestForm.email} onChange={e => setGuestForm({...guestForm, email: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:border-[#CA8E25] outline-none" placeholder="jordan@example.com" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">How can we help?</label>
                      <textarea required value={liveInput} onChange={e => setLiveInput(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:border-[#CA8E25] outline-none resize-none" placeholder="Your message..." />
                    </div>
                    <button type="submit" disabled={isLiveLoading} className="w-full bg-[#072147] text-white font-bold text-sm py-2.5 rounded-lg flex items-center justify-center gap-2">
                       {isLiveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4"/> Start Chat</>}
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="text-center py-4">
                      <span className="bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                        Chat Started
                      </span>
                    </div>
                    {liveMessages.map((msg, idx) => (
                      <div key={msg.id || idx} className={`flex ${msg.senderType === "USER" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.senderType === "USER" ? "bg-[#CA8E25] text-black rounded-tr-sm" : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm"}`}>
                          {msg.content}
                          <div className={`text-[9px] mt-1 text-right ${msg.senderType === "USER" ? "text-black/60" : "text-slate-400"}`}>
                             {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={liveMessagesEndRef} />
                  </>
                )}
              </div>
              
              {(isLoggedIn || liveSessionId) && (
                <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                  <div className="text-center mb-2">
                    <span className="text-[10px] text-slate-400">
                      Customer Service is online. We reply within minutes.
                    </span>
                  </div>
                  <form onSubmit={handleLiveSend} className="flex items-center gap-2 relative">
                    <input
                      type="text"
                      value={liveInput}
                      onChange={(e) => setLiveInput(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-full pl-4 pr-10 py-2.5 text-sm focus:border-[#CA8E25] outline-none"
                    />
                    <button type="submit" disabled={isLiveLoading || !liveInput.trim()} className="absolute right-1 top-1 bottom-1 w-8 flex items-center justify-center bg-[#CA8E25] hover:bg-[#D89A2B] text-black rounded-full disabled:opacity-50 transition-colors">
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </>
  );
}
