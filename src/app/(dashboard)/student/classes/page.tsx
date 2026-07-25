import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { BookOpen, CalendarDays, User, Mail, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Classes | Student Portal",
};

export default async function StudentClassesPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "STUDENT") {
    redirect("/login");
  }

  const student = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
      },
    },
  });

  if (!student) {
    redirect("/login");
  }

  // Get enrolled course IDs
  const courseIds = student.enrollments
    .filter((e) => e.itemType === "COURSE" || e.itemType === "CLASS" || e.itemType === "PROGRAM")
    .map((e) => e.itemId);

  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    include: {
      category: true,
      teachers: {
        include: {
          teacher: true,
        },
      },
    },
  });

  // Match enrollments that did not resolve to a database Course CUID
  const resolvedCourseIds = courses.map((c) => c.id);
  const unresolvedEnrollments = student.enrollments.filter(
    (e) => !resolvedCourseIds.includes(e.itemId)
  );

  const campIds = unresolvedEnrollments
    .filter((e) => e.itemType === "PROGRAM" || e.itemType === "CAMP")
    .map((e) => e.itemId);

  const camps = await prisma.campProgram.findMany({
    where: { id: { in: campIds } },
  });

  const campMap = new Map(camps.map((c) => [c.id, c]));

  const fallbackCourses = unresolvedEnrollments.map((e) => {
    const isProgram = e.itemType === "PROGRAM" || e.itemType === "CAMP";
    const camp = isProgram ? campMap.get(e.itemId) : null;

    return {
      id: e.id,
      title: camp ? camp.name : e.itemId,
      schedule: camp
        ? `Starts: ${new Date(camp.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
        : "Schedule to be arranged with your instructor",
      type: camp ? (camp as any).type : (isProgram ? "CAMP" : (e.itemType === "CLASS" ? "REGULAR" : "COMPETITION")),
      category: { name: isProgram ? "Camp Program" : e.itemType },
      teachers: [],
    };
  });

  const allCourses = [
    ...courses.map((c) => ({
      id: c.id,
      title: c.title,
      schedule: c.schedule,
      type: c.type,
      category: { name: c.category.name },
      teachers: c.teachers.map((t) => ({
        teacher: {
          id: t.teacher.id,
          name: t.teacher.name,
          email: t.teacher.email,
        },
      })),
    })),
    ...fallbackCourses,
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">My Classes</h1>
        <p className="text-slate-400">View and access your enrolled courses and assigned instructors.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {allCourses.length > 0 ? (
          allCourses.map((course) => (
            <div
              key={course.id}
              className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition shadow-sm"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-600/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                    {course.type}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">{course.category.name}</span>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-white">{course.title}</h2>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-3 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <CalendarDays className="h-4 w-4 text-[#CA8E25]" />
                    <span>{course.schedule}</span>
                  </div>
                </div>

                {/* Teachers List */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <p className="text-xs text-slate-400 font-bold">Class Instructors:</p>
                  {course.teachers.length > 0 ? (
                    course.teachers.map((t) => (
                      <div key={t.teacher.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
                          <User className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{t.teacher.name}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Mail className="h-3 w-3" /> {t.teacher.email}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No teacher assigned yet</p>
                  )}
                </div>
              </div>

              <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2 flex items-center justify-center gap-1.5 text-sm">
                Access Classroom
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-slate-950 border border-slate-800 p-10 rounded-2xl text-center text-slate-400 shadow-sm">
            <BookOpen className="h-10 w-10 text-slate-500 mx-auto mb-3" />
            You are not enrolled in any classes yet.
            <br />
            <Link href="/catalog" className="text-[#CA8E25] font-bold mt-2 inline-block hover:underline">
              Browse Classes
            </Link>
          </div>
        )}
      </div>

      {allCourses.length > 0 && (
        <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-sm">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#CA8E25]" />
            Your Time Matrix
          </h3>
          <div className="space-y-3">
            {allCourses.map((course) => (
              <div key={course.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800 gap-2 shadow-sm">
                <div>
                  <p className="font-bold text-white text-sm">{course.title}</p>
                  <p className="text-xs text-slate-400">Type: {course.type}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs text-[#9B6A1A] font-bold bg-[#CA8E25]/10 border border-[#CA8E25]/20 px-3.5 py-1 rounded-full font-mono">
                  {course.schedule}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
