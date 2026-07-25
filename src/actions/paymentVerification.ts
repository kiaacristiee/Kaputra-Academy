"use server";

import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generatePlacementTestCode } from "@/lib/idGenerator";
import { revalidatePath } from "next/cache";

export async function approvePayment(invoiceId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { student: true },
  });

  if (!invoice) throw new Error("Invoice not found");

  // 1. Update Invoice
  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "PAID",
      paidAt: new Date(),
    },
  });

  // 2. Create Verification Record
  await prisma.paymentVerification.create({
    data: {
      invoiceId,
      approvedById: session.user.id as string,
      status: "APPROVED",
      verifiedAt: new Date(),
    },
  });

  // 3. Handle Placement Test vs Class Tuition Invoice
  if (invoice.itemType === "PLACEMENT_TEST") {
    // Find corresponding Registration
    const registration = await prisma.registration.findFirst({
      where: {
        studentId: invoice.studentId,
        courseId: invoice.itemId,
        status: { in: ["PENDING_PT_PAYMENT", "VERIFYING_PT_PAYMENT"] },
      },
    });

    if (registration) {
      const testCode = await generatePlacementTestCode();

      // Create Placement Test
      await prisma.placementTest.create({
        data: {
          registrationId: registration.id,
          studentIdStr: invoice.student.studentIdStr || `STU-${invoice.studentId.substring(0, 8)}`,
          testCode: testCode,
          status: "NOT_STARTED",
        },
      });

      // Update Registration status
      await prisma.registration.update({
        where: { id: registration.id },
        data: { status: "PT_ELIGIBLE" },
      });

      // Send activation link email to the parent
      const studentIdStr = invoice.student.studentIdStr || `STU-${invoice.studentId.substring(0, 8)}`;
      const activationLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/activate?studentId=${studentIdStr}`;
      const { sendActivationEmail } = await import("@/lib/email");
      await sendActivationEmail({
        parentEmail: registration.parentEmail,
        parentName: registration.parentName,
        studentName: registration.studentName,
        studentId: studentIdStr,
        activationLink,
      });
    }
  } else if (invoice.itemType === "CLASS") {
    // Find corresponding Registration
    const registration = await prisma.registration.findFirst({
      where: {
        studentId: invoice.studentId,
        courseId: invoice.itemId,
        status: { not: "APPROVED" },
      },
      include: { course: true },
    });

    if (registration) {
      // If registration has a private schedule slot, assign it to the student
      if (registration.scheduleId) {
        await prisma.schedule.update({
          where: { id: registration.scheduleId },
          data: {
            studentId: registration.studentId,
            courseId: registration.courseId,
            isAvailable: false,
          },
        });
      }

      // Update Registration status to APPROVED
      await prisma.registration.update({
        where: { id: registration.id },
        data: { status: "APPROVED" },
      });

      // Send Enrollment Confirmation Email
      const { sendEnrollmentConfirmationEmail } = await import("@/lib/email");
      await sendEnrollmentConfirmationEmail({
        parentEmail: registration.parentEmail,
        studentName: registration.studentName,
        courseTitle: registration.course.title,
      });
    }

    // Create Enrollment automatically
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: invoice.studentId,
        itemId: invoice.itemId,
      },
    });

    if (existingEnrollment) {
      await prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: { status: "ACTIVE" },
      });
    } else {
      await prisma.enrollment.create({
        data: {
          studentId: invoice.studentId,
          itemId: invoice.itemId,
          itemType: invoice.itemType,
          status: "ACTIVE",
        },
      });
    }
  } else if (invoice.itemType === "CAMP") {
    const campReg = await prisma.campRegistration.findFirst({
      where: {
        studentId: invoice.studentId,
        campProgramId: invoice.itemId,
        status: { not: "APPROVED" },
      },
      include: { campProgram: true },
    });

    if (campReg) {
      await prisma.campRegistration.update({
        where: { id: campReg.id },
        data: { status: "APPROVED" },
      });

      try {
        const { sendCampEnrollmentConfirmationEmail } = await import("@/lib/email");
        await sendCampEnrollmentConfirmationEmail({
          parentEmail: campReg.parentEmail,
          studentName: campReg.studentName,
          campName: campReg.campProgram.name,
        });
      } catch (emailErr) {
        console.error("Failed to send camp enrollment confirmation email:", emailErr);
      }
    }

    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: invoice.studentId,
        itemId: invoice.itemId,
        itemType: "CAMP",
      },
    });

    if (existingEnrollment) {
      await prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: { status: "ACTIVE" },
      });
    } else {
      await prisma.enrollment.create({
        data: {
          studentId: invoice.studentId,
          itemId: invoice.itemId,
          itemType: "CAMP",
          status: "ACTIVE",
        },
      });
    }
  }

  revalidatePath("/admin/payments");
  revalidatePath("/student/invoices");
  revalidatePath("/parent/invoices");

  return { success: true };
}

export async function rejectPayment(invoiceId: string, reason: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // 1. Update Invoice
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "REJECTED",
    },
  });

  // 2. Create Verification Record
  await prisma.paymentVerification.create({
    data: {
      invoiceId,
      approvedById: session.user.id as string,
      status: "REJECTED",
      rejectionReason: reason,
      verifiedAt: new Date(),
    },
  });

  revalidatePath("/admin/payments");
  revalidatePath("/student/invoices");
  revalidatePath("/parent/invoices");

  return { success: true };
}
