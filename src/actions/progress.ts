"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessStudent } from "@/lib/permissions";

async function checkTeacher() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !["TEACHER", "ADMIN", "SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function updateStudentProgress(
  reportId: string,
  data: {
    progress: number;
    completedModules: string;
    teacherNotes: string;
    skillAssessment: string;
  }
) {
  try {
    const user = await checkTeacher();
    const existing = await prisma.academicReport.findUnique({ where: { id: reportId } });
    if (!existing) throw new Error("Report not found");
    if (!(await canAccessStudent(user, existing.studentId))) {
      throw new Error("Unauthorized: You are not assigned to this student");
    }

    const item = await prisma.academicReport.update({
      where: { id: reportId },
      data: {
        progress: data.progress,
        completedModules: data.completedModules,
        teacherNotes: data.teacherNotes,
        skillAssessment: data.skillAssessment,
      },
    });
    revalidatePath("/teacher/progress-cms");
    return { success: true, item };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createStudentReport(data: {
  studentId: string;
  courseId: string;
  grade: string;
  progress: number;
  teacherNotes: string;
  skillAssessment: string;
  completedModules: string;
}) {
  try {
    const user = await checkTeacher();
    if (!(await canAccessStudent(user, data.studentId))) {
      throw new Error("Unauthorized: You are not assigned to this student");
    }

    const item = await prisma.academicReport.create({
      data: {
        studentId: data.studentId,
        courseId: data.courseId,
        grade: data.grade,
        progress: data.progress,
        teacherNotes: data.teacherNotes,
        skillAssessment: data.skillAssessment,
        completedModules: data.completedModules,
        status: "DRAFT",
        performanceSummary: "",
        strengths: "",
        improvements: "",
        learningProgress: "",
        nextSteps: ""
      },
    });
    revalidatePath("/teacher/progress-cms");
    revalidatePath("/teacher/report-cms");
    return { success: true, item };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAcademicReport(
  reportId: string,
  data: {
    grade: string;
    progress: number;
    teacherNotes: string;
    skillAssessment: string;
    completedModules: string;
    performanceSummary?: string;
    strengths?: string;
    improvements?: string;
    learningProgress?: string;
    nextSteps?: string;
    status?: string;
  }
) {
  try {
    const user = await checkTeacher();
    const existing = await prisma.academicReport.findUnique({ where: { id: reportId } });
    if (!existing) throw new Error("Report not found");
    if (!(await canAccessStudent(user, existing.studentId))) {
      throw new Error("Unauthorized: You are not assigned to this student");
    }

    const item = await prisma.academicReport.update({
      where: { id: reportId },
      data: {
        grade: data.grade,
        progress: data.progress,
        teacherNotes: data.teacherNotes,
        skillAssessment: data.skillAssessment,
        completedModules: data.completedModules,
        performanceSummary: data.performanceSummary,
        strengths: data.strengths,
        improvements: data.improvements,
        learningProgress: data.learningProgress,
        nextSteps: data.nextSteps,
        ...(data.status && { status: data.status })
      },
    });
    revalidatePath("/teacher/report-cms");
    revalidatePath("/teacher/progress-cms");
    return { success: true, item };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAcademicReport(reportId: string) {
  try {
    const user = await checkTeacher();
    const existing = await prisma.academicReport.findUnique({ where: { id: reportId } });
    if (!existing) throw new Error("Report not found");
    if (!(await canAccessStudent(user, existing.studentId))) {
      throw new Error("Unauthorized: You are not assigned to this student");
    }

    await prisma.academicReport.delete({
      where: { id: reportId },
    });
    revalidatePath("/teacher/report-cms");
    revalidatePath("/teacher/progress-cms");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateDraftReport(studentId: string, courseId: string) {
  try {
    const user = await checkTeacher();
    if (!(await canAccessStudent(user, studentId))) {
      throw new Error("Unauthorized: You are not assigned to this student");
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        mockSubmissions: {
          where: { mockTest: { courseId } }
        },
        attendanceRecords: {
          where: { courseId }
        }
      }
    });

    if (!student) throw new Error("Student not found");

    const submissions = student.mockSubmissions;
    let avgScore = 0;
    if (submissions.length > 0) {
      avgScore = submissions.reduce((acc, sub) => acc + sub.score, 0) / submissions.length;
    }

    const attendances = student.attendanceRecords;
    const present = attendances.filter(a => a.status === "PRESENT").length;
    const attPercent = attendances.length > 0 ? (present / attendances.length) * 100 : 100;

    let grade = "B";
    if (avgScore >= 90) grade = "A";
    else if (avgScore >= 80) grade = "A-";
    else if (avgScore >= 70) grade = "B";
    else if (avgScore >= 60) grade = "C";
    else grade = "D";

    const performanceSummary = `Based on the latest evaluations, ${student.name} maintains a solid ${Math.round(avgScore)}% average across recent mock test submissions, supported by a ${Math.round(attPercent)}% attendance record. Overall performance showcases steady engagement.`;
    const strengths = avgScore > 80 ? "Exhibits excellent grasp of core concepts and maintains focus during sessions." : "Demonstrates willingness to learn and participates in class activities.";
    const improvements = avgScore < 70 ? "Needs more time reviewing introductory components and practicing time management." : "Can further enhance critical thinking applications on advanced questions.";
    const learningProgress = `Has consistently shown ${avgScore > 75 ? "strong" : "moderate"} upward trajectory in the curriculum, successfully grasping key learning objectives based on current module milestones.`;
    const nextSteps = "We recommend continuing the current pace while assigning supplementary practice sets targeting weaker modules before the next summative assessment.";

    const item = await prisma.academicReport.create({
      data: {
        studentId,
        courseId,
        grade,
        progress: Math.min(100, Math.round(avgScore || 50)),
        status: "DRAFT",
        performanceSummary,
        strengths,
        improvements,
        learningProgress,
        nextSteps,
        teacherNotes: "Generated draft structure.",
        skillAssessment: "",
        completedModules: ""
      }
    });

    revalidatePath("/teacher/report-cms");
    return { success: true, item };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

