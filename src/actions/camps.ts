"use server";

import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function getCamps() {
  try {
    const camps = await prisma.campProgram.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, camps };
  } catch (error: any) {
    console.error("Failed to fetch camps:", error);
    return { success: false, error: error.message };
  }
}

export async function createCamp(data: {
  name: string;
  slug: string;
  description: string;
  thumbnailUrl?: string | null;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  price: number;
  capacity?: number | null;
  status: string;
  visibility: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const existing = await prisma.campProgram.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      return { success: false, error: "A camp program with this slug/URL already exists." };
    }

    const camp = await prisma.campProgram.create({
      data: {
        ...data,
      },
    });

    revalidatePath("/admin/camps");
    return { success: true, camp };
  } catch (error: any) {
    console.error("Failed to create camp:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCamp(
  id: string,
  data: {
    name: string;
    slug: string;
    description: string;
    thumbnailUrl?: string | null;
    startDate: Date;
    endDate: Date;
    registrationDeadline: Date;
    price: number;
    capacity?: number | null;
    status: string;
    visibility: string;
  }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const existing = await prisma.campProgram.findFirst({
      where: {
        slug: data.slug,
        NOT: { id },
      },
    });
    if (existing) {
      return { success: false, error: "A camp program with this slug/URL already exists." };
    }

    const camp = await prisma.campProgram.update({
      where: { id },
      data: {
        ...data,
      },
    });

    revalidatePath("/admin/camps");
    return { success: true, camp };
  } catch (error: any) {
    console.error("Failed to update camp:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCamp(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    // Delete relations first
    await prisma.campRegistration.deleteMany({
      where: { campProgramId: id },
    });

    const camp = await prisma.campProgram.delete({
      where: { id },
    });

    revalidatePath("/admin/camps");
    return { success: true, camp };
  } catch (error: any) {
    console.error("Failed to delete camp:", error);
    return { success: false, error: error.message };
  }
}

// Student & Parent facing actions
export async function getAvailableCamps(studentId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Auth validation
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

    // Enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        itemType: "CAMP",
        status: "ACTIVE",
      },
      select: { itemId: true },
    });
    const enrolledCampIds = enrollments.map((e) => e.itemId);

    // Invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        studentId,
        itemType: "CAMP",
        status: { in: ["PENDING", "WAITING_VERIFICATION", "PAID"] },
      },
      select: { itemId: true },
    });
    const invoicedCampIds = invoices.map((i) => i.itemId);

    // Camp Registrations
    const registrations = await prisma.campRegistration.findMany({
      where: {
        studentId,
        status: { in: ["PENDING_PAYMENT", "VERIFYING_PAYMENT", "APPROVED"] },
      },
      select: { campProgramId: true },
    });
    const registeredCampIds = registrations.map((r) => r.campProgramId);

    const excludedIds = Array.from(
      new Set([...enrolledCampIds, ...invoicedCampIds, ...registeredCampIds])
    );

    const availableCamps = await prisma.campProgram.findMany({
      where: {
        visibility: "PUBLISHED",
        status: "OPEN",
        id: { notIn: excludedIds },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, camps: availableCamps };
  } catch (error: any) {
    console.error("Failed to fetch available camps:", error);
    return { success: false, error: error.message };
  }
}

export async function enrollInCamp(studentId: string, campProgramId: string) {
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
      return { success: false, error: "You must accept the Terms & Conditions before registering." };
    }

    // Auth validation
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

    // Verify camp exists
    const camp = await prisma.campProgram.findUnique({
      where: { id: campProgramId },
    });
    if (!camp) {
      return { success: false, error: "Camp Program not found." };
    }

    // Exclude if already enrolled/registered
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: { studentId, itemId: campProgramId, itemType: "CAMP", status: "ACTIVE" },
    });
    if (existingEnrollment) {
      return { success: false, error: "Already enrolled in this camp program." };
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        studentId,
        itemId: campProgramId,
        itemType: "CAMP",
        status: { in: ["PENDING", "WAITING_VERIFICATION", "PAID"] },
      },
    });
    if (existingInvoice) {
      return { success: false, error: "An invoice already exists for this camp program." };
    }

    // Student & Parent details
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

    // Create CampRegistration record
    const registration = await prisma.campRegistration.create({
      data: {
        studentId: studentId,
        studentName: student.name,
        studentAge: studentAge,
        parentName: student.parent?.name || "Parent",
        parentPhone: student.parent?.phone || "",
        parentEmail: student.parent?.email || "",
        campProgramId: campProgramId,
        status: "PENDING_PAYMENT",
      },
    });

    // Invoice generation
    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(count + 1).toString().padStart(4, '0')}`;
    const virtualAccountNumber = `8800${Math.floor(10000000 + Math.random() * 90000000)}`;

    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 24);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        studentId,
        itemId: campProgramId,
        itemType: "CAMP",
        amount: camp.price,
        virtualAccountNumber,
        dueDate,
      },
    });

    revalidatePath("/student/invoices");
    revalidatePath("/parent/invoices");

    return { success: true, invoiceId: invoice.id };
  } catch (error: any) {
    console.error("Failed to enroll in camp:", error);
    return { success: false, error: error.message };
  }
}

export async function getPublishedCamps() {
  try {
    const camps = await prisma.campProgram.findMany({
      where: {
        visibility: "PUBLISHED",
        status: "OPEN",
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, camps: JSON.parse(JSON.stringify(camps)) };
  } catch (error: any) {
    console.error("Failed to fetch public camps:", error);
    return { success: false, error: error.message };
  }
}

export async function uploadCampThumbnail(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("thumbnailFile") as File;
    if (!file || file.size === 0) {
      return { success: false, error: "No file provided" };
    }

    if (!file.type.startsWith("image/")) {
      return { success: false, error: "Please upload a valid image file" };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "camps");

    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // Ignore if exists
    }

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const thumbnailUrl = `/uploads/camps/${filename}`;
    return { success: true, thumbnailUrl };
  } catch (error: any) {
    console.error("Failed to upload camp thumbnail:", error);
    return { success: false, error: error.message };
  }
}
