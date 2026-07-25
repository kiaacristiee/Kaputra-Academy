import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import VideosClient from "../../student/videos/VideosClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manage Videos | Admin | Kaputra Academy",
};

export default async function AdminVideosPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const courses = await prisma.course.findMany({
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
  });

  return (
    <VideosClient
      initialCourses={courses}
      isUnlocked={true}
      userRole="ADMIN"
    />
  );
}
