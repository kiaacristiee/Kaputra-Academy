import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import MockTestClient from "../../student/mock-test/MockTestClient";
import BulkUpload from "./BulkUpload";
import { getVisibleStudentIds } from "@/lib/permissions";

export const revalidate = 10;

export const metadata = {
  title: "Manage Quizzes | Kaputra Academy",
};

export default async function TeacherMockTestsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  // Fetch initial batch (first 30 questions) to keep initial load lightweight
  const [visibleStudentIds, bankQuestions, folders, camps] = await Promise.all([
    getVisibleStudentIds(session.user),
    prisma.mockQuestion.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
    }),
    prisma.questionFolder.findMany({
      include: { _count: { select: { questions: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.campProgram.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const teacherAssignments = await prisma.teacherAssignment.findMany({
    where: { teacherId: session.user.id },
    include: {
      course: {
        include: {
          mockTests: {
            include: {
              questions: true,
              submissions: {
                where: visibleStudentIds ? { studentId: { in: visibleStudentIds } } : {},
                include: {
                  student: {
                    select: {
                      id: true,
                      name: true,
                      studentIdStr: true,
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
  });

  let courses = teacherAssignments.map((ta) => ta.course);
  if (courses.length === 0) {
    courses = await prisma.course.findMany({
      include: {
        mockTests: {
          include: {
            questions: true,
            submissions: {
              where: visibleStudentIds ? { studentId: { in: visibleStudentIds } } : {},
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    studentIdStr: true,
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

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Quizzes</h1>
        <BulkUpload courses={courses} />
      </div>
      <MockTestClient
        initialCourses={courses}
        initialCamps={camps}
        isUnlocked={true}
        userRole="TEACHER"
        initialBankQuestions={bankQuestions}
        initialFolders={folders}
      />
    </>
  );
}
