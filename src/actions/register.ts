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
  const parentEmail = (formData.get("parentEmail") as string || "").trim().toLowerCase();

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

  // Wrap all parent & child database operations in a single atomic transaction
  const { createdStudentIds, primaryStudentName, activeToken } = await prisma.$transaction(async (tx) => {
    // Find or create Parent User
    let parentUser = await tx.user.findUnique({
      where: { email: parentEmail },
    });

    if (!parentUser) {
      parentUser = await tx.user.create({
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
        parentUser = await tx.user.update({
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

    const studentIds: string[] = [];
    let firstChildName = "";

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const dateOfBirth = new Date(child.dateOfBirth);

      // Check if student with same parentId, name (case-insensitive), and DOB already exists (e.g. from double-click)
      const existingStudent = await tx.user.findFirst({
        where: {
          parentId: parentUser.id,
          name: { equals: child.studentName.trim(), mode: "insensitive" },
          dateOfBirth: dateOfBirth,
          role: "STUDENT",
        },
      });

      if (existingStudent && existingStudent.studentIdStr) {
        studentIds.push(existingStudent.studentIdStr);
      } else {
        // Generate unique Student ID (e.g. initials + DOB like MDC211006)
        const studentId = await generateStudentId(child.studentName, dateOfBirth, tx);
        const virtualEmail = `${studentId.toLowerCase()}@kaputra.local`;

        await tx.user.create({
          data: {
            name: child.studentName.trim(),
            email: virtualEmail,
            passwordHash: "", // Password created during activation
            role: "STUDENT",
            studentIdStr: studentId,
            parentId: parentUser.id,
            isActive: parentUser.isActive,
            dateOfBirth: dateOfBirth,
          },
        });

        studentIds.push(studentId);
      }

      if (i === 0) {
        firstChildName = child.studentName.trim();
      }
    }

    return {
      createdStudentIds: studentIds,
      primaryStudentName: firstChildName,
      activeToken: parentUser.activationToken || token,
    };
  });

  // Trigger activation email asynchronously in the background so HTTP response returns instantly
  const displayStudentName = children.length > 1
    ? `${primaryStudentName} (+${children.length - 1} more)`
    : primaryStudentName;

  void sendParentActivationEmail({
    parentEmail,
    parentName,
    studentName: displayStudentName,
    studentId: createdStudentIds.join(", "),
    token: activeToken,
  }).catch((err) => {
    console.error("[REGISTRATION_EMAIL] Async delivery failed:", err);
  });

  const queryParams = new URLSearchParams({
    success: "true",
    studentId: createdStudentIds.join(","),
    count: String(children.length),
    emailSent: "true",
  });

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

    const newStudent = await prisma.$transaction(async (tx) => {
      // Deduplicate check
      const existingStudent = await tx.user.findFirst({
        where: {
          parentId: parentUser.id,
          name: { equals: studentName, mode: "insensitive" },
          dateOfBirth: dateOfBirth,
          role: "STUDENT",
        },
      });

      if (existingStudent) {
        return existingStudent;
      }

      // Auto-generate unique Student ID
      const studentId = await generateStudentId(studentName, dateOfBirth, tx);
      const virtualEmail = `${studentId.toLowerCase()}@kaputra.local`;

      return await tx.user.create({
        data: {
          name: studentName,
          email: virtualEmail,
          passwordHash: "",
          role: "STUDENT",
          studentIdStr: studentId,
          parentId: parentUser.id,
          isActive: parentUser.isActive,
          dateOfBirth: dateOfBirth,
        },
      });
    });

    // Send notification email asynchronously
    void (async () => {
      try {
        if (!parentUser.isActive && parentUser.activationToken) {
          await sendParentActivationEmail({
            parentEmail: parentUser.email,
            parentName: parentUser.name,
            studentName,
            studentId: newStudent.studentIdStr || newStudent.id,
            token: parentUser.activationToken,
          });
        } else {
          await sendNewChildNotificationEmail({
            parentEmail: parentUser.email,
            parentName: parentUser.name,
            studentName,
            studentId: newStudent.studentIdStr || newStudent.id,
          });
        }
      } catch (emailErr) {
        console.error("Non-critical error sending email to parent for new child:", emailErr);
      }
    })();

    revalidatePath("/parent");
    revalidatePath("/parent/children");

    return {
      success: true,
      message: `Child ${newStudent.name} (${newStudent.studentIdStr}) added successfully!`,
      studentId: newStudent.studentIdStr,
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

      if (parent && parent.role === "PARENT") {
        // Use parent directly — don't fall through to children[0]
        student = Object.assign({}, parent, { parent }) as any;
      } else if (parent && parent.children.length > 0) {
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
