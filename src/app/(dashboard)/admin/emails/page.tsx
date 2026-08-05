import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import EmailsClient from "./EmailsClient";

import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Email Drafts | Admin | Kaputra Academy",
};

export default async function AdminEmailsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !isAdminRole(session.user.role)) {
    redirect("/login");
  }

  const drafts = await prisma.emailDraft.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return <EmailsClient initialDrafts={drafts} />;
}
