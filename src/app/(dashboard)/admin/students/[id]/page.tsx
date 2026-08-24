import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import StudentActionClient from "./StudentActionClient";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [student, courses, campsData] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        parent: {
          select: { name: true, email: true, phone: true },
        },
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
      where: { visibility: "PUBLISHED" },
      select: {
        id: true,
        name: true,
        price: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const camps = campsData.map((c) => ({
    id: c.id,
    title: c.name,
    price: c.price,
  }));

  if (!student) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Student Details</h1>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">{student.name}</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-slate-400 text-sm">Student ID</p>
            <p className="text-white font-mono">{student.studentIdStr || "—"}</p>
          </div>

          <div>
            <p className="text-slate-400 text-sm">Role</p>
            <p className="text-white">{student.role}</p>
          </div>

          <div>
            <p className="text-slate-400 text-sm">Parent Name</p>
            <p className="text-white">{student.parent?.name || "Not linked"}</p>
          </div>

          <div>
            <p className="text-slate-400 text-sm">Parent Email</p>
            <p className="text-white">{student.parent?.email || "—"}</p>
          </div>

          <div>
            <p className="text-slate-400 text-sm">Registered</p>
            <p className="text-white">{new Date(student.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <StudentActionClient
          student={{
            id: student.id,
            name: student.name,
            studentIdStr: student.studentIdStr,
          }}
          initialIsDisabled={student.isDisabled || false}
          courses={courses}
          camps={camps}
        />
      </div>
    </div>
  );
}