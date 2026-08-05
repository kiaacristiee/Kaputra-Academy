import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { Activity, BarChart2, BookOpen, Award, CheckCircle, FileText, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Academic Report | Kaputra Academy",
};

export default async function ReportPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const role = session.user.role;
  const userId = session.user.id;

  // Student reports
  const reports = await prisma.academicReport.findMany({
    where: { studentId: userId, status: "SUBMITTED" },
    include: { course: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
          <BarChart2 className="h-8 w-8 text-[#CA8E25]" />
          Academic Report Card
        </h1>
        <p className="text-slate-400 mt-1">
          Review your marks, course progression status, assessments, and teacher comments.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="py-20 text-center text-slate-500 bg-slate-950/20 border border-slate-850 rounded-2xl max-w-lg mx-auto">
          <ClipboardList className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <h4 className="text-white font-bold">No Reports Logged</h4>
          <p className="text-xs text-slate-450 mt-1">Your instructor hasn't submitted a performance report card yet. Please check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {reports.map((report: any) => (
            <div key={report.id} className="bg-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
              {/* Report Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-4">
                <div>
                  <h3 className="font-bold text-white text-xl">{report.course.title}</h3>
                  <span className="text-xs text-slate-400 font-mono">Report Ref: {report.id}</span>
                </div>
                <div className="flex gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 text-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Final Grade</p>
                    <p className="text-xl font-black text-[#CA8E25]">{report.grade}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 text-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Progress</p>
                    <p className="text-xl font-black text-white">{report.progress}%</p>
                  </div>
                </div>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Notes & Comments */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#CA8E25]" /> Comprehensive Overview
                    </h4>
                    <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-4 text-xs text-slate-350 leading-relaxed space-y-4">
                      {report.performanceSummary && <div><span className="font-bold text-slate-200">Performance:</span> {report.performanceSummary}</div>}
                      {report.strengths && <div><span className="font-bold text-slate-200">Strengths:</span> {report.strengths}</div>}
                      {report.improvements && <div><span className="font-bold text-slate-200">Areas to Improve:</span> {report.improvements}</div>}
                      {report.learningProgress && <div><span className="font-bold text-slate-200">Learning Progress:</span> {report.learningProgress}</div>}
                      {report.nextSteps && <div><span className="font-bold text-slate-200">Suggested Next Steps:</span> {report.nextSteps}</div>}
                      {report.teacherNotes && <div><span className="font-bold text-slate-200">Teacher Notes:</span> {report.teacherNotes}</div>}
                    </div>
                  </div>

                  {report.skillAssessment && (
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-blue-450" /> Skill Assessment
                      </h4>
                      <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-4 text-xs text-slate-350 leading-relaxed">
                        {report.skillAssessment}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Completed Modules */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-450" /> Completed Course Syllabus Modules
                  </h4>
                  <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-5 space-y-3">
                    {report.completedModules ? (
                      report.completedModules.split(",").map((mod: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>{mod.trim()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No completed modules listed.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
