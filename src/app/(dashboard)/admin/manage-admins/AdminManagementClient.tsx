"use client";

import { useState } from "react";
import { Shield, Plus, Search, UserMinus, UserCheck, KeyRound, UserX, AlertCircle, Trash2, Edit2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createStandardAdmin, updateStandardAdmin, toggleAdminStatus, deleteStandardAdmin, adminPasswordReset } from "@/actions/superAdmin";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  isDisabled: boolean;
  createdAt: string;
}

export default function AdminManagementClient({ initialAdmins }: { initialAdmins: AdminUser[] }) {
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", role: "ADMIN" });

  const showStatus = (t: "success" | "error", text: string) => {
    setMessage({ type: t, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = admin.name.toLowerCase().includes(search.toLowerCase()) || admin.email.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    
    if (statusFilter === "ACTIVE") return admin.isActive && !admin.isDisabled;
    if (statusFilter === "INACTIVE") return !admin.isActive || admin.isDisabled;
    return true;
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await createStandardAdmin({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
    });
    setLoading(false);

    if (res.success) {
      showStatus("success", `${formData.role === "SUPER_ADMIN" ? "Super Admin" : "Standard Admin"} created. Activation email sent.`);
      setIsAddModalOpen(false);
      setFormData({ name: "", email: "", phone: "", role: "ADMIN" });
      // In a real app we'd re-fetch, but here we can just reload the page to get fresh data
      window.location.reload();
    } else {
      showStatus("error", res.error || "Failed to create admin.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdmin) return;
    setLoading(true);
    const res = await updateStandardAdmin(currentAdmin.id, {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
    });
    setLoading(false);

    if (res.success) {
      showStatus("success", "Admin details updated.");
      setAdmins(prev => prev.map(a => a.id === currentAdmin.id ? { ...a, ...formData } : a));
      setIsEditModalOpen(false);
    } else {
      showStatus("error", res.error || "Failed to update admin.");
    }
  };

  const handleToggleStatus = async (admin: AdminUser) => {
    const newStatus = !admin.isDisabled;
    const res = await toggleAdminStatus(admin.id, newStatus);
    if (res.success) {
      showStatus("success", `Admin ${newStatus ? 'disabled' : 'enabled'} successfully.`);
      setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, isDisabled: newStatus } : a));
    } else {
      showStatus("error", res.error || "Failed to toggle status.");
    }
  };

  const handleDelete = async () => {
    if (!currentAdmin) return;
    setLoading(true);
    const res = await deleteStandardAdmin(currentAdmin.id);
    setLoading(false);

    if (res.success) {
      showStatus("success", "Admin deleted permanently.");
      setAdmins(prev => prev.filter(a => a.id !== currentAdmin.id));
      setIsDeleteModalOpen(false);
    } else {
      showStatus("error", res.error || "Failed to delete admin.");
    }
  };

  const handleResetPassword = async (admin: AdminUser) => {
    if (!confirm(`Are you sure you want to send a password reset link to ${admin.email}?`)) return;
    
    const res = await adminPasswordReset(admin.id);
    if (res.success) {
      showStatus("success", `Password reset email sent to ${admin.email}.`);
    } else {
      showStatus("error", res.error || "Failed to send password reset.");
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Shield className="h-8 w-8 text-[#CA8E25]" />
            Standard Admin Management
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Create and manage your Standard Administrators. Secure access only.</p>
        </div>
        <Button 
          onClick={() => { setFormData({ name: "", email: "", phone: "", role: "ADMIN" }); setIsAddModalOpen(true); }}
          className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-extrabold px-6 rounded-xl gap-2 transition-all shadow-lg hover:shadow-[#CA8E25]/20"
        >
          <Plus className="h-4 w-4" /> Add Administrator
        </Button>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-2 p-4 rounded-xl border ${
              message.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            {message.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-[#CA8E25] focus:ring-1 focus:ring-[#CA8E25] transition"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {["ALL", "ACTIVE", "INACTIVE"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                  statusFilter === f 
                    ? "bg-[#CA8E25] text-black" 
                    : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800">
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Admin details</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 border-b border-slate-800">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Shield className="h-10 w-10 mx-auto opacity-20 mb-3" />
                    No standard admins found.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-900/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full flex items-center justify-center border border-slate-600 font-bold text-white shadow-inner">
                          {admin.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            {admin.name}
                            {admin.role === "SUPER_ADMIN" ? (
                              <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md font-extrabold">SUPER ADMIN</span>
                            ) : (
                              <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-md font-medium">STANDARD ADMIN</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">{admin.role === "SUPER_ADMIN" ? "Super Executive" : "Admin Staff"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-300">{admin.email}</div>
                      <div className="text-xs text-slate-500">{admin.phone || "No phone"}</div>
                    </td>
                    <td className="px-6 py-4">
                      {admin.isDisabled ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          Disabled
                        </span>
                      ) : admin.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          Pending Activation
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setCurrentAdmin(admin);
                            setFormData({ name: admin.name, email: admin.email, phone: admin.phone || "", role: admin.role });
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-[#CA8E25] hover:bg-[#CA8E25]/10 rounded-lg transition"
                          title="Edit admin"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleResetPassword(admin)}
                          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                          title="Reset Password via Email"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        {admin.isDisabled ? (
                          <button 
                            onClick={() => handleToggleStatus(admin)}
                            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition"
                            title="Enable Account"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleToggleStatus(admin)}
                            className="p-2 text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition"
                            title="Disable Account"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => { setCurrentAdmin(admin); setIsDeleteModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          title="Delete Permanently"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Admin Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-slate-900 border-[#CA8E25]/20 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-[#CA8E25]">
              <Plus className="h-5 w-5" /> Add Standard Admin
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new administrative account. They will receive an email to securely set their password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
              <input required value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#CA8E25] focus:outline-none focus:ring-1 focus:ring-[#CA8E25]" placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Email Address</label>
              <input required type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#CA8E25] focus:outline-none focus:ring-1 focus:ring-[#CA8E25]" placeholder="admin@kaputra.com" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Admin Role</label>
              <select 
                value={formData.role} 
                onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#CA8E25] focus:outline-none focus:ring-1 focus:ring-[#CA8E25] text-white"
              >
                <option value="ADMIN">Standard Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Phone Number</label>
              <input value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#CA8E25] focus:outline-none focus:ring-1 focus:ring-[#CA8E25]" placeholder="+62 8..." />
            </div>
            <Button type="submit" disabled={loading} className="w-full mt-4 bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold h-12 rounded-xl">
              {loading ? "Creating..." : "Create & Send Invitation"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-slate-900 border-[#CA8E25]/20 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-[#CA8E25]" /> Edit Standard Admin
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
              <input required value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#CA8E25] focus:outline-none focus:ring-1 focus:ring-[#CA8E25]" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Email Address</label>
              <input required type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#CA8E25] focus:outline-none focus:ring-1 focus:ring-[#CA8E25]" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Admin Role</label>
              <select 
                value={formData.role} 
                onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#CA8E25] focus:outline-none focus:ring-1 focus:ring-[#CA8E25] text-white"
              >
                <option value="ADMIN">Standard Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Phone Number</label>
              <input value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#CA8E25] focus:outline-none focus:ring-1 focus:ring-[#CA8E25]" />
            </div>
            <Button type="submit" disabled={loading} className="w-full mt-4 bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold h-12 rounded-xl">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-slate-900 border-red-500/20 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-500">
              <Trash2 className="h-5 w-5" /> Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-slate-400 pt-2 text-sm">
              Are you absolutely sure you want to permanently delete the admin account for <strong>{currentAdmin?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex-col sm:flex-row gap-3">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="bg-slate-800 hover:bg-slate-700 text-white w-full sm:w-auto h-11">
              Cancel
            </Button>
            <Button onClick={handleDelete} disabled={loading} className="bg-red-500 hover:bg-red-600 text-white font-bold w-full sm:w-auto h-11">
              {loading ? "Deleting..." : "Yes, Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
