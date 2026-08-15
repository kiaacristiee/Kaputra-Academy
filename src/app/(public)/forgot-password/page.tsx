"use client";

import { useState } from "react";
import { Lock, Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Image from "next/image";
import { requestPasswordReset } from "@/actions/resetPassword";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await requestPasswordReset(email);
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
            Reset Password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email to receive a password reset link.
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl text-center space-y-4">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-emerald-800 text-lg">Check your email</h3>
            <p className="text-emerald-700 text-sm">
              If an account with that email exists, we have sent a password reset link. It expires in 1 hour.
            </p>
            <Button
              asChild
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all"
            >
              <Link href="/login">Back to Login</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700 font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="pl-10 bg-white border-gray-200 text-slate-900 rounded-xl placeholder:text-gray-400 focus-visible:ring-[#CA8E25]"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#072147] hover:bg-[#0a2f66] text-white font-bold py-3.5 rounded-xl shadow-lg transition-all text-base flex items-center justify-center gap-2"
            >
              {loading ? "Sending link..." : "Send Reset Link"}
            </Button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-500 hover:text-[#CA8E25] transition-colors flex items-center justify-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
