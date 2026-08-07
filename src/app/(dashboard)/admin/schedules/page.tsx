import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import SchedulesClient from "./SchedulesClient";

import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Schedule Management | Admin Dashboard",
};

export default async function AdminSchedulesPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !isAdminRole(session.user.role)) {
    redirect("/login");
  }

  const isSuperAdmin = ["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role);

  // Fetch lists
  const schedules = await prisma.schedule.findMany({
    where: {
      ...(!isSuperAdmin && { type: { not: "PRIVATE" } })
    },
    include: {
      course: { select: { title: true } },
      teacher: { select: { name: true } },
      student: { select: { name: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const courses = await prisma.course.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const teachers = await prisma.user.findMany({
    where: { role: { in: ["TEACHER", "SUPER_ADMIN", "OWNER", "CO_OWNER"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true, studentIdStr: true },
    orderBy: { name: "asc" },
  });

  // Fetch holidays from ContentBlock
  const block = await prisma.contentBlock.findUnique({
    where: { section: "academy_holidays" },
  });

  let holidays = [];
  if (block) {
    try {
      holidays = JSON.parse(block.content);
    } catch (e) {
      console.error("Failed to parse holidays config block", e);
    }
  }

  const formattedSchedules = schedules.map((s) => ({
    id: s.id,
    courseId: s.courseId,
    teacherId: s.teacherId,
    studentId: s.studentId,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    type: s.type,
    course: s.course ? { title: s.course.title } : null,
    teacher: { name: s.teacher.name },
    student: s.student ? { name: s.student.name } : null,
  }));

  return (
    <SchedulesClient
      initialSchedules={formattedSchedules}
      courses={courses}
      teachers={teachers}
      students={students}
      initialHolidays={holidays}
    />
  );
}
