import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import EmailsClient from "./EmailsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Email Drafts | Admin | Kaputra Academy",
};

export default async function AdminEmailsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const drafts = await prisma.emailDraft.findMany({
    orderBy: { createdAt: "desc" },
  });

  return <EmailsClient initialDrafts={drafts} />;
}
