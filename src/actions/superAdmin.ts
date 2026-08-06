"use server";

import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { randomBytes } from "crypto";
import { sendAdminActivationEmail } from "@/lib/email";

export async function getSuperAdminDashboardData() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdminRole(session.user.role)) {
    throw new Error("Unauthorized: Super Admin access required.");
  }

  const now = new Date();
  
  // Date boundaries
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const todayDay = days[now.getDay()];

  try {
    // ----------------------------------------------------
    // Section 1 & 2: Counts and Revenues
    // ----------------------------------------------------
    const [
      totalStudents,
      totalParents,
      totalTeachers,
      totalActiveClasses,
      totalCampPrograms,
      todaysClassesCount,
      privateSessionsTodayCount,
      pendingPaymentsCount,
      pendingEmailsCount,
      pendingPlacementTestsCount,
      unreadChatsCount,
      outstandingInvoicesCount,
      rejectedInvoicesCount,
    ] = await Promise.all([
      // Total Students
      prisma.user.count({ where: { role: "STUDENT" } }),
      // Total Parents
      prisma.user.count({ where: { role: "PARENT" } }),
      // Total Teachers
      prisma.user.count({ where: { role: "TEACHER" } }),
      // Active enrollment items
      prisma.enrollment.count({ where: { status: "ACTIVE" } }),
      // Camp programs
      prisma.campProgram.count(),
      // Today's schedule slots
      prisma.schedule.count({ where: { dayOfWeek: todayDay } }),
      // Private sessions today
      prisma.privateSession.count({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
          status: "SCHEDULED"
        }
      }),
      // Pending payments (waiting manual upload verification)
      prisma.invoice.count({ where: { status: "WAITING_VERIFICATION" } }),
      // Pending email approvals
      prisma.emailDraft.count({ where: { status: "PENDING_APPROVAL" } }),
      // Pending Placement tests: SUBMITTED but not scored/reviewed yet
      prisma.placementTest.count({
        where: {
          submittedAt: { not: null },
          qualificationStatus: null
        }
      }),
      // Live chats: NEW or WAITING_REPLY
      prisma.liveChatSession.count({
        where: { status: { in: ["NEW", "WAITING_REPLY"] } }
      }),
      // Outstanding / Unpaid pending invoices
      prisma.invoice.count({ where: { status: "PENDING" } }),
      // Rejected invoices
      prisma.invoice.count({ where: { status: "REJECTED" } }),
    ]);

    // Financial summaries
    const [
      revenueTodayAgg,
      revenueThisWeekAgg,
      revenueThisMonthAgg,
      outstandingAmountAgg,
    ] = await Promise.all([
      // Revenue Today
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: "PAID", paidAt: { gte: startOfDay, lte: startOfDay } } // wait, lte should be endOfDay
      }),
      // Revenue this week
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: "PAID", paidAt: { gte: startOfWeek } }
      }),
      // Revenue this month
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: "PAID", paidAt: { gte: startOfMonth } }
      }),
      // Outstanding unpaid Invoices
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: "PENDING" }
      }),
    ]);

    // Apply properly using endOfDay for local today calculation
    const revenueTodayFinal = await prisma.invoice.aggregate({
      _sum: { amount: true },
      where: { status: "PAID", paidAt: { gte: startOfDay, lte: endOfDay } }
    });

    const revenueToday = revenueTodayFinal._sum.amount || 0;
    const revenueThisWeek = revenueThisWeekAgg._sum.amount || 0;
    const revenueThisMonth = revenueThisMonthAgg._sum.amount || 0;
    const outstandingAmount = outstandingAmountAgg._sum.amount || 0;

    // ----------------------------------------------------
    // Section 3: Academy Live Activity Feed (Chronological Union)
    // ----------------------------------------------------
    const [
      recentStudents,
      recentPayments,
      recentReports,
      recentPTs,
      recentQuizzes,
      recentCampRegs,
    ] = await Promise.all([
      prisma.user.findMany({
        where: { role: "STUDENT" },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma.invoice.findMany({
        where: { status: "PAID" },
        orderBy: { paidAt: "desc" },
        include: { student: true },
        take: 5
      }),
      prisma.academicReport.findMany({
        orderBy: { createdAt: "desc" },
        include: { student: true, course: true },
        take: 5
      }),
      prisma.placementTest.findMany({
        where: { submittedAt: { not: null } },
        orderBy: { submittedAt: "desc" },
        include: { registration: true },
        take: 5
      }),
      prisma.mockSubmission.findMany({
        orderBy: { submittedAt: "desc" },
        include: { student: true, mockTest: true },
        take: 5
      }),
      prisma.campRegistration.findMany({
        orderBy: { createdAt: "desc" },
        include: { campProgram: true },
        take: 5
      })
    ]);

    // Format & combine into unified feed
    const activities: any[] = [];
    
    recentStudents.forEach(item => {
      activities.push({
        id: `student-${item.id}`,
        type: "STUDENT_REGISTRATION",
        description: `New student registered: "${item.name}" (${item.email || "No Email"})`,
        time: item.createdAt
      });
    });

    recentPayments.forEach(item => {
      activities.push({
        id: `payment-${item.id}`,
        type: "PAYMENT_APPROVED",
        description: `Invoice paid: ID ${item.invoiceNumber} by "${item.student.name}" (Rp ${item.amount.toLocaleString()})`,
        time: item.paidAt || item.updatedAt
      });
    });

    recentReports.forEach(item => {
      activities.push({
        id: `report-${item.id}`,
        type: "REPORT_SUBMITTED",
        description: `Teacher submitted report for "${item.student.name}" in course: "${item.course.title}" (Grade: ${item.grade})`,
        time: item.updatedAt
      });
    });

    recentPTs.forEach(item => {
      activities.push({
        id: `pt-${item.id}`,
        type: "PLACEMENT_TEST_COMPLETED",
        description: `Placement test code ${item.testCode} submitted by "${item.registration.studentName}" (Score: ${item.score || 0})`,
        time: item.submittedAt || item.updatedAt
      });
    });

    recentQuizzes.forEach(item => {
      activities.push({
        id: `quiz-${item.id}`,
        type: "QUIZ_SUBMITTED",
        description: `Student "${item.student.name}" submitted quiz "${item.mockTest.title}" (Score: ${item.score}/${item.mockTest.passingScore} - ${item.isPassed ? 'PASSED' : 'FAILED'})`,
        time: item.submittedAt
      });
    });

    recentCampRegs.forEach(item => {
      activities.push({
        id: `camp-${item.id}`,
        type: "CAMP_REGISTRATION",
        description: `Registered "${item.studentName}" for camp program "${item.campProgram.name}" (Status: ${item.status})`,
        time: item.createdAt
      });
    });

    // Sort descending by time
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const finalActivities = activities.slice(0, 15);

    // ----------------------------------------------------
    // Section 5: Payment Details
    // ----------------------------------------------------
    const [
      pendingPaymentList,
      approvedTodayCount,
      rejectedTodayCount,
      latestReceiptUploads,
    ] = await Promise.all([
      prisma.invoice.findMany({
        where: { status: "WAITING_VERIFICATION" },
        include: { student: true },
        orderBy: { updatedAt: "desc" }
      }),
      prisma.invoice.count({
        where: { status: "PAID", paidAt: { gte: startOfDay, lte: endOfDay } }
      }),
      prisma.invoice.count({
        where: {
          status: "REJECTED",
          updatedAt: { gte: startOfDay, lte: endOfDay }
        }
      }),
      prisma.invoice.findMany({
        where: { receiptUrl: { not: null } },
        orderBy: { updatedAt: "desc" },
        include: { student: true },
        take: 5
      })
    ]);

    // ----------------------------------------------------
    // Section 6: Placement Test details
    // ----------------------------------------------------
    const [
      ptStudentsWaitingCount,
      ptCompletedTodayCount,
      ptQualifiedCompetitionCount,
      ptQualifiedRegularCount,
      ptScoreAgg,
    ] = await Promise.all([
      prisma.placementTest.count({ where: { status: "NOT_STARTED" } }),
      prisma.placementTest.count({
        where: { submittedAt: { gte: startOfDay, lte: endOfDay } }
      }),
      prisma.placementTest.count({
        where: { qualificationStatus: "QUALIFIED_COMPETITION" }
      }),
      prisma.placementTest.count({
        where: { qualificationStatus: "QUALIFIED_REGULAR" }
      }),
      prisma.placementTest.aggregate({
        _avg: { score: true },
        where: { score: { not: null } }
      })
    ]);
    const ptAverageScore = ptScoreAgg._avg.score || 0;

    // ----------------------------------------------------
    // Section 7: Academic details
    // ----------------------------------------------------
    const [
      quizScoreAgg,
      attendancePresentCount,
      attendanceTotalCount,
      academicReportsPendingCount,
      academicReportsSentCount,
    ] = await Promise.all([
      prisma.mockSubmission.aggregate({ _avg: { score: true } }),
      prisma.attendance.count({ where: { status: "PRESENT" } }),
      prisma.attendance.count(),
      prisma.academicReport.count({ where: { status: "DRAFT" } }),
      prisma.academicReport.count({ where: { status: "SUBMITTED" } })
    ]);
    const averageQuizScore = quizScoreAgg._avg.score || 0;
    const averageAttendance = attendanceTotalCount > 0 
      ? Math.round((attendancePresentCount / attendanceTotalCount) * 100) 
      : 100;

    // ----------------------------------------------------
    // Section 8: Live chat details
    // ----------------------------------------------------
    const [
      unreadChats,
      latestConversations,
    ] = await Promise.all([
      prisma.liveChatSession.findMany({
        where: { status: { in: ["NEW", "WAITING_REPLY"] } },
        include: { user: true },
        orderBy: { updatedAt: "desc" },
        take: 5
      }),
      prisma.liveChatSession.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          user: true,
          messages: { orderBy: { createdAt: "desc" }, take: 1 }
        },
        take: 6
      })
    ]);

    // ----------------------------------------------------
    // Section 9: Email Workflow stats
    // ----------------------------------------------------
    const [
      emailDraftCount,
      emailSentTodayCount,
      emailFailedCount,
    ] = await Promise.all([
      prisma.emailDraft.count({ where: { status: "PENDING_APPROVAL" } }),
      prisma.emailDraft.count({
        where: { status: "SENT", updatedAt: { gte: startOfDay, lte: endOfDay } }
      }),
      prisma.emailDraft.count({ where: { status: "REJECTED" } }) // or failed status
    ]);

    // ----------------------------------------------------
    // Section 10: System stats
    // ----------------------------------------------------
    const [
      videoCount,
      materialCount,
      questionBankCount,
    ] = await Promise.all([
      prisma.video.count(),
      prisma.material.count(),
      prisma.mockQuestion.count(),
    ]);

    // ----------------------------------------------------
    // Right Sidebar Schedule & Camps
    // ----------------------------------------------------
    const [
      todayScheduleList,
      upcomingCampList,
      upcomingPrivateSessionsList,
    ] = await Promise.all([
      prisma.schedule.findMany({
        where: { dayOfWeek: todayDay },
        include: { course: true, teacher: true, student: true },
        orderBy: { startTime: "asc" }
      }),
      prisma.campProgram.findMany({
        where: { startDate: { gte: now } },
        orderBy: { startDate: "asc" },
        take: 3
      }),
      prisma.privateSession.findMany({
        where: {
          date: { gte: startOfDay },
          status: "SCHEDULED"
        },
        include: { teacher: true, student: true, course: true },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take: 5
      })
    ]);

    return {
      success: true,
      stats: {
        totalStudents,
        totalParents,
        totalTeachers,
        totalActiveClasses,
        totalCampPrograms,
        todaysClassesCount,
        privateSessionsTodayCount,
        pendingPaymentsCount,
        pendingEmailsCount,
        pendingPlacementTestsCount,
        unreadChatsCount,
        revenueToday,
        revenueThisWeek,
        revenueThisMonth,
        outstandingAmount,
        outstandingInvoicesCount,
        rejectedInvoicesCount,
      },
      activities: JSON.parse(JSON.stringify(finalActivities)),
      payments: {
        pendingList: JSON.parse(JSON.stringify(pendingPaymentList)),
        approvedToday: approvedTodayCount,
        rejectedToday: rejectedTodayCount,
        latestReceipts: JSON.parse(JSON.stringify(latestReceiptUploads))
      },
      placementTests: {
        waitingCount: ptStudentsWaitingCount,
        completedToday: ptCompletedTodayCount,
        qualifiedComp: ptQualifiedCompetitionCount,
        qualifiedReg: ptQualifiedRegularCount,
        averageScore: Math.round(ptAverageScore * 10) / 10
      },
      academic: {
        avgQuizScore: Math.round(averageQuizScore * 10) / 10,
        avgAttendance: averageAttendance,
        reportsPending: academicReportsPendingCount,
        reportsSent: academicReportsSentCount
      },
      support: {
        unreadCount: unreadChatsCount,
        unreadList: JSON.parse(JSON.stringify(unreadChats)),
        latestConversations: JSON.parse(JSON.stringify(latestConversations))
      },
      emails: {
        drafts: emailDraftCount,
        pendingApproval: emailDraftCount,
        sentToday: emailSentTodayCount,
        failed: emailFailedCount
      },
      system: {
        videoCount,
        materialCount,
        questionBankCount
      },
      sidebar: {
        todaySchedule: JSON.parse(JSON.stringify(todayScheduleList)),
        upcomingCamps: JSON.parse(JSON.stringify(upcomingCampList)),
        upcomingPrivate: JSON.parse(JSON.stringify(upcomingPrivateSessionsList))
      }
    };
  } catch (err: any) {
    console.error("Super Admin Dashboard fetch failed:", err);
    return {
      success: false,
      error: err.message || "Failed to load dashboard data."
    };
  }
}

export async function createSuperAdmin(data: { name: string; email: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["OWNER", "CO_OWNER"].includes(session.user.role)) {
      throw new Error("Only owners can create Super Admins.");
    }

    const { name, email } = data;
    if (!name || !email) throw new Error("Name and Email are required.");

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("A user with this email already exists.");
    }

    const token = randomBytes(32).toString("hex");
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // 24 hours validity

    const bcrypt = require("bcryptjs");
    const temporaryPassword = randomBytes(8).toString("hex");
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const newAdmin = await prisma.user.create({
      data: {
        name,
        email,
        role: "SUPER_ADMIN",
        isActive: false, // Inactive until password is set
        activationToken: token,
        activationExpires: expires,
        passwordHash: passwordHash,
      },
    });

    await sendAdminActivationEmail(newAdmin.email, newAdmin.name, token);

    return { success: true };
  } catch (error: any) {
    console.error("Failed to create super admin:", error);
    return { success: false, error: error.message };
  }
}

// ----------------------------------------------------
// STANDARD ADMIN MANAGEMENT
// ----------------------------------------------------

export async function getStandardAdmins() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role)) {
    throw new Error("Unauthorized access.");
  }
  
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      isDisabled: true,
      createdAt: true,
      // last login could be inferred from sessions or generic. For now just include standard fields.
    },
    orderBy: { createdAt: "desc" }
  });
  
  return { success: true, admins };
}

export async function createStandardAdmin(data: { name: string; email: string; phone?: string; position?: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role)) {
      throw new Error("Unauthorized access.");
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new Error("User with this email already exists.");
    }

    const { name, email, phone } = data;
    const bcrypt = require("bcryptjs");
    const temporaryPassword = randomBytes(8).toString("hex");
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const token = randomBytes(32).toString("hex");
    
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    const newAdmin = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        role: "ADMIN",
        isActive: false,
        passwordHash,
        activationToken: token,
        activationExpires: expires,
      }
    });

    await sendAdminActivationEmail(newAdmin.email, newAdmin.name, token);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateStandardAdmin(id: string, data: { name: string; email: string; phone?: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role)) {
      throw new Error("Unauthorized access.");
    }
    
    // Prevent affecting non-ADMIN users
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== "ADMIN") throw new Error("Target user is not a Standard Admin.");

    await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
      }
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleAdminStatus(id: string, isDisabled: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role)) {
      throw new Error("Unauthorized access.");
    }
    
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== "ADMIN") throw new Error("Target user is not a Standard Admin.");

    await prisma.user.update({
      where: { id },
      data: { isDisabled }
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteStandardAdmin(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role)) {
      throw new Error("Unauthorized access.");
    }
    
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== "ADMIN") throw new Error("Target user is not a Standard Admin.");

    await prisma.user.delete({ where: { id } });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

import { sendAdminPasswordResetEmail } from "@/lib/email";

export async function adminPasswordReset(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role)) {
      throw new Error("Unauthorized access.");
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== "ADMIN") throw new Error("Target user is not a Standard Admin.");

    const token = randomBytes(32).toString("hex");
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    await prisma.user.update({
      where: { id },
      data: {
        activationToken: token,
        activationExpires: expires,
      }
    });

    await sendAdminPasswordResetEmail(target.email, target.name, token);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
