import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, CreditCard, Clock, CheckCircle2, XCircle, AlertCircle, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Invoices | Student Dashboard",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:               { label: "Pending",              color: "bg-slate-800 text-slate-300 border-slate-700",          icon: Clock },
  WAITING_VERIFICATION:  { label: "Waiting Verification", color: "bg-amber-500/10 text-amber-400 border-amber-500/20",    icon: AlertCircle },
  PAID:                  { label: "Paid",                 color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  REJECTED:              { label: "Rejected",             color: "bg-red-500/10 text-red-400 border-red-500/20",          icon: XCircle },
};

export default async function StudentInvoicesPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "STUDENT") {
    redirect("/login");
  }

  const invoices = await prisma.invoice.findMany({
    where: { studentId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const courses = await prisma.course.findMany({
    select: { id: true, title: true },
  });
  const courseMap = new Map(courses.map((c) => [c.id, c.title]));

  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === "PAID").length,
    pending: invoices.filter((i) => i.status === "PENDING" || i.status === "WAITING_VERIFICATION").length,
    rejected: invoices.filter((i) => i.status === "REJECTED").length,
    totalAmount: invoices.reduce((sum, i) => sum + i.amount, 0),
    paidAmount: invoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.amount, 0),
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <FileText className="h-8 w-8 text-[#CA8E25]" />
          My Invoices
        </h1>
        <p className="text-slate-400 mt-2">Track your tuition, placement test, and program payment history.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Invoices",  value: stats.total,                              sub: "all time",          color: "text-white" },
          { label: "Paid",            value: stats.paid,                               sub: `Rp ${stats.paidAmount.toLocaleString("id-ID")}`, color: "text-emerald-400" },
          { label: "Pending",         value: stats.pending,                            sub: "awaiting payment",  color: "text-amber-400" },
          { label: "Total Billed",    value: `Rp ${stats.totalAmount.toLocaleString("id-ID")}`, sub: "cumulative",        color: "text-[#CA8E25]" },
        ].map((s) => (
          <div key={s.label} className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-600 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Invoice List */}
      {invoices.length > 0 ? (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#CA8E25]" />
              Invoice History
            </h2>
            <span className="text-xs text-slate-500">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="divide-y divide-slate-900">
            {invoices.map((invoice) => {
              const cfg = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.PENDING;
              const StatusIcon = cfg.icon;
              const isPrintable = invoice.status === "PAID";
              const itemTitle = invoice.itemType === "PLACEMENT_TEST" ? "Placement Test Fee" : (courseMap.get(invoice.itemId) || invoice.itemId);

              return (
                <div key={invoice.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-5 hover:bg-slate-900/40 transition">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">{itemTitle}</p>
                      <p className="text-xs text-slate-500 font-mono">{invoice.invoiceNumber}</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          Due: {new Date(invoice.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                        {invoice.paidAt && (
                          <span className="text-xs text-emerald-500">
                            Paid: {new Date(invoice.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 pl-14 sm:pl-0">
                    <div className="text-right">
                      <p className="text-base font-black text-[#CA8E25]">Rp {invoice.amount.toLocaleString("id-ID")}</p>
                      {invoice.virtualAccountNumber && invoice.status !== "PAID" && (
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">VA: {invoice.virtualAccountNumber}</p>
                      )}
                    </div>
                    <Link
                      href={`/student/invoices/${invoice.id}`}
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl border border-blue-500/20"
                    >
                      {isPrintable ? "View & Print" : "Pay Now"}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-16 text-center">
          <FileText className="h-12 w-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No invoices found.</p>
          <p className="text-slate-600 text-sm mt-1">Invoices will appear here once you are enrolled in a program.</p>
        </div>
      )}
    </div>
  );
}
