"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessStudent } from "@/lib/permissions";

async function checkTeacherOrAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN" && session.user.role !== "OWNER" && session.user.role !== "CO_OWNER")) {
    throw new Error("Unauthorized: Only teachers and admins can manage announcements.");
  }
  return session.user;
}

export async function getTeacherAnnouncements() {
  try {
    const user = await checkTeacherOrAdmin();
    const items = await prisma.announcement.findMany({
      where: { teacherId: user.id },
      include: {
        course: true,
        targetStudents: {
          select: { id: true, name: true, studentIdStr: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, items };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createAnnouncement(data: {
  title: string;
  description: string;
  targetAudience: string;
  courseId?: string;
  isPublished: boolean;
  publishDate?: Date;
  targetStudentIds?: string[];
}) {
  try {
    const user = await checkTeacherOrAdmin();

    if (data.targetStudentIds && data.targetStudentIds.length > 0) {
      for (const sid of data.targetStudentIds) {
        if (!(await canAccessStudent(user, sid))) {
          throw new Error(`Unauthorized: You are not assigned to target student ID ${sid}`);
        }
      }
    }

    const item = await prisma.announcement.create({
      data: {
        title: data.title,
        description: data.description,
        targetAudience: data.targetAudience,
        courseId: data.courseId || null,
        isPublished: data.isPublished,
        publishDate: data.publishDate || new Date(),
        teacherId: user.id,
        targetStudents:
          data.targetStudentIds && data.targetStudentIds.length > 0
            ? { connect: data.targetStudentIds.map((id) => ({ id })) }
            : undefined,
      },
      include: {
        targetStudents: {
          select: { id: true, name: true, studentIdStr: true },
        },
      },
    });
    revalidatePath("/teacher/announcements");
    return { success: true, item };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAnnouncement(
  id: string,
  data: {
    title: string;
    description: string;
    targetAudience: string;
    courseId?: string;
    isPublished: boolean;
    publishDate?: Date;
    targetStudentIds?: string[];
  }
) {
  try {
    const user = await checkTeacherOrAdmin();

    if (data.targetStudentIds && data.targetStudentIds.length > 0) {
      for (const sid of data.targetStudentIds) {
        if (!(await canAccessStudent(user, sid))) {
          throw new Error(`Unauthorized: You are not assigned to target student ID ${sid}`);
        }
      }
    }

    const item = await prisma.announcement.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        targetAudience: data.targetAudience,
        courseId: data.courseId || null,
        isPublished: data.isPublished,
        publishDate: data.publishDate || undefined,
        // Use `set` to replace the entire list of targeted students
        targetStudents:
          data.targetStudentIds !== undefined
            ? { set: data.targetStudentIds.map((sid) => ({ id: sid })) }
            : undefined,
      },
      include: {
        targetStudents: {
          select: { id: true, name: true, studentIdStr: true },
        },
      },
    });
    revalidatePath("/teacher/announcements");
    return { success: true, item };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


export async function deleteAnnouncement(id: string) {
  try {
    await checkTeacherOrAdmin();
    await prisma.announcement.delete({
      where: { id },
    });
    revalidatePath("/teacher/announcements");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function togglePublishAnnouncement(id: string, isPublished: boolean) {
  try {
    await checkTeacherOrAdmin();
    const item = await prisma.announcement.update({
      where: { id },
      data: { isPublished },
    });
    revalidatePath("/teacher/announcements");
    return { success: true, item };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Student & Parent fetch actions
export async function getStudentAnnouncements() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "STUDENT") {
      throw new Error("Unauthorized");
    }

    // Get courses student is active in
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: session.user.id, status: "ACTIVE" },
      select: { itemId: true },
    });
    const courseIds = enrollments.map((e) => e.itemId);

    // Fetch published announcements targeted to students/both,
    // matching their courses or general (courseId is null),
    // AND either no specific targets (all students) or this student is in the target list.
    const items = await prisma.announcement.findMany({
      where: {
        isPublished: true,
        publishDate: { lte: new Date() },
        targetAudience: { in: ["STUDENTS", "BOTH"] },
        OR: [
          { courseId: null },
          { courseId: { in: courseIds } },
        ],
        // Target filter: either no specific targets or this student is targeted
        AND: [
          {
            OR: [
              { targetStudents: { none: {} } }, // No specific targets = broadcast to all
              { targetStudents: { some: { id: session.user.id } } }, // This student is targeted
            ],
          },
        ],
      },
      include: {
        teacher: { select: { name: true } },
        course: { select: { title: true } },
        reads: {
          where: { studentId: session.user.id },
        },
        targetStudents: {
          select: { id: true },
        },
      },
      orderBy: { publishDate: "desc" },
    });

    const formatted = items.map((a) => ({
      ...a,
      isRead: a.reads.length > 0,
    }));

    return { success: true, items: formatted };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markAnnouncementAsRead(announcementId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "STUDENT") {
      throw new Error("Unauthorized");
    }

    await prisma.announcementRead.upsert({
      where: {
        announcementId_studentId: {
          announcementId,
          studentId: session.user.id,
        },
      },
      create: {
        announcementId,
        studentId: session.user.id,
      },
      update: {},
    });

    revalidatePath("/student/announcements");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getParentAnnouncements(childStudentIds: string[]) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PARENT") {
      throw new Error("Unauthorized");
    }

    // Verify all children belong to this parent
    const children = await prisma.user.findMany({
      where: { id: { in: childStudentIds }, parentId: session.user.id },
    });
    const verifiedChildIds = children.map((c) => c.id);

    if (verifiedChildIds.length === 0) {
      return { success: true, items: [] };
    }

    // Get courses all children are enrolled in
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: { in: verifiedChildIds }, status: "ACTIVE" },
      select: { itemId: true },
    });
    const courseIds = [...new Set(enrollments.map((e) => e.itemId))];

    // Fetch published announcements targeted to parents/both matching children's courses or general,
    // AND either no specific targets or at least one of this parent's children is targeted
    const items = await prisma.announcement.findMany({
      where: {
        isPublished: true,
        publishDate: { lte: new Date() },
        targetAudience: { in: ["PARENTS", "BOTH"] },
        OR: [
          { courseId: null },
          { courseId: { in: courseIds } },
        ],
        AND: [
          {
            OR: [
              { targetStudents: { none: {} } }, // Broadcast to all
              { targetStudents: { some: { id: { in: verifiedChildIds } } } }, // At least one child is targeted
            ],
          },
        ],
      },
      include: {
        teacher: { select: { name: true } },
        course: { select: { title: true } },
        targetStudents: {
          where: { id: { in: verifiedChildIds } },
          select: { id: true, name: true },
        },
      },
      orderBy: { publishDate: "desc" },
    });

    return { success: true, items };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
