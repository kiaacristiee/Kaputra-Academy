import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import EmailsClient from "./EmailsClient";
import { isAdminRole } from "@/lib/permissions";
import { getEmailDrafts } from "@/actions/emails";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Email Workflow | Admin | Kaputra Academy",
};

export default async function AdminEmailsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !isAdminRole(session.user.role)) {
    redirect("/login");
  }

  const result = await getEmailDrafts();
  const drafts = result.success && result.drafts ? result.drafts : [];

  return <EmailsClient initialDrafts={drafts} />;
}
