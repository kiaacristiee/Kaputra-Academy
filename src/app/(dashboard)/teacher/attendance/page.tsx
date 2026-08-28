import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import AttendanceClient from "./AttendanceClient";
import { getVisibleStudentIds } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Attendance | Kaputra Academy",
};

export default async function TeacherAttendancePage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const visibleStudentIds = await getVisibleStudentIds(session.user);

  // Fetch attendance records and assignments concurrently
  const [records, assignments] = await Promise.all([
    prisma.teacherAttendance.findMany({
      where: { teacherId: session.user.id },
      orderBy: { date: "desc" },
    }),
    prisma.teacherAssignment.findMany({
      where: { teacherId: session.user.id },
      include: { course: true },
    }),
  ]);

  // Check today's status
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayRecord = records.find(
    (r) => new Date(r.date).getTime() >= todayStart.getTime()
  );

  const formattedRecords = records.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    checkIn: r.checkIn ? r.checkIn.toISOString() : null,
    checkOut: r.checkOut ? r.checkOut.toISOString() : null,
    status: r.status,
    workingHours: r.workingHours,
  }));

  const courses = assignments.map(a => ({
    id: a.course.id,
    title: a.course.title,
  }));

  // Fetch enrollments and student attendances concurrently
  const [enrollments, studentAttendances] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        itemId: { in: courses.map(c => c.id) },
        itemType: "CLASS",
        status: "ACTIVE",
        ...(visibleStudentIds ? { studentId: { in: visibleStudentIds } } : {}),
      },
      include: { student: true },
    }),
    prisma.attendance.findMany({
      where: {
        courseId: { in: courses.map(c => c.id) },
        ...(visibleStudentIds ? { studentId: { in: visibleStudentIds } } : {}),
      },
      include: {
        student: { select: { name: true } },
        course: { select: { title: true } },
      },
      orderBy: { date: "desc" },
    }),
  ]);


  const students = enrollments.map(e => ({
    id: e.student.id,
    name: e.student.name,
    courseId: e.itemId,
  }));

  const formattedStudentAttendances = studentAttendances.map(a => ({
    id: a.id,
    studentId: a.studentId,
    studentName: a.student.name,
    courseId: a.courseId,
    courseTitle: a.course.title,
    date: a.date.toISOString(),
    status: a.status,
    notes: a.notes,
  }));

  return (
    <AttendanceClient
      records={formattedRecords}
      hasCheckedInToday={!!todayRecord}
      hasCheckedOutToday={!!todayRecord?.checkOut}
      courses={courses}
      students={students}
      studentAttendanceRecords={formattedStudentAttendances}
    />
  );
}
