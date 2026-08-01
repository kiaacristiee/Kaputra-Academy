import React, { forwardRef } from "react";
import Image from "next/image";

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  itemId: string;
  itemType: string;
  itemCategory?: string | null;
  learningMethod?: string | null;
  sessionsPerWeek?: number | null;
  amount: number;
  virtualAccountNumber: string | null;
  bank: string | null;
  status: string;
  dueDate: string | Date;
  paidAt: string | Date | null;
  createdAt: string | Date;
  student?: {
    name: string;
    studentIdStr: string | null;
    parent?: { name: string; email: string } | null;
  } | null;
}

interface PrintableInvoiceProps {
  invoice: InvoiceData;
  studentName?: string; // Fallback name
}

const PrintableInvoice = forwardRef<HTMLDivElement, PrintableInvoiceProps>(
  ({ invoice, studentName }, ref) => {
    
    const isPaid = invoice.status === "PAID";
    const studentDisplayName = invoice.student?.name || studentName || "Student";
    const parentName = invoice.student?.parent?.name || "Parent/Guardian";
    const parentEmail = invoice.student?.parent?.email || "-";
    const studentId = invoice.student?.studentIdStr || "-";

    const issueDate = new Date(invoice.createdAt).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    
    const dueDate = new Date(invoice.dueDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    const paymentDate = invoice.paidAt
      ? new Date(invoice.paidAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        })
      : null;

    // Helper text for learning method
    let methodName = "-";
    if (invoice.learningMethod === "PRIVATE") methodName = "Private Class";
    else if (invoice.learningMethod === "SEMI_PRIVATE") methodName = "Semi-Private Class";

    return (
      <div 
        ref={ref} 
        className="bg-white text-black p-10 font-sans" 
        style={{ width: '800px', margin: '0 auto', boxSizing: 'border-box' }}
      >
        {/* Header Section */}
        <div className="flex justify-between items-start border-b-2 border-gray-200 pb-6 mb-6">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">
              KAPUTRA ACADEMY
            </h1>
            <p className="text-sm text-gray-500 font-medium">Batam, Riau Islands, Indonesia</p>
            <p className="text-sm text-gray-500 font-medium">contact@kaputra.academy</p>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-extrabold text-[#CA8E25] tracking-widest uppercase opacity-80 mb-2">
              INVOICE
            </h2>
            <div className="flex flex-col items-end gap-1 text-sm font-medium">
              <div className="grid grid-cols-2 gap-x-4 max-w-xs text-right">
                <span className="text-gray-500">Invoice No:</span>
                <span className="font-bold text-gray-900">{invoice.invoiceNumber}</span>
                
                <span className="text-gray-500">Issue Date:</span>
                <span className="font-bold text-gray-900">{issueDate}</span>
                
                <span className="text-gray-500">Due Date:</span>
                <span className="font-bold text-gray-900">{dueDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-8 flex justify-end">
           {isPaid ? (
             <div className="inline-block border-2 border-emerald-500 text-emerald-600 font-black text-xl px-4 py-1 uppercase tracking-widest transform rotate-[-5deg]">
               PAID
             </div>
           ) : (
             <div className="inline-block border-2 border-amber-500 text-amber-600 font-black text-xl px-4 py-1 uppercase tracking-widest transform rotate-[-5deg]">
               UNPAID
             </div>
           )}
        </div>

        {/* Bill To & Details */}
        <div className="flex justify-between items-start mb-8 gap-10">
          <div className="flex-1">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Billed To</h3>
            <div className="space-y-1">
              <p className="text-lg font-bold text-gray-900">{parentName}</p>
              <p className="text-sm text-gray-600 font-medium">{parentEmail}</p>
            </div>
            
            <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Student Information</h3>
              <p className="text-base font-bold text-gray-900">{studentDisplayName}</p>
              <p className="text-sm text-gray-600 font-mono mt-0.5">ID: {studentId}</p>
            </div>
          </div>

          <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Payment Details</h3>
            <div className="space-y-2 text-sm font-medium">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500">Total Amount</span>
                <span className="font-bold text-gray-900">Rp {invoice.amount.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500">Payment Status</span>
                <span className={`font-bold ${isPaid ? "text-emerald-600" : "text-amber-600"}`}>{isPaid ? "PAID" : "PENDING"}</span>
              </div>
              {paymentDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Date</span>
                  <span className="font-bold text-gray-900">{paymentDate}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Items Table */}
        <div className="mb-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="py-3 px-2 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[45%]">Description</th>
                <th className="py-3 px-2 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-center">Category</th>
                <th className="py-3 px-2 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-center">Sessions</th>
                <th className="py-3 px-2 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-4 px-2">
                  <p className="font-bold text-gray-900 text-base">{invoice.itemId}</p>
                  <p className="text-xs text-gray-500 mt-1">{invoice.itemType.replace("_", " ")} - {methodName}</p>
                </td>
                <td className="py-4 px-2 text-center text-sm font-semibold text-gray-700">
                   {invoice.itemCategory || "-"}
                </td>
                <td className="py-4 px-2 text-center text-sm font-semibold text-gray-700">
                   {invoice.sessionsPerWeek ? `${invoice.sessionsPerWeek}x / week` : "-"}
                </td>
                <td className="py-4 px-2 text-right text-lg font-black text-gray-900">
                  Rp {invoice.amount.toLocaleString("id-ID")}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="py-4 px-2"></td>
                <td className="py-4 px-2 text-right text-sm font-bold text-gray-500 uppercase">Total</td>
                <td className="py-4 px-2 text-right text-2xl font-black text-[#CA8E25] border-t-2 border-gray-300">
                  Rp {invoice.amount.toLocaleString("id-ID")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer Notes */}
        <div className="border-t border-gray-200 pt-6 mt-10">
          <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
            <p>Kaputra Academy thanks you for your payment.</p>
            <div className="flex-1 border-t border-dotted border-gray-300"></div>
            <p>Generated digitally, valid without signature.</p>
          </div>
        </div>
      </div>
    );
  }
);

PrintableInvoice.displayName = "PrintableInvoice";

export default PrintableInvoice;
