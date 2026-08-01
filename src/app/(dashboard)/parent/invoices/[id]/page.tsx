import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import InvoiceDetailClient from "./InvoiceDetailClient";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "PARENT") {
    redirect("/login");
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, name: true, studentIdStr: true, parentId: true } },
    },
  });

  // Security fix: verify the invoice's student is a child of this parent
  // (invoice.studentId belongs to the child, not the parent's user ID)
  const isLinkedChild = invoice?.student?.parentId === session.user.id;
  if (!invoice || !isLinkedChild) {
    redirect("/parent");
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

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Payment Details</h1>
      <InvoiceDetailClient 
        invoice={{
          ...invoice,
          itemId: itemTitle,
          dueDate: invoice.dueDate.toISOString(),
          paidAt: invoice.paidAt?.toISOString() ?? null,
          createdAt: invoice.createdAt.toISOString(),
          updatedAt: invoice.updatedAt.toISOString(),
        }} 
        studentName={invoice.student.name} 
      />
    </div>
  );
}

