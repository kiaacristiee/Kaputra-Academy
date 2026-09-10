import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["TEACHER", "ADMIN", "SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const test = await prisma.mockTest.findUnique({
      where: { id: params.id },
      include: {
        // Full question data including both images - only loaded when a paper is opened
        questions: {
          select: {
            id: true,
            questionText: true,
            options: true,
            correctAnswer: true,
            explanation: true,
            explanationImageUrl: true,  // explanation image - fully preserved
            imageUrl: true,             // question image - fully preserved
            topic: true,
            difficulty: true,
            folderId: true,
            acceptedAnswers: true,
            allowAnyOrder: true,
          }
        },
        submissions: {
          take: 30,
          orderBy: { submittedAt: "desc" },
          select: {
            id: true,
            score: true,
            isPassed: true,
            answers: true,
            timeSpent: true,
            submittedAt: true,
            student: {
              select: { id: true, name: true, studentIdStr: true },
            },
          },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Mock paper not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, test });
  } catch (error: any) {
    console.error("Error fetching mock test details:", error);
    return NextResponse.json({ error: "Failed to fetch paper details" }, { status: 500 });
  }
}
