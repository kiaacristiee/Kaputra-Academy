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

    // Verify parent has access to child or student is querying themselves
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

    // Fetch all active enrollments for this student
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        status: "ACTIVE",
      },
      select: { itemId: true },
    });

    const enrolledCourseIds = enrollments.map((e) => e.itemId);

    // Fetch all active/pending invoices for this student
    const invoices = await prisma.invoice.findMany({
      where: {
        studentId,
        itemType: { in: ["CLASS", "PLACEMENT_TEST"] },
        status: { in: ["PENDING", "WAITING_VERIFICATION", "PAID"] },
      },
      select: { itemId: true },
    });

    const invoicedCourseIds = invoices.map((i) => i.itemId);

    // Fetch pending registrations
    const registrations = await prisma.registration.findMany({
      where: {
        studentId,
        status: { in: ["PENDING_PAYMENT", "PENDING_PT_PAYMENT", "VERIFYING_PT_PAYMENT", "PT_ELIGIBLE", "QUALIFIED", "NOT_QUALIFIED", "VERIFYING_ENROLLMENT_PAYMENT"] },
      },
      select: { courseId: true },
    });
    const registeredCourseIds = registrations.map((r) => r.courseId);

    // Exclude both enrolled and invoiced/registered course ids
    const excludedIds = Array.from(new Set([...enrolledCourseIds, ...invoicedCourseIds, ...registeredCourseIds]));

    // Find courses that are published and not in the excluded list
    const availableCourses = await prisma.course.findMany({
      where: {
        isPublished: true,
        id: { notIn: excludedIds },
      },
      include: {
        category: true,
        teachers: {
          include: {
            teacher: {
              select: { name: true },
            },
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
  scheduleId?: string
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
      return { success: false, error: "You must accept the Terms & Conditions before registering for a class." };
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

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      return { success: false, error: "Course not found." };
    }

    // Check if enrollment or invoice already exists
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

    // Fetch student profile and parent details
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { parent: true },
    });

    if (!student) {
      return { success: false, error: "Student not found." };
    }

    let studentAge = 12; // default
    if (student.dateOfBirth) {
      const birthYear = new Date(student.dateOfBirth).getFullYear();
      const currentYear = new Date().getFullYear();
      studentAge = currentYear - birthYear;
    }

    const isRegular = course.type === "REGULAR";

    // Create the Registration record
    const registration = await prisma.registration.create({
      data: {
        studentId: studentId,
        studentName: student.name,
        studentAge: studentAge,
        parentName: student.parent?.name || "Parent",
        parentPhone: student.parent?.phone || "",
        parentEmail: student.parent?.email || "",
        courseId: courseId,
        learningMethod: learningMethod,
        scheduleId: scheduleId || null,
        status: isRegular ? "PENDING_ENROLLMENT_PAYMENT" : "PENDING_PT_PAYMENT",
      },
    });

    // Generate unique invoice number
    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(count + 1).toString().padStart(4, '0')}`;

    // Generate mock VA
    const virtualAccountNumber = `8800${Math.floor(10000000 + Math.random() * 90000000)}`;

    // Due date: 24 hours from now
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 24);

    let invoice;
    if (isRegular) {
      // Create regular class tuition invoice (fee = price + registrationFee)
      const amount = course.price + course.registrationFee;
      invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          studentId,
          itemId: courseId,
          itemType: "CLASS",
          amount,
          virtualAccountNumber,
          dueDate,
        },
      });
    } else {
      // Create placement test invoice (fee is fixed at IDR 300,000)
      invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          studentId,
          itemId: courseId,
          itemType: "PLACEMENT_TEST",
          amount: 300000,
          virtualAccountNumber,
          dueDate,
        },
      });
    }

    revalidatePath("/student/invoices");
    revalidatePath("/parent/invoices");
    
    return { success: true, invoiceId: invoice.id };
  } catch (error: any) {
    console.error("Failed to enroll in course:", error);
    return { success: false, error: error.message };
  }
}
