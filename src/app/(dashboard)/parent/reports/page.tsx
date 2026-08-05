import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { BookOpen, GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Academic Reports | Kaputra Academy",
};

export default async function ParentReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "PARENT") {
    redirect("/login");
  }

  const children = await prisma.user.findMany({
    where: { parentId: session.user.id },
    include: {
      academicReports: {
        where: { status: "SUBMITTED" },
        include: { course: { select: { title: true } } },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-[#CA8E25]" />
          Academic Reports
        </h1>
        <p className="text-slate-400 mt-2">
          View your children's full academic report cards with grades and teacher evaluations.
        </p>
      </div>

      {children.length > 0 ? (
        <div className="space-y-10">
          {children.map((child: any) => (
            <div key={child.id} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  {child.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{child.name}</h2>
                  <p className="text-xs text-slate-500 font-mono">{child.studentIdStr || "—"}</p>
                </div>
              </div>

              {child.academicReports.length > 0 ? (
                <div className="space-y-4">
                  {child.academicReports.map((r: any) => (
                    <div key={r.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
                        <div>
                          <h3 className="text-base font-bold text-white">{r.course.title}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Last updated: {new Date(r.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Grade</p>
                            <p className={`text-2xl font-black ${
                              r.grade.startsWith("A") ? "text-emerald-400"
                                : r.grade.startsWith("B") ? "text-blue-400"
                                : "text-amber-400"
                            }`}>{r.grade}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Progress</p>
                            <p className="text-2xl font-black text-[#CA8E25]">{r.progress}%</p>
                          </div>
                        </div>
                      </div>

                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div className="bg-gradient-to-r from-[#CA8E25] to-amber-400 h-2 rounded-full"
                          style={{ width: `${r.progress}%` }} />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {r.performanceSummary && (
                          <div className="col-span-1 sm:col-span-2 bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Performance Summary</p>
                            <p className="text-sm text-slate-300 leading-relaxed">{r.performanceSummary}</p>
                          </div>
                        )}
                        {r.strengths && (
                          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Strengths</p>
                            <p className="text-xs text-slate-300 leading-relaxed">{r.strengths}</p>
                          </div>
                        )}
                        {r.improvements && (
                          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Areas for Improvement</p>
                            <p className="text-xs text-slate-300 leading-relaxed">{r.improvements}</p>
                          </div>
                        )}
                        {r.learningProgress && (
                          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Learning Progress</p>
                            <p className="text-xs text-slate-300 leading-relaxed">{r.learningProgress}</p>
                          </div>
                        )}
                        {r.nextSteps && (
                          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Suggested Next Steps</p>
                            <p className="text-xs text-slate-300 leading-relaxed">{r.nextSteps}</p>
                          </div>
                        )}
                        {r.completedModules && (
                          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Completed Modules</p>
                            <p className="text-xs text-slate-300">{r.completedModules}</p>
                          </div>
                        )}
                        {r.skillAssessment && (
                          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Skill Assessment</p>
                            <p className="text-xs text-slate-300">{r.skillAssessment}</p>
                          </div>
                        )}
                      </div>

                      {r.teacherNotes && (
                        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1 mt-4">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Teacher's Additional Notes</p>
                          <p className="text-sm text-slate-300 leading-relaxed">"{r.teacherNotes}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm">
                  No reports available for {child.name} yet.
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 p-12 rounded-2xl text-center space-y-3">
          <GraduationCap className="h-10 w-10 text-[#CA8E25] mx-auto opacity-40" />
          <p className="font-bold text-white text-lg">No children linked</p>
          <p className="text-sm text-slate-500">Contact the admin to link your child's account.</p>
        </div>
      )}
    </div>
  );
}
