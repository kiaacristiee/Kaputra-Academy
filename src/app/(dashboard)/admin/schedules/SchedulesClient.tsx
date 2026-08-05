"use client";

import { useState } from "react";
import { Calendar, Plus, Trash2, Edit2, CheckCircle2, AlertCircle, CalendarRange, Clock, BookOpen, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { createSchedule, updateSchedule, deleteSchedule, saveHolidays } from "@/actions/adminExtra";
import { useCanManageEnrollment } from "@/hooks/usePermissions";

interface Course {
  id: string;
  title: string;
}

interface Teacher {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  studentIdStr: string | null;
}

interface Schedule {
  id: string;
  courseId: string | null;
  teacherId: string;
  studentId: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  type: string;
  course?: { title: string } | null;
  teacher: { name: string };
  student?: { name: string } | null;
}

interface Holiday {
  id: string;
  date: string;
  name: string;
}

interface Props {
  initialSchedules: Schedule[];
  courses: Course[];
  teachers: Teacher[];
  students: Student[];
  initialHolidays: Holiday[];
}

const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export default function SchedulesClient({
  initialSchedules,
  courses,
  teachers,
  students,
  initialHolidays,
}: Props) {
  const { canManage, isSuperAdmin } = useCanManageEnrollment();
  const [activeTab, setActiveTab] = useState<"calendar" | "holidays">("calendar");
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState<Schedule | null>(null);
  const [holidayModal, setHolidayModal] = useState(false);

  // Form states
  const [scheduleForm, setScheduleForm] = useState({
    courseId: "",
    teacherId: "",
    studentId: "",
    dayOfWeek: "MONDAY",
    startTime: "09:00",
    endTime: "10:30",
    type: "PRIVATE",
  });

  const [holidayForm, setHolidayForm] = useState({ date: "", name: "" });

  const showStatus = (t: "success" | "error", text: string) => {
    setMessage({ type: t, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.teacherId) {
      showStatus("error", "Please select a teacher.");
      return;
    }
    setLoading(true);
    const dataToSend = {
      ...scheduleForm,
      courseId: scheduleForm.courseId || undefined,
      studentId: scheduleForm.studentId || undefined,
    };
    const res = await createSchedule(dataToSend);
    if (res.success && res.schedule) {
      const created = res.schedule;
      // Map display relation details from local state lists
      const tName = teachers.find((t) => t.id === created.teacherId)?.name || "Teacher";
      const sName = students.find((s) => s.id === created.studentId)?.name || null;
      const cTitle = courses.find((c) => c.id === created.courseId)?.title || null;

      const newSched: Schedule = {
        id: created.id,
        courseId: created.courseId,
        teacherId: created.teacherId,
        studentId: created.studentId,
        dayOfWeek: created.dayOfWeek,
        startTime: created.startTime,
        endTime: created.endTime,
        type: created.type,
        teacher: { name: tName },
        student: sName ? { name: sName } : null,
        course: cTitle ? { title: cTitle } : null,
      };

      setSchedules((prev) => [...prev, newSched]);
      showStatus("success", "Schedule slot created!");
      setAddModal(false);
      setScheduleForm({
        courseId: "",
        teacherId: "",
        studentId: "",
        dayOfWeek: "MONDAY",
        startTime: "09:00",
        endTime: "10:30",
        type: "PRIVATE",
      });
    } else {
      showStatus("error", (res as any).error || "Failed to create schedule.");
    }
    setLoading(false);
  };

  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    setLoading(true);
    const dataToSend = {
      teacherId: scheduleForm.teacherId,
      courseId: scheduleForm.courseId || undefined,
      studentId: scheduleForm.studentId || undefined,
      dayOfWeek: scheduleForm.dayOfWeek,
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      type: scheduleForm.type,
    };
    const res = await updateSchedule(editModal.id, dataToSend);
    if (res.success && res.schedule) {
      const updated = res.schedule;
      const tName = teachers.find((t) => t.id === updated.teacherId)?.name || "Teacher";
      const sName = students.find((s) => s.id === updated.studentId)?.name || null;
      const cTitle = courses.find((c) => c.id === updated.courseId)?.title || null;

      setSchedules((prev) =>
        prev.map((s) =>
          s.id === editModal.id
            ? {
                ...s,
                courseId: updated.courseId,
                teacherId: updated.teacherId,
                studentId: updated.studentId,
                dayOfWeek: updated.dayOfWeek,
                startTime: updated.startTime,
                endTime: updated.endTime,
                type: updated.type,
                teacher: { name: tName },
                student: sName ? { name: sName } : null,
                course: cTitle ? { title: cTitle } : null,
              }
            : s
        )
      );
      showStatus("success", "Schedule slot updated!");
      setEditModal(null);
    } else {
      showStatus("error", (res as any).error || "Failed to update schedule.");
    }
    setLoading(false);
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule slot?")) return;
    const res = await deleteSchedule(id);
    if (res.success) {
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      showStatus("success", "Schedule slot deleted.");
    } else {
      showStatus("error", (res as any).error || "Failed to delete.");
    }
  };

  const handleSaveHolidays = async (newHolidays: Holiday[]) => {
    setLoading(true);
    const res = await saveHolidays(newHolidays);
    if (res.success) {
      setHolidays(newHolidays);
      showStatus("success", "Holidays calendar saved!");
    } else {
      showStatus("error", (res as any).error || "Failed to save holidays.");
    }
    setLoading(false);
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.date || !holidayForm.name) return;
    const newHol = {
      id: `h_${Date.now()}`,
      date: holidayForm.date,
      name: holidayForm.name,
    };
    const updated = [...holidays, newHol].sort((a, b) => a.date.localeCompare(b.date));
    handleSaveHolidays(updated);
    setHolidayModal(false);
    setHolidayForm({ date: "", name: "" });
  };

  const handleDeleteHoliday = (id: string) => {
    if (!confirm("Delete this holiday?")) return;
    const updated = holidays.filter((h) => h.id !== id);
    handleSaveHolidays(updated);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Calendar className="h-8 w-8 text-[#CA8E25]" />
            Schedule Management
          </h1>
          <p className="text-slate-400 mt-2">Manage weekly classes, private slots, rescheduling, and academy holidays.</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "calendar" ? (
            <Button
              onClick={() => {
                setScheduleForm({
                  courseId: "",
                  teacherId: "",
                  studentId: "",
                  dayOfWeek: "MONDAY",
                  startTime: "09:00",
                  endTime: "10:30",
                  type: "PRIVATE",
                });
                setAddModal(true);
              }}
              className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl px-5 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Schedule Slot
            </Button>
          ) : (
            <Button
              onClick={() => setHolidayModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl px-5 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Holiday
            </Button>
          )}
        </div>
      </div>

      {/* Alerts */}
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

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${
            activeTab === "calendar"
              ? "border-[#CA8E25] text-white"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Weekly Schedule Matrix
        </button>
        <button
          onClick={() => setActiveTab("holidays")}
          className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${
            activeTab === "holidays"
              ? "border-[#CA8E25] text-white"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Holidays & Rescheduling Closures
        </button>
      </div>

      {/* Tab content */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
        {activeTab === "calendar" ? (
          <div className="space-y-8">
            {DAYS_OF_WEEK.map((day) => {
              const daySchedules = schedules.filter((s) => s.dayOfWeek === day);
              return (
                <div key={day} className="space-y-3">
                  <h3 className="text-sm font-black tracking-wider text-[#CA8E25] uppercase border-b border-slate-900 pb-1.5">
                    {day}
                  </h3>
                  {daySchedules.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {daySchedules.map((slot) => (
                        <div
                          key={slot.id}
                          className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex flex-col justify-between hover:border-slate-700 transition"
                        >
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                slot.type === "PRIVATE"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              }`}>
                                {slot.type.replace("_", " ")}
                              </span>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                                <Clock className="h-3.5 w-3.5 text-slate-500" />
                                {slot.startTime} - {slot.endTime}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                                {slot.course?.title || "General / Private Tutoring"}
                              </h4>
                              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                                <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                                Teacher: {slot.teacher.name}
                              </p>
                              {slot.student && (
                                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                                  <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                                  Student: {slot.student.name}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-3 border-t border-slate-900 mt-4">
                            <>
                              <button
                                onClick={() => {
                                  setScheduleForm({
                                    courseId: slot.courseId || "",
                                    teacherId: slot.teacherId,
                                    studentId: slot.studentId || "",
                                    dayOfWeek: slot.dayOfWeek,
                                    startTime: slot.startTime,
                                    endTime: slot.endTime,
                                    type: slot.type,
                                  });
                                  setEditModal(slot);
                                }}
                                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-950 transition"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSchedule(slot.id)}
                                className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 italic pl-1">No classes scheduled.</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-[#CA8E25]" /> Academy Holidays
              </h3>
              <p className="text-xs text-slate-500 mt-1">Configure calendar dates when the academy is closed. Student schedules on these days will be marked cancelled.</p>
            </div>

            {holidays.length > 0 ? (
              <div className="space-y-2">
                {holidays.map((h) => (
                  <div key={h.id} className="flex justify-between items-center bg-slate-900 border border-slate-850 px-4 py-3 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-white">{h.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{new Date(h.date).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteHoliday(h.id)}
                      className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-lg transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl text-center text-slate-500 text-sm">
                No holidays scheduled.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Schedule Modal */}
      {(addModal || editModal) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">
                {editModal ? "Edit Schedule Slot" : "Add Schedule Slot"}
              </h3>
              <button onClick={() => { setAddModal(false); setEditModal(null); }} className="text-slate-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={editModal ? handleUpdateSchedule : handleCreateSchedule} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Teacher</label>
                <select
                  required value={scheduleForm.teacherId}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, teacherId: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
                >
                  <option value="">Select Teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Course (Optional)</label>
                <select
                  value={scheduleForm.courseId}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, courseId: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
                >
                  <option value="">Select Course (General Tutoring if empty)</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Student (Optional)</label>
                <select
                  value={scheduleForm.studentId}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, studentId: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
                >
                  <option value="">Select Student (Unbooked / Open slot if empty)</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} {s.studentIdStr ? `(${s.studentIdStr})` : ""}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Day of Week</label>
                  <select
                    value={scheduleForm.dayOfWeek}
                    onChange={(e) => setScheduleForm((p) => ({ ...p, dayOfWeek: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Class Type</label>
                  <select
                    value={scheduleForm.type}
                    onChange={(e) => setScheduleForm((p) => ({ ...p, type: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
                  >
                    {isSuperAdmin && <option value="PRIVATE">PRIVATE</option>}
                    <option value="SEMI_PRIVATE">SEMI PRIVATE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Start Time</label>
                  <input
                    type="text" placeholder="e.g. 09:00" required value={scheduleForm.startTime}
                    onChange={(e) => setScheduleForm((p) => ({ ...p, startTime: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">End Time</label>
                  <input
                    type="text" placeholder="e.g. 10:30" required value={scheduleForm.endTime}
                    onChange={(e) => setScheduleForm((p) => ({ ...p, endTime: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25] font-mono"
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl mt-2">
                {loading ? "Saving..." : editModal ? "Save Changes" : "Create Slot"}
              </Button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Holiday Modal */}
      {holidayModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Add Academy Holiday</h3>
              <button onClick={() => setHolidayModal(false)} className="text-slate-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddHoliday} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Holiday Title / Occasion</label>
                <input
                  type="text" required placeholder="e.g. Christmas Day" value={holidayForm.name}
                  onChange={(e) => setHolidayForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Holiday Date</label>
                <input
                  type="date" required value={holidayForm.date}
                  onChange={(e) => setHolidayForm((p) => ({ ...p, date: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25] font-mono"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl mt-2">
                {loading ? "Adding Holiday..." : "Add Holiday"}
              </Button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
