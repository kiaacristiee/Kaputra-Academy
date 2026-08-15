"use client";

import { useState, Suspense } from "react";
import { Lock, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { resetPasswordWithToken } from "@/actions/resetPassword";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!token) {
      setError("Invalid or missing reset token.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await resetPasswordWithToken(token, password);
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error || "An error occurred");
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-600 p-6 rounded-xl text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="font-bold text-rose-800 text-lg">Invalid Link</h3>
        <p className="text-rose-700 text-sm">
          This password reset link is invalid or missing a security token.
        </p>
        <Button
          asChild
          className="w-full mt-4 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all"
        >
          <Link href="/forgot-password">Request New Link</Link>
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl text-center space-y-4">
        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
        <h3 className="font-bold text-emerald-800 text-lg">Password Reset Successfully</h3>
        <p className="text-emerald-700 text-sm">
          Your password has been successfully updated. You can now use your new password to sign in.
        </p>
        <Button
          asChild
          className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all"
        >
          <Link href="/login">Return to Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm flex items-start gap-2 mb-6">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-slate-700 font-medium">
            New Password (min. 8 characters)
          </Label>
          <PasswordInput
            id="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-white border-gray-200 text-slate-900 rounded-xl placeholder:text-gray-400 focus-visible:ring-[#CA8E25]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">
            Confirm New Password
          </Label>
          <PasswordInput
            id="confirmPassword"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-white border-gray-200 text-slate-900 rounded-xl placeholder:text-gray-400 focus-visible:ring-[#CA8E25]"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold py-3.5 rounded-xl shadow-lg transition-all text-base flex items-center justify-center gap-2 mt-4"
        >
          <Lock className="h-4 w-4" />
          {loading ? "Updating Password..." : "Update Password"}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white border border-gray-100 shadow-xl rounded-2xl p-8 text-slate-900 space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-flex flex-col items-center mb-3">
            <Image
              src="/logo.png"
              alt="Kaputra Academy Logo"
              width={48}
              height={48}
              className="mb-2 rounded-sm"
            />
            <span className="text-2xl font-black tracking-wide text-[#072147] block">
              KAPUTRA
            </span>
            <span className="text-xs font-semibold tracking-[0.2em] text-[#CA8E25] uppercase">
              Academy
            </span>
          </Link>

          <h2 className="text-3xl font-extrabold text-[#072147] mt-2">
            Set New Password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please enter your new secure password below to regain access.
          </p>
        </div>

        <Suspense fallback={<div className="text-center py-10 opacity-50">Loading details...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
