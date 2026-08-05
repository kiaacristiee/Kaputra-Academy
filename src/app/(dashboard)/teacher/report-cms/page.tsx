import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import ReportCMSClient from "./ReportCMSClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Academic Report CMS | Kaputra Academy",
};

export default async function TeacherReportCMSPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  // Get teacher's assigned courses
  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId: session.user.id },
    include: { course: { select: { id: true, title: true } } },
  });
  const courseIds = assignments.map((a) => a.courseId);
  const courses = assignments.map((a) => ({ id: a.course.id, title: a.course.title }));

  // Get all students enrolled in teacher's courses
  const enrollments = await prisma.enrollment.findMany({
    where: { itemId: { in: courseIds }, itemType: "CLASS", status: "ACTIVE" },
    include: { student: { select: { id: true, name: true, studentIdStr: true } } },
  });
  const uniqueStudentsMap = new Map<string, { id: string; name: string; studentIdStr: string | null }>();
  enrollments.forEach((e) => {
    if (!uniqueStudentsMap.has(e.studentId)) {
      uniqueStudentsMap.set(e.studentId, e.student);
    }
  });
  const students = Array.from(uniqueStudentsMap.values());

  // Fetch existing reports for teacher's courses
  const reports = await prisma.academicReport.findMany({
    where: { courseId: { in: courseIds } },
    include: {
      student: { select: { id: true, name: true, studentIdStr: true } },
      course: { select: { title: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const formatted = reports.map((r) => ({
    id: r.id,
    studentId: r.student.id,
    studentName: r.student.name,
    studentIdStr: r.student.studentIdStr || r.student.id.slice(0, 8),
    courseId: r.courseId,
    courseName: r.course.title,
    grade: r.grade,
    progress: r.progress,
    teacherNotes: r.teacherNotes,
    skillAssessment: r.skillAssessment,
    completedModules: r.completedModules,
    status: r.status,
    performanceSummary: r.performanceSummary,
    strengths: r.strengths,
    improvements: r.improvements,
    learningProgress: r.learningProgress,
    nextSteps: r.nextSteps,
  }));

  return (
    <ReportCMSClient
      reports={formatted}
      students={students}
      courses={courses}
    />
  );
}
