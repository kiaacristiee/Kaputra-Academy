export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const userSession = await getServerSession(authOptions);
    if (!userSession?.user?.id || !["ADMIN", "SUPER_ADMIN", "OWNER"].includes(userSession.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await (prisma as any).liveChatSession.findMany({
      include: {
        user: true,
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
