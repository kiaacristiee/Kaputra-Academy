"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

export async function toggleStudentStatus(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !isAdminRole(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const studentId = formData.get("studentId") as string;
  if (!studentId) throw new Error("Student ID is required");

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student) throw new Error("Student not found");

  await prisma.user.update({
    where: { id: studentId },
    data: { isDisabled: !student.isDisabled },
  });

  revalidatePath("/admin/students");
}
