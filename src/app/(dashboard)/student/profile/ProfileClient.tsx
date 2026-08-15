"use client";

import { useState } from "react";
import { User, Phone, Mail, Calendar, Key, AlertCircle, CheckCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/actions/profile";

interface ProfileClientProps {
  user: {
    name: string;
    email: string;
    phone: string | null;
    studentIdStr: string | null;
    role: string;
    dateOfBirth: Date | null;
    parent: {
      name: string;
      email: string;
      phone: string | null;
    } | null;
  };
}

export default function ProfileClient({ user }: ProfileClientProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill out all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      const res = await updatePassword(currentPassword, newPassword);
      if (res.success) {
        setSuccess("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(res.error || "Failed to update password.");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">My Profile</h1>
        <p className="text-slate-400">View your student credentials, guardian info, and secure your account.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card & Parent info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-900 pb-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20 text-blue-400 font-bold text-2xl">
                {user.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{user.name}</h2>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider font-mono">
                  Role: {user.role}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-slate-400 text-xs block">Student ID Number</span>
                <span className="font-mono text-white font-bold text-base bg-slate-900 px-3 py-1 rounded border border-slate-800 inline-block mt-1">
                  {user.studentIdStr || "N/A"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-xs block">Date of Birth</span>
                <span className="font-bold text-white flex items-center gap-2 mt-2">
                  <Calendar className="h-4 w-4 text-[#CA8E25]" />
                  {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  }) : "Not specified"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-xs block">Email Address</span>
                <span className="font-bold text-white flex items-center gap-2 mt-2">
                  <Mail className="h-4 w-4 text-[#CA8E25]" />
                  {user.email}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-xs block">Phone Number</span>
                <span className="font-bold text-white flex items-center gap-2 mt-2">
                  <Phone className="h-4 w-4 text-[#CA8E25]" />
                  {user.phone || "Not specified"}
                </span>
              </div>
            </div>
          </div>

          {/* Parent Info */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              Parent / Guardian Details
            </h3>

            {user.parent ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-1">
                  <span className="text-slate-400 text-xs block">Guardian Name</span>
                  <span className="font-bold text-white flex items-center gap-2 mt-2">
                    <User className="h-4 w-4 text-emerald-400" />
                    {user.parent.name}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 text-xs block">Guardian Email</span>
                  <span className="font-bold text-white flex items-center gap-2 mt-2">
                    <Mail className="h-4 w-4 text-emerald-400" />
                    {user.parent.email}
                  </span>
                </div>

                <div className="space-y-1 col-span-full">
                  <span className="text-slate-400 text-xs block">Guardian Phone</span>
                  <span className="font-bold text-white flex items-center gap-2 mt-2">
                    <Phone className="h-4 w-4 text-emerald-400" />
                    {user.parent.phone || "Not specified"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm italic">No guardian information is linked to this account.</p>
            )}
          </div>
        </div>

        {/* Change password card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-sm h-fit space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Key className="h-5 w-5 text-[#CA8E25]" />
            Change Password
          </h3>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs flex items-start gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-450" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handlePasswordUpdate} className="space-y-4 text-slate-300">
            <div className="space-y-1.5">
              <Label htmlFor="currentPass" className="text-slate-400 text-xs font-semibold">Current Password</Label>
              <PasswordInput
                id="currentPass"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="bg-slate-900 border-slate-800 text-white rounded-xl placeholder:text-slate-500 focus-visible:ring-[#CA8E25]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPass" className="text-slate-400 text-xs font-semibold">New Password</Label>
              <PasswordInput
                id="newPass"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="bg-slate-900 border-slate-800 text-white rounded-xl placeholder:text-slate-500 focus-visible:ring-[#CA8E25]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPass" className="text-slate-400 text-xs font-semibold">Confirm New Password</Label>
              <PasswordInput
                id="confirmPass"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="bg-slate-900 border-slate-800 text-white rounded-xl placeholder:text-slate-500 focus-visible:ring-[#CA8E25]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-white font-bold py-2.5 rounded-xl transition"
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
