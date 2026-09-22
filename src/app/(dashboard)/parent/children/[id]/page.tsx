import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { GraduationCap, BookOpen, TrendingUp, CheckSquare, UserCheck, UserX, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ChildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "PARENT") {
    redirect("/login");
  }

  // Verify child belongs to parent
  const child = await prisma.user.findFirst({
    where: { id, parentId: session.user.id },
    include: {
      enrollments: { where: { status: "ACTIVE" } },
      academicReports: {
        include: { course: { select: { title: true } } },
        orderBy: { updatedAt: "desc" },
      },
      attendanceRecords: {
        include: { course: { select: { title: true } } },
        orderBy: { date: "desc" },
        take: 10,
      },
    },
  });

  if (!child) notFound();

  const totalPresent = child.attendanceRecords.filter((r) => r.status === "PRESENT").length;
  const totalLate = child.attendanceRecords.filter((r) => r.status === "LATE").length;
  const totalAbsent = child.attendanceRecords.filter((r) => r.status === "ABSENT").length;
  const totalExcused = child.attendanceRecords.filter((r) => r.status === "EXCUSED").length;
  const total = child.attendanceRecords.length;
  const attendanceRate = total > 0 ? Math.round(((totalPresent + totalLate) / total) * 100) : 0;

  const statusDot: Record<string, string> = {
    PRESENT: "bg-emerald-400", LATE: "bg-amber-400", ABSENT: "bg-red-400", EXCUSED: "bg-blue-400",
  };
  const statusLabel: Record<string, string> = {
    PRESENT: "Present", LATE: "Late", ABSENT: "Absent", EXCUSED: "Excused",
  };

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link href="/parent/children" className="text-xs text-slate-500 hover:text-[#CA8E25] transition flex items-center gap-1">
        ← Back to Children
      </Link>

      {/* Profile header */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shrink-0">
          {child.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-white">{child.name}</h1>
          <p className="text-slate-400 text-sm font-mono">{child.studentIdStr || "—"}</p>
          <p className="text-slate-500 text-xs mt-1">{child.email}</p>
          <span className={`mt-2 inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
            child.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}>
            {child.isActive ? "Active Student" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Academic Reports */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-[#CA8E25]" /> Academic Reports
          </h2>
          {child.academicReports.length > 0 ? (
            <div className="space-y-3">
              {child.academicReports.map((r) => (
                <div key={r.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-[#CA8E25]" /> {r.course.title}
                    </p>
                    <span className={`text-sm font-black px-2.5 py-0.5 rounded-xl border ${
                      r.grade.startsWith("A") ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : r.grade.startsWith("B") ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
                        : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                    }`}>
                      {r.grade}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Progress</span>
                      <span className="text-white font-bold">{r.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <div className="bg-gradient-to-r from-[#CA8E25] to-amber-400 h-1.5 rounded-full"
                        style={{ width: `${r.progress}%` }} />
                    </div>
                  </div>
                  {r.teacherNotes && (
                    <p className="text-xs text-slate-400 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                      <span className="font-bold text-slate-300">Notes: </span>{r.teacherNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 p-8 rounded-2xl text-center text-slate-500 text-sm">
              No reports available yet.
            </div>
          )}
        </div>

        {/* Attendance */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-[#CA8E25]" /> Recent Attendance
          </h2>

          {/* Mini stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Present", value: totalPresent, icon: UserCheck, color: "text-emerald-400" },
              { label: "Late", value: totalLate, icon: Clock, color: "text-amber-400" },
              { label: "Absent", value: totalAbsent, icon: UserX, color: "text-red-400" },
              { label: "Rate", value: `${attendanceRate}%`, icon: AlertTriangle, color: "text-[#CA8E25]" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${s.color}`} />
                  <div>
                    <p className="text-[10px] text-slate-500">{s.label}</p>
                    <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {child.attendanceRecords.length > 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="divide-y divide-slate-800/60">
                {child.attendanceRecords.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${statusDot[r.status] || "bg-slate-500"}`} />
                      <div>
                        <p className="text-xs font-semibold text-white">
                          {new Date(r.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </p>
                        <p className="text-[10px] text-slate-500">{r.course.title}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{statusLabel[r.status]}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 p-8 rounded-2xl text-center text-slate-500 text-sm">
              No attendance records yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
