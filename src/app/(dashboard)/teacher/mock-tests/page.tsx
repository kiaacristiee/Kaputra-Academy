import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import MockTestClient from "../../student/mock-test/MockTestClient";
import BulkUpload from "./BulkUpload";
import { getVisibleStudentIds } from "@/lib/permissions";

export const metadata = {
  title: "Manage Quizzes | Kaputra Academy",
};

export default async function TeacherMockTestsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  // Execute permissions, folders, camps, and teacher assignments concurrently in 1 batch
  const [visibleStudentIds, folders, camps, teacherAssignments] = await Promise.all([
    getVisibleStudentIds(session.user),
    prisma.questionFolder.findMany({
      include: { _count: { select: { questions: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.campProgram.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.teacherAssignment.findMany({
      where: { teacherId: session.user.id },
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
                    student: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
              orderBy: { updatedAt: "desc" },
            },
          },
        },
      },
    }),
  ]);

  let courses = teacherAssignments.map((ta) => ta.course);
  if (courses.length === 0) {
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
                student: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });
  }

  // Ensure questions property exists as an empty array for lightweight initial render
  const formattedCourses = courses.map((c) => ({
    ...c,
    mockTests: (c.mockTests || []).map((t: any) => ({
      ...t,
      questions: [],
    })),
  }));

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Quizzes</h1>
        <BulkUpload courses={formattedCourses as any} />
      </div>
      <MockTestClient
        initialCourses={formattedCourses as any}
        initialCamps={camps as any}
        isUnlocked={true}
        userRole="TEACHER"
        initialBankQuestions={[]}
        initialFolders={folders}
      />
    </>
  );
}
