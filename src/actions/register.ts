"use server";

import prisma from "@/lib/db";
import { generateStudentId } from "@/lib/idGenerator";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { sendParentActivationEmail, sendNewChildNotificationEmail } from "@/lib/email";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function submitRegistration(formData: FormData) {
  const parentName = (formData.get("parentName") as string || "").trim();
  const parentPhone = (formData.get("parentPhone") as string || "").trim();
  const parentEmail = (formData.get("parentEmail") as string || "").trim();

  if (!parentName || !parentPhone || !parentEmail) {
    throw new Error("Missing required parent information");
  }

  // Parse children list (from JSON payload or form arrays)
  let children: { studentName: string; dateOfBirth: string }[] = [];

  const childrenJson = formData.get("childrenJson") as string;
  if (childrenJson) {
    try {
      children = JSON.parse(childrenJson);
    } catch (e) {
      // ignore
    }
  }

  if (!children || children.length === 0) {
    const names = formData.getAll("studentName") as string[];
    const dobs = formData.getAll("dateOfBirth") as string[];
    for (let i = 0; i < names.length; i++) {
      if (names[i] && dobs[i]) {
        children.push({
          studentName: names[i].trim(),
          dateOfBirth: dobs[i].trim(),
        });
      }
    }
  }

  if (!children || children.length === 0) {
    throw new Error("At least one child (Full Name & Date of Birth) is required for registration.");
  }

  // Validate each child
  for (const child of children) {
    if (!child.studentName || !child.dateOfBirth) {
      throw new Error("Each child must have a Full Name and Date of Birth.");
    }
  }

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

  // Create inactive Student User for each child
  const createdStudentIds: string[] = [];
  let primaryStudentName = "";

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const dateOfBirth = new Date(child.dateOfBirth);

    // Generate unique Student ID (e.g. initials + DOB like MDC211006)
    const studentId = await generateStudentId(child.studentName, dateOfBirth);
    const virtualEmail = `${studentId.toLowerCase()}@kaputra.local`;

    await prisma.user.create({
      data: {
        name: child.studentName,
        email: virtualEmail,
        passwordHash: "", // Password created during activation
        role: "STUDENT",
        studentIdStr: studentId,
        parentId: parentUser.id,
        isActive: parentUser.isActive,
        dateOfBirth: dateOfBirth,
      },
    });

    createdStudentIds.push(studentId);
    if (i === 0) {
      primaryStudentName = child.studentName;
    }
  }

  // Automatically send activation email to parent
  let emailSent = false;
  let emailError = "";
  try {
    const displayStudentName = children.length > 1
      ? `${primaryStudentName} (+${children.length - 1} more)`
      : primaryStudentName;

    const emailRes = await sendParentActivationEmail({
      parentEmail,
      parentName,
      studentName: displayStudentName,
      studentId: createdStudentIds.join(", "),
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
    studentId: createdStudentIds.join(","),
    count: String(children.length),
    emailSent: emailSent ? "true" : "false",
  });
  if (emailError) {
    queryParams.set("emailError", emailError);
  }

  // Redirect to registration page with success query param
  redirect(`/register?${queryParams.toString()}`);
}

export async function addChildFromParentDashboard(data: { studentName: string; dateOfBirth: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "PARENT") {
      return { success: false, error: "Unauthorized access. Parent session required." };
    }

    const studentName = (data.studentName || "").trim();
    const dateOfBirthStr = (data.dateOfBirth || "").trim();

    if (!studentName || !dateOfBirthStr) {
      return { success: false, error: "Full Name and Date of Birth are required." };
    }

    const authenticatedParentId = session.user.id;
    const parentUser = await prisma.user.findUnique({
      where: { id: authenticatedParentId },
    });

    if (!parentUser) {
      return { success: false, error: "Parent account not found." };
    }

    const dateOfBirth = new Date(dateOfBirthStr);

    // Auto-generate unique Student ID
    const studentId = await generateStudentId(studentName, dateOfBirth);
    const virtualEmail = `${studentId.toLowerCase()}@kaputra.local`;

    // Create student linked directly to authenticated parent
    const newStudent = await prisma.user.create({
      data: {
        name: studentName,
        email: virtualEmail,
        passwordHash: "",
        role: "STUDENT",
        studentIdStr: studentId,
        parentId: parentUser.id, // Strictly server-side binding
        isActive: parentUser.isActive, // Inherit active state if parent is active
        dateOfBirth: dateOfBirth,
      },
    });

    // Automatically send notification/activation email to parent
    try {
      if (!parentUser.isActive && parentUser.activationToken) {
        await sendParentActivationEmail({
          parentEmail: parentUser.email,
          parentName: parentUser.name,
          studentName,
          studentId,
          token: parentUser.activationToken,
        });
      } else {
        await sendNewChildNotificationEmail({
          parentEmail: parentUser.email,
          parentName: parentUser.name,
          studentName,
          studentId,
        });
      }
    } catch (emailErr) {
      console.error("Non-critical error sending email to parent for new child:", emailErr);
    }

    revalidatePath("/parent");
    revalidatePath("/parent/children");

    return {
      success: true,
      message: `Child ${newStudent.name} (${studentId}) added successfully!`,
      studentId,
    };
  } catch (error: any) {
    console.error("Error adding child from parent dashboard:", error);
    return { success: false, error: error.message || "Failed to add child." };
  }
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
