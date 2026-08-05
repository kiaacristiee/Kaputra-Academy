import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import ParentsClient from "./ParentsClient";

import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Parent Management | Admin Dashboard",
};

export default async function AdminParentsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !isAdminRole(session.user.role)) {
    redirect("/login");
  }

  const parents = await prisma.user.findMany({
    where: { role: "PARENT" },
    include: {
      children: {
        select: { id: true, name: true, studentIdStr: true, isActive: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formattedParents = parents.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    isActive: p.isActive,
    children: p.children.map((c) => ({
      id: c.id,
      name: c.name,
      studentIdStr: c.studentIdStr,
      isActive: c.isActive,
    })),
  }));

  return <ParentsClient initialParents={formattedParents} />;
}
