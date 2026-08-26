import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import {
  Users,
  BookOpen,
  Award,
  Calendar,
  AlertCircle,
  FileText,
  Clock,
  LogOut
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AddChildModal } from "@/components/parent/AddChildModal";
import ParentDashboardClient from "./ParentDashboardClient";
import ViewAsStudentButton from "./ViewAsStudentButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Parent Dashboard | Kaputra Academy",
};

export default async function ParentDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "PARENT") {
    redirect("/login");
  }

  // Fetch parent user along with their children students
  const parent: any = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      children: {
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
          },
          academicReports: {
            include: { course: { select: { title: true } } },
            orderBy: { updatedAt: "desc" },
          },
          attendanceRecords: true,
        },
      },
    },
  });

  if (!parent) {
    redirect("/login");
  }

  const children = parent.children || [];
  const childIds = children.map((c: any) => c.id);

  // Fetch course mapping, camp programs, and child enrollments concurrently
  const [allCourses, allCamps, childEnrollments] = await Promise.all([
    prisma.course.findMany({
      select: { id: true, title: true, type: true },
    }),
    prisma.campProgram.findMany({
      select: { id: true, name: true, type: true },
    } as any),
    prisma.enrollment.findMany({
      where: { studentId: { in: childIds }, status: "ACTIVE" },
      select: { itemId: true },
    }),
  ]);

  const courseMap = new Map<string, { title: string; type: string }>([
    ...allCourses.map((c) => [c.id, { title: c.title, type: c.type === "COMPETITION" ? "COMPETITION" : "REGULAR" }] as [string, { title: string; type: string }]),
    ...allCamps.map((c) => [c.id, { title: c.name, type: (c as any).type || "CAMP" }] as [string, { title: string; type: string }]),
  ]);

  const courseIds = Array.from(new Set(childEnrollments.map((e) => e.itemId)));

  // Fetch announcements (depends on courseIds)
  const announcements = await prisma.announcement.findMany({
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
            { targetStudents: { none: {} } },
            { targetStudents: { some: { id: { in: childIds } } } },
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

  return (
    <ParentDashboardClient>
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Welcome back, {parent.name}!</h1>
          <p className="text-slate-400">Parent Dashboard • Monitor your child's academic progress</p>
        </div>
        <div>
          <AddChildModal />
        </div>
      </div>

      {children.length === 0 ? (
        <div className="bg-slate-950 p-12 rounded-2xl border border-slate-800 text-center space-y-4">
          <p className="text-slate-400">No registered student accounts are linked to this parent account.</p>
          <AddChildModal />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Monitor progress columns */}
          <div className="lg:col-span-2 space-y-8">

            {/* Student Monitor Cards */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Linked Students</h2>
                <AddChildModal />
              </div>

              {children.map((child: any) => {
                // Compute attendance rate dynamically
                const presentCount = child.attendanceRecords?.filter((a: any) => a.status === "PRESENT" || a.status === "LATE").length || 0;
                const totalCount = child.attendanceRecords?.length || 0;
                const attendancePercent = totalCount > 0 ? `${Math.round((presentCount / totalCount) * 100)}%` : "100%";

                // Compute average progress
                const avgProgress = child.academicReports?.length > 0
                  ? `${Math.round(child.academicReports.reduce((s: number, r: any) => s + r.progress, 0) / child.academicReports.length)}% Avg`
                  : "Good Standing";

                return (
                  <div key={child.id} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
                    <div className="flex justify-between items-start border-b border-slate-900 pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">{child.name}</h3>
                        <p className="text-xs text-slate-500">Student ID: <span className="font-mono text-[#CA8E25] font-semibold">{child.studentIdStr || "—"}</span></p>
                      </div>
                      <div className="flex items-center gap-3">
                        <ViewAsStudentButton studentId={child.id} />
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      </div>
                    </div>

                    {/* Attendance & Stats grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-900/80 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-500 block">Class Attendance</span>
                          <span className="text-xl font-extrabold text-white mt-1">{attendancePercent}</span>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-400">
                          <Award className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-900/80 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-500 block">Academic Progress</span>
                          <span className="text-xl font-extrabold text-white mt-1">{avgProgress}</span>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400">
                          <BookOpen className="h-5 w-5" />
                        </div>
                      </div>
                    </div>

                    {/* Course list */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-slate-400">Enrolled Programs</h4>
                      {child.enrollments.length > 0 ? (
                        child.enrollments.map((enrollment: any) => {
                          const courseInfo = courseMap.get(enrollment.itemId);
                          const title = courseInfo ? courseInfo.title : enrollment.itemId;
                          const courseType = courseInfo ? courseInfo.type : enrollment.itemType;

                          return (
                            <div key={enrollment.id} className="bg-slate-900/50 p-4 rounded-xl border border-slate-900 flex justify-between items-center text-sm">
                              <div>
                                <p className="font-bold text-white">{title}</p>
                                <p className="text-xs text-slate-500">Type: {courseType}</p>
                              </div>
                              <span className="text-xs text-[#CA8E25] font-semibold">In Progress</span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-slate-500 text-xs italic">Not enrolled in any active classes.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reports section */}
            <div className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-white">Academic Reports</h2>
              <div className="space-y-4">
                {children.some((child: any) => child.academicReports?.length > 0) ? (
                  children.map((child: any) => 
                    child.academicReports.map((report: any) => (
                      <div key={report.id} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-white flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-[#CA8E25]" />
                              {report.course.title}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">Student: <span className="font-bold text-slate-300">{child.name}</span></p>
                          </div>
                          <span className={`text-sm font-black px-2.5 py-0.5 rounded-xl border ${
                            report.grade.startsWith("A") ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                              : report.grade.startsWith("B") ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
                              : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                          }`}>
                            {report.grade}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Completion</span>
                            <span className="font-bold text-white">{report.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2">
                            <div className="bg-gradient-to-r from-[#CA8E25] to-amber-400 h-2 rounded-full transition-all"
                              style={{ width: `${report.progress}%` }} />
                          </div>
                        </div>

                        {report.completedModules && (
                          <p className="text-xs text-slate-400"><span className="font-bold text-slate-300">Modules:</span> {report.completedModules}</p>
                        )}
                        {report.skillAssessment && (
                          <p className="text-xs text-slate-400"><span className="font-bold text-slate-300">Skills:</span> {report.skillAssessment}</p>
                        )}
                        {report.teacherNotes && (
                          <p className="text-xs text-slate-300 bg-slate-900/50 px-3 py-2.5 rounded-xl border border-slate-900">
                            <span className="font-bold text-slate-400">Notes: </span> 
                            "{report.teacherNotes}"
                          </p>
                        )}
                      </div>
                    ))
                  )
                ) : (
                  <div className="bg-slate-950 p-8 border border-slate-800 rounded-2xl text-center text-slate-500 text-sm">
                    No progress or academic report data available for your children yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Announcements sidebar */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Announcements</h2>
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-5 max-h-[800px] overflow-y-auto">
              {announcements.length > 0 ? (
                announcements.map((notif) => (
                  <div key={notif.id} className="space-y-2.5 border-b border-slate-900 pb-4 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {notif.targetStudents.length > 0 ? (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-600/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          For: {notif.targetStudents.map((s) => s.name).join(", ")}
                        </span>
                      ) : notif.course ? (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#CA8E25] bg-[#CA8E25]/10 px-2 py-0.5 rounded-full border border-[#CA8E25]/20">
                          {notif.course.title}
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-purple-400 bg-purple-600/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                          General
                        </span>
                      )}
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-400 bg-blue-650/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                        By {notif.teacher.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-white text-sm leading-tight">{notif.title}</h4>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 shrink-0 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(notif.publishDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">{notif.description}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500 text-sm">
                  No announcements for your children at this time.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </ParentDashboardClient>
  );
}
