"use server";

import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export async function activateAccounts(formData: FormData) {
  const studentId = formData.get("studentId") as string;
  const token = (formData.get("token") as string || "").trim();
  const studentPassword = formData.get("studentPassword") as string;
  const parentPassword = formData.get("parentPassword") as string;

  if ((!studentId && !token) || !studentPassword) {
    throw new Error("Missing required fields");
  }

  let student: any = null;

  if (token) {
    // Lookup by activation token
    const tokenUser = await prisma.user.findFirst({
      where: { activationToken: token },
      include: { parent: true, children: true },
    });

    if (!tokenUser) {
      throw new Error("Invalid or expired activation link.");
    }

    if (tokenUser.activationExpires && new Date() > tokenUser.activationExpires) {
      throw new Error("Activation link has expired. Please request a new activation link.");
    }

    if (tokenUser.role === "STUDENT") {
      student = tokenUser;
    } else if (tokenUser.role === "PARENT") {
      student = tokenUser.children[0] || null;
      if (student) {
        student.parent = tokenUser;
      }
    }
  }

  if (!student && studentId) {
    // Fallback lookup by studentId
    student = await prisma.user.findUnique({
      where: { studentIdStr: studentId },
      include: { parent: true },
    });
  }

  if (!student) {
    throw new Error("Student account not found");
  }

  if (student.isActive) {
    throw new Error("Account is already activated.");
  }

  // Hash student password
  const studentPasswordHash = await bcrypt.hash(studentPassword, 10);

  // Update Student User to active & clear single-use token
  await prisma.user.update({
    where: { id: student.id },
    data: {
      passwordHash: studentPasswordHash,
      isActive: true,
      activationToken: null,
      activationExpires: null,
    },
  });

  // Update Parent User to active/verified, clear token, set password
  if (student.parent) {
    const parentUpdateData: {
      isActive: boolean;
      activationToken: null;
      activationExpires: null;
      passwordHash?: string;
    } = {
      isActive: true,
      activationToken: null,
      activationExpires: null,
    };

    if (parentPassword) {
      parentUpdateData.passwordHash = await bcrypt.hash(parentPassword, 10);
    }

    await prisma.user.update({
      where: { id: student.parent.id },
      data: parentUpdateData,
    });
  }

  redirect("/login?activated=true");
}
