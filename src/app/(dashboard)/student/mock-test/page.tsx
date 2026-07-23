import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import MockTestClient from "./MockTestClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mock Tests | Kaputra Academy",
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

  // Fetch courses with mock tests
  let courses: any[] = [];
  if (role === "TEACHER") {
    const teacherAssignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: userId },
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
    courses = teacherAssignments.map((ta) => ta.course);
  } else if (role === "ADMIN") {
    courses = await prisma.course.findMany({
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
    });
  } else {
    // Student: find courses they are enrolled in — show only published, non-trial mock tests
    const courseIds = activeEnrollments.map((e) => e.itemId);
    courses = await prisma.course.findMany({
      where: {
        id: { in: courseIds },
      },
      include: {
        mockTests: {
          where: { isPublished: true, isTrial: false },
          include: {
            questions: true,
            submissions: {
              where: { studentId: userId },
              orderBy: { submittedAt: "desc" },
            },
          },
        },
      },
    });
  }

  let bankQuestions: any[] = [];
  if (role === "ADMIN" || role === "TEACHER") {
    bankQuestions = await prisma.mockQuestion.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  return (
    <MockTestClient
      initialCourses={courses}
      isUnlocked={isUnlocked}
      userRole={role}
      initialBankQuestions={bankQuestions}
    />
  );
}
