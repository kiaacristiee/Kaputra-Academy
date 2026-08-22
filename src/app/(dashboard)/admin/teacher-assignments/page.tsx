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

  // Fetch teachers (TEACHER, SUPER_ADMIN, OWNER, CO_OWNER — NOT plain ADMIN)
  const teachers = await prisma.user.findMany({
    where: { role: { in: ["TEACHER", "SUPER_ADMIN", "OWNER", "CO_OWNER"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  // Fetch all students
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: {
      id: true,
      name: true,
      studentIdStr: true,
      enrollments: {
        where: { status: "ACTIVE" },
        select: { itemId: true, itemType: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Fetch all courses (for mapping enrollment itemId → course name)
  const courses = await prisma.course.findMany({
    select: { id: true, title: true },
  });

  // Fetch all camp programs (for mapping enrollment itemId → camp name)
  const campPrograms = await prisma.campProgram.findMany({
    select: { id: true, name: true },
  });

  // Fetch existing student-teacher assignments
  const assignments = await (prisma as any).studentTeacherAssignment.findMany({
    include: {
      teacher: { select: { id: true, name: true } },
      student: { select: { id: true, name: true, studentIdStr: true } },
    },
    orderBy: { assignedAt: "desc" },
  });

  // Build course/camp lookups
  const courseMap: Record<string, string> = {};
  courses.forEach((c: any) => { courseMap[c.id] = c.title; });
  campPrograms.forEach((c: any) => { courseMap[c.id] = c.name; });

  // Build enriched student list with enrollment names
  const enrichedStudents = students.map((s: any) => ({
    id: s.id,
    name: s.name,
    studentIdStr: s.studentIdStr || "—",
    programs: s.enrollments.map((e: any) => ({
      name: courseMap[e.itemId] || "Unknown",
      type: e.itemType,
    })),
  }));

  const formattedAssignments = assignments.map((a: any) => ({
    id: a.id,
    teacherId: a.teacherId,
    teacherName: a.teacher.name,
    studentId: a.studentId,
    studentName: a.student.name,
    studentIdStr: a.student.studentIdStr || "—",
    assignedAt: a.assignedAt.toISOString(),
  }));

  return (
    <TeacherAssignmentsClient
      teachers={teachers}
      students={enrichedStudents}
      assignments={formattedAssignments}
    />
  );
}
