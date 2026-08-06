"use server";

import prisma from "@/lib/db";
import { generatePlacementTestCode } from "@/lib/idGenerator";
import { sendEnrollmentConfirmationEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageEnrollment } from "@/lib/permissions";

export async function approveRegistration(registrationId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) {
      throw new Error("Unauthorized access");
    }

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { course: true, payment: true },
    });

    if (!registration) {
      throw new Error("Registration not found");
    }

    const learningMethod = registration.learningMethod || "SEMI_PRIVATE";
    if (!canManageEnrollment(session.user.role, learningMethod)) {
      throw new Error("This action requires super admin access for Private class enrollments");
    }

    // Find Student User
    const parentUser = await prisma.user.findUnique({
      where: { email: registration.parentEmail },
    });

    const studentUser = parentUser
      ? await prisma.user.findFirst({
          where: { parentId: parentUser.id, name: registration.studentName },
        })
      : null;

    if (!studentUser) {
      throw new Error("Student account associated with this registration not found");
    }

    const studentIdStr = studentUser.studentIdStr || "STUDENT_ID";

    if (registration.status === "VERIFYING_PT_PAYMENT") {
      // 1. Placement Test Fee Paid -> Unlock Test
      const testCode = await generatePlacementTestCode();

      // Create Placement Test
      await prisma.placementTest.create({
        data: {
          registrationId: registration.id,
          studentIdStr: studentIdStr,
          testCode: testCode,
          status: "NOT_STARTED",
        },
      });

      // Update payment and registration status
      if (registration.payment) {
        await prisma.payment.update({
          where: { id: registration.payment.id },
          data: { status: "APPROVED" },
        });
      }

      await prisma.registration.update({
        where: { id: registration.id },
        data: { status: "PT_ELIGIBLE" },
      });

      // Send activation link email to the parent
      const activationLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/activate?studentId=${studentIdStr}`;
      const { sendActivationEmail } = await import("@/lib/email");
      await sendActivationEmail({
        parentEmail: registration.parentEmail,
        parentName: registration.parentName,
        studentName: registration.studentName,
        studentId: studentIdStr,
        activationLink,
        testCode,
        learningMethod,
      });

      revalidatePath("/admin");
      return { success: true, isPlacementTest: true, studentId: studentIdStr, testCode };
    } 
    
    if (registration.status === "VERIFYING_ENROLLMENT_PAYMENT" || registration.status === "VERIFYING") {
      // 2. Course Fee Paid -> Confirm Enrollment
      if (registration.payment) {
        await prisma.payment.update({
          where: { id: registration.payment.id },
          data: { status: "APPROVED" },
        });
      }

      // If registration has a private schedule slot, assign it to the student
      if (registration.scheduleId) {
        await prisma.schedule.update({
          where: { id: registration.scheduleId },
          data: {
            studentId: studentUser.id,
            courseId: registration.courseId,
            isAvailable: false,
          },
        });
      }

      await prisma.registration.update({
        where: { id: registration.id },
        data: { status: "APPROVED" },
      });

      // Create Active Enrollment
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: studentUser.id,
          itemId: registration.courseId,
        }
      });

      if (existingEnrollment) {
        await prisma.enrollment.update({
          where: { id: existingEnrollment.id },
          data: { status: "ACTIVE" }
        });
      } else {
        await prisma.enrollment.create({
          data: {
            studentId: studentUser.id,
            itemId: registration.courseId,
            itemType: "CLASS",
            status: "ACTIVE",
          },
        });
      }

      // Send Enrollment Confirmation Email
      await sendEnrollmentConfirmationEmail({
        parentEmail: registration.parentEmail,
        studentName: registration.studentName,
        courseTitle: registration.course.title,
        learningMethod,
      });

      revalidatePath("/admin");
      return { success: true, isPlacementTest: false, studentId: studentIdStr };
    }

    throw new Error("Registration is not in a verifying state");
  } catch (error: any) {
    console.error("Failed to approve registration:", error);
    return { success: false, error: error.message };
  }
}

export async function rejectRegistration(registrationId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) {
      throw new Error("Unauthorized access");
    }

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { course: true, payment: true },
    });

    if (!registration) {
      throw new Error("Registration not found");
    }

    const learningMethod = registration.learningMethod || "SEMI_PRIVATE";
    if (!canManageEnrollment(session.user.role, learningMethod)) {
      throw new Error("This action requires super admin access for Private class enrollments");
    }

    if (registration?.payment) {
      await prisma.payment.update({
        where: { id: registration.payment.id },
        data: { status: "REJECTED" },
      });
    }

    await prisma.registration.update({
      where: { id: registrationId },
      data: { status: "REJECTED" },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to reject registration:", error);
    return { success: false, error: error.message };
  }
}

