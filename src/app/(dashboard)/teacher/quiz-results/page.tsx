import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import QuizResultsClient from "./QuizResultsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Student Quiz Results | Kaputra Academy",
};

export default async function TeacherQuizResultsPage() {
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
                orderBy: { submittedAt: "desc" }
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  const courses = teacherAssignments.map((ta) => ta.course);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            Student Quiz Results
          </h1>
          <p className="text-sm text-slate-400 mt-1">Review student performance and quiz submissions</p>
        </div>
      </div>
      <QuizResultsClient initialCourses={courses} />
    </>
  );
}
