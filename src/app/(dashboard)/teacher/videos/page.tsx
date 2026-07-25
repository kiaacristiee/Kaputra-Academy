import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import VideosClient from "../../student/videos/VideosClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manage Videos | Kaputra Academy",
};

export default async function TeacherVideosPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const teacherAssignments = await prisma.teacherAssignment.findMany({
    where: { teacherId: session.user.id },
    include: {
      course: {
        include: {
          videos: {
            orderBy: { order: "asc" },
            include: {
              quizzes: {
                orderBy: { timestamp: "asc" },
              },
            },
          },
        },
      },
    },
  });

  const courses = teacherAssignments.map((ta) => ta.course);

  return (
    <VideosClient
      initialCourses={courses}
      isUnlocked={true}
      userRole="TEACHER"
    />
  );
}
