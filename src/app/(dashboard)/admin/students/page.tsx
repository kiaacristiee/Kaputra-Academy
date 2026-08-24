import prisma from "@/lib/db";
import StudentsClient from "./StudentsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Students | Admin Dashboard",
};

export default async function StudentsPage() {
  const [students, courses, camps] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "STUDENT",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        studentIdStr: true,
        isDisabled: true,
        createdAt: true,
      },
    }),
    prisma.course.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        title: true,
        type: true,
        price: true,
        pricePrivateOnce: true,
        pricePrivateTwice: true,
        priceSemiPrivateOnce: true,
        priceSemiPrivateTwice: true,
        registrationFee: true,
      },
      orderBy: { title: "asc" },
    }),
    prisma.campProgram.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        title: true,
        price: true,
      },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Students</h1>
        <p className="text-slate-400">Manage all registered students and enroll them into classes or camps.</p>
      </div>

      <StudentsClient students={students} courses={courses} camps={camps} />
    </div>
  );
}