"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadReceipt } from "@/actions/invoice";
import { useRouter } from "next/navigation";
import {
  CreditCard, CheckCircle2, AlertCircle, XCircle, Clock, Printer,
  Upload, FileText, Building2, User, Calendar, Package, Download
} from "lucide-react";
import { motion } from "framer-motion";
import VirtualAccountPayment from "@/components/payment/VirtualAccountPayment";
import PrintableInvoice from "@/components/payment/PrintableInvoice";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Invoice {
  id: string;
  invoiceNumber: string;
  itemId: string;
  itemType: string;
  amount: number;
  virtualAccountNumber: string | null;
  bank: string | null;
  status: string;
  receiptUrl: string | null;
  expiryTime: string | null;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
}

interface Student {
  name: string;
  studentIdStr: string | null;
}

interface Verification {
  status: string;
  rejectionReason: string | null;
  verifiedAt: string | null;
}

interface Props {
  invoice: Invoice;
  student: Student;
  lastVerification: Verification | null;
}

export default function StudentInvoiceDetailClient({ invoice, student, lastVerification }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isPaid = invoice.status === "PAID";
  const isWaiting = invoice.status === "WAITING_VERIFICATION";
  const isRejected = invoice.status === "REJECTED";

  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${invoice.invoiceNumber}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to export PDF.");
    } finally {
      setIsExporting(false);
    }
  };

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
        setSuccess(true);
        router.refresh();
      } else {
        setError("Upload failed. Please try again.");
      }
    } catch (e) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-end">
        <Button 
          onClick={handleExportPDF} 
          disabled={isExporting}
          className="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white rounded-xl shadow-lg flex items-center gap-2 font-bold"
        >
          {isExporting ? <span className="animate-pulse">Generating...</span> : <><Download className="w-4 h-4" /> Download PDF</>}
        </Button>
      </div>

      {/* Hidden layout purely for PDF html2canvas */}
      <div className="overflow-hidden h-0 w-0 absolute text-[0px] pointer-events-none opacity-0">
        <div ref={printRef}>
          <PrintableInvoice invoice={invoice as any} studentName={student.name} />
        </div>
      </div>

      {/* Midtrans Virtual Account Payment Component */}
      <VirtualAccountPayment
        invoice={invoice}
        studentName={student.name}
        onRefresh={() => router.refresh()}
      />

      {/* Alternative Receipt Upload Section (Fallback) */}
      {!isPaid && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 print:hidden">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Upload className="h-4 w-4 text-[#CA8E25]" />
            Alternative: Upload Manual Payment Receipt
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            If you transferred via manual bank transfer or ATM receipt, you can optionally upload it here for admin verification.
          </p>

          {isRejected && lastVerification?.rejectionReason && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
            >
              <p className="text-sm font-bold text-red-400 flex items-center gap-2"><XCircle className="h-4 w-4" /> Payment Rejected</p>
              <p className="text-xs text-red-300 mt-1">Reason: {lastVerification.rejectionReason}</p>
              <p className="text-xs text-slate-400 mt-1">Please upload a new valid receipt to re-submit your payment.</p>
            </motion.div>
          )}

          {isWaiting && (
            <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Awaiting Manual Verification
              </p>
              <p className="text-xs text-slate-400 mt-1">Your receipt has been submitted. An admin will verify it shortly.</p>
            </div>
          )}

          {success ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <p className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Receipt submitted successfully!
              </p>
              <p className="text-xs text-slate-400 mt-1">Your payment is now under admin review.</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Select File</label>
                <Input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="bg-slate-900 border-slate-800 text-white file:bg-slate-800 file:text-slate-300 file:border-0 file:rounded-lg file:px-3 file:py-1 file:text-xs cursor-pointer"
                />
                {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
              </div>
              <Button
                onClick={handleUpload}
                disabled={!file || loading}
                className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl px-6 shrink-0"
              >
                {loading ? "Uploading..." : isWaiting ? "Replace Receipt" : "Submit Receipt"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
