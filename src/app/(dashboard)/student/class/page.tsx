import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import ClassClient from "./ClassClient";
import { Info } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Class | Kaputra Academy",
};

export default async function ClassPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const role = session.user.role;
  const userId = session.user.id;

  // Retrieve user to check if disabled
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if ((user as any)?.isDisabled) {
    return (
      <div className="flex flex-col items-center justify-center p-10 h-full">
        <div className="bg-red-500/10 p-4 rounded-full mb-4">
          <Info className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2 text-center">Access Restricted</h2>
        <p className="text-slate-400 text-center max-w-md">
          Your learning access has been temporarily disabled. Please contact Kaputra Academy for more information.
        </p>
      </div>
    );
  }

  // Check active enrollments
  const activeEnrollments = await prisma.enrollment.findMany({
    where: {
      studentId: userId,
      status: "ACTIVE",
    },
  });

  const courseIds = activeEnrollments.map((e) => e.itemId);
  const isStaff = ["ADMIN", "TEACHER", "OWNER", "CO_OWNER"].includes(role);

  // Fetch enrolled courses, videos, materials, and quizzes concurrently
  const [enrolledCourses, videos, materials, mockTests] = await Promise.all([
    prisma.course.findMany({
      where: {
        id: { in: courseIds.length > 0 ? courseIds : ["NONE"] },
      },
      select: { id: true, type: true, title: true },
    }),
    prisma.video.findMany({
      where: {
        ...(isStaff ? {} : { courseId: { in: courseIds.length > 0 ? courseIds : ["NONE"] } }),
        ...(isStaff ? {} : { isPublished: true }),
      },
      include: {
        quizzes: {
          orderBy: { timestamp: "asc" },
        },
        course: {
          select: { type: true, title: true },
        },
      },
      orderBy: { order: "asc" },
    }),
    prisma.material.findMany({
      where: {
        ...(isStaff ? {} : { courseId: { in: courseIds.length > 0 ? courseIds : ["NONE"] } }),
        ...(isStaff ? {} : { isPublished: true }),
      },
      include: {
        course: {
          select: { type: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.mockTest.findMany({
      where: {
        ...(isStaff ? {} : { courseId: { in: courseIds.length > 0 ? courseIds : ["NONE"] } }),
        ...(isStaff ? {} : { isPublished: true }),
      },
      include: {
        questions: true,
        course: { select: { type: true, title: true } },
        submissions: {
          where: isStaff ? undefined : { studentId: userId },
          orderBy: { submittedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const enrolledTypes = isStaff
    ? ["REGULAR", "COMPETITION"]
    : Array.from(new Set(enrolledCourses.map((c) => c.type.toUpperCase())));

  // Map to Item structure
  const classContents = [
    ...videos.map((v) => ({
      id: v.id,
      type: "VIDEO",
      title: v.title,
      url: v.videoUrl,
      description: v.category || "Lesson Video",
      isPublished: v.isPublished,
      courseType: (v.course?.type || "REGULAR").toUpperCase(),
      quizzes: v.quizzes || [],
    })),
    ...materials.map((m) => ({
      id: m.id,
      type: "MATERIAL",
      title: m.title,
      url: m.fileUrl,
      description: m.description || "Downloadable Resource",
      isPublished: m.isPublished,
      courseType: (m.course?.type || "REGULAR").toUpperCase(),
    })),
  ];

  const formattedMockTests = mockTests.map((t) => ({
    id: t.id,
    title: t.title,
    timeLimit: t.timeLimit,
    passingScore: t.passingScore,
    isPublished: t.isPublished,
    courseType: (t.course?.type || "REGULAR").toUpperCase(),
    submissions: t.submissions,
    questions: t.questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      imageUrl: q.imageUrl,
    })),
  }));

  return (
    <ClassClient
      initialItems={classContents}
      initialMockTests={formattedMockTests}
      enrolledTypes={enrolledTypes}
      userRole={role}
    />
  );
}
