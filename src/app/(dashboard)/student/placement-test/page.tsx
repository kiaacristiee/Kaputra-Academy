import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPerformanceScale } from "@/lib/email";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { Lock, Play, CheckCircle2, AlertTriangle, Clock, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function StudentPlacementTestPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "STUDENT") {
    redirect("/login");
  }

  const student = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { studentIdStr: true },
  });

  if (!student || !student.studentIdStr) {
    redirect("/student");
  }

  const placementTest = await prisma.placementTest.findUnique({
    where: { studentIdStr: student.studentIdStr },
  });

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <FileText className="h-8 w-8 text-[#CA8E25]" />
          Placement Test
        </h1>
        <p className="text-slate-400 mt-2">
          Assess your math level to finalize class assignments and tuition invoices.
        </p>
      </div>

      {!placementTest ? (
        /* CASE 1: NOT YET PAID / NO PLACEMENT TEST GENERATED */
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 text-center space-y-6 max-w-md mx-auto mt-10">
          <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Placement Test Locked</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              To unlock the placement test, you must first register for a class and pay the Placement Test fee of <strong>IDR 300,000</strong>.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Link href="/student/enroll" className="w-full">
              <Button className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl py-3 flex items-center justify-center gap-2">
                Register for Class <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/student/invoices" className="w-full">
              <Button variant="ghost" className="w-full text-slate-400 hover:text-white rounded-xl border border-slate-850">
                View Invoices
              </Button>
            </Link>
          </div>
        </div>
      ) : placementTest.status === "SUBMITTED" || placementTest.status === "REVIEWED" ? (
        /* CASE 2: ALREADY ATTEMPTED (ONLY CAN BE ATTEMPTED ONCE) */
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 max-w-lg mx-auto space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white">Test Completed!</h3>
            <p className="text-xs text-slate-400">
              You have already attempted and completed your placement test.
            </p>
          </div>

          <div className="divide-y divide-slate-850 bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden text-xs">
            <div className="flex justify-between items-center p-4">
              <span className="text-slate-500 font-bold uppercase">Attempts</span>
              <span className="font-bold text-white">1 / 1</span>
            </div>
            <div className="flex justify-between items-center p-4">
              <span className="text-slate-500 font-bold uppercase">Performance</span>
              <span className="font-black text-emerald-400 font-mono text-sm">{getPerformanceScale(placementTest.score ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center p-4">
              <span className="text-slate-500 font-bold uppercase">Assigned Path</span>
              <span className="font-bold text-[#CA8E25]">
                {placementTest.qualificationStatus === "QUALIFIED" ? "Competition Class" : "Regular Class"}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl text-center">
            <p className="text-xs text-slate-400">
              Your final tuition invoice has been generated. Please proceed to payment to finalize your enrollment.
            </p>
            <Link href="/student/invoices" className="inline-block mt-4 w-full">
              <Button className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl py-2.5">
                Go to Invoices
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* CASE 3: UNLOCKED & READY TO ATTEMPT */
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 max-w-lg mx-auto space-y-6">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-bold tracking-wider text-[#CA8E25] uppercase bg-[#CA8E25]/10 border border-[#CA8E25]/20 px-3 py-1 rounded-full">
              Ready to Start
            </span>
            <h3 className="text-2xl font-black text-white pt-2">Entry Placement Test</h3>
            <p className="text-xs text-slate-400">
              Unlocks class syllabus and tuition invoice generation.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex flex-col justify-center items-center text-center">
              <Clock className="w-5 h-5 text-amber-500 mb-2" />
              <span className="text-[10px] text-slate-500 font-bold uppercase">Duration</span>
              <span className="text-sm font-bold text-white mt-0.5">15 Minutes</span>
            </div>
            <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex flex-col justify-center items-center text-center">
              <FileText className="w-5 h-5 text-amber-500 mb-2" />
              <span className="text-[10px] text-slate-500 font-bold uppercase">Attempts Allowed</span>
              <span className="text-sm font-bold text-white mt-0.5">1 Attempt Only</span>
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl flex gap-3 text-xs text-amber-500/90 leading-relaxed">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
            <div>
              <span className="font-extrabold block mb-0.5">Attempt Notice</span>
              This test can only be attempted once. Once you start, the timer cannot be paused and the test will auto-submit after 15 minutes. Make sure you are in a quiet environment.
            </div>
          </div>

          <Link href={`/placement-test?studentId=${student.studentIdStr}&code=${placementTest.testCode}`} target="_blank">
            <Button className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl py-3.5 mt-2 flex items-center justify-center gap-2">
              <Play className="w-4 h-4 fill-current" /> Start Placement Test
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
