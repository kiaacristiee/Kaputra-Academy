import prisma from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toggleStudentStatus } from "@/actions/students";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Students | Admin Dashboard",
};

export default async function StudentsPage() {
    const students = await prisma.user.findMany({
        where: {
            role: "STUDENT",
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">
                    Students
                </h1>

                <p className="text-slate-400">
                    Manage all registered students.
                </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-800">
                            <th className="text-left p-4 text-slate-400">
                                Name
                            </th>

                            <th className="text-left p-4 text-slate-400">
                                Student ID
                            </th>

                            <th className="text-left p-4 text-slate-400">
                                Created
                            </th>

                            <th className="text-right p-4 text-slate-400">
                                Action
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {students.map((student) => (
                            <tr
                                key={student.id}
                                className={`border-b border-slate-900 ${student.isDisabled ? "opacity-50" : ""}`}
                            >
                                <td className="p-4 text-white">
                                    {student.name}
                                    {student.isDisabled && (
                                        <span className="ml-2 text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20">Disabled</span>
                                    )}
                                </td>

                                <td className="p-4 text-slate-300 font-mono text-sm">
                                    {student.studentIdStr || "—"}
                                </td>

                                <td className="p-4 text-slate-300 text-sm">
                                    {new Date(
                                        student.createdAt
                                    ).toLocaleDateString()}
                                </td>

                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <form action={toggleStudentStatus}>
                                            <input type="hidden" name="studentId" value={student.id} />
                                            <Button
                                                type="submit"
                                                size="sm"
                                                variant="outline"
                                                className={student.isDisabled 
                                                    ? "border-emerald-500 text-emerald-400 hover:bg-emerald-500/10" 
                                                    : "border-red-500 text-red-400 hover:bg-red-500/10"}
                                            >
                                                {student.isDisabled ? "Enable" : "Disable"}
                                            </Button>
                                        </form>
                                        <Link
                                            href={`/admin/students/${student.id}`}
                                        >
                                            <Button
                                                size="sm"
                                                className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black"
                                            >
                                                View
                                            </Button>
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {students.length === 0 && (
                    <div className="p-10 text-center text-slate-500">
                        No students found.
                    </div>
                )}
            </div>
        </div>
    );
}