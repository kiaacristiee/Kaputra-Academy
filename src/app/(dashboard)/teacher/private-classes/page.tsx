import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import PrivateClassesClient from "./PrivateClassesClient";

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

  const [sessions, students, courses] = await Promise.all([
    prisma.privateSession.findMany({
      where: { teacherId },
      include: {
        student: { select: { name: true, studentIdStr: true } },
        course: { select: { title: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT", isActive: true },
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
