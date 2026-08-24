"use server";

import prisma from "@/lib/db";
import { generateStudentId } from "@/lib/idGenerator";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { sendParentActivationEmail } from "@/lib/email";

export async function submitRegistration(formData: FormData) {
  const studentName = formData.get("studentName") as string;
  const dateOfBirthStr = formData.get("dateOfBirth") as string;
  const parentName = formData.get("parentName") as string;
  const parentPhone = formData.get("parentPhone") as string;
  const parentEmail = formData.get("parentEmail") as string;

  if (!studentName || !dateOfBirthStr || !parentName || !parentPhone || !parentEmail) {
    throw new Error("Missing required fields");
  }

  const dateOfBirth = new Date(dateOfBirthStr);

  // Generate unique Student ID (e.g. initials + DOB like MDC211006)
  const studentId = await generateStudentId(studentName, dateOfBirth);

  // Generate unique student virtual email placeholder
  const virtualEmail = `${studentId.toLowerCase()}@kaputra.local`;

  // Generate single-use secure activation token & expiration (7 days)
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Find or create Parent User
  let parentUser = await prisma.user.findUnique({
    where: { email: parentEmail },
  });

  if (!parentUser) {
    parentUser = await prisma.user.create({
      data: {
        name: parentName,
        email: parentEmail,
        phone: parentPhone,
        passwordHash: "", // Blank password until set
        role: "PARENT",
        isActive: false,
        activationToken: token,
        activationExpires: expires,
      },
    });
  } else {
    // Update existing parent's activation token if not active yet
    if (!parentUser.isActive) {
      parentUser = await prisma.user.update({
        where: { id: parentUser.id },
        data: {
          name: parentName,
          phone: parentPhone,
          activationToken: token,
          activationExpires: expires,
        },
      });
    }
  }

  // Create inactive Student User
  await prisma.user.create({
    data: {
      name: studentName,
      email: virtualEmail,
      passwordHash: "", // Password created during activation
      role: "STUDENT",
      studentIdStr: studentId,
      parentId: parentUser.id,
      isActive: false,
      dateOfBirth: dateOfBirth,
    },
  });

  // Automatically send activation email to parent
  let emailSent = false;
  let emailError = "";
  try {
    const emailRes = await sendParentActivationEmail({
      parentEmail,
      parentName,
      studentName,
      studentId,
      token,
    });
    emailSent = emailRes.success;
    if (!emailRes.success) {
      emailError = emailRes.error || "Email delivery failed";
    }
  } catch (err: any) {
    console.error("Failed to send activation email during registration:", err);
    emailError = err.message || "Email delivery failed";
  }

  const queryParams = new URLSearchParams({
    success: "true",
    studentId,
    emailSent: emailSent ? "true" : "false",
  });
  if (emailError) {
    queryParams.set("emailError", emailError);
  }

  // Redirect to registration page with success query param
  redirect(`/register?${queryParams.toString()}`);
}

export async function resendActivationEmail(identifier: string) {
  try {
    if (!identifier) {
      return { success: false, error: "Student ID or Email is required." };
    }

    const trimmed = identifier.trim();

    // Find student or parent by ID or Email
    let student = await prisma.user.findFirst({
      where: {
        OR: [
          { studentIdStr: trimmed },
          { email: trimmed },
        ],
      },
      include: { parent: true, children: true },
    });

    if (!student) {
      // Check parent email
      const parent = await prisma.user.findUnique({
        where: { email: trimmed },
        include: { children: true },
      });

      if (parent && parent.children.length > 0) {
        student = parent.children[0] as any;
      }
    }

    if (!student) {
      return { success: false, error: "No student or parent record found matching that identifier." };
    }

    const parent = student.parent || (student.role === "PARENT" ? student : null);
    const parentEmail = parent?.email || student.email;
    const parentName = parent?.name || "Parent";
    const studentName = student.name;
    const studentId = student.studentIdStr || student.id;

    if (student.isActive && parent?.isActive) {
      return { success: false, error: "This account is already active. Please log in." };
    }

    // Generate new secure activation token
    const newToken = randomBytes(32).toString("hex");
    const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Invalidate old token & update target user (parent/student) with new token
    const targetUser = parent || student;
    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        activationToken: newToken,
        activationExpires: newExpires,
      },
    });

    const emailRes = await sendParentActivationEmail({
      parentEmail,
      parentName,
      studentName,
      studentId,
      token: newToken,
    });

    if (emailRes.success) {
      return { success: true, message: `Activation email resent to ${parentEmail}.` };
    } else {
      return { success: false, error: emailRes.error || "Failed to resend activation email." };
    }
  } catch (error: any) {
    console.error("Error resending activation email:", error);
    return { success: false, error: error.message || "Failed to resend activation email." };
  }
}
