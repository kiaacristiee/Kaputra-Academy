"use server";

import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function getTeachers() {
  try {
    const teachers = await prisma.user.findMany({
      where: {
        role: { in: ["TEACHER", "SUPER_ADMIN", "OWNER", "CO_OWNER"] },
      },
      include: {
        teachingAssignments: {
          include: {
            course: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return { success: true, teachers };
  } catch (error: any) {
    console.error("Failed to fetch teachers:", error);
    return { success: false, error: error.message };
  }
}

export async function createTeacher(data: {
  name: string;
  email: string;
  phone?: string;
  password?: string;
}) {
  try {
    // Check if email is unique
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return { success: false, error: "A user with this email already exists." };
    }

    const defaultPassword = data.password || "teacher123";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const teacher = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        passwordHash,
        role: "TEACHER",
        isActive: true,
      },
    });

    revalidatePath("/admin/teachers");
    return { success: true, teacher };
  } catch (error: any) {
    console.error("Failed to create teacher:", error);
    return { success: false, error: error.message };
  }
}

export async function updateTeacher(
  id: string,
  data: {
    name: string;
    email: string;
    phone?: string;
    password?: string;
  }
) {
  try {
    // Check if email is unique to other users
    const existing = await prisma.user.findFirst({
      where: {
        email: data.email,
        NOT: { id },
      },
    });
    if (existing) {
      return { success: false, error: "A user with this email already exists." };
    }

    const updateData: any = {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
    };

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const teacher = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/admin/teachers");
    return { success: true, teacher };
  } catch (error: any) {
    console.error("Failed to update teacher:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteTeacher(id: string) {
  try {
    // Delete assignments first
    await prisma.teacherAssignment.deleteMany({
      where: { teacherId: id },
    });

    const teacher = await prisma.user.delete({
      where: { id },
    });

    revalidatePath("/admin/teachers");
    return { success: true, teacher };
  } catch (error: any) {
    console.error("Failed to delete teacher:", error);
    return { success: false, error: error.message };
  }
}
