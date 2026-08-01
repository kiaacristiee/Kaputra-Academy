import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { FileText, CheckCircle2, Clock, XCircle, AlertTriangle, GraduationCap } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Invoices | Kaputra Academy",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  PAID: { label: "Paid", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  WAITING_VERIFICATION: { label: "Awaiting Verification", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  PENDING: { label: "Pending Payment", color: "text-slate-400 bg-slate-800 border-slate-700" },
  REJECTED: { label: "Rejected", color: "text-red-400 bg-red-500/10 border-red-500/20" },
};

export default async function ParentInvoicesListPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "PARENT") {
    redirect("/login");
  }

  const children = await prisma.user.findMany({
    where: { parentId: session.user.id },
    select: { id: true, name: true, studentIdStr: true },
  });
  const childIds = children.map((c) => c.id);

  const invoices = await prisma.invoice.findMany({
    where: { studentId: { in: childIds } },
    include: {
      student: { select: { name: true, studentIdStr: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const courses = await prisma.course.findMany({
    select: { id: true, title: true },
  });
  const courseMap = new Map(courses.map((c) => [c.id, c.title]));

  const totalPaid = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter((i) => i.status !== "PAID").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <FileText className="h-8 w-8 text-[#CA8E25]" />
          Invoices
        </h1>
        <p className="text-slate-400 mt-2">
          All payment invoices for your children's tuition and fees.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 font-bold uppercase">Total Invoices</p>
          <p className="text-3xl font-black text-white mt-1">{invoices.length}</p>
        </div>
        <div className="bg-slate-950 border border-emerald-500/20 rounded-2xl p-5">
          <p className="text-xs text-slate-500 font-bold uppercase">Total Paid</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">Rp {totalPaid.toLocaleString("id-ID")}</p>
        </div>
        <div className="bg-slate-950 border border-amber-500/20 rounded-2xl p-5">
          <p className="text-xs text-slate-500 font-bold uppercase">Outstanding</p>
          <p className="text-2xl font-black text-amber-400 mt-1">Rp {outstanding.toLocaleString("id-ID")}</p>
        </div>
      </div>

      {invoices.length > 0 ? (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Invoice List</h2>
            <span className="text-xs text-slate-500">{invoices.length} total</span>
          </div>
          <div className="divide-y divide-slate-800/60">
            {invoices.map((inv) => {
              const cfg = statusConfig[inv.status] || statusConfig.PENDING;
              const isPast = new Date(inv.dueDate) < new Date() && inv.status === "PENDING";
              const courseTitle = inv.itemType === "PLACEMENT_TEST" ? "Placement Test Fee" : (courseMap.get(inv.itemId) || inv.itemId);
              return (
                <div key={inv.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-slate-900/30 transition">
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{inv.invoiceNumber}</p>
                      {isPast && (
                        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {inv.student.name} · {courseTitle} ·{" "}
                      {new Date(inv.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-xs text-slate-600 font-mono">VA: {inv.virtualAccountNumber}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-base font-black text-white">Rp {inv.amount.toLocaleString("id-ID")}</p>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <Link
                      href={`/parent/invoices/${inv.id}`}
                      className="text-xs font-semibold text-[#CA8E25] hover:text-amber-400 transition border border-[#CA8E25]/20 hover:border-[#CA8E25]/40 px-3 py-1.5 rounded-xl"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 p-12 rounded-2xl text-center space-y-3">
          <GraduationCap className="h-10 w-10 text-[#CA8E25] mx-auto opacity-40" />
          <p className="font-bold text-white text-lg">No invoices yet</p>
          <p className="text-sm text-slate-500">Invoices will appear here after your child is enrolled.</p>
        </div>
      )}
    </div>
  );
}
