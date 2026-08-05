"use client";

import { useState } from "react";
import { UserCheck, BookOpen, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { createTeacherAssignment, deleteTeacherAssignment } from "@/actions/adminExtra";
import { useCanManageEnrollment } from "@/hooks/usePermissions";

interface Teacher {
  id: string;
  name: string;
  email: string;
  studentIdStr: string | null;
}

interface Course {
  id: string;
  title: string;
  learningMethod: string;
}

interface Assignment {
  id: string;
  teacherId: string;
  teacherName: string;
  courseId: string;
  courseName: string;
  learningMethod: string;
  assignedAt: string;
}

interface Props {
  teachers: Teacher[];
  courses: Course[];
  assignments: Assignment[];
}

export default function TeacherAssignmentsClient({ teachers, courses, assignments: initialAssignments }: Props) {
  const { canManage } = useCanManageEnrollment();
  const [assignments, setAssignments] = useState(initialAssignments);
  const [form, setForm] = useState({ teacherId: "", courseId: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showStatus = (t: "success" | "error", text: string) => {
    setMessage({ type: t, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreate = async () => {
    if (!form.teacherId || !form.courseId) {
      showStatus("error", "Please select both a teacher and a course.");
      return;
    }
    const already = assignments.find((a) => a.teacherId === form.teacherId && a.courseId === form.courseId);
    if (already) {
      showStatus("error", "This teacher is already assigned to this course.");
      return;
    }
    setLoading(true);
    const res = await createTeacherAssignment(form);
    if (res.success && res.assignment) {
      const teacher = teachers.find((t) => t.id === form.teacherId);
      const course = courses.find((c) => c.id === form.courseId);
      setAssignments((prev) => [
        {
          id: res.assignment!.id,
          teacherId: form.teacherId,
          teacherName: teacher?.name || "",
          courseId: form.courseId,
          courseName: course?.title || "",
          learningMethod: course?.learningMethod || "SEMI_PRIVATE",
          assignedAt: new Date(res.assignment!.assignedAt).toISOString(),
        },
        ...prev,
      ]);
      showStatus("success", "Assignment created successfully!");
      setForm({ teacherId: "", courseId: "" });
    } else {
      showStatus("error", (res as any).error || "Failed to create assignment.");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const res = await deleteTeacherAssignment(id);
    if (res.success) {
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      showStatus("success", "Assignment removed.");
    } else {
      showStatus("error", (res as any).error || "Failed to remove.");
    }
  };

  const byTeacher = teachers.map((t) => ({
    ...t,
    assignments: assignments.filter((a) => a.teacherId === t.id),
  })).filter((t) => t.assignments.length > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <UserCheck className="h-8 w-8 text-[#CA8E25]" />
          Teacher Assignment
        </h1>
        <p className="text-slate-400 mt-2">Manage which teachers are assigned to which courses.</p>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-2 p-4 rounded-xl border ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            {message.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Assignment Form */}
      <div className="bg-slate-950 border border-[#CA8E25]/20 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Plus className="h-4 w-4 text-[#CA8E25]" /> Assign Teacher to Course
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase">Teacher</label>
            <select
              value={form.teacherId}
              onChange={(e) => setForm((p) => ({ ...p, teacherId: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
            >
              <option value="">Select teacher...</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase">Course</label>
            <select
              value={form.courseId}
              onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
            >
              <option value="">Select course...</option>
              {courses.filter(c => canManage(c.learningMethod)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
        </div>
        <Button
          onClick={handleCreate} disabled={loading}
          className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl px-6 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {loading ? "Assigning..." : "Create Assignment"}
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 font-bold uppercase">Total Assignments</p>
          <p className="text-3xl font-black text-white mt-1">{assignments.length}</p>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 font-bold uppercase">Teachers Assigned</p>
          <p className="text-3xl font-black text-[#CA8E25] mt-1">{byTeacher.length}</p>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 font-bold uppercase">Available Teachers</p>
          <p className="text-3xl font-black text-slate-300 mt-1">{teachers.length}</p>
        </div>
      </div>

      {/* Assignment list */}
      {assignments.length > 0 ? (
        <div className="space-y-4">
          {byTeacher.map((teacher) => (
            <div key={teacher.id} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                  {teacher.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{teacher.name}</p>
                  <p className="text-xs text-slate-500">{teacher.email}</p>
                </div>
                <span className="text-xs font-bold text-[#CA8E25] bg-[#CA8E25]/10 border border-[#CA8E25]/20 px-2 py-0.5 rounded-full">
                  {teacher.assignments.length} course{teacher.assignments.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="divide-y divide-slate-800/60">
                {teacher.assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-900/30 transition">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-[#CA8E25]" />
                      <span className="text-sm text-white">{a.courseName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">
                        {new Date(a.assignedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="text-red-400 hover:text-red-300 transition p-1.5 rounded-lg hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 p-12 rounded-2xl text-center space-y-3">
          <UserCheck className="h-10 w-10 text-[#CA8E25] mx-auto opacity-40" />
          <p className="font-bold text-white text-lg">No assignments yet</p>
          <p className="text-sm text-slate-500">Assign teachers to courses using the form above.</p>
        </div>
      )}
    </div>
  );
}
