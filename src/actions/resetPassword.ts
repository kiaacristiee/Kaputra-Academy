"use server";

import prisma from "@/lib/db";
import { sendUserPasswordResetEmail, sendStudentPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function requestPasswordReset(email: string) {
  try {
    if (!email || !email.includes("@")) {
      return { success: false, error: "Invalid email format" };
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (!user) {
      // Sleep roughly the time it takes to send an email to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return { success: true };
    }

    if (!user.isActive) {
      return { 
        success: false, 
        error: "Your account is currently disabled or pending activation. Please use your activation link or contact support." 
      };
    }

    // Generate secure token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1-hour expiration

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
      console.error("Mailing failure in resetting password:", emailRes.error);
    }

    return { success: true };
  } catch (error: any) {
    console.error("requestPasswordReset Error:", error);
    return { success: false, error: "Something went wrong processing your request." };
  }
}

export async function requestStudentPasswordReset(studentId: string) {
  try {
    if (!studentId || studentId.trim() === "") {
      return { success: false, error: "Invalid Student ID format" };
    }

    console.log(`[Student Password Reset] Attempting lookup for Student ID: ${studentId}`);

    const student = await prisma.user.findFirst({
      where: { 
        studentIdStr: { equals: studentId.trim(), mode: "insensitive" },
        role: "STUDENT" 
      },
      include: { parent: true }
    });

    if (!student) {
      console.warn(`[Student Password Reset] Student ID not found: ${studentId}`);
      // Sleep roughly the time it takes to send an email to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return { success: true }; 
    }

    if (!student.parent || !student.parent.email) {
      console.warn(`[Student Password Reset] Student ${studentId} lacks a linked parent or valid parent email.`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return { success: true };
    }

    if (!student.isActive) {
      console.warn(`[Student Password Reset] Blocked: Student ${studentId} is inactive.`);
      return { 
        success: false, 
        error: "Your student account is inactive or disabled. Please contact support." 
      };
    }

    // Generate secure token explicitly tied to STUDENT
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1-hour expiration

    await prisma.user.update({
      where: { id: student.id },
      data: {
        resetToken,
        resetTokenExpires,
      },
    });

    console.log(`[Student Password Reset] Generated token for Student ID: ${studentId}. Sending to Parent: ${student.parent.email}`);

    // Call the dedicated student email dispatch targeting PARENT email
    const emailRes = await sendStudentPasswordResetEmail({
      parentEmail: student.parent.email,
      parentName: student.parent.name,
      studentName: student.name,
      studentIdStr: student.studentIdStr || studentId,
      token: resetToken
    });
    
    if (!emailRes.success) {
      console.error(`[Student Password Reset] Mailing failure for ${studentId}:`, emailRes.error);
    } else {
      console.log(`[Student Password Reset] Email successfully delivered to Parent: ${student.parent.email} for Student ID: ${studentId}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error(`[Student Password Reset] Critical Error for ${studentId}:`, error);
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
