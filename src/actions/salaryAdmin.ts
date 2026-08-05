"use server";

import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

import { isAdminRole } from "@/lib/permissions";

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !isAdminRole(session.user.role)) {
    throw new Error("Unauthorized: Admin access required.");
  }
  return session;
}

export async function getSalariesForAdmin() {
  try {
    await checkAdmin();
    const salaries = await prisma.salary.findMany({
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, salaries };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTeachersList() {
  try {
    await checkAdmin();
    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER" },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    });
    return { success: true, teachers };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adminCreateSalary(data: {
  teacherId: string;
  month: string;
  baseSalary: number;
  bonus: number;
  status: string;
  paymentDetails?: string;
  receiptUrl?: string;
}) {
  try {
    await checkAdmin();
    const salary = await prisma.salary.create({
      data: {
        teacherId: data.teacherId,
        month: data.month,
        baseSalary: data.baseSalary,
        bonus: data.bonus,
        status: data.status,
        paymentDetails: data.paymentDetails || null,
        receiptUrl: data.receiptUrl || null,
      },
    });
    revalidatePath("/admin/salary");
    revalidatePath("/teacher/salary");
    return { success: true, salary };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adminUpdateSalary(
  salaryId: string,
  data: {
    status?: string;
    paymentDetails?: string;
    receiptUrl?: string;
  }
) {
  try {
    await checkAdmin();
    const salary = await prisma.salary.update({
      where: { id: salaryId },
      data: {
        status: data.status,
        paymentDetails: data.paymentDetails,
        receiptUrl: data.receiptUrl,
      },
    });
    revalidatePath("/admin/salary");
    revalidatePath("/teacher/salary");
    return { success: true, salary };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adminDeleteSalary(salaryId: string) {
  try {
    await checkAdmin();
    await prisma.salary.delete({
      where: { id: salaryId },
    });
    revalidatePath("/admin/salary");
    revalidatePath("/teacher/salary");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function uploadSalaryReceipt(formData: FormData) {
  try {
    await checkAdmin();
    const receiptFile = formData.get("receiptFile") as File;

    if (!receiptFile || receiptFile.size === 0) {
      throw new Error("Missing required receipt file or empty file");
    }

    // Ensure it's an image or PDF
    if (!receiptFile.type.startsWith("image/") && receiptFile.type !== "application/pdf") {
      throw new Error("Please upload a valid image file or PDF");
    }

    const bytes = await receiptFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const filename = `${Date.now()}-${receiptFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "salaries");

    let receiptUrl: string;

    try {
      await mkdir(uploadDir, { recursive: true });
      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);
      receiptUrl = `/uploads/salaries/${filename}`;
    } catch (fsError) {
      console.warn("Serverless disk write fallback activated:", fsError);
      const base64Data = buffer.toString("base64");
      receiptUrl = `data:${receiptFile.type};base64,${base64Data}`;
    }

    return { success: true, receiptUrl };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
