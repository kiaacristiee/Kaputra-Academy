import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import MockTestClient from "../../student/mock-test/MockTestClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manage Quizzes | Admin | Kaputra Academy",
};

export default async function AdminMockTestsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const courses = await prisma.course.findMany({
    include: {
      mockTests: {
        include: {
          questions: true,
          submissions: {
            include: {
              student: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return (
    <MockTestClient
      initialCourses={courses}
      isUnlocked={true}
      userRole="ADMIN"
    />
  );
}
