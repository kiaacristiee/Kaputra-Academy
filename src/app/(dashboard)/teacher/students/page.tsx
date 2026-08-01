import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, GraduationCap, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Student List | Kaputra Academy",
};

export default async function TeacherStudentListPage({
  searchParams,
}: {
  searchParams: { courseId?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  // Get teacher assignments
  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId: session.user.id },
    include: {
      course: true,
    },
  });

  const courseIds = assignments.map((a) => a.courseId);
  const filterCourseId = searchParams?.courseId;

  // If a specific course is filtered, only show students for that course
  const targetCourseIds = filterCourseId && courseIds.includes(filterCourseId)
    ? [filterCourseId]
    : courseIds;

  // Fetch enrollments with student, parent data
  const enrollments = await prisma.enrollment.findMany({
    where: {
      itemId: { in: targetCourseIds },
      itemType: "CLASS",
      status: "ACTIVE",
    },
    include: {
      student: {
        include: {
          parent: true,
        },
      },
    },
  });

  // Map course titles
  const courseMap = new Map(assignments.map((a) => [a.courseId, a.course.title]));

  // Build student data
  const students = enrollments.map((e) => {
    return {
      id: e.student.id,
      name: e.student.name,
      studentIdStr: e.student.studentIdStr || "—",
      email: e.student.email,
      parentName: e.student.parent?.name || "Not linked",
      isDisabled: (e.student as any).isDisabled || false,
      courseId: e.itemId,
      courseName: courseMap.get(e.itemId) || "Unknown",
    };
  });

  // Get the course filter name for display
  const filterCourseName = filterCourseId ? courseMap.get(filterCourseId) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Users className="h-8 w-8 text-[#CA8E25]" />
          Student List
        </h1>
        <p className="text-slate-400 mt-2">
          {filterCourseName
            ? `Showing students enrolled in "${filterCourseName}"`
            : "View all students enrolled in your assigned classes."}
        </p>
      </div>

      {/* Course Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <Link href="/teacher/students">
          <span
            className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border transition cursor-pointer ${
              !filterCourseId
                ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
            }`}
          >
            All Classes
          </span>
        </Link>
        {assignments.map((a) => (
          <Link key={a.courseId} href={`/teacher/students?courseId=${a.courseId}`}>
            <span
              className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border transition cursor-pointer ${
                filterCourseId === a.courseId
                  ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
              }`}
            >
              {a.course.title}
            </span>
          </Link>
        ))}
      </div>

      {/* Student Grid */}
      {students.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {students.map((student) => (
            <div
              key={`${student.id}-${student.courseId}`}
              className="bg-slate-950 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition shadow-lg space-y-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#CA8E25]/10 border border-[#CA8E25]/20 flex items-center justify-center text-[#CA8E25] font-bold text-lg shrink-0">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{student.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${student.isDisabled ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                      {student.isDisabled ? "Disabled" : "Active"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Class:</span>
                  <span className="text-white font-medium truncate ml-2">{student.courseName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Parent:</span>
                  <span className="text-white font-medium truncate ml-2">{student.parentName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-white font-medium truncate ml-2">{student.email}</span>
                </div>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 p-12 rounded-2xl text-center text-slate-400 max-w-xl mx-auto space-y-3">
          <Users className="h-10 w-10 text-[#CA8E25] mx-auto opacity-50" />
          <p className="font-bold text-white text-lg">No students found</p>
          <p className="text-sm">
            {filterCourseId
              ? "No students are currently enrolled in this class."
              : "No students are enrolled in any of your assigned classes."}
          </p>
        </div>
      )}
    </div>
  );
}
