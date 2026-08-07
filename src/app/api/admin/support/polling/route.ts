export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const userSession = await getServerSession(authOptions);
    if (!userSession?.user?.id || !["ADMIN", "SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(userSession.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = ["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(userSession.user.role);
    const userId = userSession.user.id;

    const whereCondition: any = {};
    if (!isSuperAdmin) {
      // Standard Admin only sees conversations assigned to them
      whereCondition.assignedAdminId = userId;
    }

    const sessions = await prisma.liveChatSession.findMany({
      where: whereCondition,
      include: {
        user: true,
        assignedAdmin: {
          select: { id: true, name: true, email: true, role: true }
        },
        messages: {
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
