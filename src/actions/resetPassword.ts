"use server";

import prisma from "@/lib/db";
import { sendUserPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function requestPasswordReset(email: string) {
  try {
    if (!email || !email.includes("@")) {
      return { success: false, error: "Invalid email format" };
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // For security reasons, we implicitly return success even if user not found.
    // We don't want attackers to enumerate valid emails.
    if (!user) {
      return { success: true };
    }

    // Generate secure token
    const resetToken = crypto.randomBytes(32).toString("hex");
    // 1-hour expiration
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires,
      },
    });

    // Send physical email
    const emailRes = await sendUserPasswordResetEmail(user.email, user.name, resetToken);
    
    if (!emailRes.success) {
      // Failed to send email, maybe log it but we technically still want to return success 
      // so attackers don't know the state of the email server? 
      // For UX we might want to return an actual message if the mailer is totally broken, 
      // but let's suppress internal errors to the user.
      console.error("Mailing failure in resetting password:", emailRes.error);
    }

    return { success: true };
  } catch (error: any) {
    console.error("requestPasswordReset Error:", error);
    return { success: false, error: "Something went wrong processing your request." };
  }
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  try {
    if (!token || !newPassword) {
      return { success: false, error: "Missing required fields" };
    }

    if (newPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters long." };
    }

    const user = await prisma.user.findUnique({
      where: { resetToken: token },
    });

    if (!user) {
      return { success: false, error: "Invalid or expired reset token." };
    }

    if (!user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      return { success: false, error: "This reset token has expired. Please request a new one." };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("resetPasswordWithToken Error:", error);
    return { success: false, error: "Failed to reset password. Please try again." };
  }
}
