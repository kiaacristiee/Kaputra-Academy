export function canManageEnrollment(
  userRole?: string | null,
  learningMethod?: string | null
): boolean {
  if (!userRole) return false;

  const normalizedRole = userRole.toUpperCase();

  // Super admins, owners, and co-owners have full permission for all learning methods
  if (["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(normalizedRole)) {
    return true;
  }

  // Standard admin role is allowed for Semi-Private classes
  if (normalizedRole === "ADMIN") {
    // If learningMethod is SEMI_PRIVATE or Semi-Private
    if (!learningMethod) return true; // Default fallback if unspecified
    const method = learningMethod.toUpperCase().replace("-", "_");
    return method === "SEMI_PRIVATE";
  }

  return false;
}

export function isAdminRole(userRole?: string | null): boolean {
  if (!userRole) return false;
  const normalized = userRole.toUpperCase();
  return ["ADMIN", "SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(normalized);
}

// Determines if an admin model is authorized to manage strictly private classes & payments
export function canManagePrivateClasses(userRole?: string | null): boolean {
  if (!userRole) return false;
  const normalized = userRole.toUpperCase();
  // Standard ADMIN is locked out of this.
  return ["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(normalized);
}

import prisma from "@/lib/db";

export type AuthUser = {
  id: string;
  role?: string | null;
};

/**
 * Checks if a given user (Admin, Teacher, Parent, or Student) can access a specific student's record.
 * 
 * Rules:
 * - Admins (ADMIN, SUPER_ADMIN, OWNER, CO_OWNER) -> true
 * - Students -> true if accessing own record
 * - Parents -> true if accessing own child's record
 * - Teachers -> true ONLY if assigned to that student via StudentTeacherAssignment
 * - Everything else -> false
 */
export async function canAccessStudent(user: AuthUser | null | undefined, studentId: string): Promise<boolean> {
  if (!user || !user.id || !studentId) return false;

  const role = user.role?.toUpperCase() || "";

  // 1. Admins bypass restrictions
  if (isAdminRole(role)) {
    return true;
  }

  // 2. Student accessing own record
  if (role === "STUDENT") {
    return user.id === studentId;
  }

  // 3. Parent accessing own child's record
  if (role === "PARENT") {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { parentId: true },
    });
    return student?.parentId === user.id;
  }

  // 4. Teacher accessing assigned student
  if (role === "TEACHER") {
    const assignment = await (prisma as any).studentTeacherAssignment.findUnique({
      where: {
        teacherId_studentId: {
          teacherId: user.id,
          studentId,
        },
      },
    });
    return !!assignment;
  }

  return false;
}

/**
 * Returns list of student IDs visible to the user, or `null` if the user is an admin with unrestricted access.
 */
export async function getVisibleStudentIds(user: AuthUser | null | undefined): Promise<string[] | null> {
  if (!user || !user.id) return [];

  const role = user.role?.toUpperCase() || "";

  // Admins see all students (unrestricted scope)
  if (isAdminRole(role)) {
    return null;
  }

  // Teachers see only directly assigned students
  if (role === "TEACHER") {
    const assignments = await (prisma as any).studentTeacherAssignment.findMany({
      where: { teacherId: user.id },
      select: { studentId: true },
    });
    return assignments.map((a: any) => a.studentId);
  }

  // Parents see only their children
  if (role === "PARENT") {
    const children = await prisma.user.findMany({
      where: { parentId: user.id, role: "STUDENT" },
      select: { id: true },
    });
    return children.map((c) => c.id);
  }

  // Students see only themselves
  if (role === "STUDENT") {
    return [user.id];
  }

  return [];
}


