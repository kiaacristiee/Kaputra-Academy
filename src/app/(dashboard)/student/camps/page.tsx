import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { getHomeworkVisibilityWhereClause } from "@/lib/homeworkScope";
import StudentCampsClient from "./StudentCampsClient";
import { Info } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Camp Programs | Kaputra Academy",
};

export default async function StudentCampsPage() {
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

  // Check active enrollments for camps
  const activeEnrollments = await prisma.enrollment.findMany({
    where: {
      studentId: userId,
      itemType: "CAMP",
      status: "ACTIVE",
    },
  });

  const campIds = activeEnrollments.map((e) => e.itemId);
  const isStaff = ["ADMIN", "TEACHER", "OWNER", "CO_OWNER"].includes(role);

  // Fetch enrolled camps details
  const enrolledCamps = await prisma.campProgram.findMany({
    where: {
      id: { in: campIds.length > 0 ? campIds : ["NONE"] },
    },
  });

  // Fetch videos for enrolled/all camps
  const videos = await prisma.video.findMany({
    where: {
      ...(isStaff ? { campProgramId: { not: null } } : { campProgramId: { in: campIds.length > 0 ? campIds : ["NONE"] } }),
      ...(isStaff ? {} : { isPublished: true }),
    },
    include: {
      quizzes: {
        orderBy: { timestamp: "asc" },
      },
      campProgram: true,
    },
    orderBy: { order: "asc" },
  });

  // Fetch materials for camps
  const materials = await prisma.material.findMany({
    where: {
      ...(isStaff ? { campProgramId: { not: null } } : { campProgramId: { in: campIds.length > 0 ? campIds : ["NONE"] } }),
      ...(isStaff ? {} : { isPublished: true }),
    },
    include: {
      campProgram: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Map to Item structure
  const classContents = [
    ...videos.map((v) => ({
      id: v.id,
      type: "VIDEO",
      title: v.title,
      url: v.videoUrl,
      description: v.category || "Camp Video",
      isPublished: v.isPublished,
      campProgramId: v.campProgram?.id,
      quizzes: v.quizzes || [],
    })),
    ...materials.map((m) => ({
      id: m.id,
      type: "MATERIAL",
      title: m.title,
      url: m.fileUrl,
      description: m.description || "Downloadable Resource",
      isPublished: m.isPublished,
      campProgramId: m.campProgram?.id,
    })),
  ];

  // Fetch quizzes for camps
  const visibilityWhere = isStaff ? {} : await getHomeworkVisibilityWhereClause(session.user);
  const mockTests = await prisma.mockTest.findMany({
    where: {
      AND: [
        isStaff ? { campProgramId: { not: null } } : { campProgramId: { in: campIds.length > 0 ? campIds : ["NONE"] } },
        visibilityWhere,
      ],
    },
    include: {
      questions: true,
      campProgram: true,
      submissions: {
        where: isStaff ? {} : { studentId: userId },
        orderBy: { submittedAt: "desc" },
      }
    },
    orderBy: { createdAt: "desc" },
  });

  const formattedMockTests = mockTests.map((t) => ({
    id: t.id,
    title: t.title,
    timeLimit: t.timeLimit,
    passingScore: t.passingScore,
    isPublished: t.isPublished,
    campProgramId: t.campProgram?.id,
    questions: t.questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    })),
    submissions: t.submissions,
  }));

  // Fetch published camps for un-enrolled view
  const allPublishedCamps = await prisma.campProgram.findMany({
    where: { visibility: "PUBLISHED", status: "OPEN" },
  });

  return (
    <StudentCampsClient
      enrolledCamps={JSON.parse(JSON.stringify(enrolledCamps))}
      allCamps={JSON.parse(JSON.stringify(allPublishedCamps))}
      initialItems={classContents}
      initialMockTests={formattedMockTests}
      userRole={role}
    />
  );
}
