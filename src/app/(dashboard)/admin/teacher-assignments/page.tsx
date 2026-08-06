import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import TeacherAssignmentsClient from "./TeacherAssignmentsClient";

import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Teacher Assignment | Admin Dashboard",
};

export default async function AdminTeacherAssignmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !isAdminRole(session.user.role)) {
    redirect("/login");
  }

  const isSuperAdmin = ["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role);

  const [teachers, courses, assignments] = await Promise.all([
    prisma.user.findMany({
      where: { role: "TEACHER", isActive: true },
      select: { id: true, name: true, email: true, studentIdStr: true },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.teacherAssignment.findMany({
      include: {
        teacher: { select: { name: true } },
        course: { select: { title: true } },
      },
      orderBy: { assignedAt: "desc" },
    }),
  ]);

  const formattedAssignments = assignments.map((a) => ({
    id: a.id,
    teacherId: a.teacherId,
    teacherName: a.teacher.name,
    courseId: a.courseId,
    courseName: a.course.title,
    assignedAt: a.assignedAt.toISOString(),
  }));

  return (
    <TeacherAssignmentsClient
      teachers={teachers}
      courses={courses}
      assignments={formattedAssignments}
    />
  );
}
