"use server";

import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getInteractiveQuizzes(videoId: string) {
  try {
    const quizzes = await prisma.interactiveVideoQuiz.findMany({
      where: { videoId },
      orderBy: { timestamp: "asc" },
    });
    return { success: true, quizzes };
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return { success: false, error: "Failed to fetch quizzes" };
  }
}

export async function createInteractiveQuiz(data: {
  videoId: string;
  timestamp: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation?: string;
  requireCorrect: boolean;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
      return { success: false, error: "Unauthorized" };
    }

    const quiz = await prisma.interactiveVideoQuiz.create({
      data,
    });
    return { success: true, quiz };
  } catch (error) {
    console.error("Error creating quiz:", error);
    return { success: false, error: "Failed to create quiz" };
  }
}

export async function updateInteractiveQuiz(id: string, data: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
      return { success: false, error: "Unauthorized" };
    }

    const quiz = await prisma.interactiveVideoQuiz.update({
      where: { id },
      data,
    });
    return { success: true, quiz };
  } catch (error) {
    console.error("Error updating quiz:", error);
    return { success: false, error: "Failed to update quiz" };
  }
}

export async function deleteInteractiveQuiz(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.interactiveVideoQuiz.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting quiz:", error);
    return { success: false, error: "Failed to delete quiz" };
  }
}
