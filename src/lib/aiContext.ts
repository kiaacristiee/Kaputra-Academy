import prisma from "@/lib/db";
import { canAccessStudent } from "@/lib/permissions";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────


interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  studentIdStr?: string | null;
  viewingAsStudentId?: string | null;
}

interface PlacementTestContext {
  testCode: string;
  status: string;
  score: number | null;
  qualificationStatus: string | null;
  submittedAt: string | null;
  startedAt: string | null;
  courseName: string;
  questions: {
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    studentAnswer: string | null;
    isCorrect: boolean;
    topic?: string;
  }[];
}

interface MockSubmissionContext {
  testTitle: string;
  score: number;
  isPassed: boolean;
  submittedAt: string;
  totalQuestions: number;
  correctCount: number;
  questions: {
    questionNumber: number;
    questionText: string;
    options: string[];
    correctAnswer: string;
    studentAnswer: string | null;
    isCorrect: boolean;
    explanation: string | null;
    topic: string | null;
    difficulty: string | null;
  }[];
  timeSpent: Record<string, number> | null;
}

interface EnrollmentContext {
  programName: string;
  programType: string;
  status: string;
  enrolledAt: string;
}

interface AcademicReportContext {
  courseName: string;
  grade: string;
  progress: number;
  teacherNotes: string | null;
  skillAssessment: string | null;
  completedModules: string | null;
}

interface ProgressSummary {
  totalQuizzesCompleted: number;
  averageQuizScore: number;
  totalMockTestsCompleted: number;
  averageMockTestScore: number;
  placementTestScore: number | null;
  placementTestStatus: string | null;
  currentClasses: string[];
  campPrograms: string[];
  attendanceRate: number | null;
  weakTopics: string[];
  strongTopics: string[];
}

export interface StudentAIContext {
  studentName: string;
  studentId: string | null;
  role: string;
  progressSummary: ProgressSummary;
  placementTests: PlacementTestContext[];
  mockSubmissions: MockSubmissionContext[];
  enrollments: EnrollmentContext[];
  academicReports: AcademicReportContext[];
}

export interface ParentAIContext {
  parentName: string;
  role: string;
  children: {
    childName: string;
    childId: string | null;
    context: StudentAIContext;
  }[];
}

export type AIContext = StudentAIContext | ParentAIContext | null;

// ─────────────────────────────────────────────────────────────
// Placement test config (reuse from placementTest.ts logic)
// ─────────────────────────────────────────────────────────────

async function getPlacementTestConfig() {
  try {
    const block = await prisma.contentBlock.findUnique({
      where: { section: "placement_test_config" },
    });
    if (!block) return null;
    return JSON.parse(block.content) as {
      passingScore: number;
      questions: { id: string; question: string; options: string[]; correctAnswer: string; topic?: string }[];
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Build student context
// ─────────────────────────────────────────────────────────────

async function buildStudentContext(studentId: string): Promise<StudentAIContext> {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { name: true, studentIdStr: true, role: true },
  });

  if (!student) {
    return {
      studentName: "Unknown",
      studentId: null,
      role: "STUDENT",
      progressSummary: emptyProgress(),
      placementTests: [],
      mockSubmissions: [],
      enrollments: [],
      academicReports: [],
    };
  }

  // Fetch data in parallel
  const [
    registrations,
    mockSubmissions,
    enrollments,
    academicReports,
    attendances,
    ptConfig,
  ] = await Promise.all([
    // Registrations with placement tests
    prisma.registration.findMany({
      where: { studentId },
      include: {
        placementTest: true,
        course: { select: { title: true, type: true } },
      },
    }),
    // Mock test submissions (last 10)
    prisma.mockSubmission.findMany({
      where: { studentId },
      include: {
        mockTest: {
          include: {
            questions: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: 3,
    }),
    // Enrollments
    prisma.enrollment.findMany({
      where: { studentId },
    }),
    // Academic reports
    prisma.academicReport.findMany({
      where: { studentId },
      include: { course: { select: { title: true } } },
    }),
    // Attendance
    prisma.attendance.findMany({
      where: { studentId },
      select: { status: true },
    }),
    // PT config
    getPlacementTestConfig(),
  ]);

  // ── Resolve enrollment names ──
  const enrollmentContexts: EnrollmentContext[] = [];
  for (const e of enrollments) {
    let programName = e.itemId;
    if (e.itemType === "CLASS" || e.itemType === "PLACEMENT_TEST") {
      const course = await prisma.course.findUnique({
        where: { id: e.itemId },
        select: { title: true },
      });
      if (course) programName = course.title;
    } else if (e.itemType === "CAMP") {
      const camp = await prisma.campProgram.findUnique({
        where: { id: e.itemId },
        select: { name: true },
      });
      if (camp) programName = camp.name;
    }
    enrollmentContexts.push({
      programName,
      programType: e.itemType,
      status: e.status,
      enrolledAt: e.enrolledAt.toISOString(),
    });
  }

  // ── Build placement test contexts ──
  const placementTests: PlacementTestContext[] = [];
  for (const reg of registrations) {
    if (!reg.placementTest) continue;
    const pt = reg.placementTest;

    const studentAnswers: Record<string, string> = pt.answers
      ? JSON.parse(pt.answers)
      : {};

    const questions = ptConfig?.questions?.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      studentAnswer: studentAnswers[q.id] || null,
      isCorrect: studentAnswers[q.id] === q.correctAnswer,
      topic: q.topic,
    })) || [];

    placementTests.push({
      testCode: pt.testCode,
      status: pt.status,
      score: pt.score,
      qualificationStatus: pt.qualificationStatus,
      submittedAt: pt.submittedAt?.toISOString() || null,
      startedAt: pt.startedAt?.toISOString() || null,
      courseName: reg.course.title,
      questions,
    });
  }

  // ── Build mock submission contexts ──
  const mockContexts: MockSubmissionContext[] = mockSubmissions.map((sub) => {
    const studentAnswers: Record<string, string> = sub.answers
      ? JSON.parse(sub.answers)
      : {};
    const timeSpent: Record<string, number> | null = sub.timeSpent
      ? JSON.parse(sub.timeSpent)
      : null;

    let correctCount = 0;
    const questions = sub.mockTest.questions.map((q, idx) => {
      const studentAnswer = studentAnswers[q.id] || null;
      const isCorrect =
        studentAnswer !== null &&
        String(studentAnswer).toLowerCase().trim() ===
          String(q.correctAnswer).toLowerCase().trim();
      if (isCorrect) correctCount++;

      let options: string[] = [];
      try {
        options = JSON.parse(q.options);
      } catch {
        options = [];
      }

      return {
        questionNumber: idx + 1,
        questionText: q.questionText,
        options,
        correctAnswer: q.correctAnswer,
        studentAnswer,
        isCorrect,
        explanation: q.explanation,
        topic: q.topic,
        difficulty: q.difficulty,
      };
    });

    return {
      testTitle: sub.mockTest.title,
      score: sub.score,
      isPassed: sub.isPassed,
      submittedAt: sub.submittedAt.toISOString(),
      totalQuestions: sub.mockTest.questions.length,
      correctCount,
      questions,
      timeSpent,
    };
  });

  // ── Build academic report contexts ──
  const reportContexts: AcademicReportContext[] = academicReports.map((r) => ({
    courseName: r.course.title,
    grade: r.grade,
    progress: r.progress,
    teacherNotes: r.teacherNotes,
    skillAssessment: r.skillAssessment,
    completedModules: r.completedModules,
  }));

  // ── Build progress summary ──
  const quizScores = mockContexts.map((m) => m.score);
  const avgQuiz =
    quizScores.length > 0
      ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length
      : 0;

  const latestPT = placementTests.find((pt) => pt.status === "SUBMITTED");

  // Determine weak/strong topics from mock tests
  const topicStats: Record<string, { correct: number; total: number }> = {};
  for (const sub of mockContexts) {
    for (const q of sub.questions) {
      const topic = q.topic || "General";
      if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0 };
      topicStats[topic].total++;
      if (q.isCorrect) topicStats[topic].correct++;
    }
  }

  // Also incorporate placement test topics
  for (const pt of placementTests) {
    for (const q of pt.questions) {
      const topic = q.topic || "General";
      if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0 };
      topicStats[topic].total++;
      if (q.isCorrect) topicStats[topic].correct++;
    }
  }

  const weakTopics: string[] = [];
  const strongTopics: string[] = [];
  for (const [topic, stats] of Object.entries(topicStats)) {
    if (stats.total === 0) continue;
    const rate = stats.correct / stats.total;
    if (rate < 0.5) weakTopics.push(topic);
    else if (rate >= 0.8) strongTopics.push(topic);
  }

  // Attendance rate
  let attendanceRate: number | null = null;
  if (attendances.length > 0) {
    const presentCount = attendances.filter(
      (a) => a.status === "PRESENT" || a.status === "LATE"
    ).length;
    attendanceRate = Math.round((presentCount / attendances.length) * 100);
  }

  // Current classes
  const activeClasses = enrollmentContexts
    .filter((e) => e.programType === "CLASS" && e.status === "ACTIVE")
    .map((e) => e.programName);
  const activeCamps = enrollmentContexts
    .filter((e) => e.programType === "CAMP" && e.status === "ACTIVE")
    .map((e) => e.programName);

  const progressSummary: ProgressSummary = {
    totalQuizzesCompleted: mockContexts.length,
    averageQuizScore: Math.round(avgQuiz * 100) / 100,
    totalMockTestsCompleted: mockContexts.length,
    averageMockTestScore: Math.round(avgQuiz * 100) / 100,
    placementTestScore: latestPT?.score ?? null,
    placementTestStatus: latestPT?.qualificationStatus ?? null,
    currentClasses: activeClasses,
    campPrograms: activeCamps,
    attendanceRate,
    weakTopics,
    strongTopics,
  };

  return {
    studentName: student.name,
    studentId: student.studentIdStr,
    role: student.role,
    progressSummary,
    placementTests,
    mockSubmissions: mockContexts,
    enrollments: enrollmentContexts,
    academicReports: reportContexts,
  };
}

function emptyProgress(): ProgressSummary {
  return {
    totalQuizzesCompleted: 0,
    averageQuizScore: 0,
    totalMockTestsCompleted: 0,
    averageMockTestScore: 0,
    placementTestScore: null,
    placementTestStatus: null,
    currentClasses: [],
    campPrograms: [],
    attendanceRate: null,
    weakTopics: [],
    strongTopics: [],
  };
}

// ─────────────────────────────────────────────────────────────
// Build parent context
// ─────────────────────────────────────────────────────────────

async function buildParentContext(parentId: string): Promise<ParentAIContext> {
  const parent = await prisma.user.findUnique({
    where: { id: parentId },
    select: { name: true, role: true },
  });

  const children = await prisma.user.findMany({
    where: { parentId, role: "STUDENT" },
    select: { id: true, name: true, studentIdStr: true },
  });

  const childContexts = await Promise.all(
    children.map(async (child) => ({
      childName: child.name,
      childId: child.studentIdStr,
      context: await buildStudentContext(child.id),
    }))
  );

  return {
    parentName: parent?.name || "Parent",
    role: "PARENT",
    children: childContexts,
  };
}

// ─────────────────────────────────────────────────────────────
// Main export: build context based on authenticated user
// ─────────────────────────────────────────────────────────────

export async function buildAIContext(user: SessionUser): Promise<AIContext> {
  if (!user || !user.id) return null;

  const role = user.role || "STUDENT";

  if (role === "PARENT") {
    // If parent is viewing as a specific student, check authorization and build student context
    if (user.viewingAsStudentId) {
      const allowed = await canAccessStudent({ id: user.id, role: user.role }, user.viewingAsStudentId);
      if (!allowed) return null;
      return buildStudentContext(user.viewingAsStudentId);
    }
    return buildParentContext(user.id);
  }

  if (role === "STUDENT") {
    return buildStudentContext(user.id);
  }

  // Teachers / Admins get basic context without personalized student data
  return null;
}


// ─────────────────────────────────────────────────────────────
// Format context into a prompt-friendly string
// ─────────────────────────────────────────────────────────────

export function formatContextForPrompt(context: AIContext): string {
  if (!context) return "";

  if ("children" in context) {
    // Parent context
    const parent = context as ParentAIContext;
    let result = `\n=== PARENT CONTEXT ===\nParent Name: ${parent.parentName}\nNumber of Children: ${parent.children.length}\n`;

    for (const child of parent.children) {
      result += `\n--- Child: ${child.childName} (${child.childId || "No ID"}) ---\n`;
      result += formatStudentSummary(child.context);
    }

    return result;
  }

  // Student context
  const student = context as StudentAIContext;
  return `\n=== STUDENT CONTEXT ===\n${formatStudentSummary(student)}`;
}

function formatStudentSummary(ctx: StudentAIContext): string {
  const p = ctx.progressSummary;
  let summary = `Student Name: ${ctx.studentName}\nStudent ID: ${ctx.studentId || "Not assigned"}\n`;

  // Progress Summary
  summary += `\n[Progress Summary]\n`;
  if (p.currentClasses.length > 0) {
    summary += `Current Classes: ${p.currentClasses.join(", ")}\n`;
  }
  if (p.campPrograms.length > 0) {
    summary += `Camp Programs: ${p.campPrograms.join(", ")}\n`;
  }
  if (p.placementTestScore !== null) {
    summary += `Placement Test Score: ${p.placementTestScore}/100 (${p.placementTestStatus})\n`;
  }
  if (p.totalQuizzesCompleted > 0) {
    summary += `Quizzes Completed: ${p.totalQuizzesCompleted}, Average Score: ${p.averageQuizScore}\n`;
  }
  if (p.attendanceRate !== null) {
    summary += `Attendance Rate: ${p.attendanceRate}%\n`;
  }
  if (p.weakTopics.length > 0) {
    summary += `Weak Topics (need improvement): ${p.weakTopics.join(", ")}\n`;
  }
  if (p.strongTopics.length > 0) {
    summary += `Strong Topics: ${p.strongTopics.join(", ")}\n`;
  }

  // Academic Reports
  if (ctx.academicReports.length > 0) {
    summary += `\n[Academic Reports]\n`;
    for (const r of ctx.academicReports) {
      summary += `- ${r.courseName}: Grade ${r.grade}, Progress ${r.progress}%`;
      if (r.teacherNotes) summary += ` | Teacher Notes: ${r.teacherNotes}`;
      if (r.skillAssessment) summary += ` | Skills: ${r.skillAssessment}`;
      summary += `\n`;
    }
  }

  // Placement Tests (detailed)
  if (ctx.placementTests.length > 0) {
    summary += `\n[Placement Test Details]\n`;
    for (const pt of ctx.placementTests) {
      summary += `Test Code: ${pt.testCode} | Status: ${pt.status} | Score: ${pt.score ?? "N/A"}/100 | Result: ${pt.qualificationStatus || "N/A"}\n`;
      summary += `Target Course: ${pt.courseName}\n`;
      if (pt.submittedAt) summary += `Submitted: ${pt.submittedAt}\n`;
      if (pt.questions.length > 0) {
        summary += `Questions:\n`;
        pt.questions.forEach((q, i) => {
          summary += `  Q${i + 1}: ${q.question}\n`;
          summary += `    Options: ${q.options.join(" | ")}\n`;
          summary += `    Correct Answer: ${q.correctAnswer}\n`;
          summary += `    Student Answer: ${q.studentAnswer || "Not answered"}\n`;
          summary += `    Result: ${q.isCorrect ? "✓ Correct" : "✗ Incorrect"}\n`;
          if (q.topic) summary += `    Topic: ${q.topic}\n`;
        });
      }
    }
  }

  // Mock Test Submissions (detailed)
  if (ctx.mockSubmissions.length > 0) {
    summary += `\n[Quiz/Mock Test History]\n`;
    for (const sub of ctx.mockSubmissions) {
      summary += `Test: "${sub.testTitle}" | Score: ${sub.score.toFixed(1)}% (${sub.correctCount}/${sub.totalQuestions}) | ${sub.isPassed ? "Passed" : "Failed"} | Date: ${sub.submittedAt}\n`;
      summary += `Questions:\n`;
      for (const q of sub.questions) {
        summary += `  Q${q.questionNumber}: ${q.questionText}\n`;
        summary += `    Options: ${q.options.join(" | ")}\n`;
        summary += `    Correct: ${q.correctAnswer} | Student: ${q.studentAnswer || "Not answered"} | ${q.isCorrect ? "✓" : "✗"}\n`;
        if (q.explanation) summary += `    Explanation: ${q.explanation}\n`;
        if (q.topic) summary += `    Topic: ${q.topic}\n`;
      }
    }
  }

  // Enrollments
  if (ctx.enrollments.length > 0) {
    summary += `\n[Enrollments]\n`;
    for (const e of ctx.enrollments) {
      summary += `- ${e.programName} (${e.programType}) - Status: ${e.status}\n`;
    }
  }

  return summary;
}
