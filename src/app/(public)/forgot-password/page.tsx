"use client";

import { useState } from "react";
import { Lock, Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Image from "next/image";
import { requestPasswordReset, requestStudentPasswordReset } from "@/actions/resetPassword";

export default function ForgotPasswordPage() {
  const [accountType, setAccountType] = useState<"student" | "staff">("student");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let res;
      if (accountType === "student") {
        res = await requestStudentPasswordReset(studentId);
      } else {
        res = await requestPasswordReset(email);
      }
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
          <Link href="/" className="inline-flex flex-col items-center mb-6">
            <Image
              src="/blue.png"
              alt="Kaputra Academy Logo"
              width={600}
              height={160}
              className="mb-2 rounded-sm object-contain h-40 w-auto hover:opacity-90 transition"
              priority
            />
          </Link>

          <h2 className="text-3xl font-extrabold text-[#072147] mt-2">
            Reset Password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {accountType === "student" 
              ? "Enter your Student ID and we will send a password reset link to your parent's registered email address."
              : "Enter your email to receive a password reset link."}
          </p>
        </div>

        {!success && (
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => { setAccountType("student"); setError(""); }}
              className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${
                accountType === "student" ? "bg-white shadow-sm text-slate-900" : "text-gray-500 hover:text-slate-900"
              }`}
            >
              Student
            </button>
            <button
              onClick={() => { setAccountType("staff"); setError(""); }}
              className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${
                accountType === "staff" ? "bg-white shadow-sm text-slate-900" : "text-gray-500 hover:text-slate-900"
              }`}
            >
              Staff / Parent
            </button>
          </div>
        )}

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
              {accountType === "student"
                ? "If the Student ID is registered, a password reset link will be sent to the parent's registered email address."
                : "If an account with that email exists, we have sent a password reset link. It expires in 1 hour."}
            </p>
            <Link href="/login" className="block w-full">
              <Button
                type="button"
                className="w-full mt-4 bg-[#CA8E25] hover:bg-[#b07b1e] text-white font-bold py-3.5 rounded-xl shadow-lg transition-all"
              >
                Back to Login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {accountType === "student" ? (
              <div className="space-y-1.5">
                <Label htmlFor="studentId" className="text-slate-700 font-medium">
                  Student ID
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="studentId"
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. KPA-2026-0001"
                    className="pl-10 bg-white border-gray-200 text-slate-900 rounded-xl placeholder:text-gray-400 focus-visible:ring-[#CA8E25]"
                  />
                </div>
              </div>
            ) : (
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
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#CA8E25] hover:bg-[#b07b1e] text-black font-bold py-3.5 rounded-xl shadow-lg transition-all text-base flex items-center justify-center gap-2"
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
