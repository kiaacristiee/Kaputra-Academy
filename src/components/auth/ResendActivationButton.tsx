"use client";

import { useState } from "react";
import { resendActivationEmail } from "@/actions/register";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

export function ResendActivationButton({ studentId }: { studentId: string }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleResend = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await resendActivationEmail(studentId);
      setStatus({ success: res.success, message: res.success ? res.message : res.error });
    } catch (err: any) {
      setStatus({ success: false, message: err.message || "Failed to resend email." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 text-left">
      <Button
        type="button"
        onClick={handleResend}
        disabled={loading}
        variant="outline"
        className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Sending Activation Email..." : "Resend Activation Email"}
      </Button>

      {status && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            status.success
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {status.success ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{status.message}</span>
        </div>
      )}
    </div>
  );
}
