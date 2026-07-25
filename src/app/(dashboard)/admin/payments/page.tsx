import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import AdminPaymentsClient from "./AdminPaymentsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payment Management | Admin Dashboard",
};

export default async function AdminPaymentsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  // Fetch ALL invoices with relations
  const allInvoices = await prisma.invoice.findMany({
    include: {
      student: {
        select: { id: true, name: true, studentIdStr: true, parent: { select: { name: true, email: true } } },
      },
      verifications: {
        orderBy: { verifiedAt: "desc" },
        take: 1,
        select: { status: true, rejectionReason: true, verifiedAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const courses = await prisma.course.findMany({
    select: { id: true, title: true },
  });
  const camps = await prisma.campProgram.findMany({
    select: { id: true, name: true },
  });
  const nameMap = new Map<string, string>([
    ...courses.map((c) => [c.id, c.title] as [string, string]),
    ...camps.map((c) => [c.id, c.name] as [string, string]),
  ]);

  const formatted = allInvoices.map((inv) => {
    const itemTitle = nameMap.get(inv.itemId) || inv.itemId;
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      itemId: itemTitle,
      itemType: inv.itemType,
      amount: inv.amount,
      virtualAccountNumber: inv.virtualAccountNumber,
      status: inv.status,
      receiptUrl: inv.receiptUrl,
      dueDate: inv.dueDate.toISOString(),
      paidAt: inv.paidAt?.toISOString() ?? null,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
      student: {
        id: inv.student.id,
        name: inv.student.name,
        studentIdStr: inv.student.studentIdStr,
        parent: inv.student.parent
          ? { name: inv.student.parent.name, email: inv.student.parent.email }
          : null,
      },
      lastVerification: inv.verifications[0]
        ? {
            status: inv.verifications[0].status,
            rejectionReason: inv.verifications[0].rejectionReason,
            verifiedAt: inv.verifications[0].verifiedAt?.toISOString() ?? null,
          }
        : null,
    };
  });

  return <AdminPaymentsClient allInvoices={formatted} />;
}
