"use server";

import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function getAvailablePrograms() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdminRole(session.user.role)) {
      throw new Error("Unauthorized access");
    }

    const [courses, camps] = await Promise.all([
      prisma.course.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          title: true,
          type: true,
          price: true,
          pricePrivateOnce: true,
          pricePrivateTwice: true,
          priceSemiPrivateOnce: true,
          priceSemiPrivateTwice: true,
          registrationFee: true,
        },
        orderBy: { title: "asc" },
      }),
      prisma.campProgram.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          title: true,
          price: true,
        },
        orderBy: { title: "asc" },
      }),
    ]);

    return { success: true, courses, camps };
  } catch (error: any) {
    console.error("Failed to fetch available programs:", error);
    return { success: false, error: error.message, courses: [], camps: [] };
  }
}

export interface AdminEnrollParams {
  studentId: string;
  itemType: "CLASS" | "CAMP";
  itemId: string;
  learningMethod?: "SEMI_PRIVATE" | "PRIVATE";
  sessionsPerWeek?: number;
  paymentStatus: "PAID" | "PENDING";
}

export async function adminEnrollStudent(params: AdminEnrollParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdminRole(session.user.role)) {
      throw new Error("Unauthorized access");
    }

    const { studentId, itemType, itemId, learningMethod = "SEMI_PRIVATE", sessionsPerWeek = 1, paymentStatus } = params;

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { parent: true },
    });

    if (!student) {
      throw new Error("Student account not found");
    }

    if (itemType === "CLASS") {
      const course = await prisma.course.findUnique({
        where: { id: itemId },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      // Calculate tuition based on method & sessions
      let tuition = course.price;
      if (learningMethod === "PRIVATE") {
        tuition = sessionsPerWeek === 1 ? (course.pricePrivateOnce || course.price) : (course.pricePrivateTwice || course.price);
      } else {
        tuition = sessionsPerWeek === 1 ? (course.priceSemiPrivateOnce || course.price) : (course.priceSemiPrivateTwice || course.price);
      }
      const totalAmount = tuition + (course.registrationFee || 0);

      // Create Registration record
      await prisma.registration.create({
        data: {
          studentId: student.id,
          studentName: student.name,
          studentAge: 10,
          parentName: student.parent?.name || "Parent",
          parentPhone: student.parent?.phone || "-",
          parentEmail: student.parent?.email || student.email,
          courseId: course.id,
          learningMethod,
          sessionsPerWeek,
          status: "APPROVED",
        },
      });

      // Upsert Enrollment record
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: student.id,
          itemId: course.id,
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
            studentId: student.id,
            itemId: course.id,
            itemType: "CLASS",
            status: "ACTIVE",
          },
        });
      }

      // Generate Invoice
      const count = await prisma.invoice.count();
      const invoiceNumber = `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, "0")}-${(count + 1).toString().padStart(4, "0")}`;
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + 24);

      await prisma.invoice.create({
        data: {
          invoiceNumber,
          studentId: student.id,
          itemId: course.id,
          itemType: "CLASS",
          learningMethod,
          sessionsPerWeek,
          amount: totalAmount,
          virtualAccountNumber: "7000686799",
          status: paymentStatus === "PAID" ? "PAID" : "PENDING",
          approvalStatus: "APPROVED",
          paidAt: paymentStatus === "PAID" ? new Date() : null,
          dueDate,
        },
      });
    } else {
      const camp = await prisma.campProgram.findUnique({
        where: { id: itemId },
      });

      if (!camp) {
        throw new Error("Camp program not found");
      }

      // Create Camp Registration record
      await prisma.campRegistration.create({
        data: {
          studentId: student.id,
          campProgramId: camp.id,
          parentName: student.parent?.name || "Parent",
          parentPhone: student.parent?.phone || "-",
          parentEmail: student.parent?.email || student.email,
          studentName: student.name,
          status: paymentStatus === "PAID" ? "CONFIRMED" : "ENROLLED",
        },
      });

      // Upsert Enrollment record
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: student.id,
          itemId: camp.id,
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
            studentId: student.id,
            itemId: camp.id,
            itemType: "CAMP",
            status: "ACTIVE",
          },
        });
      }

      // Generate Invoice
      const count = await prisma.invoice.count();
      const invoiceNumber = `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, "0")}-${(count + 1).toString().padStart(4, "0")}`;
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + 24);

      await prisma.invoice.create({
        data: {
          invoiceNumber,
          studentId: student.id,
          itemId: camp.id,
          itemType: "CAMP",
          amount: camp.price,
          virtualAccountNumber: "7000686799",
          status: paymentStatus === "PAID" ? "PAID" : "PENDING",
          approvalStatus: "APPROVED",
          paidAt: paymentStatus === "PAID" ? new Date() : null,
          dueDate,
        },
      });
    }

    revalidatePath("/admin/students");
    revalidatePath(`/admin/students/${studentId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to enroll student:", error);
    return { success: false, error: error.message };
  }
}
