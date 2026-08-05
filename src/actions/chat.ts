"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function createGuestSession(data: { name: string; email: string; phone?: string; initialMessage: string }) {
  try {
    const session = await (prisma as any).liveChatSession.create({
      data: {
        guestName: data.name,
        guestEmail: data.email,
        guestPhone: data.phone,
        status: "NEW",
        messages: {
          create: {
            senderType: "USER",
            content: data.initialMessage,
          }
        }
      },
      include: {
        messages: true
      }
    });
    return { success: true, session };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createAuthSession(data: { initialMessage: string }) {
  try {
    const userSession = await getServerSession(authOptions);
    if (!userSession?.user?.id) throw new Error("Not logged in");

    // Check if an active session already exists for this user, if not create new
    let session = await (prisma as any).liveChatSession.findFirst({
      where: {
        userId: userSession.user.id,
        status: { in: ["NEW", "WAITING_REPLY", "REPLIED"] }
      },
      include: {
        messages: true
      }
    });

    if (!session) {
      session = await (prisma as any).liveChatSession.create({
        data: {
          userId: userSession.user.id,
          status: "NEW",
          messages: {
            create: {
              senderType: "USER",
              content: data.initialMessage,
            }
          }
        },
        include: { messages: true }
      });
    } else {
      await (prisma as any).liveChatMessage.create({
        data: {
          sessionId: session.id,
          senderType: "USER",
          content: data.initialMessage,
        }
      });
      session = await (prisma as any).liveChatSession.update({
        where: { id: session.id },
        data: { status: "NEW" },
        include: { messages: true }
      });
    }

    return { success: true, session };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendChatMessage(sessionId: string, content: string, senderType: "USER" | "ADMIN") {
  try {
    const message = await (prisma as any).liveChatMessage.create({
      data: {
        sessionId,
        senderType,
        content
      }
    });

    if (senderType === "USER") {
      await (prisma as any).liveChatSession.update({
        where: { id: sessionId },
        data: { status: "WAITING_REPLY" }
      });
    } else {
      await (prisma as any).liveChatSession.update({
        where: { id: sessionId },
        data: { status: "REPLIED" }
      });
    }

    return { success: true, message };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSessionMessages(sessionId: string) {
  try {
    const session = await (prisma as any).liveChatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" }
        },
        user: true
      }
    });
    return { success: true, session };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getActiveUserSession() {
  try {
    const userSession = await getServerSession(authOptions);
    if (!userSession?.user?.id) return { success: true, session: null };

    const session = await (prisma as any).liveChatSession.findFirst({
      where: {
        userId: userSession.user.id,
        status: { not: "CLOSED" }
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    return { success: true, session };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAdminChatSessions() {
  try {
    const userSession = await getServerSession(authOptions);
    if (!userSession?.user?.id || !["ADMIN", "SUPER_ADMIN", "OWNER"].includes(userSession.user.role)) {
      throw new Error("Unauthorized");
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

    return { success: true, sessions };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSessionStatus(sessionId: string, status: string, adminId?: string) {
  try {
    const userSession = await getServerSession(authOptions);
    if (!userSession?.user?.id || !["ADMIN", "SUPER_ADMIN", "OWNER"].includes(userSession.user.role)) {
      throw new Error("Unauthorized");
    }

    const session = await (prisma as any).liveChatSession.update({
      where: { id: sessionId },
      data: {
        status,
        ...(adminId && { assignedAdminId: adminId })
      }
    });

    revalidatePath("/admin/support");
    return { success: true, session };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
