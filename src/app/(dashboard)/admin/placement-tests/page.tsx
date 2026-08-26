import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import PlacementTestsClient from "./PlacementTestsClient";

import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Placement Tests | Admin Dashboard",
};

export default async function AdminPlacementTestsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !isAdminRole(session.user.role)) {
    redirect("/login");
  }

  // Fetch results
  const results = await prisma.placementTest.findMany({
    include: {
      registration: {
        select: {
          studentName: true,
          studentAge: true,
          parentName: true,
          parentEmail: true,
          parentPhone: true,
          grade: true,
          course: { select: { title: true } },
        } as any,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch config from ContentBlock
  const block = await prisma.contentBlock.findUnique({
    where: { section: "placement_test_config" },
  });

  let config = {
    passingScore: 60,
    questions: [
      {
        id: "q1",
        question: "If a train travels 120 km in 2 hours, what is its average speed in km/h?",
        options: ["50 km/h", "60 km/h", "70 km/h", "80 km/h"],
        correctAnswer: "60 km/h",
      },
      {
        id: "q2",
        question: "Which of the following sentences is grammatically correct?",
        options: [
          "He don't like apples.",
          "She like to read books.",
          "They have went to the store.",
          "We are going to school.",
        ],
        correctAnswer: "We are going to school.",
      },
      {
        id: "q3",
        question: "If all cats are mammals, and all mammals have fur, which of the following is true?",
        options: [
          "All cats have fur.",
          "Some cats do not have fur.",
          "All mammals are cats.",
          "No cats have fur.",
        ],
        correctAnswer: "All cats have fur.",
      },
      {
        id: "q4",
        question: "What is the chemical symbol for water?",
        options: ["CO2", "H2O", "NaCl", "O2"],
        correctAnswer: "H2O",
      },
      {
        id: "q5",
        question: "What is the primary curriculum followed at Kaputra Academy?",
        options: ["Cambridge Curriculum", "Singapore Curriculum", "IB Curriculum", "National Curriculum"],
        correctAnswer: "Singapore Curriculum",
      },
    ],
  };

  if (block) {
    try {
      config = JSON.parse(block.content);
    } catch (e) {
      console.error("Failed to parse placement test config block content", e);
    }
  }

  const formattedResults = (results as any[]).map((r) => ({
    id: r.id,
    studentIdStr: r.studentIdStr,
    testCode: r.testCode,
    status: r.status,
    score: r.score,
    qualificationStatus: r.qualificationStatus,
    submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
    registration: {
      studentName: r.registration.studentName,
      studentAge: r.registration.studentAge,
      parentName: r.registration.parentName,
      parentEmail: r.registration.parentEmail,
      parentPhone: r.registration.parentPhone,
      grade: r.registration.grade || null,
      course: { title: r.registration.course.title },
    },
  }));

  return <PlacementTestsClient results={formattedResults} config={config} />;
}
