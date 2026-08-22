"use client";

import { useState, useMemo } from "react";
import { UserCheck, Users, Plus, Trash2, CheckCircle2, AlertCircle, Search, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { createStudentTeacherAssignment, deleteStudentTeacherAssignment } from "@/actions/adminExtra";

interface Teacher {
  id: string;
  name: string;
  role: string;
}

interface Program {
  name: string;
  type: string;
}

interface Student {
  id: string;
  name: string;
  studentIdStr: string;
  programs: Program[];
}

interface Assignment {
  id: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  studentIdStr: string;
  assignedAt: string;
}

interface Props {
  teachers: Teacher[];
  students: Student[];
  assignments: Assignment[];
}

export default function TeacherAssignmentsClient({ teachers, students, assignments: initialAssignments }: Props) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [form, setForm] = useState({ teacherId: "", studentId: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const showStatus = (t: "success" | "error", text: string) => {
    setMessage({ type: t, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreate = async () => {
    if (!form.teacherId || !form.studentId) {
      showStatus("error", "Please select both a teacher and a student.");
      return;
    }
    const already = assignments.find((a) => a.teacherId === form.teacherId && a.studentId === form.studentId);
    if (already) {
      showStatus("error", "This teacher is already assigned to this student.");
      return;
    }
    setLoading(true);
    const res = await createStudentTeacherAssignment(form);
    if (res.success && res.assignment) {
      const teacher = teachers.find((t) => t.id === form.teacherId);
      const student = students.find((s) => s.id === form.studentId);
      setAssignments((prev) => [
        {
          id: res.assignment!.id,
          teacherId: form.teacherId,
          teacherName: teacher?.name || "",
          studentId: form.studentId,
          studentName: student?.name || "",
          studentIdStr: student?.studentIdStr || "—",
          assignedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      showStatus("success", `${teacher?.name} assigned to ${student?.name} successfully!`);
      setForm({ teacherId: "", studentId: "" });
    } else {
      showStatus("error", (res as any).error || "Failed to create assignment.");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const res = await deleteStudentTeacherAssignment(id);
    if (res.success) {
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      showStatus("success", "Assignment removed.");
    } else {
      showStatus("error", (res as any).error || "Failed to remove.");
    }
  };

  // Build assignment lookup: studentId → assignment
  const assignmentByStudent = useMemo(() => {
    const map: Record<string, Assignment> = {};
    assignments.forEach((a) => { map[a.studentId] = a; });
    return map;
  }, [assignments]);

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.studentIdStr.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Stats
  const assignedCount = new Set(assignments.map((a) => a.studentId)).size;
  const unassignedCount = students.length - assignedCount;
  const teachersWithStudents = new Set(assignments.map((a) => a.teacherId)).size;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <UserCheck className="h-8 w-8 text-[#CA8E25]" />
          Teacher Assignment
        </h1>
        <p className="text-slate-400 mt-2">Assign teachers to individual students.</p>
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
          <Plus className="h-4 w-4 text-[#CA8E25]" /> Assign Teacher to Student
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase">Student</label>
            <select
              value={form.studentId}
              onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
            >
              <option value="">Select student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.studentIdStr} — {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase">Teacher</label>
            <select
              value={form.teacherId}
              onChange={(e) => setForm((p) => ({ ...p, teacherId: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
            >
              <option value="">Select teacher...</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.role !== "TEACHER" ? `(${t.role})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button
          onClick={handleCreate} disabled={loading}
          className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl px-6 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {loading ? "Assigning..." : "Assign Teacher"}
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 font-bold uppercase">Total Students</p>
          <p className="text-3xl font-black text-white mt-1">{students.length}</p>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 font-bold uppercase">Assigned</p>
          <p className="text-3xl font-black text-emerald-400 mt-1">{assignedCount}</p>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 font-bold uppercase">Unassigned</p>
          <p className="text-3xl font-black text-amber-400 mt-1">{unassignedCount}</p>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 font-bold uppercase">Active Teachers</p>
          <p className="text-3xl font-black text-[#CA8E25] mt-1">{teachersWithStudents}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Student ID or Name..."
          className="pl-10 bg-slate-950 border-slate-800 text-white rounded-xl placeholder:text-slate-500 focus-visible:ring-[#CA8E25]"
        />
      </div>

      {/* Student Assignment Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left p-4 text-xs font-bold text-slate-400 uppercase">Student ID</th>
                <th className="text-left p-4 text-xs font-bold text-slate-400 uppercase">Student</th>
                <th className="text-left p-4 text-xs font-bold text-slate-400 uppercase">Programs</th>
                <th className="text-left p-4 text-xs font-bold text-slate-400 uppercase">Assigned Teacher</th>
                <th className="text-right p-4 text-xs font-bold text-slate-400 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const assignment = assignmentByStudent[student.id];
                return (
                  <tr key={student.id} className="border-b border-slate-900/50 hover:bg-slate-900/30 transition">
                    <td className="p-4 font-mono text-sm text-[#CA8E25] font-bold">
                      {student.studentIdStr}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-white">{student.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {student.programs.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {student.programs.map((prog, idx) => (
                            <span
                              key={idx}
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                prog.type === "CAMP"
                                  ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              }`}
                            >
                              {prog.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600 italic">No enrollments</span>
                      )}
                    </td>
                    <td className="p-4">
                      {assignment ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-[10px]">
                            {assignment.teacherName.charAt(0)}
                          </div>
                          <span className="text-sm text-white font-medium">{assignment.teacherName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-500/70 italic flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Unassigned
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {assignment && (
                        <button
                          onClick={() => handleDelete(assignment.id)}
                          className="text-red-400 hover:text-red-300 transition p-1.5 rounded-lg hover:bg-red-500/10"
                          title="Remove assignment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="p-12 text-center space-y-3">
            <GraduationCap className="h-10 w-10 text-[#CA8E25] mx-auto opacity-40" />
            <p className="font-bold text-white text-lg">No students found</p>
            <p className="text-sm text-slate-500">
              {searchQuery ? "No students match your search." : "No students are registered yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
