import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { Users, GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Students | Kaputra Academy",
};

export default async function TeacherStudentListPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  // Get students directly assigned to this teacher
  const studentAssignments = await (prisma as any).studentTeacherAssignment.findMany({
    where: { teacherId: session.user.id },
    include: {
      student: {
        include: {
          parent: { select: { name: true } },
          enrollments: {
            where: { status: "ACTIVE" },
            select: { itemId: true, itemType: true },
          },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  // Fetch all course and camp names for enrollment lookups
  const [courses, campPrograms] = await Promise.all([
    prisma.course.findMany({ select: { id: true, title: true } }),
    prisma.campProgram.findMany({ select: { id: true, name: true } }),
  ]);

  const nameMap: Record<string, string> = {};
  courses.forEach((c: any) => { nameMap[c.id] = c.title; });
  campPrograms.forEach((c: any) => { nameMap[c.id] = c.name; });

  // Build student data with programs
  const students = studentAssignments.map((sa: any) => ({
    id: sa.student.id,
    name: sa.student.name,
    studentIdStr: sa.student.studentIdStr || "—",
    parentName: sa.student.parent?.name || "Not linked",
    isDisabled: sa.student.isDisabled || false,
    programs: sa.student.enrollments.map((e: any) => ({
      name: nameMap[e.itemId] || "Unknown",
      type: e.itemType,
    })),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Users className="h-8 w-8 text-[#CA8E25]" />
          My Students
        </h1>
        <p className="text-slate-400 mt-2">
          Students assigned to you and their enrolled programs.
        </p>
      </div>

      {/* Student Grid */}
      {students.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {students.map((student: any) => (
            <div
              key={student.id}
              className="bg-slate-950 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition shadow-lg space-y-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#CA8E25]/10 border border-[#CA8E25]/20 flex items-center justify-center text-[#CA8E25] font-bold text-lg shrink-0">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{student.name}</h3>
                  <p className="text-xs font-mono text-[#CA8E25] mt-0.5">{student.studentIdStr}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${student.isDisabled ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                      {student.isDisabled ? "Disabled" : "Active"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Parent:</span>
                  <span className="text-white font-medium truncate ml-2">{student.parentName}</span>
                </div>

                <div className="pt-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">Enrolled Programs</span>
                  {student.programs.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {student.programs.map((prog: any, idx: number) => (
                        <span
                          key={idx}
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            prog.type === "CAMP"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}
                        >
                          {prog.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600 italic">No active enrollments</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 p-12 rounded-2xl text-center text-slate-400 max-w-xl mx-auto space-y-3">
          <Users className="h-10 w-10 text-[#CA8E25] mx-auto opacity-50" />
          <p className="font-bold text-white text-lg">No students assigned</p>
          <p className="text-sm">
            You have not been assigned to any students yet. Contact an administrator to receive student assignments.
          </p>
        </div>
      )}
    </div>
  );
}
