import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ResendActivationButton } from "@/components/auth/ResendActivationButton";
import { MultiChildRegisterForm } from "./MultiChildRegisterForm";

export const metadata = {
  title: "Register | Kaputra Academy",
};

interface SearchParams {
  success?: string;
  studentId?: string;
  count?: string;
  emailSent?: string;
  emailError?: string;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    const role = session.user.role;
    if (role === "ADMIN") redirect("/admin");
    if (role === "TEACHER") redirect("/teacher");
    if (role === "PARENT") redirect("/parent");
    if (role === "STUDENT") redirect("/student");
  }

  const { success, studentId, count, emailSent, emailError } = await searchParams;

  if (success === "true") {
    const isEmailFailed = emailSent === "false";
    const studentIdList = (studentId || "").split(",").map((s) => s.trim()).filter(Boolean);
    const firstStudentId = studentIdList[0] || "";

    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white shadow-2xl rounded-3xl p-8 border border-gray-100 text-center space-y-6">
          <div className="flex justify-center">
            <div className={`p-4 rounded-full ${isEmailFailed ? "bg-amber-50" : "bg-emerald-50"}`}>
              <CheckCircle2 className={`w-16 h-16 ${isEmailFailed ? "text-amber-500" : "text-emerald-500"}`} />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-[#072147]">
              Registration Complete!
            </h2>
            <p className="text-sm text-gray-500">
              {studentIdList.length > 1
                ? `${studentIdList.length} student accounts have been created successfully.`
                : "Your student account has been created successfully."}
            </p>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100 text-left space-y-3">
            <div className="flex flex-col gap-2 pb-2 border-b border-gray-200">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                {studentIdList.length > 1 ? "Generated Student IDs" : "Student ID"}
              </span>
              <div className="flex flex-wrap gap-2">
                {studentIdList.map((id) => (
                  <span key={id} className="font-mono font-bold text-[#CA8E25] bg-[#CA8E25]/10 px-3 py-1 rounded-xl border border-[#CA8E25]/20 text-sm">
                    {id}
                  </span>
                ))}
              </div>
            </div>
            
            {!isEmailFailed ? (
              <p className="text-sm text-gray-600 leading-relaxed pt-1">
                An activation email containing your <strong>Activation Link</strong> has been sent to your parent's email address.
              </p>
            ) : (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-800 space-y-1">
                <p className="font-semibold">Activation email could not be delivered automatically.</p>
                <p>{emailError || "Please click below to try resending the email."}</p>
              </div>
            )}
          </div>

          {firstStudentId && (
            <div className="pt-2 space-y-3">
              <ResendActivationButton studentId={firstStudentId} />

              <Link href={`/activate?studentId=${firstStudentId}`} className="block">
                <Button className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2">
                  Go to Activation Link <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login" className="block text-sm text-slate-500 hover:text-slate-800 transition">
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
        <div className="text-center mb-8 flex flex-col items-center">
          <Image src="/blue.png" alt="Kaputra Academy Logo" width={600} height={160} className="mb-2 rounded-sm object-contain h-40 w-auto hover:opacity-90 transition" priority />
          <h2 className="text-3xl font-extrabold text-[#072147]">
            Account Registration
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Register parent account and child profile(s)
          </p>
        </div>

        <MultiChildRegisterForm />
      </div>
    </main>
  );
}

