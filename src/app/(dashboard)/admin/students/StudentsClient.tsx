"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toggleStudentStatus } from "@/actions/students";
import { GraduationCap } from "lucide-react";
import AdminEnrollModal from "@/components/admin/AdminEnrollModal";
import { useRouter } from "next/navigation";

interface Student {
  id: string;
  name: string;
  studentIdStr: string | null;
  isDisabled: boolean;
  createdAt: Date | string;
}

interface CourseItem {
  id: string;
  title: string;
  type: string;
  price: number;
  registrationFee: number;
}

interface CampItem {
  id: string;
  title: string;
  price: number;
}

interface Props {
  students: Student[];
  courses: CourseItem[];
  camps: CampItem[];
}

export default function StudentsClient({ students, courses, camps }: Props) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleOpenEnrollModal = (student: Student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-xs font-bold uppercase tracking-wider text-slate-400">
                <th className="p-4">Name</th>
                <th className="p-4">Student ID</th>
                <th className="p-4">Registered</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-900 text-sm">
              {students.map((student) => (
                <tr
                  key={student.id}
                  className={`hover:bg-slate-900/30 transition ${student.isDisabled ? "opacity-50" : ""}`}
                >
                  <td className="p-4 font-bold text-white">
                    {student.name}
                    {student.isDisabled && (
                      <span className="ml-2 text-[10px] uppercase font-bold bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20">
                        Disabled
                      </span>
                    )}
                  </td>

                  <td className="p-4 text-slate-300 font-mono text-xs">
                    {student.studentIdStr || "—"}
                  </td>

                  <td className="p-4 text-slate-400 text-xs">
                    {new Date(student.createdAt).toLocaleDateString()}
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Enroll Button */}
                      <Button
                        size="sm"
                        onClick={() => handleOpenEnrollModal(student)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md"
                      >
                        <GraduationCap className="h-3.5 w-3.5" />
                        Enroll
                      </Button>

                      {/* Enable/Disable Button */}
                      <form action={toggleStudentStatus}>
                        <input type="hidden" name="studentId" value={student.id} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          className={`rounded-xl text-xs font-bold ${
                            student.isDisabled
                              ? "border-emerald-500 text-emerald-400 hover:bg-emerald-500/10"
                              : "border-red-500 text-red-400 hover:bg-red-500/10"
                          }`}
                        >
                          {student.isDisabled ? "Enable" : "Disable"}
                        </Button>
                      </form>

                      {/* View Details */}
                      <Link href={`/admin/students/${student.id}`}>
                        <Button
                          size="sm"
                          className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl text-xs"
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
        </div>

        {students.length === 0 && (
          <div className="p-12 text-center text-slate-500 text-sm">
            No registered students found.
          </div>
        )}
      </div>

      {/* Admin Enroll Modal */}
      <AdminEnrollModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        student={selectedStudent}
        courses={courses}
        camps={camps}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
