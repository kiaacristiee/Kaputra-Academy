import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import CampsClient from "./CampsClient";
import { getCamps } from "@/actions/camps";

import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Camp Program Management | Admin Dashboard",
};

export default async function AdminCampsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !isAdminRole(session.user.role)) {
    redirect("/login");
  }

  const campRes = await getCamps();
  const camps = campRes.success ? campRes.camps || [] : [];

  return (
    <CampsClient
      initialCamps={JSON.parse(JSON.stringify(camps))}
    />
  );
}
