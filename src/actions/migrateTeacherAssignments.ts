"use server";

import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Migration script: converts existing Teacher→Course assignments into Teacher→Student assignments
 * by finding all students enrolled in those courses.
 * 
 * Safe to run multiple times (uses upsert-like logic with try/catch for P2002).
 */
export async function migrateTeacherAssignmentsToStudents() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["OWNER", "CO_OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
    return { success: false, error: "Only Super Admins can run migrations." };
  }

  try {
    // 1. Get all existing Teacher→Course assignments
    const courseAssignments = await prisma.teacherAssignment.findMany({
      include: { teacher: true, course: true },
    });

    let created = 0;
    let skipped = 0;

    for (const ca of courseAssignments) {
      // 2. Find all students enrolled in this course
      const enrollments = await prisma.enrollment.findMany({
        where: {
          itemId: ca.courseId,
          itemType: "CLASS",
          status: "ACTIVE",
        },
        include: {
          student: { select: { id: true, role: true } },
        },
      });

      for (const enrollment of enrollments) {
        if (enrollment.student.role !== "STUDENT") continue;

        try {
          await (prisma as any).studentTeacherAssignment.create({
            data: {
              teacherId: ca.teacherId,
              studentId: enrollment.studentId,
              isPrimary: true,
            },
          });
          created++;
        } catch (err: any) {
          // P2002 = unique constraint violation (already exists)
          if (err.code === "P2002") {
            skipped++;
          } else {
            throw err;
          }
        }
      }
    }

    return {
      success: true,
      message: `Migration complete. Created ${created} new student-teacher assignments. Skipped ${skipped} duplicates.`,
      stats: { created, skipped, totalCourseAssignments: courseAssignments.length },
    };
  } catch (error: any) {
    console.error("Migration error:", error);
    return { success: false, error: error.message };
  }
}
