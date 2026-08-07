"use client";

import { useState, useRef, useEffect } from "react";
import { Search, HeadphonesIcon, CheckCircle2, Mail, Phone, Send, Info, UserCheck, ShieldAlert, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendChatMessage, updateSessionStatus, reassignSupportSession } from "@/actions/chat";

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
  assignedAdminId: string | null;
  assignedAt: string | Date | null;
  lastReplyAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  user: User | null;
  assignedAdmin?: User | null;
  messages: LiveChatMessage[];
}

interface AdminSupportClientProps {
  initialSessions: LiveChatSession[];
  adminId: string;
  userRole: string;
  availableAdmins?: { id: string; name: string; email: string; role: string }[];
}

export default function AdminSupportClient({ 
  initialSessions, 
  adminId, 
  userRole,
  availableAdmins = [] 
}: AdminSupportClientProps) {
  const isSuperAdmin = ["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(userRole);

  const [sessions, setSessions] = useState<LiveChatSession[]>(initialSessions);
  const [activeSession, setActiveSession] = useState<LiveChatSession | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
  const [selectedReassignAdminId, setSelectedReassignAdminId] = useState<string>("");

  // Filters for Super Admin vs Standard Admin
  const [filterMode, setFilterMode] = useState<"ALL" | "OPEN" | "IN_PROGRESS" | "CLOSED" | "MY_CONVERSATIONS">(
    isSuperAdmin ? "ALL" : "MY_CONVERSATIONS"
  );
  const [searchTerm, setSearchTerm] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  // Polling for updates
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
    pollingRef.current = setInterval(poll, 4000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Sync activeSession with polling updates
  useEffect(() => {
    if (activeSession) {
      const updatedSession = sessions.find(s => s.id === activeSession.id);
      if (updatedSession) {
        if (updatedSession.messages.length > activeSession.messages.length || updatedSession.status !== activeSession.status || updatedSession.assignedAdminId !== activeSession.assignedAdminId) {
          setActiveSession(updatedSession);
        }
      }
    }
  }, [sessions, activeSession]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeSession || isSubmitting) return;

    setIsSubmitting(true);
    const text = replyText;
    setReplyText("");

    const optimisticMessage: LiveChatMessage = {
      id: Math.random().toString(),
      senderType: "ADMIN",
      content: text,
      createdAt: new Date()
    };

    const updatedSession = {
      ...activeSession,
      status: "IN_PROGRESS",
      lastReplyAt: new Date(),
      messages: [...activeSession.messages, optimisticMessage]
    };

    setActiveSession(updatedSession);
    setSessions(prev => prev.map(s => s.id === activeSession.id ? updatedSession : s));

    await sendChatMessage(activeSession.id, text, "ADMIN");
    setIsSubmitting(false);
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    const confirmed = confirm("Are you sure you want to close this customer conversation?");
    if (!confirmed) return;

    const updated = { ...activeSession, status: "CLOSED" };
    setActiveSession(updated);
    setSessions(prev => prev.map(s => s.id === activeSession.id ? updated : s));
    await updateSessionStatus(activeSession.id, "CLOSED");
  };

  const handleReopenSession = async () => {
    if (!activeSession) return;
    const updated = { ...activeSession, status: "OPEN" };
    setActiveSession(updated);
    setSessions(prev => prev.map(s => s.id === activeSession.id ? updated : s));
    await updateSessionStatus(activeSession.id, "OPEN");
  };

  const handleTakeOver = async () => {
    if (!activeSession) return;
    setIsReassigning(true);
    const res = await reassignSupportSession(activeSession.id, adminId);
    if (res.success && res.session) {
      const updated = { 
        ...activeSession, 
        assignedAdminId: adminId, 
        assignedAdmin: res.session.assignedAdmin || null,
        assignedAt: new Date()
      };
      setActiveSession(updated as any);
      setSessions(prev => prev.map(s => s.id === activeSession.id ? (updated as any) : s));
    }
    setIsReassigning(false);
  };

  const handleReassignToAdmin = async (targetAdminId: string) => {
    if (!activeSession || !targetAdminId) return;
    setIsReassigning(true);
    const res = await reassignSupportSession(activeSession.id, targetAdminId);
    if (res.success && res.session) {
      const updated = {
        ...activeSession,
        assignedAdminId: targetAdminId,
        assignedAdmin: res.session.assignedAdmin || null,
        assignedAt: new Date()
      };
      setActiveSession(updated as any);
      setSessions(prev => prev.map(s => s.id === activeSession.id ? (updated as any) : s));
    }
    setSelectedReassignAdminId("");
    setIsReassigning(false);
  };

  const getFilteredSessions = () => {
    let filtered = [...sessions];
    
    // Strict Standard Admin filtering: ONLY assigned conversations
    if (!isSuperAdmin) {
      filtered = filtered.filter(s => s.assignedAdminId === adminId);
    }

    if (filterMode === "MY_CONVERSATIONS") {
      filtered = filtered.filter(s => s.assignedAdminId === adminId);
    } else if (filterMode === "OPEN") {
      filtered = filtered.filter(s => ["OPEN", "NEW"].includes(s.status));
    } else if (filterMode === "IN_PROGRESS") {
      filtered = filtered.filter(s => ["IN_PROGRESS", "WAITING_REPLY", "REPLIED"].includes(s.status));
    } else if (filterMode === "CLOSED") {
      filtered = filtered.filter(s => s.status === "CLOSED");
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(s => {
        const name = (s.user?.name || s.guestName || "").toLowerCase();
        const email = (s.user?.email || s.guestEmail || "").toLowerCase();
        const adminName = (s.assignedAdmin?.name || "").toLowerCase();
        return name.includes(q) || email.includes(q) || adminName.includes(q);
      });
    }

    return filtered;
  };

  const renderStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (["OPEN", "NEW"].includes(s)) {
      return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">OPEN</span>;
    } else if (["IN_PROGRESS", "WAITING_REPLY", "REPLIED"].includes(s)) {
      return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">IN PROGRESS</span>;
    } else if (s === "CLOSED") {
      return <span className="bg-slate-500/20 text-slate-400 border border-slate-500/30 px-2 py-0.5 rounded text-[10px] font-bold">CLOSED</span>;
    }
    return <span className="bg-slate-500/20 text-slate-400 border border-slate-500/30 px-2 py-0.5 rounded text-[10px] font-bold">{s}</span>;
  };

  const filteredSessions = getFilteredSessions();

  return (
    <div className="flex h-[calc(100vh-140px)] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
      
      {/* LEFT PANEL : INBOX */}
      <div className="w-1/3 border-r border-slate-800 flex flex-col bg-slate-900/50 relative shrink-0">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <HeadphonesIcon className="w-5 h-5 text-[#CA8E25]" /> Customer Service
            </h2>
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {isSuperAdmin ? "Super Admin" : "Standard Admin"}
            </span>
          </div>
          
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search customer name, email..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#CA8E25]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {isSuperAdmin && (
              <button 
                onClick={() => setFilterMode("ALL")}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${filterMode === "ALL" ? "bg-[#CA8E25] border-[#CA8E25] text-black" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"}`}
              >All</button>
            )}
            {isSuperAdmin && (
              <button 
                onClick={() => setFilterMode("OPEN")}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${filterMode === "OPEN" ? "bg-emerald-500 border-emerald-600 text-black" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"}`}
              >Open</button>
            )}
            {isSuperAdmin && (
              <button 
                onClick={() => setFilterMode("IN_PROGRESS")}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${filterMode === "IN_PROGRESS" ? "bg-amber-500 border-amber-600 text-black" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"}`}
              >In Progress</button>
            )}
            {isSuperAdmin && (
              <button 
                onClick={() => setFilterMode("CLOSED")}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${filterMode === "CLOSED" ? "bg-slate-600 border-slate-700 text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"}`}
              >Closed</button>
            )}
            <button 
              onClick={() => setFilterMode("MY_CONVERSATIONS")}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${filterMode === "MY_CONVERSATIONS" ? "bg-purple-600 border-purple-500 text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"}`}
            >My Conversations</button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredSessions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
               <Info className="w-8 h-8 mx-auto mb-2 text-slate-600" />
               <p className="text-sm font-medium">No conversations found.</p>
               {!isSuperAdmin && <p className="text-xs text-slate-600 mt-1">You will automatically receive newly assigned conversations here.</p>}
            </div>
          ) : (
            filteredSessions.map(session => {
               const isActive = activeSession?.id === session.id;
               const lastMsg = session.messages[session.messages.length - 1];
               const isAssignedToMe = session.assignedAdminId === adminId;

               return (
                 <div
                   key={session.id}
                   onClick={() => setActiveSession(session)}
                   className={`p-4 border-b border-slate-800 cursor-pointer transition-colors relative ${isActive ? "bg-slate-800" : "hover:bg-slate-800/50"} ${isActive ? "border-l-4 border-l-[#CA8E25]" : "border-l-4 border-l-transparent"}`}
                 >
                   <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white tracking-tight">
                          {session.user?.name || session.guestName || "Guest User"}
                        </h4>
                        {!session.user && <span className="bg-slate-700 text-slate-400 text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider">GUEST</span>}
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                         {lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                      </span>
                   </div>
                   
                   <p className="text-xs pr-4 truncate text-slate-400">
                     {lastMsg ? lastMsg.content : "No messages yet."}
                   </p>
                   
                   <div className="mt-2 flex justify-between items-center text-[10px]">
                      <div className="flex items-center gap-2">
                        {renderStatusBadge(session.status)}
                        {isSuperAdmin && (
                          <span className="text-slate-400 font-medium">
                            {session.assignedAdmin ? `Assigned: ${session.assignedAdmin.name}` : "Unassigned"}
                          </span>
                        )}
                      </div>
                      {isAssignedToMe && (
                        <span className="text-purple-400 font-bold bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">MINE</span>
                      )}
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
                    {activeSession.user?.name || activeSession.guestName || "Guest User"}
                    {renderStatusBadge(activeSession.status)}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-500" /> {activeSession.user?.email || activeSession.guestEmail || "-"}</span>
                    {(activeSession.user?.phone || activeSession.guestPhone) && (
                       <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-500" /> {activeSession.user?.phone || activeSession.guestPhone}</span>
                    )}
                    <span className="flex items-center gap-1 text-slate-400">
                      <UserCheck className="w-3.5 h-3.5 text-[#CA8E25]" />
                      <span>Admin: <strong className="text-white">{activeSession.assignedAdmin?.name || "Unassigned"}</strong></span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Super Admin / Admin Actions */}
              <div className="flex items-center gap-2">
                 {isSuperAdmin && (
                   <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1">
                     <select
                       disabled={isReassigning}
                       value={selectedReassignAdminId || activeSession.assignedAdminId || ""}
                       onChange={(e) => {
                         const val = e.target.value;
                         if (val && val !== activeSession.assignedAdminId) {
                           handleReassignToAdmin(val);
                         }
                       }}
                       className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                     >
                       <option value="" disabled className="bg-slate-900 text-slate-400">Reassign Admin...</option>
                       {availableAdmins.map(admin => (
                         <option key={admin.id} value={admin.id} className="bg-slate-900 text-white">
                           {admin.name} ({admin.role === "ADMIN" ? "Standard Admin" : "Super Admin"})
                         </option>
                       ))}
                     </select>
                   </div>
                 )}

                 {isSuperAdmin && activeSession.assignedAdminId !== adminId && (
                   <Button
                     onClick={handleTakeOver}
                     disabled={isReassigning}
                     variant="outline"
                     className="bg-purple-600/20 border-purple-500/30 hover:bg-purple-600 hover:text-white text-purple-300 text-xs rounded-xl h-8 px-3"
                   >
                     <ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> Take Over
                   </Button>
                 )}

                 {activeSession.status !== "CLOSED" ? (
                   <Button 
                     onClick={handleCloseSession}
                     variant="outline"
                     className="text-slate-400 border-slate-700 hover:text-white hover:bg-slate-800 text-xs rounded-xl h-8 px-3"
                   >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Close Ticket
                   </Button>
                 ) : (
                   <Button 
                     onClick={handleReopenSession}
                     variant="outline"
                     className="text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800 text-xs rounded-xl h-8 px-3"
                   >
                      Reopen Ticket
                   </Button>
                 )}
              </div>
            </div>

            {/* Conversation Details Bar */}
            <div className="bg-slate-900/60 border-b border-slate-800/80 px-6 py-2 flex items-center justify-between text-[11px] text-slate-400">
               <div>
                 <span>Assigned At: </span>
                 <strong className="text-slate-300">
                   {activeSession.assignedAt ? new Date(activeSession.assignedAt).toLocaleString() : "Not assigned"}
                 </strong>
               </div>
               <div>
                 <span>Last Reply: </span>
                 <strong className="text-slate-300">
                   {activeSession.lastReplyAt ? new Date(activeSession.lastReplyAt).toLocaleString() : "No replies yet"}
                 </strong>
               </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
               {activeSession.messages.map((msg, idx) => (
                 <div key={msg.id || idx} className={`flex ${msg.senderType === "ADMIN" ? "justify-end" : "justify-start"}`}>
                   <div className="max-w-[75%] flex flex-col">
                     <span className={`text-[10px] font-bold mb-1 ml-1 ${msg.senderType === "ADMIN" ? "text-slate-400 text-right mr-1" : "text-slate-500"}`}>
                        {msg.senderType === "ADMIN" ? "Admin Support" : (activeSession.user?.name || activeSession.guestName || "Customer")} 
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
                {!isSuperAdmin && activeSession.assignedAdminId && activeSession.assignedAdminId !== adminId ? (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span>This conversation is assigned to another admin. Only the assigned admin can reply.</span>
                  </div>
                ) : (
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
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-900 border-t border-slate-800 text-center">
                 <p className="text-sm font-bold text-slate-500">This conversation is closed.</p>
                 <Button onClick={handleReopenSession} variant="outline" className="mt-3 bg-slate-800 border-slate-700 hover:bg-slate-700 text-white text-xs h-8">
                    Reopen Conversation
                 </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
             <HeadphonesIcon className="w-16 h-16 mb-4 opacity-50" />
             <p className="font-medium text-slate-400">Select a conversation to start assisting customers.</p>
          </div>
        )}
      </div>
    </div>
  );
}
