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
  Save,
  X,
  AlertTriangle,
  FileText,
  DollarSign,
  CheckSquare,
  Square,
  Filter,
  CheckCircle2,
  AlertOctagon,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  updateEmailDraft, 
  deleteEmailDraft, 
  bulkDeleteEmailDrafts,
  sendEmailDraft,
  updateInvoiceDraftData
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

type ConfirmModalState = {
  isOpen: boolean;
  mode: "SINGLE" | "SELECTED" | "CLEAR_ALL";
  targetId?: string;
  targetSubject?: string;
  targetCount?: number;
  categoryLabel?: string;
} | null;

export default function EmailsClient({ initialDrafts }: { initialDrafts: EmailDraft[] }) {
  const { canManage } = useCanManageEnrollment();
  const [drafts, setDrafts] = useState<EmailDraft[]>(initialDrafts);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal & Preview state
  const [selectedDraft, setSelectedDraft] = useState<EmailDraft | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [previewTab, setPreviewTab] = useState<"EMAIL" | "PDF">("EMAIL");

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [editForm, setEditForm] = useState({ recipient: "", subject: "", bodyHtml: "" });

  // Confirmation modal state for deletion
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Invoice form state
  const [invoiceEditForm, setInvoiceEditForm] = useState<any>({
    itemDescription: "",
    unitPrice: 0,
    amount: 0,
    bankName: "",
    bankAccountNo: "",
    bankAccountHolder: "",
  });

  const editorRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Initialize editor HTML purely once on mount/edit mode
  useEffect(() => {
    if (isEditing && editorRef.current) {
      if (editorRef.current.innerHTML !== editForm.bodyHtml) {
        editorRef.current.innerHTML = editForm.bodyHtml;
      }
    }
  }, [isEditing]);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
  };

  const getMetadata = (metadataStr: string | null) => {
    if (!metadataStr) return {};
    try {
      return JSON.parse(metadataStr);
    } catch {
      return {};
    }
  };

  const getDraftCategory = (type: string): string => {
    if (type === "INVOICE") return "INVOICE";
    if (type.includes("PLACEMENT_TEST")) return "PLACEMENT_TEST";
    if (type.includes("ENROLLMENT") || type.includes("CLASS_PAYMENT") || type.includes("CAMP_PAYMENT")) return "ENROLLMENT";
    if (type === "ACCOUNT_ACTIVATION") return "ACCOUNT_ACTIVATION";
    if (type === "PASSWORD_RESET") return "PASSWORD_RESET";
    return "OTHER";
  };

  const getCategoryLabel = (catKey: string): string => {
    switch (catKey) {
      case "INVOICE": return "Invoice";
      case "PLACEMENT_TEST": return "Placement Test";
      case "ENROLLMENT": return "Enrollment";
      case "ACCOUNT_ACTIVATION": return "Account Activation";
      case "PASSWORD_RESET": return "Password Reset";
      case "OTHER": return "Other System Emails";
      default: return "All Categories";
    }
  };

  // Filtered drafts calculation
  const filteredDrafts = drafts.filter(draft => {
    const matchesSearch = 
      draft.recipient.toLowerCase().includes(search.toLowerCase()) || 
      draft.subject.toLowerCase().includes(search.toLowerCase()) ||
      draft.type.toLowerCase().includes(search.toLowerCase());
    
    let matchesCategory = true;
    if (categoryFilter !== "ALL") {
      matchesCategory = getDraftCategory(draft.type) === categoryFilter;
    }

    let matchesStatus = true;
    if (statusFilter !== "ALL") {
      matchesStatus = draft.status === statusFilter;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Checkbox Selection Logic
  const visibleIds = filteredDrafts.map(d => d.id);
  const isSelectAllChecked = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
  const isSomeSelectedInView = visibleIds.some(id => selectedIds.includes(id));

  const handleToggleSelectAll = () => {
    if (isSelectAllChecked) {
      // Deselect all visible
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      // Select all visible (union)
      const combined = new Set([...selectedIds, ...visibleIds]);
      setSelectedIds(Array.from(combined));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

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
        return <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 animate-spin" /> SENDING</span>;
      default:
        return <span className="bg-slate-500/10 border border-slate-500/20 text-slate-400 text-xs font-bold px-2.5 py-1 rounded-full">{status}</span>;
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const res = await updateEmailDraft(id, { status: newStatus });
    if (res.success && res.draft) {
      setDrafts(drafts.map(d => d.id === id ? { ...d, ...res.draft } : d));
      if (selectedDraft?.id === id) setSelectedDraft({ ...selectedDraft, ...res.draft } as any);
      showNotification("success", `Status updated to ${newStatus.replace("_", " ")}`);
    } else {
      showNotification("error", res.error || "Failed to update status");
    }
  };

  // Open confirmation modal triggers
  const promptDeleteSingle = (draft: EmailDraft) => {
    setConfirmModal({
      isOpen: true,
      mode: "SINGLE",
      targetId: draft.id,
      targetSubject: draft.subject,
    });
  };

  const promptDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      mode: "SELECTED",
      targetCount: selectedIds.length,
    });
  };

  const promptClearAll = () => {
    if (filteredDrafts.length === 0) return;
    setConfirmModal({
      isOpen: true,
      mode: "CLEAR_ALL",
      targetCount: filteredDrafts.length,
      categoryLabel: getCategoryLabel(categoryFilter),
    });
  };

  // Process Deletion after confirmation
  const handleExecuteDelete = async () => {
    if (!confirmModal) return;
    setIsDeleting(true);

    try {
      if (confirmModal.mode === "SINGLE" && confirmModal.targetId) {
        const idToDelete = confirmModal.targetId;
        const res = await deleteEmailDraft(idToDelete);
        if (res.success) {
          setDrafts(prev => prev.filter(d => d.id !== idToDelete));
          setSelectedIds(prev => prev.filter(id => id !== idToDelete));
          if (selectedDraft?.id === idToDelete) setIsModalOpen(false);
          showNotification("success", "Email deleted successfully.");
        } else {
          showNotification("error", res.error || "Failed to delete email");
        }
      } else if (confirmModal.mode === "SELECTED") {
        const res = await bulkDeleteEmailDrafts(selectedIds);
        if (res.success) {
          const deletedCount = res.count || selectedIds.length;
          setDrafts(prev => prev.filter(d => !selectedIds.includes(d.id)));
          if (selectedDraft && selectedIds.includes(selectedDraft.id)) setIsModalOpen(false);
          setSelectedIds([]);
          showNotification("success", `${deletedCount} email(s) deleted successfully.`);
        } else {
          showNotification("error", res.error || "Failed to delete selected emails");
        }
      } else if (confirmModal.mode === "CLEAR_ALL") {
        const targetIds = filteredDrafts.map(d => d.id);
        const res = await bulkDeleteEmailDrafts(targetIds);
        if (res.success) {
          const deletedCount = res.count || targetIds.length;
          setDrafts(prev => prev.filter(d => !targetIds.includes(d.id)));
          setSelectedIds(prev => prev.filter(id => !targetIds.includes(id)));
          if (selectedDraft && targetIds.includes(selectedDraft.id)) setIsModalOpen(false);
          showNotification("success", `${deletedCount} email(s) deleted successfully.`);
        } else {
          showNotification("error", res.error || "Failed to clear emails");
        }
      }
    } catch (err: any) {
      showNotification("error", err.message || "An unexpected error occurred during deletion");
    } finally {
      setIsDeleting(false);
      setConfirmModal(null);
    }
  };

  const handleSend = async (id: string) => {
    if (confirm("Are you sure you want to send this email now?")) {
      setIsSending(true);
      
      setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: "SENDING" } : d));
      if (selectedDraft?.id === id) setSelectedDraft(prev => prev ? { ...prev, status: "SENDING" } as any : prev);

      const res = await sendEmailDraft(id);
      
      if (res.draft) {
        setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...res.draft } : d));
        if (selectedDraft?.id === id) setSelectedDraft(prev => prev ? { ...prev, ...res.draft } as any : prev);
      }
      
      if (!res.success) {
        showNotification("error", res.error || "Failed to send email");
      } else {
        showNotification("success", "Email sent successfully!");
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
      showNotification("success", "Email draft updated successfully");
    } else {
      showNotification("error", res.error || "Failed to save edits");
    }
  };

  const handleSaveInvoiceEdit = async () => {
    if (!selectedDraft) return;
    const meta = getMetadata(selectedDraft.metadata);
    const existingInvData = meta.invoiceData || {};

    const updatedItems = [
      {
        no: 1,
        date: existingInvData.invoiceDate || new Date().toLocaleDateString("en-GB"),
        description: invoiceEditForm.itemDescription,
        unitPrice: Number(invoiceEditForm.unitPrice),
        amount: Number(invoiceEditForm.unitPrice),
      },
    ];

    const updatedInvData = {
      ...existingInvData,
      items: updatedItems,
      subtotal: Number(invoiceEditForm.unitPrice),
      total: Number(invoiceEditForm.unitPrice),
      bankName: invoiceEditForm.bankName,
      bankAccountNo: invoiceEditForm.bankAccountNo,
      bankAccountHolder: invoiceEditForm.bankAccountHolder,
    };

    const res = await updateInvoiceDraftData(selectedDraft.id, {
      invoiceData: updatedInvData,
    });

    if (res.success && res.draft) {
      setDrafts(drafts.map(d => d.id === selectedDraft.id ? { ...d, ...res.draft } : d));
      setSelectedDraft({ ...selectedDraft, ...res.draft } as any);
      setIsEditingInvoice(false);
      showNotification("success", "Invoice updated & PDF regenerated successfully!");
    } else {
      showNotification("error", res.error || "Failed to update invoice");
    }
  };

  const openModal = (draft: EmailDraft) => {
    setSelectedDraft(draft);
    setEditForm({
      recipient: draft.recipient,
      subject: draft.subject,
      bodyHtml: draft.bodyHtml
    });

    const meta = getMetadata(draft.metadata);
    if (draft.type === "INVOICE" && meta.invoiceData) {
      const inv = meta.invoiceData;
      const firstItem = inv.items && inv.items[0] ? inv.items[0] : {};
      setInvoiceEditForm({
        itemDescription: firstItem.description || inv.programName || "",
        unitPrice: firstItem.unitPrice || inv.total || 0,
        amount: firstItem.amount || inv.total || 0,
        bankName: inv.bankName || "BCA (Bank Central Asia)",
        bankAccountNo: inv.bankAccountNo || "7000686799",
        bankAccountHolder: inv.bankAccountHolder || "ANDI JULIO KAPUTRA",
      });
      setPreviewTab("PDF");
    } else {
      setPreviewTab("EMAIL");
    }

    setIsEditing(false);
    setIsEditingInvoice(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if ((isEditing || isEditingInvoice) && confirm("You have unsaved changes. Discard?")) {
      setIsEditing(false);
      setIsEditingInvoice(false);
      setIsModalOpen(false);
    } else if (!isEditing && !isEditingInvoice) {
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {notification && (
        <div 
          className={`fixed top-5 right-5 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 text-sm font-medium transition-all transform animate-in fade-in slide-in-from-top-4 ${
            notification.type === "success" 
              ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200" 
              : "bg-rose-950/90 border-rose-500/40 text-rose-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            className="ml-3 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Mail className="h-8 w-8 text-[#CA8E25]" />
            Email Workflow
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Manage, edit, approve, send, and delete transactional email drafts and logs. Total: <strong className="text-white">{drafts.length}</strong>
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        {/* Search */}
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by recipient, subject, or type..."
            className="pl-10 bg-slate-900 border-slate-800 text-white rounded-xl h-11 text-sm focus:border-[#CA8E25]"
          />
          {search && (
            <button 
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category & Status Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <Layers className="w-4 h-4 text-[#CA8E25]" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer py-1"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Categories</option>
              <option value="INVOICE" className="bg-slate-900 text-white">Invoice</option>
              <option value="PLACEMENT_TEST" className="bg-slate-900 text-white">Placement Test</option>
              <option value="ENROLLMENT" className="bg-slate-900 text-white">Enrollment</option>
              <option value="ACCOUNT_ACTIVATION" className="bg-slate-900 text-white">Account Activation</option>
              <option value="PASSWORD_RESET" className="bg-slate-900 text-white">Password Reset</option>
              <option value="OTHER" className="bg-slate-900 text-white">Other</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <Filter className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer py-1"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Statuses</option>
              <option value="PENDING_APPROVAL" className="bg-slate-900 text-white">Pending Approval</option>
              <option value="APPROVED" className="bg-slate-900 text-white">Approved</option>
              <option value="SENT" className="bg-slate-900 text-white">Sent</option>
              <option value="FAILED" className="bg-slate-900 text-white">Failed</option>
              <option value="REJECTED" className="bg-slate-900 text-white">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Controls Bar */}
      <div className="bg-slate-900/80 border border-slate-800 px-5 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Select All Checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-slate-200 select-none">
            <input
              type="checkbox"
              checked={isSelectAllChecked}
              onChange={handleToggleSelectAll}
              disabled={filteredDrafts.length === 0}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-[#CA8E25] focus:ring-[#CA8E25] focus:ring-offset-slate-950 cursor-pointer disabled:opacity-40"
            />
            <span>Select All</span>
          </label>

          <div className="h-4 w-px bg-slate-800" />

          {/* Selection Count Indicator */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-all ${
              selectedIds.length > 0 
                ? "bg-[#CA8E25]/10 text-[#CA8E25] border-[#CA8E25]/30" 
                : "bg-slate-800/50 text-slate-400 border-slate-800"
            }`}>
              {selectedIds.length} email{selectedIds.length !== 1 ? "s" : ""} selected
            </span>

            {/* Clear Selected Button */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={promptDeleteSelected}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl h-8 text-xs font-bold px-3 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear Selected ({selectedIds.length})
                </Button>
                <button
                  onClick={handleClearSelection}
                  className="text-xs text-slate-500 hover:text-slate-300 underline"
                >
                  Deselect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Clear All Emails Button */}
        <div className="flex items-center gap-3 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={promptClearAll}
            disabled={filteredDrafts.length === 0}
            className="bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded-xl h-9 text-xs font-bold px-4 transition-all disabled:opacity-40"
          >
            <AlertOctagon className="w-3.5 h-3.5 mr-1.5 text-red-400" /> Clear All Emails {filteredDrafts.length > 0 && `(${filteredDrafts.length})`}
          </Button>
        </div>
      </div>

      {/* Email List Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[48px] text-center">
                  #
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[180px]">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[200px]">Category / Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Recipient &amp; Subject</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[160px]">Created</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right w-[180px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredDrafts.length > 0 ? (
                filteredDrafts.map((draft) => {
                  const isChecked = selectedIds.includes(draft.id);
                  return (
                    <tr 
                      key={draft.id} 
                      className={`transition-colors ${
                        isChecked ? "bg-[#CA8E25]/5 hover:bg-[#CA8E25]/10" : "hover:bg-slate-900/50"
                      }`}
                    >
                      <td className="px-5 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(draft.id)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#CA8E25] focus:ring-[#CA8E25] focus:ring-offset-slate-950 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(draft.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {draft.type === "INVOICE" ? (
                          <span className="font-mono text-xs font-bold text-[#CA8E25] bg-[#CA8E25]/10 px-2.5 py-1 rounded-md border border-[#CA8E25]/20 flex items-center gap-1.5 w-fit">
                            <FileText className="w-3.5 h-3.5" /> INVOICE
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-blue-400/90 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                            {draft.type}
                          </span>
                        )}
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
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openModal(draft)}
                          className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-8 px-3 text-xs border border-slate-800 inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => promptDeleteSingle(draft)}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg h-8 px-2.5 text-xs border border-red-500/20 inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Mail className="w-12 h-12 text-slate-700" />
                      <p className="text-sm font-medium">No emails found matching your filters.</p>
                      {(search || categoryFilter !== "ALL" || statusFilter !== "ALL") && (
                        <button
                          onClick={() => {
                            setSearch("");
                            setCategoryFilter("ALL");
                            setStatusFilter("ALL");
                          }}
                          className="text-xs text-[#CA8E25] hover:underline font-bold"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DELETION CONFIRMATION MODAL */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl shrink-0 ${
                confirmModal.mode === "CLEAR_ALL" 
                  ? "bg-red-500/15 border border-red-500/30 text-red-400" 
                  : "bg-amber-500/15 border border-amber-500/30 text-amber-400"
              }`}>
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">
                  {confirmModal.mode === "SINGLE" && "Delete this email?"}
                  {confirmModal.mode === "SELECTED" && `Delete ${confirmModal.targetCount} selected email(s)?`}
                  {confirmModal.mode === "CLEAR_ALL" && `DELETE ALL ${confirmModal.targetCount} EMAILS?`}
                </h3>
                {confirmModal.targetSubject && (
                  <p className="text-xs font-mono text-[#CA8E25] line-clamp-1">
                    "{confirmModal.targetSubject}"
                  </p>
                )}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
              {confirmModal.mode === "SINGLE" && (
                <p>This email will be permanently removed from the Email Workflow list.</p>
              )}

              {confirmModal.mode === "SELECTED" && (
                <p>You are about to permanently delete <strong>{confirmModal.targetCount} selected email(s)</strong>. This action cannot be undone.</p>
              )}

              {confirmModal.mode === "CLEAR_ALL" && (
                <p>
                  You are about to permanently delete all <strong>{confirmModal.targetCount} emails</strong> in the current view ({confirmModal.categoryLabel || "All Categories"}). This action cannot be undone.
                </p>
              )}
              
              <p className="text-rose-400 font-semibold text-[11px]">
                ⚠️ Database record will be permanently deleted.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setConfirmModal(null)}
                disabled={isDeleting}
                className="flex-1 border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl h-11 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className={`flex-1 ${
                  confirmModal.mode === "CLEAR_ALL" 
                    ? "bg-red-600 hover:bg-red-500 text-white" 
                    : "bg-rose-600 hover:bg-rose-500 text-white"
                } rounded-xl h-11 text-xs font-bold shadow-lg flex items-center justify-center gap-2`}
              >
                {isDeleting ? (
                  <>Deleting...</>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> 
                    {confirmModal.mode === "SINGLE" && "Delete"}
                    {confirmModal.mode === "SELECTED" && `Delete Selected (${confirmModal.targetCount})`}
                    {confirmModal.mode === "CLEAR_ALL" && `Delete All (${confirmModal.targetCount})`}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review & Edit Modal */}
      {isModalOpen && selectedDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#CA8E25]" /> 
                  {selectedDraft.type === "INVOICE" ? "Review Invoice & Email Draft" : "Review Email Draft"}
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
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">To / Recipient Email</label>
                        {!isEditing && selectedDraft.status !== "SENT" && (
                          <button onClick={() => setIsEditing(true)} className="text-blue-400 text-xs hover:text-blue-300 flex items-center gap-1"><Edit className="w-3 h-3" /> Edit Email</button>
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

                    {/* Invoice Edit Section */}
                    {selectedDraft.type === "INVOICE" && (
                      <div className="bg-slate-900 border border-[#CA8E25]/30 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-[#CA8E25] uppercase tracking-wider flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4" /> Invoice Details
                          </h4>
                          {!isEditingInvoice && selectedDraft.status !== "SENT" && (
                            <button
                              onClick={() => setIsEditingInvoice(true)}
                              className="text-amber-400 text-xs hover:text-amber-300 flex items-center gap-1 font-bold"
                            >
                              <Edit className="w-3 h-3" /> Edit Invoice Items
                            </button>
                          )}
                        </div>

                        {isEditingInvoice ? (
                          <div className="space-y-3 pt-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Item Description</label>
                              <Input
                                value={invoiceEditForm.itemDescription}
                                onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, itemDescription: e.target.value })}
                                className="bg-slate-950 border-slate-700 text-white text-xs mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Unit Price (Rp)</label>
                              <Input
                                type="number"
                                value={invoiceEditForm.unitPrice}
                                onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, unitPrice: e.target.value })}
                                className="bg-slate-950 border-slate-700 text-white text-xs mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Bank Name</label>
                              <Input
                                value={invoiceEditForm.bankName}
                                onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, bankName: e.target.value })}
                                className="bg-slate-950 border-slate-700 text-white text-xs mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Account Number</label>
                              <Input
                                value={invoiceEditForm.bankAccountNo}
                                onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, bankAccountNo: e.target.value })}
                                className="bg-slate-950 border-slate-700 text-white text-xs mt-1"
                              />
                            </div>
                            <div className="flex gap-2 pt-2">
                              <Button
                                onClick={handleSaveInvoiceEdit}
                                className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold text-xs flex-1 py-1.5 h-auto"
                              >
                                <Save className="w-3.5 h-3.5 mr-1" /> Regenerate PDF
                              </Button>
                              <Button
                                onClick={() => setIsEditingInvoice(false)}
                                variant="outline"
                                className="border-slate-700 text-slate-300 text-xs py-1.5 h-auto"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-300 space-y-1 font-mono">
                            {(() => {
                              const meta = getMetadata(selectedDraft.metadata);
                              const inv = meta.invoiceData || {};
                              return (
                                <>
                                  <p><span className="text-slate-500">Number:</span> {inv.invoiceNumber || meta.invoiceNumber}</p>
                                  <p><span className="text-slate-500">Student ID:</span> {inv.studentIdStr || meta.studentIdStr}</p>
                                  <p><span className="text-slate-500">Total:</span> Rp {(inv.total || 0).toLocaleString("id-ID")}</p>
                                  <p className="text-[10px] text-amber-400/80 pt-1 font-sans">
                                    📎 PDF Attachment: {meta.pdfFilename || "Invoice.pdf"}
                                  </p>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
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

                  {!isEditing && !isEditingInvoice && (
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
                            onClick={() => promptDeleteSingle(selectedDraft)}
                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl py-2 flex items-center justify-center gap-1.5 border border-red-500/20"
                          >
                            <Trash2 className="w-4 h-4" /> Delete Email
                          </Button>
                        </>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right Panel: Live Preview (Email or PDF) */}
              <div className="w-full lg:w-3/5 bg-slate-100 overflow-hidden flex flex-col rounded-br-2xl lg:rounded-bl-none rounded-bl-2xl">
                <div className="bg-slate-200 border-b border-slate-300 px-4 py-3 flex items-center justify-between shrink-0 shadow-sm z-10">
                  <div className="flex items-center gap-2">
                    {selectedDraft.type === "INVOICE" && (
                      <div className="flex bg-slate-300 p-0.5 rounded-lg border border-slate-400">
                        <button
                          onClick={() => setPreviewTab("EMAIL")}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition ${previewTab === "EMAIL" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                        >
                          <Mail className="w-3.5 h-3.5 inline mr-1" /> Email Body
                        </button>
                        <button
                          onClick={() => setPreviewTab("PDF")}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition ${previewTab === "PDF" ? "bg-[#CA8E25] text-black shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                        >
                          <FileText className="w-3.5 h-3.5 inline mr-1" /> Invoice PDF Preview
                        </button>
                      </div>
                    )}
                    {selectedDraft.type !== "INVOICE" && (
                      <span className="text-xs font-bold text-slate-600 flex items-center gap-2 uppercase tracking-wide">
                        <Mail className="w-4 h-4" /> Live Preview
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] bg-white border border-slate-300 text-slate-500 px-2 py-0.5 rounded-full font-mono shadow-sm">
                    {editForm.recipient || "(No recipient)"}
                  </span>
                </div>

                {previewTab === "PDF" && selectedDraft.type === "INVOICE" ? (
                  <div className="w-full flex-1 bg-slate-800 flex flex-col items-center justify-center p-2 relative overflow-hidden">
                    {(() => {
                      const meta = getMetadata(selectedDraft.metadata);
                      if (meta.pdfBase64) {
                        return (
                          <iframe
                            className="w-full h-full rounded-lg border border-slate-700 bg-white"
                            src={`data:application/pdf;base64,${meta.pdfBase64}`}
                            title="Invoice PDF Preview"
                          />
                        );
                      }
                      return (
                        <div className="text-center text-slate-400 space-y-2">
                          <FileText className="w-10 h-10 mx-auto text-slate-600" />
                          <p className="text-sm">No PDF preview available</p>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <iframe 
                    className="w-full flex-1 bg-white" 
                    srcDoc={isEditing ? editForm.bodyHtml : selectedDraft.bodyHtml}
                    title="Email Preview"
                    sandbox="allow-same-origin"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
