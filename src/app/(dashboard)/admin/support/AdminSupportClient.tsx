"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Filter, HeadphonesIcon, MoreVertical, CheckCircle2, Clock, Mail, Phone, Calendar, Send, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendChatMessage, updateSessionStatus } from "@/actions/chat";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
}

interface LiveChatMessage {
  id: string;
  senderType: string;
  content: string;
  createdAt: string | Date;
}

interface LiveChatSession {
  id: string;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  user: User | null;
  messages: LiveChatMessage[];
}

interface AdminSupportClientProps {
  initialSessions: LiveChatSession[];
  adminId: string;
}

export default function AdminSupportClient({ initialSessions, adminId }: AdminSupportClientProps) {
  const [sessions, setSessions] = useState<LiveChatSession[]>(initialSessions);
  const [activeSession, setActiveSession] = useState<LiveChatSession | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [filterMode, setFilterMode] = useState<"ALL" | "NEW" | "WAITING_REPLY" | "CLOSED">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  // Handle Polling updates for the entire list (can be optimized in production by just fetching updates since last poll)
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/admin/support/polling");
        if (res.ok) {
          const data = await res.json();
          if (data.sessions) setSessions(data.sessions);
        }
      } catch (e) {}
    };
    pollingRef.current = setInterval(poll, 5000); // 5 sec poll in admin

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Sync activeSession with polling updates
  useEffect(() => {
    if (activeSession) {
      const updatedSession = sessions.find(s => s.id === activeSession.id);
      if (updatedSession && updatedSession.messages.length > activeSession.messages.length) {
        setActiveSession(updatedSession);
      }
    }
  }, [sessions, activeSession]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeSession || isSubmitting) return;

    setIsSubmitting(true);
    const text = replyText;
    setReplyText("");

    // Optimistic UI update
    const optimisticMessage: LiveChatMessage = {
      id: Math.random().toString(),
      senderType: "ADMIN",
      content: text,
      createdAt: new Date()
    };

    setActiveSession({
      ...activeSession,
      status: "REPLIED",
      messages: [...activeSession.messages, optimisticMessage]
    });

    setSessions(prev => prev.map(s => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          status: "REPLIED",
          messages: [...s.messages, optimisticMessage]
        };
      }
      return s;
    }));

    await sendChatMessage(activeSession.id, text, "ADMIN");
    await updateSessionStatus(activeSession.id, "REPLIED", adminId);
    
    setIsSubmitting(false);
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    const confirmed = confirm("Are you sure you want to close this ticket?");
    if (!confirmed) return;

    setActiveSession({
      ...activeSession,
      status: "CLOSED"
    });
    setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, status: "CLOSED" } : s));
    await updateSessionStatus(activeSession.id, "CLOSED", adminId);
  };

  const getFilteredSessions = () => {
    let filtered = [...sessions];
    
    if (filterMode !== "ALL") {
      filtered = filtered.filter(s => s.status === filterMode);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(s => {
        const name = (s.user?.name || s.guestName || "").toLowerCase();
        const email = (s.user?.email || s.guestEmail || "").toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }

    return filtered;
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">NEW</span>;
      case "WAITING_REPLY":
        return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">USER REPLIED</span>;
      case "REPLIED":
        return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-bold">REPLIED</span>;
      case "CLOSED":
        return <span className="bg-slate-500/20 text-slate-400 border border-slate-500/30 px-2 py-0.5 rounded text-[10px] font-bold">CLOSED</span>;
      default:
        return null;
    }
  };

  const filteredSessions = getFilteredSessions();

  return (
    <div className="flex h-[calc(100vh-140px)] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
      
      {/* LEFT PANEL : INBOX */}
      <div className="w-1/3 border-r border-slate-800 flex flex-col bg-slate-900/50 relative shrink-0">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900">
          <h2 className="text-xl font-black text-white flex items-center gap-2 mb-4">
            <HeadphonesIcon className="w-5 h-5 text-[#CA8E25]" /> Customer Service
          </h2>
          
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#CA8E25]"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
             <button 
                onClick={() => setFilterMode("ALL")}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${filterMode === "ALL" ? "bg-[#CA8E25] border-[#CA8E25] text-black" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"}`}
             >All</button>
             <button 
                onClick={() => setFilterMode("NEW")}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${filterMode === "NEW" ? "bg-emerald-500 border-emerald-600 text-black" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"}`}
             >New</button>
             <button 
                onClick={() => setFilterMode("WAITING_REPLY")}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${filterMode === "WAITING_REPLY" ? "bg-amber-500 border-amber-600 text-black" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"}`}
             >Action Needed</button>
             <button 
                onClick={() => setFilterMode("CLOSED")}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${filterMode === "CLOSED" ? "bg-slate-600 border-slate-700 text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"}`}
             >Resolved</button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredSessions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
               <Info className="w-8 h-8 mx-auto mb-2 text-slate-600" />
               <p className="text-sm">No conversations found.</p>
            </div>
          ) : (
            filteredSessions.map(session => {
               const isActive = activeSession?.id === session.id;
               const lastMsg = session.messages[session.messages.length - 1];
               const hasUnread = ["NEW", "WAITING_REPLY"].includes(session.status);

               return (
                 <div
                   key={session.id}
                   onClick={() => setActiveSession(session)}
                   className={`p-4 border-b border-slate-800 cursor-pointer transition-colors relative ${isActive ? "bg-slate-800" : "hover:bg-slate-800/50"} ${isActive ? "border-l-4 border-l-[#CA8E25]" : "border-l-4 border-l-transparent"}`}
                 >
                   <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm tracking-tight ${hasUnread ? "font-black text-white" : "font-bold text-slate-300"}`}>
                          {session.user?.name || session.guestName || "Unknown"}
                        </h4>
                        {!session.user && <span className="bg-slate-700 text-slate-400 text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider">GUEST</span>}
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                         {lastMsg ? new Date(lastMsg.createdAt).toLocaleDateString() : ""}
                      </span>
                   </div>
                   
                   <p className={`text-xs pr-4 truncate ${hasUnread ? "text-slate-200 font-medium" : "text-slate-500"}`}>
                     {lastMsg ? lastMsg.content : "No messages yet."}
                   </p>
                   
                   <div className="mt-2 flex justify-between items-center">
                      {renderStatusBadge(session.status)}
                      {hasUnread && !isActive && <span className="w-2 h-2 rounded-full bg-[#CA8E25] shadow-sm" />}
                   </div>
                 </div>
               )
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL : ACTIVE CHAT */}
      <div className="w-2/3 flex flex-col bg-slate-950 relative">
        {activeSession ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#CA8E25]/10 border border-[#CA8E25]/20 rounded-full flex items-center justify-center">
                   <span className="text-[#CA8E25] font-black text-lg">
                      {(activeSession.user?.name || activeSession.guestName || "?").charAt(0).toUpperCase()}
                   </span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    {activeSession.user?.name || activeSession.guestName || "Unknown"}
                    {renderStatusBadge(activeSession.status)}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {activeSession.user?.email || activeSession.guestEmail || "-"}</span>
                    {(activeSession.user?.phone || activeSession.guestPhone) && (
                       <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {activeSession.user?.phone || activeSession.guestPhone}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 {activeSession.status !== "CLOSED" && (
                   <Button 
                     onClick={handleCloseSession}
                     variant="outline"
                     className="text-slate-400 border-slate-700 hover:text-white hover:bg-slate-800 text-xs rounded-xl h-8 px-3"
                   >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Resolved
                   </Button>
                 )}
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
               {activeSession.messages.map((msg, idx) => (
                 <div key={msg.id || idx} className={`flex ${msg.senderType === "ADMIN" ? "justify-end" : "justify-start"}`}>
                   <div className="max-w-[75%] flex flex-col">
                     <span className={`text-[10px] font-bold mb-1 ml-1 ${msg.senderType === "ADMIN" ? "text-slate-400 text-right mr-1" : "text-slate-500"}`}>
                        {msg.senderType === "ADMIN" ? "You (Admin)" : (activeSession.user?.name || activeSession.guestName)} 
                        <span className="font-normal opacity-70 ml-2">
                           {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                     </span>
                     <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.senderType === "ADMIN" ? "bg-[#CA8E25] text-black rounded-tr-sm" : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm"}`}>
                        {msg.content}
                     </div>
                   </div>
                 </div>
               ))}
               <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {activeSession.status !== "CLOSED" ? (
              <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
                <form onSubmit={handleSendReply} className="flex items-end gap-3 max-w-4xl mx-auto">
                   <div className="flex-1 relative">
                     <textarea 
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply(e);
                          }
                        }}
                        placeholder={`Reply to ${activeSession.user?.name || activeSession.guestName || "customer"}...`}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-2xl px-4 pt-3 pb-3 text-sm focus:outline-none focus:border-[#CA8E25] focus:ring-1 focus:ring-[#CA8E25]/30 resize-none"
                        rows={3}
                     />
                     <div className="absolute left-4 bottom-[-16px]">
                       <p className="text-[10px] text-slate-500">Press <kbd className="bg-slate-800 font-mono px-1 rounded">Enter</kbd> to send, <kbd className="bg-slate-800 font-mono px-1 rounded">Shift+Enter</kbd> for new line.</p>
                     </div>
                   </div>
                   <Button 
                      type="submit"
                      disabled={isSubmitting || !replyText.trim()}
                      className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold h-12 w-12 rounded-xl mb-1 flex items-center justify-center shrink-0 disabled:opacity-50 transition-colors shadow-sm"
                   >
                     <Send className="w-5 h-5 ml-0.5" />
                   </Button>
                </form>
              </div>
            ) : (
              <div className="p-4 bg-slate-900 border-t border-slate-800 text-center">
                 <p className="text-sm font-bold text-slate-500">This conversation is closed.</p>
                 <Button onClick={() => updateSessionStatus(activeSession.id, "NEW", adminId).then(() => {
                    const updated = { ...activeSession, status: "NEW" };
                    setActiveSession(updated);
                    setSessions(prev => prev.map(s => s.id === activeSession.id ? updated : s));
                 })} variant="outline" className="mt-3 bg-slate-800 border-slate-700 hover:bg-slate-700 text-white text-xs h-8">
                    Reopen Conversation
                 </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
             <HeadphonesIcon className="w-16 h-16 mb-4 opacity-50" />
             <p className="font-medium">Select a conversation to start assisting users.</p>
          </div>
        )}
      </div>
    </div>
  );
}
