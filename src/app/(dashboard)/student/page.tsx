import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import StudentDashboardClient from "./StudentDashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Student Dashboard | Kaputra Academy",
};

export default async function StudentDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "STUDENT") {
    redirect("/login");
  }

  // Fetch student profile and active enrollments
  const student = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      parent: true,
      enrollments: {
        where: { status: "ACTIVE" },
      },
    },
  });

  if (!student) {
    redirect("/login");
  }

  // Map out enrolled course IDs
  const courseIds = student.enrollments
    .filter((e) => e.itemType === "COURSE" || e.itemType === "CLASS" || e.itemType === "PROGRAM")
    .map((e) => e.itemId);

  // Fetch course details, camp programs & registrations, placement test, and announcements concurrently
  const [enrolledCourses, campsData, placementTest, latestAnnouncements] = await Promise.all([
    prisma.course.findMany({
      where: {
        id: { in: courseIds },
      },
      include: {
        category: true,
        teachers: {
          include: {
            teacher: true,
          },
        },
      },
    }),
    // Camp programs and student's camp registrations
    (async () => {
      const resolvedCourseIds_pre = await prisma.course.findMany({
        where: { id: { in: courseIds } },
        select: { id: true },
      });
      const resolvedIds = resolvedCourseIds_pre.map((c) => c.id);
      const unresolvedEnrollments = student.enrollments.filter(
        (e) => !resolvedIds.includes(e.itemId)
      );
      const campIds = unresolvedEnrollments
        .filter((e) => e.itemType === "PROGRAM" || e.itemType === "CAMP")
        .map((e) => e.itemId);

      const [camps, campRegs] = await Promise.all([
        prisma.campProgram.findMany({
          where: { id: { in: campIds } },
        }),
        prisma.campRegistration.findMany({
          where: {
            studentId: session.user.id,
            campProgramId: { in: campIds },
          },
          include: {
            slots: {
              include: {
                campSchedule: {
                  include: {
                    teacher: { select: { id: true, name: true, email: true } },
                  },
                },
              },
            },
          },
        }),
      ]);

      return { camps, campRegs };
    })(),
    // Placement test
    student.studentIdStr
      ? prisma.placementTest.findUnique({
          where: { studentIdStr: student.studentIdStr },
        })
      : Promise.resolve(null),
    // Announcements
    prisma.announcement.findMany({
      where: {
        isPublished: true,
        publishDate: { lte: new Date() },
        targetAudience: { in: ["STUDENTS", "BOTH"] },
        OR: [
          { courseId: null },
          { courseId: { in: courseIds } },
        ],
        AND: [
          {
            OR: [
              { targetStudents: { none: {} } },
              { targetStudents: { some: { id: session.user.id } } },
            ],
          },
        ],
      },
      include: {
        teacher: { select: { name: true } },
        course: { select: { title: true } },
      },
      orderBy: { publishDate: "desc" },
      take: 5,
    }),
  ]);

  const coursesWithDetails = enrolledCourses.map((course) => ({
    id: course.id,
    title: course.title,
    schedule: course.schedule,
    price: course.price,
    type: course.type,
    categoryName: course.category.name,
    teachers: course.teachers.map((t) => ({
      id: t.teacher.id,
      name: t.teacher.name,
      email: t.teacher.email,
    })),
  }));

  // Match enrollments that did not resolve to a database Course CUID
  const resolvedCourseIds = enrolledCourses.map((c) => c.id);
  const unresolvedEnrollments = student.enrollments.filter(
    (e) => !resolvedCourseIds.includes(e.itemId)
  );

  const { camps, campRegs } = campsData;
  const campMap = new Map(camps.map((c) => [c.id, c]));
  const campRegMap = new Map(campRegs.map((r) => [r.campProgramId, r]));

  const fallbackCourses = unresolvedEnrollments.map((e) => {
    const isProgram = e.itemType === "PROGRAM" || e.itemType === "CAMP";
    const camp = isProgram ? campMap.get(e.itemId) : null;
    const reg = isProgram ? campRegMap.get(e.itemId) : null;

    let scheduleText = "Schedule to be arranged with your instructor";
    let teachers: { id: string; name: string; email: string }[] = [];

    if (camp) {
      if (reg && reg.slots && reg.slots.length > 0) {
        const freqText = reg.sessionFrequency === "1x_WEEK" ? "1x/week (4 Sessions/mo)" : "2x/week (8 Sessions/mo)";
        const slotText = reg.slots
          .map((s) => `${s.campSchedule.className} • ${s.campSchedule.dayOfWeek} (${s.campSchedule.startTime}-${s.campSchedule.endTime})`)
          .join(" & ");
        scheduleText = `${freqText} | ${slotText}`;

        reg.slots.forEach((s) => {
          if (s.campSchedule.teacher && !teachers.some((t) => t.id === s.campSchedule.teacher!.id)) {
            teachers.push({
              id: s.campSchedule.teacher.id,
              name: s.campSchedule.teacher.name,
              email: s.campSchedule.teacher.email,
            });
          }
        });
      } else {
        scheduleText = `Starts: ${new Date(camp.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
      }
    }
    
    return {
      id: e.id,
      title: camp ? camp.name : e.itemId,
      schedule: scheduleText,
      price: reg && reg.price != null ? reg.price : (camp ? camp.price : 0),
      type: camp ? (camp as any).type : (isProgram ? "CAMP" : (e.itemType === "CLASS" ? "REGULAR" : "COMPETITION")),
      categoryName: isProgram ? "Camp Program" : e.itemType,
      teachers,
    };
  });

  const allCoursesWithDetails = [...coursesWithDetails, ...fallbackCourses];

  const formattedAnnouncements = latestAnnouncements.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    publishDate: a.publishDate.toISOString(),
    teacherName: a.teacher.name,
    courseName: a.course?.title || null,
  }));

  return (
    <StudentDashboardClient
      studentName={student.name}
      studentIdStr={student.studentIdStr}
      courses={allCoursesWithDetails}
      placementTest={placementTest ? {
        id: placementTest.id,
        testCode: placementTest.testCode,
        status: placementTest.status,
        score: placementTest.score,
        qualificationStatus: placementTest.qualificationStatus,
        submittedAt: placementTest.submittedAt,
      } : null}
      announcements={formattedAnnouncements}
    />
  );
}
