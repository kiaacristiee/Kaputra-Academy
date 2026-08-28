import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import AnnouncementsClient from "./AnnouncementsClient";
import { getVisibleStudentIds } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Announcements CMS | Kaputra Academy",
};

export default async function TeacherAnnouncementsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !["TEACHER", "ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  // Fetch announcements created by this teacher
  const announcements = await prisma.announcement.findMany({
    where: { teacherId: session.user.id },
    include: {
      course: {
        select: {
          id: true,
          title: true,
        },
      },
      targetStudents: {
        select: {
          id: true,
          name: true,
          studentIdStr: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch teacher's assigned courses to populate the dropdown targeting specific classes
  const teacher = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      teachingAssignments: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });

  if (!teacher) {
    redirect("/login");
  }

  const assignedCourses = teacher.teachingAssignments.map((ta) => ta.course);

  const visibleStudentIds = await getVisibleStudentIds(session.user);

  // Fetch active students assigned to this teacher with their active enrollments
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      isActive: true,
      ...(visibleStudentIds ? { id: { in: visibleStudentIds } } : {}),
    },
    select: {
      id: true,
      name: true,
      studentIdStr: true,
      enrollments: {
        where: { status: "ACTIVE" },
        select: {
          itemId: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });


  return (
    <AnnouncementsClient
      initialAnnouncements={announcements as any}
      courses={assignedCourses}
      students={students}
    />
  );
}
