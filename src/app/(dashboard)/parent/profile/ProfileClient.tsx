"use client";

import { useState } from "react";
import { User, Mail, Phone, Lock, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { updatePassword } from "@/actions/profile";
import { motion, AnimatePresence } from "framer-motion";

interface ParentUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
}

export default function ParentProfileClient({ user }: { user: ParentUser }) {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", newPass: "", confirm: "" });

  const showStatus = (t: "success" | "error", text: string) => {
    setMessage({ type: t, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPass !== pwForm.confirm) {
      showStatus("error", "New passwords do not match.");
      return;
    }
    if (pwForm.newPass.length < 8) {
      showStatus("error", "Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    const res = await updatePassword(pwForm.current, pwForm.newPass);
    if (res.success) {
      showStatus("success", "Password updated successfully!");
      setPwForm({ current: "", newPass: "", confirm: "" });
    } else {
      showStatus("error", res.error || "Failed to update password.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <User className="h-8 w-8 text-[#CA8E25]" />
          My Profile
        </h1>
        <p className="text-slate-400 mt-2">Manage your account information and security settings.</p>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
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

      {/* Profile Info (read-only) */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Account Information</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-slate-900 rounded-xl border border-slate-800">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#CA8E25] to-amber-500 flex items-center justify-center text-white font-black text-xl">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-base font-bold text-white">{user.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role.toLowerCase()} account</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> Email
              </label>
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400">
                {user.email}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> Phone
              </label>
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400">
                {user.phone || "Not set"}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-600">Contact the admin to update your name, email, or phone number.</p>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Lock className="h-4 w-4 text-[#CA8E25]" /> Change Password
        </h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase">Current Password</label>
            <PasswordInput
              value={pwForm.current}
              onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
              required
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
              placeholder="Enter current password"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">New Password</label>
              <PasswordInput
                value={pwForm.newPass}
                onChange={(e) => setPwForm((p) => ({ ...p, newPass: e.target.value }))}
                required
                minLength={8}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
                placeholder="Min 8 characters"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Confirm Password</label>
              <PasswordInput
                value={pwForm.confirm}
                onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
                placeholder="Repeat new password"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl px-6 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
