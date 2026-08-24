"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toggleStudentDisabled } from "@/actions/adminExtra";
import { GraduationCap } from "lucide-react";
import AdminEnrollModal from "@/components/admin/AdminEnrollModal";
import { useRouter } from "next/navigation";

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
  student: {
    id: string;
    name: string;
    studentIdStr?: string | null;
  };
  initialIsDisabled: boolean;
  courses: CourseItem[];
  camps: CampItem[];
}

export default function StudentActionClient({ student, initialIsDisabled, courses, camps }: Props) {
  const [isDisabled, setIsDisabled] = useState(initialIsDisabled);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setLoading(true);
    const nextState = !isDisabled;
    const res = await toggleStudentDisabled(student.id, nextState);
    if (res.success) {
      setIsDisabled(nextState);
    } else {
      alert(res.error || "Failed to update student status.");
    }
    setLoading(false);
  };

  return (
    <div className="mt-6 pt-6 border-t border-slate-800 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-2">Program Enrollment</h3>
        <p className="text-slate-400 text-sm mb-4">
          Manually enroll this student into a regular class, competition course, or camp program.
        </p>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2"
        >
          <GraduationCap className="h-4 w-4" />
          Enroll Student in Program
        </Button>
      </div>

      <div className="pt-6 border-t border-slate-800">
        <h3 className="text-lg font-bold text-white mb-2">Student Access Control</h3>
        <p className="text-slate-400 text-sm mb-4">
          {isDisabled
            ? "This student is currently disabled and cannot access their class content."
            : "This student is active and can access their class content normally."}
        </p>
        <Button
          onClick={handleToggle}
          disabled={loading}
          variant={isDisabled ? "default" : "destructive"}
          className={isDisabled ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl" : "font-bold rounded-xl"}
        >
          {loading ? "Processing..." : isDisabled ? "Enable Student" : "Disable Student"}
        </Button>
      </div>

      <AdminEnrollModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        student={student}
        courses={courses}
        camps={camps}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
