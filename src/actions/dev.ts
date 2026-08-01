"use server";

import prisma from "@/lib/db";

export async function getDevUsers() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Unauthorized action. Available only in development mode.");
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      where: {
        isActive: true
      },
      orderBy: {
        name: "asc",
      },
    });

    return { success: true, users };
  } catch (error: any) {
    console.error("[DEV USERS ERROR]", error);
    return { success: false, error: error.message };
  }
}
