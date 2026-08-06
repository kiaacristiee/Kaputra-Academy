import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStandardAdmins } from "@/actions/superAdmin";
import { redirect } from "next/navigation";
import AdminManagementClient from "./AdminManagementClient";

export const metadata = {
  title: "Admin Management | Kaputra Academy",
};

export default async function AdminManagementPage() {
  const session = await getServerSession(authOptions);
  
  // Guard route for super admins only
  if (!session?.user || !["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role)) {
    redirect("/admin"); 
  }

  const res = await getStandardAdmins();
  const admins = res.success ? res.admins || [] : [];

  const serialized = admins.map(a => ({
    ...a,
    createdAt: a.createdAt.toISOString()
  }));

  return <AdminManagementClient initialAdmins={serialized} />;
}
