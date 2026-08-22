import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import TeacherDashboardClient from "./TeacherDashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Teacher Dashboard | Kaputra Academy",
};

export default async function TeacherDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  // Fetch the teacher profile details along with assigned courses
  const teacher = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      teachingAssignments: {
        include: {
          course: true,
        },
      },
    },
  });

  if (!teacher) {
    redirect("/login");
  }

  const courseIds = teacher.teachingAssignments.map((ta) => ta.courseId);

  // Fetch active enrollments for these courses to count students per course
  const enrollments = await prisma.enrollment.findMany({
    where: {
      itemId: { in: courseIds },
      status: "ACTIVE",
    },
  });

  // Count directly assigned students via new StudentTeacherAssignment model
  const assignedStudentCount = await (prisma as any).studentTeacherAssignment.count({
    where: { teacherId: session.user.id },
  });

  // Map courses with their specific enrollment counts
  const coursesWithStats = teacher.teachingAssignments.map((ta) => {
    const course = ta.course;
    const studentCount = enrollments.filter((e) => e.itemId === course.id).length;
    return {
      id: course.id,
      title: course.title,
      schedule: course.schedule,
      isPublished: course.isPublished,
      type: course.type,
      studentsCount: studentCount,
    };
  });

  const totalStudents = assignedStudentCount || enrollments.length;
  const activeClassesCount = coursesWithStats.filter((c) => c.isPublished).length;

  return (
    <TeacherDashboardClient
      teacherName={teacher.name}
      courses={coursesWithStats}
      totalStudents={totalStudents}
      activeClassesCount={activeClassesCount}
    />
  );
}

