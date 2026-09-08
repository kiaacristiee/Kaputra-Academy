import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !["TEACHER", "ADMIN", "SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const folderId = searchParams.get("folderId");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (folderId === "unfiled") {
      whereClause.folderId = null;
    } else if (folderId && folderId !== "all") {
      whereClause.folderId = folderId;
    }

    if (search.trim()) {
      whereClause.questionText = {
        contains: search.trim(),
        mode: "insensitive",
      };
    }

    const [questions, totalCount] = await Promise.all([
      prisma.mockQuestion.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.mockQuestion.count({
        where: whereClause,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      questions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });

  } catch (error: any) {
    console.error("Error fetching question bank:", error);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}
