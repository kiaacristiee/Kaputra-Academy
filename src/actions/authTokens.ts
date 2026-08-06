"use server";

import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

export async function activateAdminAccount(token: string, password: string) {
  try {
    if (!token || !password) {
      throw new Error("Token and password are required.");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }

    // Find the user with this token
    const user = await prisma.user.findUnique({
      where: { activationToken: token },
    });

    if (!user) {
      throw new Error("Invalid activation token.");
    }

    if (user.activationExpires && new Date() > user.activationExpires) {
      throw new Error("Activation token has expired.");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        isActive: true,
        activationToken: null,
        activationExpires: null,
      },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
