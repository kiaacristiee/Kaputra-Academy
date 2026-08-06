"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { activateAdminAccount } from "@/actions/authTokens";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export default function ActivateAdminClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-sm w-full text-center">
          <Lock className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Invalid or Missing Token</h2>
          <p className="text-slate-400 text-sm mb-6">You must use the activation link sent to your email.</p>
          <Link href="/login" className="text-[#CA8E25] hover:underline font-bold text-sm">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await activateAdminAccount(token, password);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push("/login?activated=true");
      }, 3000);
    } else {
      setError(res.error || "Failed to activate account. The token may be invalid or expired.");
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-[#CA8E25]/30 p-8 rounded-2xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Account Activated Successfully!</h2>
          <p className="text-slate-400 mb-6 font-medium">Your password has been securely saved. You will be redirected to the login page shortly.</p>
          <Link href="/login">
            <Button className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold h-12 text-sm rounded-xl transition-all">
              Go to Login Now
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 border border-slate-800 mb-4 shadow-xl">
            <Lock className="w-7 h-7 text-[#CA8E25]" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Activate Account</h1>
          <p className="text-slate-400 mt-2 font-medium">Create a secure password for your Kaputra Academy administrative account.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#CA8E25] to-transparent opacity-50" />
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl font-medium">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#CA8E25] focus:ring-1 focus:ring-[#CA8E25] transition-all font-medium"
                    placeholder="Minimal 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-2"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#CA8E25] focus:ring-1 focus:ring-[#CA8E25] transition-all font-medium"
                  placeholder="Re-enter password"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || password.length === 0}
              className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-extrabold h-14 text-base rounded-xl transition-all shadow-lg shadow-[#CA8E25]/10"
            >
              {loading ? (
                <div className="flex items-center gap-2 justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Activating...</span>
                </div>
              ) : (
                "Set Password & Activate"
              )}
            </Button>
          </form>
        </div>
        
        <p className="text-center text-slate-500 text-xs mt-8">
          Need help? <a href="mailto:support@kaputra.com" className="text-[#CA8E25] hover:underline font-bold">Contact Support</a>
        </p>
      </div>
    </div>
  );
}
