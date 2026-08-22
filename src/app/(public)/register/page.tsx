import { submitRegistration } from "@/actions/register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Mail, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Register | Kaputra Academy",
};

interface SearchParams {
  success?: string;
  studentId?: string;
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

  const { success, studentId } = await searchParams;

  if (success === "true") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white shadow-2xl rounded-3xl p-8 border border-gray-100 text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-emerald-50 rounded-full">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-[#072147]">
              Registration Complete!
            </h2>
            <p className="text-sm text-gray-500">
              Your student account has been created successfully.
            </p>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100 text-left space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Student ID</span>
              <span className="font-mono font-bold text-[#CA8E25] text-lg">{studentId}</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              An activation email containing your **Student ID** and an **Activation Link** has been sent to your parent's email address.
            </p>
            <p className="text-xs text-gray-400 italic">
              Please check the terminal/console to view the simulated email and activate your account.
            </p>
          </div>

          <div className="pt-4 space-y-3">
            <Link href={`/activate?studentId=${studentId}`}>
              <Button className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2">
                Go to Activation Link <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login" className="block text-sm text-slate-500 hover:text-slate-800 transition">
              Back to Login
            </Link>
          </div>
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
        </div>

        <form action={submitRegistration} className="space-y-6">

          {/* Student Info */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h3 className="text-lg font-semibold text-[#072147] mb-4">
              Student Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="studentName">Student's Full Name</Label>
                <Input
                  id="studentName"
                  name="studentName"
                  required
                  placeholder="Full Name"
                  className="w-full bg-white rounded-xl focus-visible:ring-[#CA8E25] placeholder: italic"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  required
                  className="w-full bg-white rounded-xl focus-visible:ring-[#CA8E25]"
                />
              </div>
            </div>
          </div>

          {/* Parent Info */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h3 className="text-lg font-semibold text-[#072147] mb-4">
              Parent Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="parentName">Parent Name</Label>
                <Input
                  id="parentName"
                  name="parentName"
                  required
                  placeholder="Full Name"
                  className="w-full bg-white rounded-xl focus-visible:ring-[#CA8E25] placeholder: italic"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentPhone">Parent Phone Number</Label>
                <Input
                  id="parentPhone"
                  name="parentPhone"
                  required
                  placeholder="Enter Phone Number"
                  className="w-full bg-white rounded-xl focus-visible:ring-[#CA8E25] placeholder: italic"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentEmail">Parent Email Address</Label>
                <Input
                  id="parentEmail"
                  name="parentEmail"
                  type="email"
                  required
                  placeholder="Enter Email"
                  className="w-full bg-white rounded-xl focus-visible:ring-[#CA8E25] placeholder: italic"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold py-3 rounded-xl shadow-lg transition-all text-lg"
          >
            Register Account
          </Button>

          <div className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-[#CA8E25] font-semibold hover:underline">
              Log In
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
