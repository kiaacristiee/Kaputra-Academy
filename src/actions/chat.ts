"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function findAdminForAutoAssignment(): Promise<string | null> {
  // Find all active Standard Admins
  const standardAdmins = await prisma.user.findMany({
    where: {
      role: "ADMIN",
      isDisabled: false,
    },
    select: { id: true }
  });

  let candidates = standardAdmins;
  if (candidates.length === 0) {
    // Fallback to Super Admins if no standard admins exist
    const superAdmins = await prisma.user.findMany({
      where: {
        role: { in: ["SUPER_ADMIN", "OWNER", "CO_OWNER"] },
        isDisabled: false,
      },
      select: { id: true }
    });
    candidates = superAdmins;
  }

  if (candidates.length === 0) return null;

  // Count active conversations for each candidate admin
  const adminCounts = await Promise.all(
    candidates.map(async (admin) => {
      const count = await (prisma as any).liveChatSession.count({
        where: {
          assignedAdminId: admin.id,
          status: { in: ["OPEN", "IN_PROGRESS", "NEW", "WAITING_REPLY", "REPLIED"] }
        }
      });
      return { id: admin.id, count };
    })
  );

  // Sort by active count ascending (balanced distribution)
  adminCounts.sort((a, b) => a.count - b.count);
  return adminCounts[0].id;
}

export async function createGuestSession(data: { name: string; email: string; phone?: string; initialMessage: string }) {
  try {
    const assignedAdminId = await findAdminForAutoAssignment();
    const now = new Date();

    const session = await (prisma as any).liveChatSession.create({
      data: {
        guestName: data.name,
        guestEmail: data.email,
        guestPhone: data.phone,
        status: "OPEN",
        assignedAdminId: assignedAdminId || null,
        assignedAt: assignedAdminId ? now : null,
        lastReplyAt: now,
        messages: {
          create: {
            senderType: "USER",
            content: data.initialMessage,
          }
        }
      },
      include: {
        messages: true,
        assignedAdmin: {
          select: { id: true, name: true, email: true, role: true }
        }
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

    let session = await (prisma as any).liveChatSession.findFirst({
      where: {
        userId: userSession.user.id,
        status: { in: ["OPEN", "IN_PROGRESS", "NEW", "WAITING_REPLY", "REPLIED"] }
      },
      include: {
        messages: true,
        assignedAdmin: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });

    const now = new Date();

    if (!session) {
      const assignedAdminId = await findAdminForAutoAssignment();

      session = await (prisma as any).liveChatSession.create({
        data: {
          userId: userSession.user.id,
          status: "OPEN",
          assignedAdminId: assignedAdminId || null,
          assignedAt: assignedAdminId ? now : null,
          lastReplyAt: now,
          messages: {
            create: {
              senderType: "USER",
              content: data.initialMessage,
            }
          }
        },
        include: {
          messages: true,
          assignedAdmin: {
            select: { id: true, name: true, email: true, role: true }
          }
        }
      });
    } else {
      await (prisma as any).liveChatMessage.create({
        data: {
          sessionId: session.id,
          senderType: "USER",
          content: data.initialMessage,
        }
      });

      let updatedAssignedId = session.assignedAdminId;
      if (!updatedAssignedId) {
        updatedAssignedId = await findAdminForAutoAssignment();
      }

      session = await (prisma as any).liveChatSession.update({
        where: { id: session.id },
        data: {
          status: session.status === "CLOSED" ? "OPEN" : session.status,
          lastReplyAt: now,
          ...(updatedAssignedId !== session.assignedAdminId && {
            assignedAdminId: updatedAssignedId,
            assignedAt: now,
          })
        },
        include: {
          messages: true,
          assignedAdmin: {
            select: { id: true, name: true, email: true, role: true }
          }
        }
      });
    }

    return { success: true, session };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendChatMessage(sessionId: string, content: string, senderType: "USER" | "ADMIN") {
  try {
    const userSession = await getServerSession(authOptions);
    const now = new Date();

    const currentSession = await (prisma as any).liveChatSession.findUnique({
      where: { id: sessionId },
      select: { id: true, status: true, assignedAdminId: true }
    });

    if (!currentSession) throw new Error("Session not found");

    // Standard Admin RBAC check
    if (senderType === "ADMIN" && userSession?.user?.id) {
      const isSuperAdmin = ["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(userSession.user.role);
      if (!isSuperAdmin && currentSession.assignedAdminId !== userSession.user.id) {
        throw new Error("Unauthorized: You can only reply to conversations assigned to you.");
      }
    }

    const message = await (prisma as any).liveChatMessage.create({
      data: {
        sessionId,
        senderType,
        content
      }
    });

    let newStatus = currentSession.status;
    if (senderType === "ADMIN") {
      newStatus = "IN_PROGRESS";
    } else if (currentSession.status === "CLOSED") {
      newStatus = "OPEN";
    }

    await (prisma as any).liveChatSession.update({
      where: { id: sessionId },
      data: {
        status: newStatus,
        lastReplyAt: now,
        ...(senderType === "ADMIN" && userSession?.user?.id && !currentSession.assignedAdminId && {
          assignedAdminId: userSession.user.id,
          assignedAt: now,
        })
      }
    });

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
        user: true,
        assignedAdmin: {
          select: { id: true, name: true, email: true, role: true }
        }
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
    if (!userSession?.user?.id || !["ADMIN", "SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(userSession.user.role)) {
      throw new Error("Unauthorized");
    }

    const isSuperAdmin = ["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(userSession.user.role);
    const userId = userSession.user.id;

    const whereCondition: any = {};
    if (!isSuperAdmin) {
      // Standard Admins ONLY see conversations assigned to them
      whereCondition.assignedAdminId = userId;
    }

    const sessions = await (prisma as any).liveChatSession.findMany({
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

    return { success: true, sessions };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSessionStatus(sessionId: string, status: string, adminId?: string) {
  try {
    const userSession = await getServerSession(authOptions);
    if (!userSession?.user?.id || !["ADMIN", "SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(userSession.user.role)) {
      throw new Error("Unauthorized");
    }

    const isSuperAdmin = ["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(userSession.user.role);
    const currentSession = await (prisma as any).liveChatSession.findUnique({
      where: { id: sessionId }
    });

    if (!currentSession) throw new Error("Session not found");

    if (!isSuperAdmin && currentSession.assignedAdminId !== userSession.user.id) {
      throw new Error("Unauthorized: You cannot modify a conversation assigned to another admin.");
    }

    const updateData: any = { status };
    if (adminId) {
      updateData.assignedAdminId = adminId;
      if (!currentSession.assignedAt) {
        updateData.assignedAt = new Date();
      }
    }

    const session = await (prisma as any).liveChatSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        assignedAdmin: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });

    revalidatePath("/admin/support");
    return { success: true, session };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reassignSupportSession(sessionId: string, newAdminId: string) {
  try {
    const userSession = await getServerSession(authOptions);
    if (!userSession?.user?.id || !["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(userSession.user.role)) {
      throw new Error("Unauthorized: Only Super Admins can reassign support conversations.");
    }

    const session = await (prisma as any).liveChatSession.update({
      where: { id: sessionId },
      data: {
        assignedAdminId: newAdminId,
        assignedAt: new Date()
      },
      include: {
        assignedAdmin: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });

    revalidatePath("/admin/support");
    return { success: true, session };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAvailableAdminsForSupport() {
  try {
    const userSession = await getServerSession(authOptions);
    if (!userSession?.user?.id || !["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(userSession.user.role)) {
      throw new Error("Unauthorized");
    }

    const admins = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "SUPER_ADMIN", "OWNER", "CO_OWNER"] },
        isDisabled: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" }
    });

    return { success: true, admins };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
