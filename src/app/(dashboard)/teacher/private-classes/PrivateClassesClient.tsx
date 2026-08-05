"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, Clock, Users, BookOpen, Plus, Trash2, CheckCircle2, AlertCircle, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { createPrivateSession, updatePrivateSessionStatus, deletePrivateSession } from "@/actions/privateSessions";

interface Student { id: string; name: string; studentIdStr: string | null; }
interface Course { id: string; title: string; type: string; }
interface Session {
  id: string;
  studentId: string;
  courseId: string | null;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number | null;
  status: string;
  attendance: string | null;
  student: { name: string; studentIdStr: string | null };
  course: { title: string } | null;
}

interface Props {
  sessions: Session[];
  students: Student[];
  courses: Course[];
}

export default function PrivateClassesClient({ sessions: initialSessions, students, courses }: Props) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | "REGULAR" | "COMPETITION">("ALL");

  const [form, setForm] = useState({
    studentId: "",
    courseId: "",
    date: "",
    startTime: "14:00",
    endTime: "15:30",
    duration: 90
  });

  const showStatus = (t: "success" | "error", text: string) => {
    setMessage({ type: t, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreate = async () => {
    if (!form.studentId || !form.date) {
      showStatus("error", "Student and Date are required.");
      return;
    }
    setLoading(true);
    const res = await createPrivateSession({
      studentId: form.studentId,
      courseId: form.courseId || null,
      date: new Date(form.date),
      startTime: form.startTime,
      endTime: form.endTime,
      duration: form.duration
    });

    if (res.success && res.session) {
      const student = students.find(s => s.id === form.studentId);
      const course = courses.find(c => c.id === form.courseId);
      setSessions((prev) => [...prev, {
        ...res.session!,
        student: { name: student?.name || "", studentIdStr: student?.studentIdStr || "" },
        course: course ? { title: course.title } : null,
      } as Session].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      setShowCreate(false);
      showStatus("success", "Session scheduled successfully.");
    } else {
      showStatus("error", res.error || "Failed to schedule session.");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return;
    setLoading(true);
    const res = await deletePrivateSession(id);
    if (res.success) {
      setSessions(prev => prev.filter(s => s.id !== id));
      showStatus("success", "Session deleted.");
    } else {
      showStatus("error", "Failed to delete.");
    }
    setLoading(false);
  };

  const handleStatus = async (id: string, status: string) => {
    setLoading(true);
    const res = await updatePrivateSessionStatus(id, status);
    if (res.success) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
      showStatus("success", `Session marked as ${status}.`);
    } else {
      showStatus("error", "Failed to update status.");
    }
    setLoading(false);
  };

  const filteredSessions = sessions.filter(s => {
    if (activeTab === "ALL") return true;
    if (activeTab === "REGULAR") return s.course?.title.toLowerCase().includes("competition") === false;
    if (activeTab === "COMPETITION") return s.course?.title.toLowerCase().includes("competition") === true;
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-[#CA8E25]" /> Private Classes
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Schedule and manage your 1-on-1 private sessions.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold flex gap-2">
          <Plus className="h-4 w-4" /> Schedule Session
        </Button>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`flex items-center gap-2 p-4 rounded-xl border ${message.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
            {message.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-850 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">Schedule Private Session</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">Student</label>
                <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white">
                  <option value="">Select Student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.studentIdStr})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">Track / Course</label>
                <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white">
                  <option value="">General Program</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white [color-scheme:dark]" />
              </div>
              <div className="flex gap-4">
                <div className="space-y-1.5 flex-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Start Time</label>
                  <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white [color-scheme:dark]" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">End Time</label>
                  <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white [color-scheme:dark]" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2 border-t border-slate-850">
              <Button onClick={handleCreate} disabled={loading} className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold">Schedule</Button>
              <Button onClick={() => setShowCreate(false)} variant="ghost" className="text-slate-400">Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-start border-b border-slate-800 mb-6">
        <div className="flex space-x-6">
          {(["ALL", "REGULAR", "COMPETITION"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === tab ? "border-[#CA8E25] text-[#CA8E25]" : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab === "ALL" ? "All Tracks" : tab}
            </button>
          ))}
        </div>
      </div>

      {filteredSessions.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredSessions.map((session) => (
            <div key={session.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-white">{session.student.name}</h3>
                  <span className="text-xs text-slate-500 font-mono">{session.student.studentIdStr}</span>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                  session.status === "SCHEDULED" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                  session.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                  "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}>
                  {session.status}
                </div>
              </div>
              <div className="space-y-2 mb-5">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <CalendarIcon className="h-4 w-4 text-[#CA8E25]" />
                  <span>{new Date(session.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Clock className="h-4 w-4 text-[#CA8E25]" />
                  <span>{session.startTime} - {session.endTime} ({session.duration}m)</span>
                </div>
                {session.course && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <BookOpen className="h-4 w-4 text-[#CA8E25]" />
                    <span>{session.course.title}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between border-t border-slate-850 pt-4 mt-2">
                <div className="flex gap-2">
                  {session.status === "SCHEDULED" && (
                    <Button onClick={() => handleStatus(session.id, "COMPLETED")} variant="ghost" className="h-8 text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20">
                      <Check className="h-3.5 w-3.5 mr-1" /> Complete
                    </Button>
                  )}
                  {session.status === "SCHEDULED" && (
                    <Button onClick={() => handleStatus(session.id, "CANCELLED")} variant="ghost" className="h-8 text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20">
                      <X className="h-3.5 w-3.5 mr-1" /> Cancel
                    </Button>
                  )}
                </div>
                <Button onClick={() => handleDelete(session.id)} variant="ghost" className="h-8 text-slate-400 hover:text-red-400 px-2">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 p-12 rounded-2xl text-center text-slate-400">
          <CalendarIcon className="h-10 w-10 text-[#CA8E25] mx-auto opacity-50 mb-3" />
          <p className="font-bold text-white mb-1">No Private Sessions Found</p>
          <p className="text-sm">There are no private classes scheduled in this view.</p>
        </div>
      )}
    </div>
  );
}
