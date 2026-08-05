"use server";

import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function checkTeacher() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "TEACHER") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function createPrivateSession(data: {
  studentId: string;
  courseId: string | null;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
}) {
  try {
    const teacher = await checkTeacher();

    const existing = await prisma.privateSession.findMany({
      where: {
        teacherId: teacher.id,
        date: data.date,
        status: { not: "CANCELLED" }
      }
    });

    const newStart = parseInt(data.startTime.replace(":", ""));
    const newEnd = parseInt(data.endTime.replace(":", ""));

    let conflict = false;
    for (const s of existing) {
      const sStart = parseInt(s.startTime.replace(":", ""));
      const sEnd = parseInt(s.endTime.replace(":", ""));
      if (newStart < sEnd && newEnd > sStart) {
        conflict = true;
        break;
      }
    }

    if (conflict) {
      return { success: false, error: "Time conflict detected with another scheduled private session." };
    }

    const session = await prisma.privateSession.create({
      data: {
        teacherId: teacher.id,
        studentId: data.studentId,
        courseId: data.courseId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: data.duration,
        status: "SCHEDULED"
      }
    });

    revalidatePath("/teacher/private-classes");
    return { success: true, session };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePrivateSessionStatus(sessionId: string, status: string, attendance?: string) {
  try {
    await checkTeacher();
    const session = await prisma.privateSession.update({
      where: { id: sessionId },
      data: {
        status,
        ...(attendance && { attendance })
      }
    });
    revalidatePath("/teacher/private-classes");
    return { success: true, session };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePrivateSession(sessionId: string) {
  try {
    await checkTeacher();
    await prisma.privateSession.delete({
      where: { id: sessionId }
    });
    revalidatePath("/teacher/private-classes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
