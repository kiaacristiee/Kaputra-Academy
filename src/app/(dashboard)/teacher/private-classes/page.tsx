import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import PrivateClassesClient from "./PrivateClassesClient";
import { getVisibleStudentIds } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Private Classes | Kaputra Academy",
};

export default async function PrivateClassesPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const teacherId = session.user.id;
  const visibleStudentIds = await getVisibleStudentIds(session.user);

  const [sessions, students, courses] = await Promise.all([
    prisma.privateSession.findMany({
      where: {
        teacherId,
        ...(visibleStudentIds ? { studentId: { in: visibleStudentIds } } : {}),
      },
      include: {
        student: { select: { name: true, studentIdStr: true } },
        course: { select: { title: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.user.findMany({
      where: {
        role: "STUDENT",
        isActive: true,
        ...(visibleStudentIds ? { id: { in: visibleStudentIds } } : {}),
      },
      select: { id: true, name: true, studentIdStr: true },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      select: { id: true, title: true, type: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return <PrivateClassesClient sessions={sessions} students={students} courses={courses} />;
}

