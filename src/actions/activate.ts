"use server";

import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export async function activateAccounts(formData: FormData) {
  const token = (formData.get("token") as string || "").trim();
  const studentPassword = formData.get("studentPassword") as string;
  const parentPassword = formData.get("parentPassword") as string;
  const studentId = formData.get("studentId") as string;

  if ((!studentId && !token) || !studentPassword) {
    throw new Error("Missing required fields");
  }

  let parentUser: any = null;
  let allChildren: any[] = [];

  if (token) {
    // Lookup by activation token — token belongs to the PARENT account
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

    if (tokenUser.role === "PARENT") {
      parentUser = tokenUser;
      allChildren = tokenUser.children || [];
    } else if (tokenUser.role === "STUDENT") {
      // Legacy: token on student directly
      parentUser = tokenUser.parent || null;
      allChildren = [tokenUser];
    }
  }

  // Fallback lookup by studentId (legacy single-child path)
  if (allChildren.length === 0 && studentId) {
    const student = await prisma.user.findUnique({
      where: { studentIdStr: studentId },
      include: { parent: true },
    });

    if (student) {
      allChildren = [student];
      parentUser = student.parent || null;
    }
  }

  if (allChildren.length === 0) {
    throw new Error("Student account not found");
  }

  // Check if already activated (use first child as representative check)
  if (allChildren[0].isActive) {
    throw new Error("Account is already activated.");
  }

  // Hash student password once — applied to ALL children
  const studentPasswordHash = await bcrypt.hash(studentPassword, 10);

  // Activate ALL children linked to this parent
  const childIds = allChildren.map((c: any) => c.id);

  await prisma.user.updateMany({
    where: { id: { in: childIds } },
    data: {
      passwordHash: studentPasswordHash,
      isActive: true,
      activationToken: null,
      activationExpires: null,
    },
  });

  // Activate Parent account, clear token, set password
  if (parentUser) {
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
      where: { id: parentUser.id },
      data: parentUpdateData,
    });
  }

  redirect("/login?activated=true");
}
