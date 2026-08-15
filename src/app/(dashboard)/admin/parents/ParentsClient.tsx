"use client";

import { useState } from "react";
import { Users, Plus, Trash2, Edit2, Link2, Unlink, CheckCircle2, AlertCircle, Search, ToggleLeft, ToggleRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { motion, AnimatePresence } from "framer-motion";
import {
  createParentAccount,
  updateParentAccount,
  deleteParentAccount,
  toggleParentActive,
  linkChildToParent,
  unlinkChildFromParent,
} from "@/actions/adminExtra";

interface Child {
  id: string;
  name: string;
  studentIdStr: string | null;
  isActive: boolean;
}

interface Parent {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  children: Child[];
}

interface Props {
  initialParents: Parent[];
}

export default function ParentsClient({ initialParents }: Props) {
  const [parents, setParents] = useState<Parent[]>(initialParents);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals / forms state
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<Parent | null>(null);
  const [linkModal, setLinkModal] = useState<Parent | null>(null);

  const [createForm, setCreateForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });
  const [studentIdToLink, setStudentIdToLink] = useState("");

  const showStatus = (t: "success" | "error", text: string) => {
    setMessage({ type: t, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await createParentAccount(createForm);
    if (res.success && res.parent) {
      setParents((prev) => [
        {
          id: res.parent.id,
          name: res.parent.name,
          email: res.parent.email,
          phone: res.parent.phone,
          isActive: res.parent.isActive,
          children: [],
        },
        ...prev,
      ]);
      showStatus("success", "Parent account created!");
      setCreateModal(false);
      setCreateForm({ name: "", email: "", phone: "", password: "" });
    } else {
      showStatus("error", (res as any).error || "Failed to create parent account.");
    }
    setLoading(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    setLoading(true);
    const res = await updateParentAccount(editModal.id, editForm);
    if (res.success && res.parent) {
      setParents((prev) =>
        prev.map((p) =>
          p.id === editModal.id
            ? { ...p, name: res.parent.name, email: res.parent.email, phone: res.parent.phone }
            : p
        )
      );
      showStatus("success", "Parent account updated!");
      setEditModal(null);
    } else {
      showStatus("error", (res as any).error || "Failed to update.");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this parent account? Linked children will be unlinked.")) return;
    const res = await deleteParentAccount(id);
    if (res.success) {
      setParents((prev) => prev.filter((p) => p.id !== id));
      showStatus("success", "Parent account deleted.");
    } else {
      showStatus("error", (res as any).error || "Failed to delete.");
    }
  };

  const handleToggleActive = async (parent: Parent) => {
    const nextVal = !parent.isActive;
    const res = await toggleParentActive(parent.id, nextVal);
    if (res.success) {
      setParents((prev) =>
        prev.map((p) => (p.id === parent.id ? { ...p, isActive: nextVal } : p))
      );
      showStatus("success", `Parent account is now ${nextVal ? "active" : "inactive"}.`);
    } else {
      showStatus("error", (res as any).error || "Failed to toggle status.");
    }
  };

  const handleLinkChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkModal || !studentIdToLink) return;
    setLoading(true);
    const res = await linkChildToParent(linkModal.id, studentIdToLink);
    if (res.success) {
      // Find the parent to refresh list locally. Since we don't have the child details, we would ideally refetch,
      // but let's just show success and close modal. Suggest router.refresh or just update state.
      // Better yet, we can locate student details in memory or show status.
      showStatus("success", "Child linked successfully! Please refresh to see the updated children list.");
      setLinkModal(null);
      setStudentIdToLink("");
      // Simple reload to fetch fresh children relationships
      window.location.reload();
    } else {
      showStatus("error", (res as any).error || "Failed to link child.");
    }
    setLoading(false);
  };

  const handleUnlinkChild = async (parentId: string, studentId: string) => {
    if (!confirm("Are you sure you want to unlink this child from this parent?")) return;
    const res = await unlinkChildFromParent(studentId);
    if (res.success) {
      setParents((prev) =>
        prev.map((p) =>
          p.id === parentId
            ? { ...p, children: p.children.filter((c) => c.id !== studentId) }
            : p
        )
      );
      showStatus("success", "Child unlinked.");
    } else {
      showStatus("error", (res as any).error || "Failed to unlink.");
    }
  };

  const filtered = parents.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.phone && p.phone.includes(search))
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-[#CA8E25]" />
            Parent Management
          </h1>
          <p className="text-slate-400 mt-2">Create parent accounts, manage relationships, and toggle statuses.</p>
        </div>
        <Button
          onClick={() => setCreateModal(true)}
          className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl px-5 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Parent
        </Button>
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-2 p-4 rounded-xl border ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            {message.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
          />
        </div>
      </div>

      {/* Parents Grid / List */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((parent) => (
            <div key={parent.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold">
                      {parent.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-tight">{parent.name}</h3>
                      <p className="text-xs text-slate-500">{parent.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(parent)}
                    className={`p-1.5 rounded-lg transition ${
                      parent.isActive ? "text-emerald-400 hover:bg-emerald-500/10" : "text-slate-600 hover:bg-slate-800"
                    }`}
                    title={parent.isActive ? "Deactivate Parent" : "Activate Parent"}
                  >
                    {parent.isActive ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                  </button>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  Phone: {parent.phone || "Not set"}
                </div>

                {/* Children section */}
                <div className="space-y-2 pt-2 border-t border-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Linked Children</span>
                    <button
                      onClick={() => {
                        setLinkModal(parent);
                        setStudentIdToLink("");
                      }}
                      className="text-[10px] font-bold text-[#CA8E25] hover:underline flex items-center gap-1"
                    >
                      <Link2 className="h-3 w-3" /> Link Child
                    </button>
                  </div>
                  {parent.children.length > 0 ? (
                    <div className="space-y-1.5">
                      {parent.children.map((child) => (
                        <div key={child.id} className="flex items-center justify-between bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
                          <div>
                            <p className="text-xs text-slate-300 font-medium">{child.name}</p>
                            <p className="text-[9px] text-slate-500 font-mono">{child.studentIdStr || "—"}</p>
                          </div>
                          <button
                            onClick={() => handleUnlinkChild(parent.id, child.id)}
                            className="text-red-400 hover:text-red-300 transition p-1 hover:bg-red-500/10 rounded"
                            title="Unlink child"
                          >
                            <Unlink className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-600 italic">No linked children.</p>
                  )}
                </div>
              </div>

              {/* Actions row */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-900">
                <button
                  onClick={() => {
                    setEditModal(parent);
                    setEditForm({ name: parent.name, email: parent.email, phone: parent.phone || "" });
                  }}
                  className="text-xs font-semibold text-slate-400 hover:text-white transition p-1.5 hover:bg-slate-900 rounded-lg"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(parent.id)}
                  className="text-xs font-semibold text-red-400 hover:text-red-300 transition p-1.5 hover:bg-red-500/10 rounded-lg"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 p-12 rounded-2xl text-center text-slate-500 text-sm">
          No parent accounts found.
        </div>
      )}

      {/* Create Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Add New Parent Account</h3>
              <button onClick={() => setCreateModal(false)} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
                <input
                  type="text" required value={createForm.name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Email Address</label>
                <input
                  type="email" required value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Phone Number</label>
                <input
                  type="text" required value={createForm.phone}
                  onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Password (Optional)</label>
                <PasswordInput
                  placeholder="Default: password123" value={createForm.password}
                  onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl mt-2">
                {loading ? "Creating..." : "Create Account"}
              </Button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Edit Parent Account</h3>
              <button onClick={() => setEditModal(null)} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
                <input
                  type="text" required value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Email Address</label>
                <input
                  type="email" required value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Phone Number</label>
                <input
                  type="text" required value={editForm.phone}
                  onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl mt-2">
                {loading ? "Saving Changes..." : "Save Changes"}
              </Button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Link Child Modal */}
      {linkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Link Child to {linkModal.name}</h3>
              <button onClick={() => setLinkModal(null)} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleLinkChild} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Student ID (Code)</label>
                <input
                  type="text" required placeholder="e.g. KPA-2026-0001" value={studentIdToLink}
                  onChange={(e) => setStudentIdToLink(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25] font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">Provide the exact Student ID code of the child you want to link.</p>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl mt-2">
                {loading ? "Linking..." : "Link Child"}
              </Button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
