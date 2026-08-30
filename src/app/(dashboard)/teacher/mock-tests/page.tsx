import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import MockTestClient from "../../student/mock-test/MockTestClient";
import BulkUpload from "./BulkUpload";
import { getVisibleStudentIds } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manage Quizzes | Kaputra Academy",
};

export default async function TeacherMockTestsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const visibleStudentIds = await getVisibleStudentIds(session.user);

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
                  student: true,
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
                student: true,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });
  }


  // Fetch all bank questions with folder info
  const [bankQuestions, folders, camps] = await Promise.all([
    prisma.mockQuestion.findMany({
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
