"use client";

import { useState, useRef, useEffect } from "react";
import { X, Sparkles, Send, Loader2, MessageCircle } from "lucide-react";

interface Message {
  role: "user" | "ai";
  content: string;
}

const suggestions = [
  "What programs do you offer?",
  "How do I register?",
  "What is the Placement Test?",
  "What is the difference between Regular and Competition Class?",
  "How much are the tuition fees?",
];

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Auto focus input when opened, slightly delayed for animation
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [messages, isOpen]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const newMessages = [...messages, { role: "user", content: text } as Message];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "ai", content: data.answer }]);
    } catch (error) {
      setMessages([
        ...newMessages,
        { role: "ai", content: "Sorry, I am currently unavailable. Please try again later." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 p-4 bg-[#CA8E25] text-black rounded-full shadow-lg hover:scale-110 transition-transform duration-300 flex items-center justify-center ${
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        }`}
        aria-label="Open Kaputra AI Chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 z-50 w-[calc(100vw-48px)] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col transition-all duration-300 origin-bottom-right ${
          isOpen ? "scale-100 opacity-100 pointer-events-auto" : "scale-50 opacity-0 pointer-events-none"
        }`}
        style={{ maxHeight: "calc(100vh - 48px)" }}
      >
        {/* Header */}
        <div className="bg-[#072147] p-4 flex items-center justify-between rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-[#CA8E25]/20 p-1.5 rounded-full">
              <Sparkles className="w-4 h-4 text-[#CA8E25]" />
            </div>
            <h3 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base">
              Kaputra AI
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                Beta
              </span>
            </h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Close Chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto min-h-[300px] max-h-[500px] bg-slate-50 flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-8">
              <div className="w-16 h-16 bg-[#072147]/5 rounded-full flex items-center justify-center mb-2">
                <Sparkles className="w-8 h-8 text-[#CA8E25]" />
              </div>
              <p className="text-slate-500 text-sm max-w-[250px]">
                Hi! I'm Kaputra AI. Ask me anything about our programs, classes, and registration.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(suggestion)}
                    className="text-xs bg-white border border-[#CA8E25]/30 text-[#072147] px-3 py-1.5 rounded-full hover:bg-[#CA8E25]/10 hover:border-[#CA8E25] transition-colors text-left"
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
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-[#072147] text-white rounded-tr-sm"
                        : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-[#CA8E25] animate-spin" />
                    <span className="text-xs text-slate-500 font-medium">Thinking...</span>
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
                if (e.key === "Enter") handleSend(input);
              }}
              placeholder="Ask anything about Kaputra Academy..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-full pl-4 pr-10 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#CA8E25] focus:ring-1 focus:ring-[#CA8E25]"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={isLoading || !input.trim()}
              className="absolute right-1 top-1 bottom-1 w-8 flex items-center justify-center bg-[#CA8E25] hover:bg-[#D89A2B] text-black rounded-full disabled:opacity-50 disabled:hover:bg-[#CA8E25] transition-colors"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
