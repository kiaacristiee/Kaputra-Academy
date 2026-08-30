import prisma from "@/lib/db";
import { isAdminRole } from "@/lib/permissions";
import { isValidGrade } from "@/lib/grades";

/**
 * Returns all active grade levels registered for a student.
 */
export async function getStudentGrades(studentId: string): Promise<string[]> {
  if (!studentId) return [];

  const registrations = await prisma.registration.findMany({
    where: {
      studentId: studentId,
      status: "APPROVED",
    },
    select: {
      grade: true,
    },
  });

  const gradesSet = new Set<string>();

  for (const reg of registrations) {
    if (reg.grade && isValidGrade(reg.grade)) {
      gradesSet.add(reg.grade);
    }
  }

  return Array.from(gradesSet);
}

/**
 * Parses target grades array from a MockTest instance.
 */
export function getHomeworkGradesArray(mockTest: {
  targetedGrade?: string | null;
  targetedGrades?: string | null;
}): string[] {
  if (!mockTest) return ["ALL"];

  if (mockTest.targetedGrades) {
    try {
      const parsed = JSON.parse(mockTest.targetedGrades);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      // Fall through to targetedGrade
    }
  }

  if (mockTest.targetedGrade && mockTest.targetedGrade !== "ALL") {
    return [mockTest.targetedGrade];
  }

  return ["ALL"];
}

/**
 * Checks if a specific user can view, access, or submit a given MockTest.
 * Admins & Teachers can access everything.
 * Students can only access published homework matching their active grade level(s).
 */
export async function canUserAccessHomework(
  user: { id: string; role?: string | null },
  mockTestId: string
): Promise<boolean> {
  if (!user || !user.id || !mockTestId) return false;

  const role = (user.role || "").toUpperCase();

  // Admin and Staff roles have access to all homework
  if (isAdminRole(role) || role === "TEACHER") {
    return true;
  }

  // Fetch the mock test
  const mockTest = await prisma.mockTest.findUnique({
    where: { id: mockTestId },
    select: {
      id: true,
      isPublished: true,
      targetedGrade: true,
      targetedGrades: true,
      courseId: true,
    },
  });

  if (!mockTest || !mockTest.isPublished) {
    return false;
  }

  const targetGrades = getHomeworkGradesArray(mockTest);

  // If homework is targeted to ALL grades, any authenticated student can access
  if (targetGrades.includes("ALL")) {
    return true;
  }

  // Get active grades for the student
  const studentGrades = await getStudentGrades(user.id);

  if (studentGrades.length === 0) {
    // Student has no active grade registrations, deny access
    return false;
  }

  // Access granted if there is any overlap between homework target grades and student's active grades
  const hasMatchingGrade = targetGrades.some((g) => studentGrades.includes(g));

  return hasMatchingGrade;
}

/**
 * Generates a Prisma database `where` clause for filtering MockTest queries
 * based on user role and student active grades.
 */
export async function getHomeworkVisibilityWhereClause(user: {
  id: string;
  role?: string | null;
}) {
  const role = (user.role || "").toUpperCase();

  if (isAdminRole(role) || role === "TEACHER") {
    return {}; // No filter for staff/admins
  }

  // For students
  const studentGrades = await getStudentGrades(user.id);

  if (studentGrades.length === 0) {
    // If student has no active grades registered, only show general/ALL homework
    return {
      isPublished: true,
      AND: [
        {
          OR: [{ targetedGrade: "ALL" }, { targetedGrade: null }],
        },
        { targetedGrades: null },
      ],
    };
  }

  // Student has active grades e.g. ["GRADE_1", "GRADE_2"]
  const ORConditions: any[] = [
    // 1. General/ALL homework
    {
      AND: [
        { OR: [{ targetedGrade: "ALL" }, { targetedGrade: null }] },
        { targetedGrades: null },
      ],
    },
    // 2. Single grade matches student grade
    { targetedGrade: { in: studentGrades } },
  ];

  // 3. Multi-grade JSON string contains any of student's active grades
  for (const grade of studentGrades) {
    ORConditions.push({
      targetedGrades: {
        contains: grade,
      },
    });
  }

  return {
    isPublished: true,
    OR: ORConditions,
  };
}
