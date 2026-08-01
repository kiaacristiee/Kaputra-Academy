import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import MaterialsClient from "../../student/materials/MaterialsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manage Materials | Kaputra Academy",
};

export default async function TeacherMaterialsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const teacherAssignments = await prisma.teacherAssignment.findMany({
    where: { teacherId: session.user.id },
    include: {
      course: {
        include: {
          materials: {
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  const courses = teacherAssignments.map((ta) => ta.course);

  return (
    <MaterialsClient
      initialCourses={courses as any}
      isUnlocked={true}
      userRole="TEACHER"
    />
  );
}
