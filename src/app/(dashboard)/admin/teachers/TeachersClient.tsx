"use client";

import { useState } from "react";
import { Plus, Search, Edit2, Trash2, X, Users, Phone, Mail, Lock, Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { createTeacher, updateTeacher, deleteTeacher } from "@/actions/teachers";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function TeachersClient({
  initialTeachers,
}: {
  initialTeachers: any[];
}) {
  const router = useRouter();
  const [teachers, setTeachers] = useState(initialTeachers);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const openAddModal = () => {
    setEditingTeacher(null);
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (teacher: any) => {
    setEditingTeacher(teacher);
    setName(teacher.name);
    setEmail(teacher.email);
    setPhone(teacher.phone || "");
    setPassword(""); // Keep blank to not change password
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email) {
      setError("Name and Email are required fields.");
      return;
    }

    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    const payload = {
      name,
      email,
      phone: phone || undefined,
      password: password || undefined,
    };

    let result;
    if (editingTeacher) {
      result = await updateTeacher(editingTeacher.id, payload);
    } else {
      result = await createTeacher(payload);
    }

    if (result.success && result.teacher) {
      if (editingTeacher) {
        setTeachers(
          teachers.map((t) =>
            t.id === editingTeacher.id
              ? {
                  ...t,
                  ...result.teacher,
                }
              : t
          )
        );
      } else {
        setTeachers([
          {
            ...result.teacher,
            teachingAssignments: [],
          },
          ...teachers,
        ]);
      }
      setIsModalOpen(false);
      router.refresh();
    } else {
      setError(result.error || "Something went wrong.");
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this instructor? All teaching assignments for this instructor will also be deleted."
      )
    )
      return;
    const result = await deleteTeacher(id);
    if (result.success) {
      setTeachers(teachers.filter((t) => t.id !== id));
      router.refresh();
    } else {
      alert(result.error || "Failed to delete instructor.");
    }
  };

  const filteredTeachers = teachers.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="h-8 w-8 text-[#CA8E25]" />
            Teacher Directory
          </h1>
          <p className="text-slate-400 mt-1">Manage and assign Kaputra Academy instructors.</p>
        </div>
        <Button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl px-5 py-2.5 flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <Plus className="h-5 w-5" />
          Add Instructor
        </Button>
      </div>

      {/* Search Filter */}
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search instructors by name or email..."
            className="pl-12 bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600 w-full"
          />
        </div>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeachers.map((teacher) => (
          <motion.div
            layout
            key={teacher.id}
            className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all group relative"
          >
            <div>
              {/* Profile Card Header */}
              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-900">
                <div className="w-12 h-12 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-white font-bold text-lg">
                  {teacher.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">
                    {teacher.name}
                  </h3>
                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-emerald-400 mt-0.5 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">
                    <Shield className="w-3 h-3" />
                    Instructor
                  </span>
                </div>
              </div>

              {/* Contact Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                  <Mail className="h-4 w-4 text-[#CA8E25]" />
                  <span className="font-mono">{teacher.email}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                  <Phone className="h-4 w-4 text-[#CA8E25]" />
                  <span>{teacher.phone || "No phone contact added"}</span>
                </div>
              </div>

              {/* Teaching Assignments */}
              <div className="mt-5">
                <p className="text-xs text-slate-500 font-bold mb-2">Assigned Courses:</p>
                <div className="flex flex-wrap gap-1.5">
                  {teacher.teachingAssignments && teacher.teachingAssignments.length > 0 ? (
                    teacher.teachingAssignments.map((ta: any) => (
                      <span
                        key={ta.id}
                        className="bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[10px] px-2.5 py-1 rounded-md"
                      >
                        {ta.course.title}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-600 text-xs italic">No assigned courses</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-900">
              <Button
                variant="ghost"
                onClick={() => openEditModal(teacher)}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2 flex items-center justify-center gap-2 text-xs border border-slate-800"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit Info
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleDelete(teacher.id)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl px-4 py-2 flex items-center justify-center gap-2 text-xs border border-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        ))}

        {filteredTeachers.length === 0 && (
          <div className="col-span-full bg-slate-950 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            No instructors found matching search.
          </div>
        )}
      </div>

      {/* Modal - Add / Edit Teacher */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <h2 className="text-xl font-bold text-white">
                  {editingTeacher ? "Edit Instructor" : "Register New Instructor"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-300">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dr. John Doe"
                      className="bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. johndoe@kaputra.com"
                      className="bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-slate-300">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 08123456789"
                      className="bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="pass" className="text-slate-300">
                        Password {!editingTeacher && <span className="text-red-500">*</span>}
                      </Label>
                      {editingTeacher && (
                        <span className="text-[10px] text-slate-500 italic">Leave empty to keep current</span>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <PasswordInput
                        id="pass"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={editingTeacher ? "Enter new password" : "Enter temporary password (min 6 chars)"}
                        className="pl-10 bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4 border-t border-slate-900">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-3 border border-slate-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 shadow-lg shadow-blue-600/20 font-bold"
                  >
                    Save Instructor
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
