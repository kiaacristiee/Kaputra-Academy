"use server";

import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getAvailableCourses(studentId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    if (session.user.role === "PARENT") {
      const child = await prisma.user.findFirst({
        where: { id: studentId, parentId: session.user.id },
      });
      if (!child) {
        return { success: false, error: "Unauthorized access to child data" };
      }
    } else if (session.user.role === "STUDENT") {
      if (session.user.id !== studentId) {
        return { success: false, error: "Unauthorized access" };
      }
    } else if (session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized role" };
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, status: "ACTIVE" },
      select: { itemId: true },
    });
    const enrolledCourseIds = enrollments.map((e) => e.itemId);

    const invoices = await prisma.invoice.findMany({
      where: {
        studentId,
        itemType: { in: ["CLASS", "PLACEMENT_TEST"] },
        status: { in: ["PENDING", "WAITING_VERIFICATION", "PAID"] },
      },
      select: { itemId: true },
    });
    const invoicedCourseIds = invoices.map((i) => i.itemId);

    const registrations = await prisma.registration.findMany({
      where: {
        studentId,
        status: { in: ["PENDING_PAYMENT", "PENDING_PT_PAYMENT", "VERIFYING_PT_PAYMENT", "PT_ELIGIBLE", "QUALIFIED", "NOT_QUALIFIED", "VERIFYING_ENROLLMENT_PAYMENT"] },
      },
      select: { courseId: true },
    });
    const registeredCourseIds = registrations.map((r) => r.courseId);

    const excludedIds = Array.from(new Set([...enrolledCourseIds, ...invoicedCourseIds, ...registeredCourseIds]));

    const availableCourses = await prisma.course.findMany({
      where: {
        isPublished: true,
        id: { notIn: excludedIds },
      },
      include: {
        category: true,
        teachers: {
          include: {
            teacher: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, courses: availableCourses };
  } catch (error: any) {
    console.error("Failed to fetch available courses:", error);
    return { success: false, error: error.message };
  }
}

export async function getAvailablePrivateSchedules() {
  try {
    const schedules = await prisma.schedule.findMany({
      where: {
        type: "PRIVATE",
        isAvailable: true,
        studentId: null,
      },
      include: {
        teacher: { select: { name: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return { success: true, schedules };
  } catch (error: any) {
    console.error("Failed to fetch available private schedules:", error);
    return { success: false, error: error.message };
  }
}

export async function enrollInClass(
  studentId: string,
  courseId: string,
  learningMethod: string,
  scheduleId?: string,
  sessionsPerWeek?: number
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify user accepted terms
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { acceptedTerms: true },
    });
    if (dbUser && !dbUser.acceptedTerms) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { acceptedTerms: true },
      });
    }

    // Auth verification
    if (session.user.role === "PARENT") {
      const child = await prisma.user.findFirst({
        where: { id: studentId, parentId: session.user.id },
      });
      if (!child) {
        return { success: false, error: "Unauthorized access to child data" };
      }
    } else if (session.user.role === "STUDENT") {
      if (session.user.id !== studentId) {
        return { success: false, error: "Unauthorized access" };
      }
    } else if (session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized role" };
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return { success: false, error: "Course not found." };

    const existingEnrollment = await prisma.enrollment.findFirst({
      where: { studentId, itemId: courseId, status: "ACTIVE" },
    });
    if (existingEnrollment) {
      return { success: false, error: "Already enrolled in this course." };
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        studentId,
        itemId: courseId,
        status: { in: ["PENDING", "WAITING_VERIFICATION", "PAID"] },
      },
    });
    if (existingInvoice) {
      return { success: false, error: "An invoice already exists for this course." };
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { parent: true },
    });
    if (!student) return { success: false, error: "Student not found." };

    let studentAge = 12;
    if (student.dateOfBirth) {
      const birthYear = new Date(student.dateOfBirth).getFullYear();
      studentAge = new Date().getFullYear() - birthYear;
    }

    const isRegular = course.type === "REGULAR";
    const sessions = sessionsPerWeek || 1;

    await prisma.registration.create({
      data: {
        studentId,
        studentName: student.name,
        studentAge,
        parentName: student.parent?.name || "Parent",
        parentPhone: student.parent?.phone || "",
        parentEmail: student.parent?.email || "",
        courseId,
        learningMethod,
        scheduleId: scheduleId || null,
        status: isRegular ? "PENDING_ENROLLMENT_PAYMENT" : "PENDING_PT_PAYMENT",
      },
    });

    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(count + 1).toString().padStart(4, '0')}`;
    const virtualAccountNumber = `8800${Math.floor(10000000 + Math.random() * 90000000)}`;
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 24);

    let invoice;
    if (isRegular) {
      // Calculate Tuition dynamically based on method and frequency
      let tuitionAmount = 0;
      if (learningMethod === "PRIVATE") {
        tuitionAmount = sessions === 1 ? course.pricePrivateOnce : course.pricePrivateTwice;
      } else {
        tuitionAmount = sessions === 1 ? course.priceSemiPrivateOnce : course.priceSemiPrivateTwice;
      }
      const amount = tuitionAmount + course.registrationFee;

      invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          studentId,
          itemId: courseId,
          itemType: "CLASS",
          itemCategory: course.type,
          learningMethod,
          sessionsPerWeek: sessions,
          settlementAccount: course.settlementAccount,
          amount,
          virtualAccountNumber,
          dueDate,
        },
      });
    } else {
      invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          studentId,
          itemId: courseId,
          itemType: "PLACEMENT_TEST",
          itemCategory: course.type,
          learningMethod,
          sessionsPerWeek: sessions,
          amount: 300000,
          virtualAccountNumber,
          dueDate,
        },
      });
    }

    // Automatically generate invoice PDF and place into Admin Email Workflow -> Invoice (Draft)
    try {
      const { createOrUpdateInvoiceEmailDraft } = await import("@/lib/invoiceDraft");
      await createOrUpdateInvoiceEmailDraft(invoice.id);
    } catch (draftErr) {
      console.error("Failed to auto-generate invoice draft:", draftErr);
    }

    revalidatePath("/student/invoices");
    revalidatePath("/parent/invoices");
    revalidatePath("/admin/emails");

    return { success: true, invoiceId: invoice.id };
  } catch (error: any) {
    console.error("Failed to enroll in course:", error);
    return { success: false, error: error.message };
  }
}
