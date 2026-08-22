import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import AdminPaymentsClient from "./AdminPaymentsClient";

import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payment Management | Admin Dashboard",
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !isAdminRole(session.user.role)) {
    redirect("/login");
  }

  const isSuperAdmin = ["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role);

  const baseWhere = {
    ...(!isSuperAdmin && {
      OR: [
        { learningMethod: null },
        { learningMethod: { not: "PRIVATE" } }
      ]
    })
  };

  // 1. Fetch lightweight dates to construct Monthly Archives list automatically
  const allInvoicesLight = await prisma.invoice.findMany({
    where: baseWhere,
    select: { createdAt: true },
    orderBy: { createdAt: "desc" }
  });

  const uniquePeriods = new Set<string>();
  allInvoicesLight.forEach((inv) => {
    uniquePeriods.add(inv.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
  });
  const availableArchives = Array.from(uniquePeriods);

  // 2. Define active period boundary
  const now = new Date();
  const currentSystemPeriod = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  
  let activePeriodStr = period ? decodeURIComponent(period) : currentSystemPeriod;
  if (!availableArchives.includes(activePeriodStr) && activePeriodStr !== currentSystemPeriod) {
    activePeriodStr = currentSystemPeriod;
  }

  // Ensure current month is always available to jump to even if empty
  if (!uniquePeriods.has(currentSystemPeriod)) {
    availableArchives.unshift(currentSystemPeriod);
  }

  const [monthName, yearStr] = activePeriodStr.split(" ");
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const targetMonthNum = monthNames.indexOf(monthName);
  const targetYearNum = parseInt(yearStr, 10);

  const startOfMonth = new Date(targetYearNum, targetMonthNum, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(targetYearNum, targetMonthNum + 1, 0, 23, 59, 59, 999);

  // 3. Fetch full invoices tightly bound to the desired monthly archive bracket
  const allInvoices = await prisma.invoice.findMany({
    where: {
      ...baseWhere,
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    },
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
    select: { id: true, title: true, type: true },
  });
  const camps = await prisma.campProgram.findMany({
    select: { id: true, name: true, type: true },
  });
  
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const campMap = new Map(camps.map((c) => [c.id, c]));
  
  const formatted = allInvoices.map((inv) => {
    let itemTitle = inv.itemId;
    let actualCategory = (inv as any).itemCategory;

    if (inv.itemType === "PLACEMENT_TEST") {
      itemTitle = "Placement Test Fee";
    } else if (inv.itemType === "CAMP_PROGRAM" || (inv as any).itemCategory === "CAMP") {
      const camp = campMap.get(inv.itemId);
      itemTitle = camp?.name || inv.itemId;
      actualCategory = "CAMP";
    } else {
      const course = courseMap.get(inv.itemId);
      if (course) {
        itemTitle = course.title;
        if (!actualCategory) actualCategory = course.type.toUpperCase();
      }
    }
    
    // Fallback if still unknown
    if (!actualCategory) actualCategory = "REGULAR";

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      itemId: itemTitle,
      itemType: inv.itemType,
      amount: inv.amount,
      virtualAccountNumber: inv.virtualAccountNumber,
      itemCategory: actualCategory,
      learningMethod: (inv as any).learningMethod || "SEMI_PRIVATE",
      sessionsPerWeek: (inv as any).sessionsPerWeek || 1,
      settlementAccount: (inv as any).settlementAccount || "COMPANY",
      approvalStatus: (inv as any).approvalStatus || "APPROVED",
      bank: (inv as any).bank ?? null,
      orderId: (inv as any).orderId ?? null,
      transactionId: (inv as any).transactionId ?? null,
      expiryTime: (inv as any).expiryTime ? (inv as any).expiryTime.toISOString() : null,
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

  return <AdminPaymentsClient allInvoices={formatted} availableArchives={availableArchives} activePeriod={activePeriodStr} currentSystemPeriod={currentSystemPeriod} />;
}
