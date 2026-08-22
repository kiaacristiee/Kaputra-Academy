import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import CampsClient from "./CampsClient";
import { getCamps, getTeachersForAssignment } from "@/actions/camps";

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

  const [campRes, teacherRes] = await Promise.all([
    getCamps(),
    getTeachersForAssignment(),
  ]);

  const camps = campRes.success ? campRes.camps || [] : [];
  const teachers = teacherRes.success ? teacherRes.teachers || [] : [];

  return (
    <CampsClient
      initialCamps={JSON.parse(JSON.stringify(camps))}
      teachers={JSON.parse(JSON.stringify(teachers))}
    />
  );
}
