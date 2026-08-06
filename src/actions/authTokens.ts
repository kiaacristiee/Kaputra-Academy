"use server";

import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

export async function activateAdminAccount(token: string, password: string) {
  try {
    if (!token || !password) {
      return { success: false, error: "Token and password are required." };
    }

    if (password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters long." };
    }

    const trimmedToken = token.trim();

    console.log("[ACTIVATION] Token received from URL:", trimmedToken);
    console.log("[ACTIVATION] Token length:", trimmedToken.length);

    // Use findFirst instead of findUnique to avoid potential Prisma unique constraint lookup issues
    const user = await prisma.user.findFirst({
      where: { activationToken: trimmedToken },
    });

    console.log("[ACTIVATION] Database lookup result:", user ? `Found user: ${user.email} (role: ${user.role})` : "No user found");

    if (!user) {
      // Additional debug: check if ANY user has a non-null activationToken
      const usersWithTokens = await prisma.user.findMany({
        where: { activationToken: { not: null } },
        select: { id: true, email: true, activationToken: true, activationExpires: true },
      });
      console.log("[ACTIVATION] Users with active tokens:", JSON.stringify(usersWithTokens.map(u => ({
        email: u.email,
        tokenPrefix: u.activationToken?.substring(0, 8) + "...",
        tokenLength: u.activationToken?.length,
        expires: u.activationExpires,
      }))));

      return { success: false, error: "Invalid activation token. Please request a new activation link." };
    }

    // Check if token was already used (account already active)
    if (user.isActive && !user.activationToken) {
      return { success: false, error: "This activation link has already been used. Your account is already active." };
    }

    // Check expiration
    if (user.activationExpires && new Date() > user.activationExpires) {
      console.log("[ACTIVATION] Token expired. Expires:", user.activationExpires, "Now:", new Date());
      return { success: false, error: "Activation token has expired. Please request a new activation link from your Super Admin." };
    }

    console.log("[ACTIVATION] Token valid. Activating account for:", user.email);

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        isActive: true,
        acceptedTerms: true,
        activationToken: null,
        activationExpires: null,
      },
    });

    console.log("[ACTIVATION] Account activated successfully for:", user.email);

    return { success: true };
  } catch (error: any) {
    console.error("[ACTIVATION] Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}
