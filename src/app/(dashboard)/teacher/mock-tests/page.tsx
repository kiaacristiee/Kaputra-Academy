import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import MockTestClient from "../../student/mock-test/MockTestClient";
import BulkUpload from "./BulkUpload";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manage Mock Tests | Kaputra Academy",
};

export default async function TeacherMockTestsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const teacherAssignments = await prisma.teacherAssignment.findMany({
    where: { teacherId: session.user.id },
    include: {
      course: {
        include: {
          mockTests: {
            include: {
              questions: true,
              submissions: {
                include: {
                  student: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  const courses = teacherAssignments.map((ta) => ta.course);

  // Fetch all bank questions
  const bankQuestions = await prisma.mockQuestion.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Mock Tests</h1>
        <BulkUpload courses={courses} />
      </div>
      <MockTestClient
        initialCourses={courses}
        isUnlocked={true}
        userRole="TEACHER"
        initialBankQuestions={bankQuestions}
      />
    </>
  );
}
