import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import StudentDashboardClient from "./StudentDashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Student Dashboard | Kaputra Academy",
};

export default async function StudentDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "STUDENT") {
    redirect("/login");
  }

  // Fetch student profile and active enrollments
  const student = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      parent: true,
      enrollments: {
        where: { status: "ACTIVE" },
      },
    },
  });

  if (!student) {
    redirect("/login");
  }

  // Map out enrolled course IDs
  const courseIds = student.enrollments
    .filter((e) => e.itemType === "COURSE" || e.itemType === "CLASS" || e.itemType === "PROGRAM")
    .map((e) => e.itemId);

  // Fetch course details, categories, and assigned teachers
  const enrolledCourses = await prisma.course.findMany({
    where: {
      id: { in: courseIds },
    },
    include: {
      category: true,
      teachers: {
        include: {
          teacher: true,
        },
      },
    },
  });

  const coursesWithDetails = enrolledCourses.map((course) => ({
    id: course.id,
    title: course.title,
    schedule: course.schedule,
    price: course.price,
    type: course.type,
    categoryName: course.category.name,
    teachers: course.teachers.map((t) => ({
      id: t.teacher.id,
      name: t.teacher.name,
      email: t.teacher.email,
    })),
  }));

  // Match enrollments that did not resolve to a database Course CUID
  const resolvedCourseIds = enrolledCourses.map((c) => c.id);
  const unresolvedEnrollments = student.enrollments.filter(
    (e) => !resolvedCourseIds.includes(e.itemId)
  );

  const campIds = unresolvedEnrollments
    .filter((e) => e.itemType === "PROGRAM" || e.itemType === "CAMP")
    .map((e) => e.itemId);

  const camps = await prisma.campProgram.findMany({
    where: { id: { in: campIds } },
  });

  const campMap = new Map(camps.map((c) => [c.id, c]));

  const fallbackCourses = unresolvedEnrollments.map((e) => {
    const isProgram = e.itemType === "PROGRAM" || e.itemType === "CAMP";
    const camp = isProgram ? campMap.get(e.itemId) : null;
    
    return {
      id: e.id,
      title: camp ? camp.name : e.itemId,
      schedule: camp
        ? `Starts: ${new Date(camp.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
        : "Schedule to be arranged with your instructor",
      price: camp ? camp.price : 0,
      type: camp ? (camp as any).type : (isProgram ? "CAMP" : (e.itemType === "CLASS" ? "REGULAR" : "COMPETITION")),
      categoryName: isProgram ? "Camp Program" : e.itemType,
      teachers: [],
    };
  });

  const allCoursesWithDetails = [...coursesWithDetails, ...fallbackCourses];

  // Fetch entry placement test results
  let placementTest = null;
  if (student.studentIdStr) {
    placementTest = await prisma.placementTest.findUnique({
      where: { studentIdStr: student.studentIdStr },
    });
  }

  // Fetch student active announcements
  const latestAnnouncements = await prisma.announcement.findMany({
    where: {
      isPublished: true,
      publishDate: { lte: new Date() },
      targetAudience: { in: ["STUDENTS", "BOTH"] },
      OR: [
        { courseId: null },
        { courseId: { in: courseIds } },
      ],
      AND: [
        {
          OR: [
            { targetStudents: { none: {} } }, // Send to everyone
            { targetStudents: { some: { id: session.user.id } } }, // Specific targeted student
          ],
        },
      ],
    },
    include: {
      teacher: { select: { name: true } },
      course: { select: { title: true } },
    },
    orderBy: { publishDate: "desc" },
    take: 5,
  });

  const formattedAnnouncements = latestAnnouncements.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    publishDate: a.publishDate.toISOString(),
    teacherName: a.teacher.name,
    courseName: a.course?.title || null,
  }));

  return (
    <StudentDashboardClient
      studentName={student.name}
      studentIdStr={student.studentIdStr}
      courses={allCoursesWithDetails}
      placementTest={placementTest ? {
        id: placementTest.id,
        testCode: placementTest.testCode,
        status: placementTest.status,
        score: placementTest.score,
        qualificationStatus: placementTest.qualificationStatus,
        submittedAt: placementTest.submittedAt,
      } : null}
      announcements={formattedAnnouncements}
    />
  );
}
