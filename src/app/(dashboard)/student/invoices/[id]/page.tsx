import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import StudentInvoiceDetailClient from "./StudentInvoiceDetailClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Invoice Detail | Student Dashboard",
};

export default async function StudentInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "STUDENT") {
    redirect("/login");
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, name: true, studentIdStr: true } },
      verifications: {
        orderBy: { verifiedAt: "desc" },
        take: 1,
      },
    },
  });

  // Make sure invoice belongs to this student
  if (!invoice || invoice.studentId !== session.user.id) {
    redirect("/student/invoices");
  }

  let itemTitle = invoice.itemId;
  if (invoice.itemType === "PLACEMENT_TEST") {
    itemTitle = "Placement Test Fee";
  } else if (invoice.itemType === "CLASS") {
    const course = await prisma.course.findUnique({
      where: { id: invoice.itemId },
      select: { title: true },
    });
    if (course) {
      itemTitle = course.title;
    }
  }

  const lastVerification = invoice.verifications[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/student/invoices" className="text-xs text-slate-500 hover:text-slate-300 transition">
          ← Back to Invoices
        </Link>
      </div>
      <StudentInvoiceDetailClient
        invoice={{
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          itemId: itemTitle,
          itemType: invoice.itemType,
          amount: invoice.amount,
          virtualAccountNumber: invoice.virtualAccountNumber,
          bank: (invoice as any).bank ?? null,
          status: invoice.status,
          receiptUrl: invoice.receiptUrl,
          expiryTime: (invoice as any).expiryTime?.toISOString() ?? null,
          dueDate: invoice.dueDate.toISOString(),
          paidAt: invoice.paidAt?.toISOString() ?? null,
          createdAt: invoice.createdAt.toISOString(),
        }}
        student={{
          name: invoice.student.name,
          studentIdStr: invoice.student.studentIdStr,
        }}
        lastVerification={
          lastVerification
            ? {
                status: lastVerification.status,
                rejectionReason: lastVerification.rejectionReason,
                verifiedAt: lastVerification.verifiedAt?.toISOString() ?? null,
              }
            : null
        }
      />
    </div>
  );
}
