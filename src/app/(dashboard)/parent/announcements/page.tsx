import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import ParentAnnouncementsClient from "./AnnouncementsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Announcements | Parent Dashboard",
};

export default async function ParentAnnouncementsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "PARENT") {
    redirect("/login");
  }

  // Fetch parent user along with their children students
  const parent = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      children: true,
    },
  });

  if (!parent) {
    redirect("/login");
  }

  const children = parent.children || [];
  const childIds = children.map((c) => c.id);
  const childEnrollments = await prisma.enrollment.findMany({
    where: { studentId: { in: childIds }, status: "ACTIVE" },
    select: { itemId: true },
  });
  const courseIds = Array.from(new Set(childEnrollments.map((e) => e.itemId)));

  // Fetch published announcements targeted to parents/both matching children's courses or general,
  // AND either no specific targets or at least one of this parent's children is targeted
  const items = await prisma.announcement.findMany({
    where: {
      isPublished: true,
      publishDate: { lte: new Date() },
      targetAudience: { in: ["PARENTS", "BOTH"] },
      OR: [
        { courseId: null },
        { courseId: { in: courseIds } },
      ],
      AND: [
        {
          OR: [
            { targetStudents: { none: {} } }, // Broadcast to all
            { targetStudents: { some: { id: { in: childIds } } } }, // At least one child is targeted
          ],
        },
      ],
    },
    include: {
      teacher: { select: { name: true } },
      course: { select: { title: true } },
      targetStudents: {
        where: { id: { in: childIds } },
        select: { id: true, name: true },
      },
    },
    orderBy: { publishDate: "desc" },
  });

  const formatted = items.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    publishDate: a.publishDate.toISOString(),
    teacherName: a.teacher.name,
    courseName: a.course?.title || null,
    targetStudents: a.targetStudents.map((s) => s.name),
  }));

  return <ParentAnnouncementsClient initialAnnouncements={formatted} />;
}
