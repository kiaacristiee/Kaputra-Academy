"use server";

import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createVaCharge, MidtransBank } from "@/lib/midtrans";
import { generatePlacementTestCode } from "@/lib/idGenerator";
import {
  sendActivationEmail,
  sendEnrollmentConfirmationEmail,
  sendCampEnrollmentConfirmationEmail,
} from "@/lib/email";

export async function generateVirtualAccount(invoiceId: string, bank: MidtransBank) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        student: {
          include: { parent: true },
        },
      },
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found." };
    }

    if (invoice.status === "PAID") {
      return { success: false, error: "This invoice has already been paid." };
    }

    // Check authorization: must be student owner, parent owner, or admin
    if (session.user.role === "STUDENT" && session.user.id !== invoice.studentId) {
      return { success: false, error: "Unauthorized access to invoice." };
    }
    if (session.user.role === "PARENT") {
      const isParent = invoice.student.parentId === session.user.id;
      if (!isParent && session.user.id !== invoice.studentId) {
        return { success: false, error: "Unauthorized access to child invoice." };
      }
    }

    // Construct unique order ID for Midtrans
    const timestampSuffix = Date.now().toString().slice(-6);
    const orderId = `${invoice.invoiceNumber}-${bank.toUpperCase()}-${timestampSuffix}`;

    const customerName = invoice.student.name || "Student";
    const customerEmail = invoice.student.parent?.email || invoice.student.email || "parent@kaputra.com";
    const customerPhone = invoice.student.parent?.phone || invoice.student.phone || undefined;

    // Call Midtrans Core API
    const chargeResult = await createVaCharge({
      orderId,
      amount: invoice.amount,
      bank,
      customerName,
      customerEmail,
      customerPhone,
      itemTitle: invoice.itemId,
    });

    if (!chargeResult.success || !chargeResult.vaNumber) {
      return {
        success: false,
        error: chargeResult.error || "Failed to generate Virtual Account with bank",
      };
    }

    // Save Midtrans VA info to database
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        orderId: chargeResult.orderId,
        transactionId: chargeResult.transactionId,
        bank: chargeResult.bank,
        virtualAccountNumber: chargeResult.vaNumber,
        expiryTime: chargeResult.expiryTime,
        dueDate: chargeResult.expiryTime,
        status: "PENDING",
      },
    });

    // Also sync payment record if linked via registration
    let registrationId: string | null = null;
    if (invoice.itemType === "CAMP") {
      const campReg = await prisma.campRegistration.findFirst({
        where: { studentId: invoice.studentId, campProgramId: invoice.itemId },
      });
      if (campReg) registrationId = campReg.id;
    } else {
      const reg = await prisma.registration.findFirst({
        where: { studentId: invoice.studentId, courseId: invoice.itemId },
      });
      if (reg) registrationId = reg.id;
    }

    if (registrationId) {
      const existingPayment = await prisma.payment.findUnique({
        where: { registrationId },
      });
      if (existingPayment) {
        await prisma.payment.update({
          where: { registrationId },
          data: {
            bank: chargeResult.bank,
            virtualAccountNumber: chargeResult.vaNumber,
            transactionId: chargeResult.transactionId,
            expiryTime: chargeResult.expiryTime,
            paymentMethod: `${bank.toUpperCase()} Virtual Account`,
          },
        });
      }
    }

    revalidatePath("/student/invoices");
    revalidatePath(`/student/invoices/${invoiceId}`);
    revalidatePath("/parent/invoices");
    revalidatePath(`/parent/invoices/${invoiceId}`);
    revalidatePath("/admin/payments");

    return {
      success: true,
      invoice: JSON.parse(JSON.stringify(updatedInvoice)),
    };
  } catch (error: any) {
    console.error("Failed to generate Virtual Account:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Executes full transactional fulfillment when an Invoice payment is confirmed (paid)
 * Used by both Midtrans Webhook and Admin Manual Approvals.
 */
export async function fulfillInvoicePayment(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { student: { include: { parent: true } } },
  });

  if (!invoice) {
    throw new Error(`Invoice with ID ${invoiceId} not found.`);
  }

  // Idempotency check: if already paid, return early
  if (invoice.status === "PAID") {
    console.log(`[PAYMENT FULFILLMENT] Invoice ${invoice.invoiceNumber} is already marked as PAID.`);
    return { success: true, invoice, alreadyPaid: true };
  }

  const now = new Date();

  // 1. Transactionally update Invoice status to PAID
  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "PAID",
      paidAt: now,
    },
  });

  // 2. Handle Placement Test vs Class Tuition vs Camp Program
  if (invoice.itemType === "PLACEMENT_TEST") {
    const registration = await prisma.registration.findFirst({
      where: {
        studentId: invoice.studentId,
        courseId: invoice.itemId,
        status: { in: ["PENDING_PT_PAYMENT", "VERIFYING_PT_PAYMENT", "PENDING_PAYMENT"] },
      },
    });

    if (registration) {
      const testCode = await generatePlacementTestCode();

      // Create Placement Test record if not exists
      const existingPt = await prisma.placementTest.findUnique({
        where: { registrationId: registration.id },
      });

      if (!existingPt) {
        await prisma.placementTest.create({
          data: {
            registrationId: registration.id,
            studentIdStr: invoice.student.studentIdStr || `STU-${invoice.studentId.substring(0, 8)}`,
            testCode: testCode,
            status: "NOT_STARTED",
          },
        });
      }

      // Update Registration status to PT_ELIGIBLE
      await prisma.registration.update({
        where: { id: registration.id },
        data: { status: "PT_ELIGIBLE" },
      });

      // Update Payment record status
      const existingPayment = await prisma.payment.findUnique({
        where: { registrationId: registration.id },
      });
      if (existingPayment) {
        await prisma.payment.update({
          where: { registrationId: registration.id },
          data: { status: "PAID", verifiedAt: now },
        });
      }

      // Trigger activation link / notification email to parent
      try {
        const studentIdStr = invoice.student.studentIdStr || `STU-${invoice.studentId.substring(0, 8)}`;
        const activationLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/activate?studentId=${studentIdStr}`;
        // Use existing PT's code if it was already created, otherwise use the newly generated one
        const finalTestCode = existingPt ? existingPt.testCode : testCode;
        await sendActivationEmail({
          parentEmail: registration.parentEmail,
          parentName: registration.parentName,
          studentName: registration.studentName,
          studentId: studentIdStr,
          activationLink,
          testCode: finalTestCode,
        });
      } catch (emailErr) {
        console.error("[EMAIL ERROR] Failed to send PT activation email:", emailErr);
      }
    }
  } else if (invoice.itemType === "CLASS") {
    const registration = await prisma.registration.findFirst({
      where: {
        studentId: invoice.studentId,
        courseId: invoice.itemId,
        status: { not: "APPROVED" },
      },
      include: { course: true },
    });

    if (registration) {
      // Assign private schedule slot if selected
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

      // Update Payment record status
      const existingPayment = await prisma.payment.findUnique({
        where: { registrationId: registration.id },
      });
      if (existingPayment) {
        await prisma.payment.update({
          where: { registrationId: registration.id },
          data: { status: "PAID", verifiedAt: now },
        });
      }

      // Fetch schedule if assigned
      let scheduleDetails: string | undefined = undefined;
      if (registration.scheduleId) {
        const sched = await prisma.schedule.findUnique({
          where: { id: registration.scheduleId },
        });
        if (sched) {
          scheduleDetails = `${sched.dayOfWeek} (${sched.startTime} - ${sched.endTime})`;
        }
      }

      const bankName = (invoice as any).bank ? `${(invoice as any).bank.toUpperCase()} Virtual Account` : "Midtrans Virtual Account";

      // Send Rich Enrollment Confirmation Email
      try {
        await sendEnrollmentConfirmationEmail({
          parentEmail: registration.parentEmail,
          parentName: registration.parentName,
          studentName: registration.studentName,
          invoiceNumber: invoice.invoiceNumber,
          paymentDate: now,
          paymentStatus: "PAID",
          paymentMethod: bankName,
          totalPaid: invoice.amount,
          programType: "Class",
          programName: registration.course.title,
          category: registration.course.type === "COMPETITION" ? "Competition Class" : "Regular Class",
          duration: (registration.course as any).duration || undefined,
          scheduleDetails,
          location: "Kaputra Academy Online Campus (Zoom)",
        });
      } catch (emailErr) {
        console.error("[EMAIL ERROR] Failed to send class enrollment email:", emailErr);
      }
    }

    // Auto-create/activate Enrollment
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

      const bankName = (invoice as any).bank ? `${(invoice as any).bank.toUpperCase()} Virtual Account` : "Midtrans Virtual Account";
      const startDate = campReg.campProgram.startDate
        ? new Date(campReg.campProgram.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
        : undefined;
      const endDate = campReg.campProgram.endDate
        ? new Date(campReg.campProgram.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
        : undefined;

      try {
        await sendCampEnrollmentConfirmationEmail({
          parentEmail: campReg.parentEmail,
          parentName: campReg.parentName,
          studentName: campReg.studentName,
          invoiceNumber: invoice.invoiceNumber,
          paymentDate: now,
          paymentStatus: "PAID",
          paymentMethod: bankName,
          totalPaid: invoice.amount,
          programType: "Camp Program",
          programName: campReg.campProgram.name,
          category: "Camp Program",
          startDate,
          endDate,
          location: "Kaputra Academy Camp Headquarters",
        });
      } catch (emailErr) {
        console.error("[EMAIL ERROR] Failed to send camp enrollment email:", emailErr);
      }
    }

    // Auto-create/activate Camp Enrollment
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
  revalidatePath("/student");
  revalidatePath("/parent");

  return { success: true, invoice: updatedInvoice };
}
