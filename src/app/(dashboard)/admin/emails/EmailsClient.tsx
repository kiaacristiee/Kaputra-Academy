"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Mail, 
  Send, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  Eye,
  ShieldAlert,
  Save,
  X,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  updateEmailDraft, 
  deleteEmailDraft, 
  sendEmailDraft 
} from "@/actions/emails";
import { useCanManageEnrollment } from "@/hooks/usePermissions";

interface EmailDraft {
  id: string;
  type: string;
  recipient: string;
  subject: string;
  bodyHtml: string;
  status: string; // PENDING_APPROVAL, APPROVED, REJECTED, SENT, FAILED, SENDING
  metadata: string | null;
  createdAt: Date;
}

export default function EmailsClient({ initialDrafts }: { initialDrafts: EmailDraft[] }) {
  const { canManage } = useCanManageEnrollment();
  const [drafts, setDrafts] = useState(initialDrafts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedDraft, setSelectedDraft] = useState<EmailDraft | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ recipient: "", subject: "", bodyHtml: "" });
  const editorRef = useRef<HTMLDivElement>(null);

  // Initialize editor HTML purely once on mount/edit mode to prevent cursor jumping bug
  useEffect(() => {
    if (isEditing && editorRef.current) {
      if (editorRef.current.innerHTML !== editForm.bodyHtml) {
        editorRef.current.innerHTML = editForm.bodyHtml;
      }
    }
  }, [isEditing]);

  const getLearningMethod = (metadataStr: string | null) => {
    if (!metadataStr) return null;
    try {
      return JSON.parse(metadataStr).learningMethod || null;
    } catch {
      return null;
    }
  };

  const getMetadata = (metadataStr: string | null) => {
    if (!metadataStr) return {};
    try {
      return JSON.parse(metadataStr);
    } catch {
      return {};
    }
  };

  const filteredDrafts = drafts.filter(draft => {
    const matchesSearch = 
      draft.recipient.toLowerCase().includes(search.toLowerCase()) || 
      draft.subject.toLowerCase().includes(search.toLowerCase()) ||
      draft.type.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || draft.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_APPROVAL":
        return <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> PENDING</span>;
      case "APPROVED":
        return <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> APPROVED</span>;
      case "REJECTED":
        return <span className="bg-slate-500/10 border border-slate-500/20 text-slate-400 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> REJECTED</span>;
      case "SENT":
        return <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"><Send className="w-3.5 h-3.5" /> SENT</span>;
      case "FAILED":
        return <span className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> FAILED</span>;
      case "SENDING":
        return <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 className animate-spin" /> SENDING</span>;
      default:
        return <span className="bg-slate-500/10 border border-slate-500/20 text-slate-400 text-xs font-bold px-2.5 py-1 rounded-full">{status}</span>;
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const res = await updateEmailDraft(id, { status: newStatus });
    if (res.success && res.draft) {
      setDrafts(drafts.map(d => d.id === id ? { ...d, ...res.draft } : d));
      if (selectedDraft?.id === id) setSelectedDraft({ ...selectedDraft, ...res.draft } as any);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this draft permanently?")) {
      const res = await deleteEmailDraft(id);
      if (res.success) {
        setDrafts(drafts.filter(d => d.id !== id));
        if (selectedDraft?.id === id) setIsModalOpen(false);
      }
    }
  };

  const handleSend = async (id: string) => {
    if (confirm("Are you sure you want to send this email now?")) {
      setIsSending(true);
      
      // Optimistic update to UI for "SENDING" state
      setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: "SENDING" } : d));
      if (selectedDraft?.id === id) setSelectedDraft(prev => prev ? { ...prev, status: "SENDING" } as any : prev);

      const res = await sendEmailDraft(id);
      
      if (res.draft) {
        setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...res.draft } : d));
        if (selectedDraft?.id === id) setSelectedDraft(prev => prev ? { ...prev, ...res.draft } as any : prev);
      }
      
      if (!res.success) {
        alert(res.error || "Failed to send email");
      }
      
      setIsSending(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedDraft) return;
    const res = await updateEmailDraft(selectedDraft.id, editForm);
    if (res.success && res.draft) {
      setDrafts(drafts.map(d => d.id === selectedDraft.id ? { ...d, ...res.draft } : d));
      setSelectedDraft({ ...selectedDraft, ...res.draft } as any);
      setIsEditing(false);
    } else {
      alert(res.error || "Failed to save edits");
    }
  };

  const openModal = (draft: EmailDraft) => {
    setSelectedDraft(draft);
    setEditForm({
      recipient: draft.recipient,
      subject: draft.subject,
      bodyHtml: draft.bodyHtml
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isEditing && confirm("You have unsaved changes. Discard?")) {
      setIsEditing(false);
      setIsModalOpen(false);
    } else if (!isEditing) {
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Mail className="h-8 w-8 text-[#CA8E25]" />
            Email Workflow
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Review, edit, approve, and track system-generated transactional emails.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by recipient or subject..."
            className="pl-10 bg-slate-900 border-slate-800 text-white rounded-xl h-11"
          />
        </div>
        <div className="flex gap-2 text-sm w-full md:w-auto overflow-x-auto">
          {["ALL", "PENDING_APPROVAL", "APPROVED", "FAILED", "SENT"].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap font-medium transition-all ${
                statusFilter === status
                  ? "bg-[#CA8E25] text-black"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700"
              }`}
            >
              {status === "ALL" ? "All Drafts" : status.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[180px]">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[200px]">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Recipient &amp; Subject</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[160px]">Created</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredDrafts.length > 0 ? (
                filteredDrafts.map((draft) => (
                  <tr key={draft.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(draft.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs text-blue-400/80 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                        {draft.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-white text-sm flex items-center gap-2">
                          {draft.recipient}
                        </span>
                        <span className="text-xs text-slate-400 line-clamp-1">{draft.subject}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-mono">
                      {new Date(draft.createdAt).toLocaleString("en-GB", {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openModal(draft)}
                        className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-8 px-3 text-xs border border-slate-800"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Actions
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Mail className="w-12 h-12 text-slate-700" />
                      <p>No email drafts found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Edit Modal */}
      {isModalOpen && selectedDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-5xl bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#CA8E25]" /> {isEditing ? "Edit Email Draft" : "Review Email Draft"}
                </h2>
                {getStatusBadge(selectedDraft.status)}
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white transition-colors"
                disabled={isSending}
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
              
              {/* Left Panel: Details & Actions */}
              <div className="w-full lg:w-2/5 border-r border-slate-800 bg-slate-950/50 flex flex-col overflow-y-auto relative">
                <div className="p-6 flex flex-col gap-6">
                
                  {/* Status Badges & Logs */}
                  {(() => {
                    const meta = getMetadata(selectedDraft.metadata);
                    return (
                      <div className="space-y-3">
                        {selectedDraft.status === "FAILED" && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                            <h4 className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Delivery Failed</h4>
                            <p className="text-red-300/80 text-xs">{meta.lastError || "Unknown delivery error"}</p>
                            {meta.failedBy && <p className="text-red-300/60 text-[10px] mt-2 font-mono">Attempted by: {meta.failedBy} at {new Date(meta.failedAt).toLocaleString()}</p>}
                          </div>
                        )}
                        
                        {selectedDraft.status === "SENT" && meta.sentBy && (
                          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                            <h4 className="text-emerald-500/80 text-xs font-bold uppercase tracking-wider mb-1">Delivery Log</h4>
                            <p className="text-emerald-400/60 text-[10px] font-mono">Sent successfully by {meta.sentBy} at {new Date(meta.sentAt).toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">To / Recipient</label>
                        {!isEditing && selectedDraft.status !== "SENT" && (
                          <button onClick={() => setIsEditing(true)} className="text-blue-400 text-xs hover:text-blue-300 flex items-center gap-1"><Edit className="w-3 h-3" /> Edit</button>
                        )}
                      </div>
                      {isEditing ? (
                        <Input 
                          value={editForm.recipient} 
                          onChange={(e) => setEditForm({...editForm, recipient: e.target.value})} 
                          className="bg-slate-900 border-slate-700 text-white" 
                        />
                      ) : (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-medium text-white break-all">
                          {selectedDraft.recipient}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Subject</label>
                      {isEditing ? (
                        <Input 
                          value={editForm.subject} 
                          onChange={(e) => setEditForm({...editForm, subject: e.target.value})} 
                          className="bg-slate-900 border-slate-700 text-white" 
                        />
                      ) : (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-medium text-white">
                          {selectedDraft.subject}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Trigger Type</label>
                      <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-blue-400 opacity-60">
                        {selectedDraft.type}
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex flex-col gap-2 mt-2">
                       <label className="text-[10px] font-bold text-[#CA8E25] uppercase tracking-widest block">Email Body Edit (Visual)</label>
                       <p className="text-xs text-slate-400 mb-1">Click the box below to visually edit the text content of the email.</p>
                       <div 
                          ref={editorRef}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(e) => setEditForm({...editForm, bodyHtml: e.currentTarget.innerHTML})}
                          className="w-full min-h-[16rem] max-h-96 overflow-y-auto bg-white border border-slate-700 rounded-xl p-4 text-black focus:outline-none focus:border-[#CA8E25] shadow-inner prose prose-sm prose-slate max-w-none"
                        />
                       
                       <div className="flex items-center gap-3 pt-3">
                          <Button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-500 text-white flex-1"><Save className="w-4 h-4 mr-2" /> Save Edits</Button>
                          <Button onClick={() => {
                            // Revert changes
                            setEditForm({
                              recipient: selectedDraft.recipient,
                              subject: selectedDraft.subject,
                              bodyHtml: selectedDraft.bodyHtml
                            });
                            setIsEditing(false);
                          }} className="bg-slate-700 hover:bg-slate-600 text-white" variant="outline"><X className="w-4 h-4 mr-2" /> Cancel</Button>
                       </div>
                    </div>
                  )}

                  {!isEditing && (
                    <div className="pt-6 border-t border-slate-800">
                      <h4 className="text-xs font-bold text-white mb-3">Workflow Actions</h4>
                      
                        <>
                          {selectedDraft.status === "PENDING_APPROVAL" && (
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <Button 
                                onClick={() => handleStatusChange(selectedDraft.id, "APPROVED")}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2 flex items-center justify-center gap-1.5"
                              >
                                <CheckCircle className="w-4 h-4" /> Approve
                              </Button>
                              <Button 
                                onClick={() => handleStatusChange(selectedDraft.id, "REJECTED")}
                                className="bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/20 rounded-xl py-2 flex items-center justify-center gap-1.5"
                              >
                                <XCircle className="w-4 h-4" /> Reject
                              </Button>
                            </div>
                          )}

                          {selectedDraft.status === "REJECTED" && (
                            <div className="mb-4">
                              <Button 
                                onClick={() => handleStatusChange(selectedDraft.id, "PENDING_APPROVAL")}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-2 flex items-center justify-center gap-1.5"
                              >
                                Re-evaluate
                              </Button>
                            </div>
                          )}

                          {(selectedDraft.status === "APPROVED" || selectedDraft.status === "PENDING_APPROVAL" || selectedDraft.status === "FAILED") && (
                            <Button 
                              onClick={() => handleSend(selectedDraft.id)}
                              disabled={isSending}
                              className={`w-full ${selectedDraft.status === "FAILED" ? "bg-rose-600 hover:bg-rose-500 text-white" : "bg-[#CA8E25] hover:bg-[#D89A2B] text-black shadow-[0_0_15px_rgba(202,142,37,0.3)] hover:shadow-[0_0_20px_rgba(202,142,37,0.5)]"} font-bold rounded-xl py-6 flex items-center justify-center gap-2 mb-3 transition-all`}
                            >
                              {isSending ? (
                                <>Sending...</>
                              ) : (
                                <>
                                  <Send className="w-4 h-4" /> {selectedDraft.status === "FAILED" ? "Retry Sending Email" : "Send Email Now"}
                                </>
                              )}
                            </Button>
                          )}

                          <hr className="border-slate-800 my-4" />
                          
                          <Button 
                            variant="ghost"
                            onClick={() => handleDelete(selectedDraft.id)}
                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl py-2 flex items-center justify-center gap-1.5 border border-red-500/20"
                          >
                            <Trash2 className="w-4 h-4" /> Delete Draft
                          </Button>
                        </>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right Panel: HTML Live Preview */}
              <div className="w-full lg:w-3/5 bg-slate-100 overflow-hidden flex flex-col rounded-br-2xl lg:rounded-bl-none rounded-bl-2xl">
                <div className="bg-slate-200 border-b border-slate-300 px-4 py-3 flex items-center justify-between shrink-0 shadow-sm z-10">
                  <span className="text-xs font-bold text-slate-600 flex items-center gap-2 uppercase tracking-wide">
                    <Mail className="w-4 h-4" /> Live Preview
                  </span>
                  <span className="text-[10px] bg-white border border-slate-300 text-slate-500 px-2 py-0.5 rounded-full font-mono shadow-sm">
                    {editForm.recipient || "(No recipient)"}
                  </span>
                </div>
                {/* 
                  Using an iframe with srcDoc allows rendering HTML content safely 
                  and applying local styles securely inside the modal.
                  It updates live as the user types in edit mode.
                */}
                <iframe 
                  className="w-full flex-1 bg-white" 
                  srcDoc={isEditing ? editForm.bodyHtml : selectedDraft.bodyHtml}
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
