"use client";

import { useState } from "react";
import {
  Calendar, Clock, Plus, Edit, Trash2, Bell, BookOpen,
  AlertCircle, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createReminder, updateReminder, deleteReminder } from "@/actions/reminders";
import { motion, AnimatePresence } from "framer-motion";

interface ScheduleItem {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  type: string;
  courseName: string | null;
}

interface ReminderItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  dueDate: string | null;
  courseId: string | null;
  courseName: string | null;
}

interface Course {
  id: string;
  title: string;
}

const REMINDER_TYPES = [
  { value: "CLASS_START", label: "Class Starts", color: "text-blue-400 bg-blue-600/10 border-blue-500/20" },
  { value: "HOMEWORK", label: "Homework", color: "text-amber-400 bg-amber-600/10 border-amber-500/20" },
  { value: "MOCK_TEST", label: "Quiz", color: "text-purple-400 bg-purple-600/10 border-purple-500/20" },
  { value: "DEADLINE", label: "Deadline", color: "text-red-400 bg-red-600/10 border-red-500/20" },
];

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export default function ScheduleClient({
  schedules,
  initialReminders,
  courses,
}: {
  schedules: ScheduleItem[];
  initialReminders: ReminderItem[];
  courses: Course[];
}) {
  const [reminders, setReminders] = useState<ReminderItem[]>(initialReminders);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReminderItem | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("CLASS_START");
  const [dueDate, setDueDate] = useState("");
  const [courseId, setCourseId] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const showStatus = (t: "success" | "error", text: string) => {
    setMessage({ type: t, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setTitle("");
    setDescription("");
    setType("CLASS_START");
    setDueDate("");
    setCourseId("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: ReminderItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description || "");
    setType(item.type);
    setCourseId(item.courseId || "");
    if (item.dueDate) {
      const d = new Date(item.dueDate);
      const tzoffset = d.getTimezoneOffset() * 60000;
      setDueDate(new Date(d.getTime() - tzoffset).toISOString().slice(0, 16));
    } else {
      setDueDate("");
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) { showStatus("error", "Title is required."); return; }
    setLoading(true);

    const payload = { title, description, type, dueDate: dueDate || undefined, courseId: courseId || undefined };

    if (editingItem) {
      const res = await updateReminder(editingItem.id, payload);
      if (res.success && res.item) {
        showStatus("success", "Reminder updated!");
        const updated = res.item as any;
        setReminders(prev =>
          prev.map(r => r.id === editingItem.id ? {
            ...r,
            title: updated.title,
            description: updated.description,
            type: updated.type,
            dueDate: updated.dueDate ? new Date(updated.dueDate).toISOString() : null,
            courseId: updated.courseId,
          } : r)
        );
        setIsModalOpen(false);
      } else {
        showStatus("error", res.error || "Failed to update.");
      }
    } else {
      const res = await createReminder(payload);
      if (res.success && res.item) {
        showStatus("success", "Reminder created!");
        const created = res.item as any;
        setReminders(prev => [{
          id: created.id,
          title: created.title,
          description: created.description,
          type: created.type,
          dueDate: created.dueDate ? new Date(created.dueDate).toISOString() : null,
          courseId: created.courseId,
          courseName: courses.find(c => c.id === created.courseId)?.title || null,
        }, ...prev]);
        setIsModalOpen(false);
      } else {
        showStatus("error", res.error || "Failed to create.");
      }
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this reminder?")) return;
    const res = await deleteReminder(id);
    if (res.success) {
      showStatus("success", "Reminder deleted!");
      setReminders(prev => prev.filter(r => r.id !== id));
    } else {
      showStatus("error", res.error || "Failed.");
    }
  };

  const getReminderTypeInfo = (t: string) =>
    REMINDER_TYPES.find(rt => rt.value === t) || REMINDER_TYPES[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Calendar className="h-8 w-8 text-[#CA8E25]" />
            Schedule & Reminders
          </h1>
          <p className="text-slate-400 mt-2">
            View your teaching schedule and manage class reminders.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 px-4 flex items-center gap-2 text-sm font-semibold transition self-start sm:self-center"
        >
          <Plus className="h-4 w-4" />
          Add Reminder
        </Button>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
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

      {/* Weekly Schedule */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Weekly Teaching Schedule</h2>
        {schedules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DAYS.filter(day => schedules.some(s => s.dayOfWeek === day)).map(day => (
              <div key={day} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">{day}</h3>
                {schedules.filter(s => s.dayOfWeek === day).map(s => (
                  <div key={s.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 space-y-1">
                    <div className="flex items-center gap-2 text-white text-sm font-semibold">
                      <Clock className="h-3.5 w-3.5 text-[#CA8E25]" />
                      {s.startTime} – {s.endTime}
                    </div>
                    {s.courseName && (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> {s.courseName}
                      </p>
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-600/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                      {s.type}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-950 border border-slate-800 p-8 rounded-2xl text-center text-slate-400">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-white">No schedule entries found</p>
            <p className="text-sm mt-1">Your teaching schedule will appear here once classes are assigned.</p>
          </div>
        )}
      </div>

      {/* Reminders List */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Reminders</h2>
        {reminders.length > 0 ? (
          <div className="space-y-4">
            {reminders.map(item => {
              const typeInfo = getReminderTypeInfo(item.type);
              return (
                <div
                  key={item.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition flex flex-col md:flex-row justify-between md:items-start gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      {item.courseName && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#CA8E25] bg-[#CA8E25]/10 px-2.5 py-0.5 rounded-full border border-[#CA8E25]/20">
                          {item.courseName}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white">{item.title}</h3>
                    {item.description && (
                      <p className="text-slate-400 text-sm">{item.description}</p>
                    )}
                    {item.dueDate && (
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5" />
                        Due: {new Date(item.dueDate).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-start">
                    <Button
                      onClick={() => openEditModal(item)}
                      variant="ghost"
                      size="icon"
                      className="rounded-xl text-blue-400 hover:text-blue-300 hover:bg-slate-900"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(item.id)}
                      variant="ghost"
                      size="icon"
                      className="rounded-xl text-red-400 hover:text-red-300 hover:bg-slate-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-950 border border-slate-800 p-8 rounded-2xl text-center text-slate-400">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-white">No reminders yet</p>
            <p className="text-sm mt-1">Create reminders for homework, quizzes, or deadlines.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bell className="h-5 w-5 text-[#CA8E25]" />
                  {editingItem ? "Edit Reminder" : "Add Reminder"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-xl font-bold">&times;</button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase">Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Homework Due"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase">Description (optional)</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="Additional details..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase">Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      {REMINDER_TYPES.map(rt => (
                        <option key={rt.value} value={rt.value}>{rt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase">Course</label>
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">General</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase">Due Date & Time (optional)</label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <Button type="button" onClick={() => setIsModalOpen(false)} variant="ghost" className="rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-6 font-semibold">
                    {loading ? "Saving..." : editingItem ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
