import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { Users, GraduationCap, BookOpen, TrendingUp } from "lucide-react";
import { AddChildModal } from "@/components/parent/AddChildModal";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Children | Kaputra Academy",
};

export default async function ParentChildrenPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "PARENT") {
    redirect("/login");
  }

  const children = await prisma.user.findMany({
    where: { parentId: session.user.id },
    include: {
      enrollments: { where: { status: "ACTIVE" } },
      academicReports: {
        include: { course: { select: { title: true } } },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-[#CA8E25]" />
            Children
          </h1>
          <p className="text-slate-400 mt-2">View and monitor your linked student accounts.</p>
        </div>
        <div>
          <AddChildModal />
        </div>
      </div>

      {children.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {children.map((child) => {
            const avgProgress = child.academicReports.length > 0
              ? Math.round(child.academicReports.reduce((s, r) => s + r.progress, 0) / child.academicReports.length)
              : 0;
            const latestGrade = child.academicReports[0]?.grade || "—";

            return (
              <div key={child.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5 hover:border-slate-700 transition">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl">
                    {child.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{child.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{child.studentIdStr || "—"}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      child.isActive
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      {child.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-900/60 p-3 rounded-xl text-center border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Enrolled</p>
                    <p className="text-xl font-black text-white">{child.enrollments.length}</p>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-xl text-center border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Progress</p>
                    <p className="text-xl font-black text-[#CA8E25]">{avgProgress}%</p>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-xl text-center border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Grade</p>
                    <p className={`text-xl font-black ${latestGrade.startsWith("A") ? "text-emerald-400" : latestGrade.startsWith("B") ? "text-blue-400" : "text-amber-400"}`}>
                      {latestGrade}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                {child.academicReports.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Average Progress</span>
                      <span className="text-white font-bold">{avgProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-gradient-to-r from-[#CA8E25] to-amber-400 h-2 rounded-full"
                        style={{ width: `${avgProgress}%` }} />
                    </div>
                  </div>
                )}

                {/* Recent courses */}
                {child.academicReports.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase">Recent Reports</p>
                    {child.academicReports.slice(0, 2).map((r) => (
                      <div key={r.id} className="flex items-center justify-between bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
                        <p className="text-xs text-slate-300 truncate flex items-center gap-1.5">
                          <BookOpen className="h-3 w-3 text-[#CA8E25]" />{r.course.title}
                        </p>
                        <span className="text-xs font-bold text-[#CA8E25]">{r.grade}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Link href={`/parent/children/${child.id}`}
                  className="block text-center text-xs font-bold text-[#CA8E25] hover:text-amber-400 transition py-2 border border-[#CA8E25]/20 hover:border-[#CA8E25]/40 rounded-xl bg-[#CA8E25]/5 hover:bg-[#CA8E25]/10">
                  View Full Profile →
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 p-12 rounded-2xl text-center space-y-3">
          <GraduationCap className="h-10 w-10 text-[#CA8E25] mx-auto opacity-40" />
          <p className="font-bold text-white text-lg">No children linked</p>
          <p className="text-sm text-slate-500">Contact the admin to link your child's student account.</p>
        </div>
      )}
    </div>
  );
}
