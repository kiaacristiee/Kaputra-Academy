import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import TeachersClient from "./TeachersClient";
import { getTeachers } from "@/actions/teachers";

import { isAdminRole } from "@/lib/permissions";

export const metadata = {
  title: "Teacher Directory | Admin Dashboard",
};

export default async function AdminTeachersPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !isAdminRole(session.user.role)) {
    redirect("/login");
  }

  // Fetch all teachers
  const res = await getTeachers();
  const teachers = res.success ? res.teachers || [] : [];

  return <TeachersClient initialTeachers={teachers} />;
}
