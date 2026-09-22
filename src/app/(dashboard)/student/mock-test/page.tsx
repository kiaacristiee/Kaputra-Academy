import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { getHomeworkVisibilityWhereClause } from "@/lib/homeworkScope";
import MockTestClient from "./MockTestClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Quizzes | Kaputra Academy",
};

export default async function MockTestPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const role = session.user.role;
  const userId = session.user.id;

  // Check enrollment
  const activeEnrollments = await prisma.enrollment.findMany({
    where: {
      studentId: userId,
      status: "ACTIVE",
    },
  });

  const isUnlocked = activeEnrollments.length > 0 || ["ADMIN", "TEACHER"].includes(role);

  // Fetch courses with quizzes (lightweight for initial page render)
  let courses: any[] = [];
  if (role === "TEACHER") {
    const teacherAssignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: userId },
      select: {
        course: {
          select: {
            id: true,
            title: true,
            type: true,
            mockTests: {
              select: {
                id: true,
                title: true,
                timeLimit: true,
                passingScore: true,
                isPublished: true,
                isTrial: true,
                targetedGrade: true,
                updatedAt: true,
                courseId: true,
                campProgramId: true,
                questionOrder: true,
                _count: { select: { questions: true } },
                submissions: {
                  take: 5,
                  select: {
                    id: true,
                    score: true,
                    isPassed: true,
                    answers: true,
                    submittedAt: true,
                    student: { select: { id: true, name: true } },
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });
    courses = teacherAssignments.map((ta) => ta.course);
  } else if (role === "ADMIN") {
    courses = await prisma.course.findMany({
      select: {
        id: true,
        title: true,
        type: true,
        mockTests: {
          select: {
            id: true,
            title: true,
            timeLimit: true,
            passingScore: true,
            isPublished: true,
            isTrial: true,
            targetedGrade: true,
            updatedAt: true,
            courseId: true,
            campProgramId: true,
            questionOrder: true,
            _count: { select: { questions: true } },
            submissions: {
              take: 5,
              select: {
                id: true,
                score: true,
                isPassed: true,
                answers: true,
                submittedAt: true,
                student: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  } else {
    // Student: find courses they are enrolled in — show only published, non-trial quizzes matching student's grade
    const visibilityWhere = await getHomeworkVisibilityWhereClause(session.user);
    const courseIds = activeEnrollments.map((e) => e.itemId);
    courses = await prisma.course.findMany({
      where: {
        id: { in: courseIds },
      },
      select: {
        id: true,
        title: true,
        type: true,
        mockTests: {
          where: {
            isTrial: false,
            ...visibilityWhere,
          },
          select: {
            id: true,
            title: true,
            timeLimit: true,
            passingScore: true,
            isPublished: true,
            isTrial: true,
            targetedGrade: true,
            updatedAt: true,
            courseId: true,
            campProgramId: true,
            questionOrder: true,
            _count: { select: { questions: true } },
            submissions: {
              where: { studentId: userId },
              orderBy: { submittedAt: "desc" },
              take: 5,
              select: {
                id: true,
                score: true,
                isPassed: true,
                answers: true,
                submittedAt: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  // Ensure questions array exists on mockTests for client compatibility
  const formattedCourses = courses.map((c) => ({
    ...c,
    mockTests: (c.mockTests || []).map((t: any) => ({
      ...t,
      questions: t.questions || [],
    })),
  }));

  let folders: any[] = [];
  if (role === "ADMIN" || role === "TEACHER") {
    // Bank questions are loaded on-demand per folder via /api/teacher/question-bank to avoid heavy page payloads
    folders = await prisma.questionFolder.findMany({
      include: { _count: { select: { questions: true } } },
      orderBy: { name: "asc" },
    });
  }

  return (
    <MockTestClient
      initialCourses={formattedCourses}
      isUnlocked={isUnlocked}
      userRole={role}
      initialBankQuestions={[]}
      initialFolders={folders}
    />
  );
}
