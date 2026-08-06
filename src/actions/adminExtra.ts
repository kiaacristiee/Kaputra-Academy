"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import bcrypt from "bcryptjs";

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !["ADMIN", "SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function createTeacherAssignment(data: { teacherId: string; courseId: string }) {
  try {
    const user = await checkAdmin();
    
    const course = await prisma.course.findUnique({ where: { id: data.courseId } });

    const assignment = await prisma.teacherAssignment.create({
      data: {
        teacherId: data.teacherId,
        courseId: data.courseId,
      },
    });
    revalidatePath("/admin/teacher-assignments");
    return { success: true, assignment };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "This teacher is already assigned to that course." };
    }
    return { success: false, error: error.message };
  }
}

export async function deleteTeacherAssignment(id: string) {
  try {
    const user = await checkAdmin();
    const assignment = await prisma.teacherAssignment.findUnique({
      where: { id },
      include: { course: true }
    });

    await prisma.teacherAssignment.delete({ where: { id } });
    revalidatePath("/admin/teacher-assignments");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getParents() {
  try {
    await checkAdmin();
    const parents = await prisma.user.findMany({
      where: { role: "PARENT" },
      include: {
        children: {
          select: { id: true, name: true, studentIdStr: true, isActive: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, parents };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleParentActive(userId: string, isActive: boolean) {
  try {
    await checkAdmin();
    await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });
    revalidatePath("/admin/parents");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAdminSchedules() {
  try {
    await checkAdmin();
    const schedules = await prisma.schedule.findMany({
      include: {
        course: { select: { title: true } },
        teacher: { select: { name: true } },
        student: { select: { name: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return { success: true, schedules };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createSchedule(data: {
  teacherId: string;
  courseId?: string;
  studentId?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  type: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role)) {
      throw new Error("Unauthorized");
    }

    if (data.type === "PRIVATE" && session.user.role === "ADMIN") {
       throw new Error("Admins are not allowed to create Private class schedules.");
    }
    const schedule = await prisma.schedule.create({
      data: {
        teacherId: data.teacherId,
        courseId: data.courseId || null,
        studentId: data.studentId || null,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        type: data.type,
      },
    });
    revalidatePath("/admin/schedules");
    return { success: true, schedule };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteSchedule(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role)) {
      throw new Error("Unauthorized");
    }

    const schedule = await prisma.schedule.findUnique({ where: { id } });
    if (!schedule) throw new Error("Schedule not found");

    if (schedule.type === "PRIVATE" && session.user.role === "ADMIN") {
      throw new Error("Admins are not allowed to delete Private class schedules.");
    }
    await prisma.schedule.delete({ where: { id } });
    revalidatePath("/admin/schedules");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSchedule(
  id: string,
  data: {
    teacherId: string;
    courseId?: string;
    studentId?: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    type: string;
  }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role)) {
      throw new Error("Unauthorized");
    }

    const schedule = await prisma.schedule.findUnique({ where: { id } });
    if (!schedule) throw new Error("Schedule not found");

    if ((schedule.type === "PRIVATE" || data.type === "PRIVATE") && session.user.role === "ADMIN") {
      throw new Error("Admins are not allowed to edit Private class schedules.");
    }
    const updatedSchedule = await prisma.schedule.update({
      where: { id },
      data: {
        teacherId: data.teacherId,
        courseId: data.courseId || null,
        studentId: data.studentId || null,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        type: data.type,
      },
    });
    revalidatePath("/admin/schedules");
    return { success: true, schedule: updatedSchedule };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getHolidays() {
  try {
    const block = await prisma.contentBlock.findUnique({
      where: { section: "academy_holidays" },
    });
    if (!block) return { success: true, holidays: [] };
    return { success: true, holidays: JSON.parse(block.content) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveHolidays(holidays: any[]) {
  try {
    await checkAdmin();
    await prisma.contentBlock.upsert({
      where: { section: "academy_holidays" },
      update: { content: JSON.stringify(holidays) },
      create: {
        section: "academy_holidays",
        content: JSON.stringify(holidays),
      },
    });
    revalidatePath("/admin/schedules");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createParentAccount(data: {
  name: string;
  email: string;
  phone: string;
  password?: string;
}) {
  try {
    await checkAdmin();
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return { success: false, error: "Email already registered." };
    }


    const defaultPassword = data.password || "password123";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const parent = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: "PARENT",
        isActive: true,
      },
    });
    revalidatePath("/admin/parents");
    return { success: true, parent };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateParentAccount(
  id: string,
  data: { name: string; email: string; phone: string }
) {
  try {
    await checkAdmin();
    const parent = await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
      },
    });
    revalidatePath("/admin/parents");
    return { success: true, parent };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteParentAccount(id: string) {
  try {
    await checkAdmin();
    // Unlink children first
    await prisma.user.updateMany({
      where: { parentId: id },
      data: { parentId: null },
    });
    await prisma.user.delete({ where: { id } });
    revalidatePath("/admin/parents");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function linkChildToParent(parentId: string, studentIdStr: string) {
  try {
    await checkAdmin();
    const student = await prisma.user.findFirst({
      where: { studentIdStr, role: "STUDENT" },
    });
    if (!student) {
      return { success: false, error: "Student not found with this Student ID." };
    }
    await prisma.user.update({
      where: { id: student.id },
      data: { parentId },
    });
    revalidatePath("/admin/parents");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function unlinkChildFromParent(studentId: string) {
  try {
    await checkAdmin();
    await prisma.user.update({
      where: { id: studentId },
      data: { parentId: null },
    });
    revalidatePath("/admin/parents");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPlacementTestResults() {
  try {
    await checkAdmin();
    const results = await prisma.placementTest.findMany({
      include: {
        registration: {
          select: {
            studentName: true,
            studentAge: true,
            parentName: true,
            parentEmail: true,
            parentPhone: true,
            course: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, results };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPlacementTestConfig() {
  try {
    const block = await prisma.contentBlock.findUnique({
      where: { section: "placement_test_config" },
    });
    if (!block) {
      // Return default questions
      const defaults = {
        passingScore: 60,
        questions: [
          {
            id: "q1",
            question: "If a train travels 120 km in 2 hours, what is its average speed in km/h?",
            options: ["50 km/h", "60 km/h", "70 km/h", "80 km/h"],
            correctAnswer: "60 km/h",
          },
          {
            id: "q2",
            question: "Which of the following sentences is grammatically correct?",
            options: [
              "He don't like apples.",
              "She like to read books.",
              "They have went to the store.",
              "We are going to school.",
            ],
            correctAnswer: "We are going to school.",
          },
          {
            id: "q3",
            question: "If all cats are mammals, and all mammals have fur, which of the following is true?",
            options: [
              "All cats have fur.",
              "Some cats do not have fur.",
              "All mammals are cats.",
              "No cats have fur.",
            ],
            correctAnswer: "All cats have fur.",
          },
          {
            id: "q4",
            question: "What is the chemical symbol for water?",
            options: ["CO2", "H2O", "NaCl", "O2"],
            correctAnswer: "H2O",
          },
          {
            id: "q5",
            question: "What is the primary curriculum followed at Kaputra Academy?",
            options: ["Cambridge Curriculum", "Singapore Curriculum", "IB Curriculum", "National Curriculum"],
            correctAnswer: "Singapore Curriculum",
          },
        ],
      };
      return { success: true, config: defaults };
    }
    return { success: true, config: JSON.parse(block.content) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePlacementTestConfig(config: { passingScore: number; questions: any[] }) {
  try {
    await checkAdmin();
    await prisma.contentBlock.upsert({
      where: { section: "placement_test_config" },
      update: { content: JSON.stringify(config) },
      create: {
        section: "placement_test_config",
        content: JSON.stringify(config),
      },
    });
    revalidatePath("/admin/placement-tests");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleStudentDisabled(userId: string, isDisabled: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["ADMIN", "SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role)) {
      throw new Error("Unauthorized");
    }
    await (prisma.user as any).update({
      where: { id: userId },
      data: { isDisabled },
    });
    revalidatePath("/admin/students");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

