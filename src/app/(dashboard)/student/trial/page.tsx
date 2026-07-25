import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import TrialClient from "./TrialClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Trial Content | Kaputra Academy",
};

export default async function TrialPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const role = session.user.role;
  const userId = session.user.id;

  // Check if student has active enrollments
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId: userId,
      status: "ACTIVE",
    },
  });

  const hasEnrollment = !!enrollment;

  const isStaff = ["ADMIN", "TEACHER"].includes(role);

  // Fetch trial videos — students only see published ones
  const trialVideos = await prisma.video.findMany({
    where: {
      isTrial: true,
      ...(isStaff ? {} : { isPublished: true }),
    },
    include: {
      quizzes: {
        orderBy: { timestamp: "asc" },
      },
    },
    orderBy: { order: "asc" },
  });

  // Fetch trial materials — students only see published ones
  const trialMaterials = await prisma.material.findMany({
    where: {
      isTrial: true,
      ...(isStaff ? {} : { isPublished: true }),
    },
    orderBy: { createdAt: "desc" },
  });

  // Map to TrialItem structure
  const trialContents = [
    ...trialVideos.map((v) => ({
      id: v.id,
      type: "VIDEO",
      title: v.title,
      url: v.videoUrl,
      description: v.category || "Trial Lesson Video",
      isPublished: v.isPublished,
      quizzes: v.quizzes || [],
    })),
    ...trialMaterials.map((m) => ({
      id: m.id,
      type: "MATERIAL",
      title: m.title,
      url: m.fileUrl,
      description: m.description || "Downloadable Resource",
      isPublished: m.isPublished,
    })),
  ];

  // Fetch trial quizzes — students only see published ones
  const mockTests = await prisma.mockTest.findMany({
    where: {
      isTrial: true,
      ...(isStaff ? {} : { isPublished: true }),
    },
    include: { questions: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <TrialClient
      initialItems={trialContents}
      initialMockTests={mockTests}
      hasEnrollment={hasEnrollment}
      userRole={role}
    />
  );
}
