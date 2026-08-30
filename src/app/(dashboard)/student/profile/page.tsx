import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";
import { getGradeLabel } from "@/lib/grades";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Profile | Student Portal",
};

export default async function StudentProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "STUDENT") {
    redirect("/login");
  }

  const [student, registrations, activeEnrollments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        parent: true,
      },
    }),
    prisma.registration.findMany({
      where: { studentId: session.user.id, status: "APPROVED" },
      select: { grade: true, courseId: true },
    }),
    prisma.enrollment.findMany({
      where: { studentId: session.user.id, status: "ACTIVE" },
    }),
  ]);

  if (!student) {
    redirect("/login");
  }

  // Get active grade labels
  const gradeValues = Array.from(
    new Set(registrations.map((r) => r.grade).filter(Boolean) as string[])
  );
  const enrolledGrades =
    gradeValues.map((g) => getGradeLabel(g)).join(", ") || "Not specified";

  // Course IDs from enrollments + approved registrations
  const courseIds = Array.from(
    new Set([
      ...activeEnrollments.filter((e) => e.itemType !== "CAMP").map((e) => e.itemId),
      ...registrations.map((r) => r.courseId).filter(Boolean),
    ])
  );

  const campIds = Array.from(
    new Set(
      activeEnrollments.filter((e) => e.itemType === "CAMP").map((e) => e.itemId)
    )
  );

  const [courses, camps] = await Promise.all([
    prisma.course.findMany({
      where: { id: { in: courseIds.length > 0 ? courseIds : ["NONE"] } },
      select: { id: true, title: true, type: true },
    }),
    prisma.campProgram.findMany({
      where: { id: { in: campIds.length > 0 ? campIds : ["NONE"] } },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <ProfileClient
      user={student}
      enrolledGrades={enrolledGrades}
      enrolledCourses={courses}
      enrolledCamps={camps}
    />
  );
}
