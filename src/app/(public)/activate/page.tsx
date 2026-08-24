import prisma from "@/lib/db";
import { activateAccounts } from "@/actions/activate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ShieldAlert, KeyRound, CheckCircle, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Account Activation | Kaputra Academy",
};

interface SearchParams {
  studentId?: string;
  token?: string;
}

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { studentId, token } = await searchParams;

  let student: any = null;
  let tokenError: "missing" | "invalid" | "expired" | null = null;

  if (token) {
    const trimmedToken = token.trim();
    const foundUser = await prisma.user.findFirst({
      where: { activationToken: trimmedToken },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!foundUser) {
      tokenError = "invalid";
    } else if (foundUser.activationExpires && new Date() > foundUser.activationExpires) {
      tokenError = "expired";
    } else {
      if (foundUser.role === "STUDENT") {
        student = foundUser;
      } else if (foundUser.role === "PARENT") {
        student = foundUser.children[0] || null;
        if (student) student.parent = foundUser;
      }
    }
  } else if (studentId) {
    student = await prisma.user.findUnique({
      where: { studentIdStr: studentId },
      include: { parent: true },
    });

    if (!student) {
      tokenError = "invalid";
    }
  } else {
    tokenError = "missing";
  }

  // Handle Token Errors (Missing, Invalid, Expired)
  if (tokenError || !student) {
    return (
      <main className="min-h-screen bg-[#072147] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-white space-y-5 shadow-2xl">
          <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto" />
          <h2 className="text-2xl font-black">
            {tokenError === "missing" && "Missing Activation Link"}
            {tokenError === "expired" && "Activation Link Expired"}
            {tokenError === "invalid" && "Invalid Activation Link"}
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            {tokenError === "missing" && "Please click the activation link sent to your parent email address."}
            {tokenError === "expired" && "This activation link has expired. Please request a new activation email."}
            {tokenError === "invalid" && "This activation link is invalid or has already been used to activate an account."}
          </p>
          <div className="pt-2 space-y-3">
            <Link href="/register">
              <Button className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2">
                Back to Registration <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login" className="block text-xs text-slate-500 hover:text-slate-300 transition">
              Go to Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Handle Already Active
  if (student.isActive) {
    return (
      <main className="min-h-screen bg-[#072147] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-white space-y-6 shadow-2xl">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
          <h2 className="text-2xl font-black">Account Already Active</h2>
          <p className="text-slate-400">
            Your account (<span className="font-mono text-[#CA8E25] font-bold">{student.studentIdStr || studentId}</span>) is already active.
          </p>
          <Link href="/login">
            <Button className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2">
              Go to Login <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  const effectiveStudentId = student.studentIdStr || studentId || "";

  return (
    <main className="min-h-screen bg-[#072147] py-12 px-4 flex items-center justify-center">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-white space-y-8 shadow-2xl">
        <div className="text-center">
          <div className="inline-flex p-3 bg-[#CA8E25]/10 rounded-full mb-3">
            <KeyRound className="h-10 w-10 text-[#CA8E25]" />
          </div>
          <h2 className="text-3xl font-black tracking-tight">Activate Account</h2>
          <p className="mt-2 text-sm text-slate-400">
            Welcome, {student.name}. Please set up login passwords to activate your account.
          </p>
        </div>

        <form action={activateAccounts} className="space-y-6">
          <input type="hidden" name="studentId" value={effectiveStudentId} />
          <input type="hidden" name="token" value={token || student.activationToken || ""} />

          {/* Student Account Setup */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-[#CA8E25]">Student Account Setup</h3>
            
            <div className="space-y-1.5">
              <Label>Student ID</Label>
              <Input
                value={effectiveStudentId}
                disabled
                className="bg-slate-900 border-slate-800 text-slate-400 rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="studentPassword">Create Student Password</Label>
              <PasswordInput
                id="studentPassword"
                name="studentPassword"
                required
                placeholder="••••••••"
                className="bg-slate-900 border-slate-800 text-white rounded-xl focus-visible:ring-[#CA8E25]"
              />
              <span className="text-[11px] text-slate-500 block">
                This password will be used along with the Student ID to log in.
              </span>
            </div>
          </div>

          {/* Parent Account Setup */}
          {student.parent && (
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-[#CA8E25]">Parent Account Setup</h3>

              <div className="space-y-1.5">
                <Label>Parent Email</Label>
                <Input
                  value={student.parent.email}
                  disabled
                  className="bg-slate-900 border-slate-800 text-slate-400 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="parentPassword">Create Parent Password</Label>
                <PasswordInput
                  id="parentPassword"
                  name="parentPassword"
                  required
                  placeholder="••••••••"
                  className="bg-slate-900 border-slate-800 text-white rounded-xl focus-visible:ring-[#CA8E25]"
                />
                <span className="text-[11px] text-slate-500 block">
                  This password will be used along with your email to log in as a parent.
                </span>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-black py-4 rounded-xl text-lg shadow-lg"
          >
            Activate Accounts
          </Button>
        </form>
      </div>
    </main>
  );
}
