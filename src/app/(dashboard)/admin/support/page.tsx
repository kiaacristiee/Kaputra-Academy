import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminSupportClient from "./AdminSupportClient";
import { getAdminChatSessions } from "@/actions/chat";

export const metadata: Metadata = {
  title: "Customer Support | Admin Dashboard | Kaputra Academy",
};

export default async function AdminSupportPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || !["ADMIN", "SUPER_ADMIN", "OWNER"].includes(session.user.role)) {
    redirect("/login");
  }

  const { sessions = [] } = await getAdminChatSessions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Customer Support</h1>
        <p className="text-slate-500 mt-1">Manage and respond to live chat inquiries from students, parents, and guests.</p>
      </div>

      <AdminSupportClient 
        initialSessions={sessions as any} 
        adminId={session.user.id} 
      />
    </div>
  );
}
