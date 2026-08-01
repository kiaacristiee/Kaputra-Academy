"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadReceipt } from "@/actions/invoice";
import { useRouter } from "next/navigation";
import VirtualAccountPayment from "@/components/payment/VirtualAccountPayment";
import { Upload, AlertCircle, XCircle, CheckCircle2 } from "lucide-react";

export default function InvoiceDetailClient({ invoice, studentName }: { invoice: any; studentName?: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isPaid = invoice.status === "PAID";
  const isWaiting = invoice.status === "WAITING_VERIFICATION";
  const isRejected = invoice.status === "REJECTED";

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("invoiceId", invoice.id);
      formData.append("receiptFile", file);

      const res = await uploadReceipt(formData);
      if (res.success) {
        router.refresh();
      } else {
        setError("Upload failed. Please try again.");
      }
    } catch (e) {
      console.error(e);
      setError("An error occurred during upload.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Midtrans Virtual Account Payment Panel */}
      <VirtualAccountPayment
        invoice={invoice}
        studentName={studentName}
        onRefresh={() => router.refresh()}
      />

      {/* Manual Receipt Upload Fallback */}
      {!isPaid && (
        <div className="bg-slate-950 rounded-2xl p-6 shadow-sm border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Upload className="h-4 w-4 text-[#CA8E25]" />
            Alternative: Upload Manual Payment Receipt
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            If you transferred manually via bank counter/ATM receipt, upload it here for admin verification.
          </p>

          {isRejected && (
            <div className="p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 mb-4 text-xs">
              <span className="font-bold flex items-center gap-1.5"><XCircle className="h-4 w-4" /> Previous Payment Rejected</span>
              Please upload a new valid payment receipt.
            </div>
          )}

          {isWaiting ? (
            <div className="p-4 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 text-xs">
              <span className="font-bold flex items-center gap-1.5"><AlertCircle className="h-4 w-4" /> Receipt Submitted</span>
              Awaiting admin review. You can replace the uploaded receipt below if needed.
              <div className="mt-3 flex gap-3 items-center">
                <Input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="bg-slate-900 border-slate-800 text-white text-xs"
                />
                <Button onClick={handleUpload} disabled={!file || loading} className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black text-xs font-bold shrink-0">
                  {loading ? "Uploading..." : "Replace Receipt"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                  Select File (JPG, PNG, PDF max 5MB)
                </label>
                <Input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="bg-slate-900 border-slate-800 text-white text-xs"
                />
                {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
              </div>
              <Button
                onClick={handleUpload}
                disabled={!file || loading}
                className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold text-xs shrink-0 rounded-xl px-6"
              >
                {loading ? "Uploading..." : "Submit Receipt"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
