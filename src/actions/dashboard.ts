"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Role helper
async function checkAuth(allowedRoles: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
    throw new Error("Unauthorized access");
  }
  return session.user;
}

/* =========================================================================
   TERMS & CONDITIONS
   ========================================================================= */

export async function acceptTerms() {
  try {
    const user = await checkAuth(["STUDENT", "PARENT", "TEACHER", "ADMIN"]);
    await prisma.user.update({
      where: { id: user.id },
      data: { acceptedTerms: true },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUserTermsStatus() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: true, acceptedTerms: true };
    const role = session.user.role;
    if (["ADMIN", "SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(role)) {
      return { success: true, acceptedTerms: true };
    }
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { acceptedTerms: true },
    });
    return { success: true, acceptedTerms: dbUser?.acceptedTerms ?? false };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* =========================================================================
   TRIAL CONTENT
   ========================================================================= */

export async function getTrialContents() {
  try {
    const items = await prisma.trialContent.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, items };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createTrialContent(data: {
  type: string;
  title: string;
  url?: string;
  description?: string;
  isPublished: boolean;
}) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    const item = await prisma.trialContent.create({ data });
    revalidatePath("/student/trial");
    return { success: true, item };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTrialContent(
  id: string,
  data: {
    type: string;
    title: string;
    url?: string;
    description?: string;
    isPublished: boolean;
  }
) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    const item = await prisma.trialContent.update({
      where: { id },
      data,
    });
    revalidatePath("/student/trial");
    return { success: true, item };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteTrialContent(id: string) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    await prisma.trialContent.delete({ where: { id } });
    revalidatePath("/student/trial");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* =========================================================================
   COURSE VIDEOS
   ========================================================================= */

export async function getVideos(courseId: string) {
  try {
    const videos = await prisma.video.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
    });
    return { success: true, videos };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createVideo(data: {
  courseId?: string;
  campProgramId?: string;
  title: string;
  videoUrl: string;
  category?: string;
  order: number;
  isPublished: boolean;
  isTrial?: boolean;
}) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    const video = await prisma.video.create({
      data: {
        courseId: data.courseId || null,
        campProgramId: data.campProgramId,
        title: data.title,
        videoUrl: data.videoUrl,
        category: data.category,
        order: data.order,
        isPublished: data.isPublished,
        isTrial: data.isTrial,
      },
      include: {
        quizzes: {
          orderBy: { timestamp: "asc" },
        },
      },
    });
    revalidatePath("/student/trial");
    return { success: true, video };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateVideo(
  id: string,
  data: {
    title: string;
    videoUrl: string;
    category?: string;
    order: number;
    isPublished: boolean;
    isTrial?: boolean;
  }
) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    const video = await prisma.video.update({
      where: { id },
      data,
      include: {
        quizzes: {
          orderBy: { timestamp: "asc" },
        },
      },
    });
    revalidatePath("/student/trial");
    return { success: true, video };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteVideo(id: string) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    await prisma.video.delete({ where: { id } });
    revalidatePath("/student/trial");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* =========================================================================
   LEARNING MATERIALS
   ========================================================================= */

export async function getMaterials(courseId: string) {
  try {
    const materials = await prisma.material.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, materials };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createMaterial(data: {
  courseId?: string;
  campProgramId?: string;
  title: string;
  fileUrl: string;
  description?: string;
  isPublished: boolean;
  isTrial?: boolean;
}) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    const material = await prisma.material.create({
       data: {
        courseId: data.courseId || null,
        campProgramId: data.campProgramId,
        title: data.title,
        fileUrl: data.fileUrl,
        description: data.description,
        isPublished: data.isPublished,
        isTrial: data.isTrial,
      },
    });
    revalidatePath("/student/trial");
    return { success: true, material };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateMaterial(
  id: string,
  data: {
    title: string;
    fileUrl: string;
    description?: string;
    isPublished: boolean;
    isTrial?: boolean;
  }
) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    const material = await prisma.material.update({
      where: { id },
      data,
    });
    revalidatePath("/student/trial");
    return { success: true, material };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteMaterial(id: string) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    await prisma.material.delete({ where: { id } });
    revalidatePath("/student/trial");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* =========================================================================
   QUIZZES
   ========================================================================= */

export async function getMockTests(courseId?: string, isTrial: boolean = false) {
  try {
    const tests = await prisma.mockTest.findMany({
      where: {
        courseId: courseId || undefined,
        isTrial,
      },
      include: {
        questions: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, tests };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createMockTest(data: {
  courseId?: string;
  campProgramId?: string;
  title: string;
  timeLimit: number;
  passingScore: number;
  isPublished: boolean;
  isTrial: boolean;
  questionIds: string[];
}) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    const { questionIds, courseId, campProgramId, ...testData } = data;

    const test = await prisma.mockTest.create({
      data: {
        ...testData,
        courseId: courseId || null,
        campProgramId: campProgramId || null,
        questions: {
          connect: questionIds.map((id) => ({ id })),
        },
      },
    });

    revalidatePath("/student/trial");
    return { success: true, test };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateMockTest(
  id: string,
  data: {
    title: string;
    timeLimit: number;
    passingScore: number;
    isPublished: boolean;
    isTrial: boolean;
    questionIds?: string[];
  }
) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    const { questionIds, ...testData } = data;

    const test = await prisma.mockTest.update({
      where: { id },
      data: {
        ...testData,
        questions: questionIds
          ? {
            set: questionIds.map((qid) => ({ id: qid })),
          }
          : undefined,
      },
    });

    revalidatePath("/student/trial");
    return { success: true, test };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// === QUESTION BANK ACTIONS ===
export async function createBankQuestion(data: {
  courseId?: string;
  folderId?: string | null;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  topic?: string;
  difficulty?: string;
  imageUrl?: string;
}) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    const q = await prisma.mockQuestion.create({
      data: {
        courseId: data.courseId,
        folderId: data.folderId,
        questionText: data.questionText,
        options: JSON.stringify(data.options),
        correctAnswer: data.correctAnswer,
        explanation: data.explanation,
        topic: data.topic,
        difficulty: data.difficulty,
        imageUrl: data.imageUrl,
      },
    });
    return { success: true, question: q };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateBankQuestion(id: string, data: {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  topic?: string;
  difficulty?: string;
  imageUrl?: string;
}) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    const q = await prisma.mockQuestion.update({
      where: { id },
      data: {
        questionText: data.questionText,
        options: JSON.stringify(data.options),
        correctAnswer: data.correctAnswer,
        explanation: data.explanation || null,
        topic: data.topic || null,
        difficulty: data.difficulty || null,
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      },
    });
    return { success: true, question: q };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteBankQuestion(id: string) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    await prisma.mockQuestion.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteBankQuestionsInBulk(ids: string[]) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    if (!ids || ids.length === 0) throw new Error("No questions selected");
    const result = await prisma.mockQuestion.deleteMany({
      where: { id: { in: ids } },
    });
    return { success: true, deletedCount: result.count };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* =========================================================================
   QUESTION FOLDERS
   ========================================================================= */

export async function getQuestionFolders() {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    const folders = await prisma.questionFolder.findMany({
      include: { _count: { select: { questions: true } } },
      orderBy: { name: "asc" },
    });
    return { success: true, folders };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createQuestionFolder(data: {
  name: string;
  parentId?: string;
}) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    if (!data.name.trim()) throw new Error("Folder name is required");
    const folder = await prisma.questionFolder.create({
      data: {
        name: data.name.trim(),
        parentId: data.parentId || null,
      },
      include: { _count: { select: { questions: true } } },
    });
    return { success: true, folder };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function renameQuestionFolder(id: string, name: string) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    if (!name.trim()) throw new Error("Folder name is required");
    const folder = await prisma.questionFolder.update({
      where: { id },
      data: { name: name.trim() },
      include: { _count: { select: { questions: true } } },
    });
    return { success: true, folder };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteQuestionFolder(id: string) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    // Move all questions in this folder to "unfiled" (folderId = null)
    await prisma.mockQuestion.updateMany({
      where: { folderId: id },
      data: { folderId: null },
    });
    await prisma.questionFolder.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function moveQuestionsToFolder(questionIds: string[], folderId: string | null) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    if (!questionIds || questionIds.length === 0) throw new Error("No questions selected");
    await prisma.mockQuestion.updateMany({
      where: { id: { in: questionIds } },
      data: { folderId: folderId },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteMockTest(id: string) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    await prisma.mockTest.delete({ where: { id } });
    revalidatePath("/student/trial");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitMockTest(testId: string, answers: Record<string, string>, timeSpent?: Record<string, number>) {
  try {
    const user = await checkAuth(["STUDENT", "TEACHER", "ADMIN"]);
    const test = await prisma.mockTest.findUnique({
      where: { id: testId },
      include: { questions: true },
    });

    if (!test) throw new Error("Quiz not found");

    const existingSubmission = await prisma.mockSubmission.findFirst({
      where: {
        mockTestId: testId,
        studentId: user.id,
      },
    });

    if (existingSubmission && user.role === "STUDENT") {
      throw new Error("You have already submitted this quiz.");
    }

    let correctCount = 0;
    test.questions.forEach((q) => {
      const studentAns = String(answers?.[q.id] || "").toLowerCase().trim();
      const correctAns = String(q.correctAnswer || "").toLowerCase().trim();
      if (studentAns && studentAns === correctAns) {
        correctCount++;
      }
    });

    const score = (correctCount / test.questions.length) * 100;
    const isPassed = score >= test.passingScore;

    const totalSeconds = timeSpent ? Object.values(timeSpent).reduce((sum, val) => sum + val, 0) : 0;

    const submission = await prisma.mockSubmission.create({
      data: {
        mockTestId: testId,
        studentId: user.id,
        score,
        answers: JSON.stringify(answers),
        timeSpent: timeSpent ? JSON.stringify(timeSpent) : null,
        totalCompletionTime: Math.round(totalSeconds),
        isPassed,
      },
    });

    return { success: true, submission, score, isPassed };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* =========================================================================
   ACADEMIC REPORTS
   ========================================================================= */

export async function getAcademicReports(studentId: string) {
  try {
    const reports = await prisma.academicReport.findMany({
      where: { studentId },
      include: { course: true },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, reports };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createOrUpdateReport(data: {
  studentId: string;
  courseId: string;
  grade: string;
  progress: number;
  teacherNotes?: string;
  skillAssessment?: string;
  completedModules?: string;
}) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    // Find if report exists
    const existing = await prisma.academicReport.findFirst({
      where: {
        studentId: data.studentId,
        courseId: data.courseId,
      },
    });

    let report;
    if (existing) {
      report = await prisma.academicReport.update({
        where: { id: existing.id },
        data,
      });
    } else {
      report = await prisma.academicReport.create({ data });
    }

    return { success: true, report };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* =========================================================================
   ATTENDANCE
   ========================================================================= */

export async function getAttendances(courseId?: string, studentId?: string) {
  try {
    const records = await prisma.attendance.findMany({
      where: {
        courseId: courseId || undefined,
        studentId: studentId || undefined,
      },
      include: {
        student: true,
        course: true,
      },
      orderBy: { date: "desc" },
    });
    return { success: true, records };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markAttendance(data: {
  studentId: string;
  courseId: string;
  date: Date;
  status: string;
  notes?: string;
}) {
  try {
    const user = await checkAuth(["ADMIN", "TEACHER"]);

    // Check if attendance already exists for that day
    const startOfDay = new Date(data.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(data.date);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await prisma.attendance.findFirst({
      where: {
        studentId: data.studentId,
        courseId: data.courseId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    let record;
    if (existing) {
      record = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: data.status,
          notes: data.notes,
          markedById: user.id,
        },
      });
    } else {
      record = await prisma.attendance.create({
        data: {
          ...data,
          markedById: user.id,
        },
      });
    }

    return { success: true, record };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* =========================================================================
   SCHEDULES
   ========================================================================= */

export async function getSchedules({
  teacherId,
  studentId,
  courseId,
}: {
  teacherId?: string;
  studentId?: string;
  courseId?: string;
}) {
  try {
    const schedules = await prisma.schedule.findMany({
      where: {
        teacherId: teacherId || undefined,
        studentId: studentId || undefined,
        courseId: courseId || undefined,
      },
      include: {
        teacher: true,
        student: true,
        course: true,
      },
      orderBy: [
        { dayOfWeek: "asc" },
        { startTime: "asc" },
      ],
    });
    return { success: true, schedules };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createScheduleSlot(data: {
  courseId?: string;
  teacherId: string;
  studentId?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  type: string;
  isAvailable: boolean;
}) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    const schedule = await prisma.schedule.create({ data });
    return { success: true, schedule };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function bookPrivateSchedule(scheduleId: string, studentId: string) {
  try {
    await checkAuth(["ADMIN", "STUDENT"]);

    // Check if slot is available
    const slot = await prisma.schedule.findUnique({
      where: { id: scheduleId },
    });

    if (!slot || !slot.isAvailable) {
      throw new Error("This schedule slot is no longer available");
    }

    const schedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        studentId,
        isAvailable: false,
      },
    });

    return { success: true, schedule };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteSchedule(id: string) {
  try {
    await checkAuth(["ADMIN", "TEACHER"]);
    await prisma.schedule.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* =========================================================================
   SALARY MANAGEMENT
   ========================================================================= */

export async function getSalaries(teacherId?: string) {
  try {
    const salaries = await prisma.salary.findMany({
      where: {
        teacherId: teacherId || undefined,
      },
      include: {
        teacher: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, salaries };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createSalary(data: {
  teacherId: string;
  month: string;
  baseSalary: number;
  bonus: number;
  status: string;
}) {
  try {
    await checkAuth(["ADMIN"]);
    const salary = await prisma.salary.create({ data });
    return { success: true, salary };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSalaryStatus(id: string, status: string) {
  try {
    await checkAuth(["ADMIN"]);
    const salary = await prisma.salary.update({
      where: { id },
      data: { status },
    });
    return { success: true, salary };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
