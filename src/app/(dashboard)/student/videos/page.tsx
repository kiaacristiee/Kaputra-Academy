import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import VideosClient from "./VideosClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Class Videos | Kaputra Academy",
};

export default async function VideosPage() {
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

  // If role is teacher, find their assigned courses
  let courses: any[] = [];
  if (role === "TEACHER") {
    const teacherAssignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: userId },
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
    courses = teacherAssignments.map((ta) => ta.course);
  } else if (role === "ADMIN") {
    courses = await prisma.course.findMany({
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
  } else {
    // Student: find courses they are enrolled in
    const courseIds = activeEnrollments.map((e) => e.itemId);
    courses = await prisma.course.findMany({
      where: {
        id: { in: courseIds },
      },
      include: {
        videos: {
          where: { isPublished: true },
          orderBy: { order: "asc" },
          include: {
            quizzes: {
              orderBy: { timestamp: "asc" },
            },
          },
        },
      },
    });
  }

  return (
    <VideosClient
      initialCourses={courses}
      isUnlocked={isUnlocked}
      userRole={role}
    />
  );
}
