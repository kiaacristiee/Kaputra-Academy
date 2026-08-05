import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSalariesForAdmin, getTeachersList } from "@/actions/salaryAdmin";
import AdminSalaryClient from "./AdminSalaryClient";

import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Salary CMS | Admin | Kaputra Academy",
};

export default async function AdminSalaryPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !isAdminRole(session.user.role)) {
    redirect("/login");
  }

  const salariesRes = await getSalariesForAdmin();
  const teachersRes = await getTeachersList();

  const salaries = salariesRes.success && salariesRes.salaries ? salariesRes.salaries : [];
  const teachers = teachersRes.success && teachersRes.teachers ? teachersRes.teachers : [];

  return (
    <AdminSalaryClient
      initialSalaries={JSON.parse(JSON.stringify(salaries))}
      teachers={JSON.parse(JSON.stringify(teachers))}
    />
  );
}
