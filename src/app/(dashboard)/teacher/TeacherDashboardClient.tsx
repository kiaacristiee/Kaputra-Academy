"use client";

import { motion } from "framer-motion";
import {
  Users,
  BookOpen,
  Clock,
  Star,
  ArrowUpRight,
  Calendar,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface CourseWithStats {
  id: string;
  title: string;
  schedule: string;
  isPublished: boolean;
  type: string;
  studentsCount: number;
}

export default function TeacherDashboardClient({
  teacherName,
  courses,
  totalStudents,
  activeClassesCount,
}: {
  teacherName: string;
  courses: CourseWithStats[];
  totalStudents: number;
  activeClassesCount: number;
}) {
  const stats = [
    { name: "Total Students", value: totalStudents.toString(), icon: Users, change: "Active enrollments", color: "from-blue-600 to-indigo-600" },
    { name: "Assigned Courses", value: courses.length.toString(), icon: BookOpen, change: "Current curriculum", color: "from-emerald-600 to-teal-600" },
    { name: "Active Classes", value: activeClassesCount.toString(), icon: Clock, change: "Published in catalog", color: "from-amber-600 to-orange-600" },
    { name: "Instructor Rating", value: "4.9/5", icon: Star, change: "Student feedback rating", color: "from-purple-600 to-pink-600" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back, {teacherName}!</h1>
          <p className="text-slate-400">Here's what's happening with your classes and students today.</p>
        </div>
        <div className="flex items-center gap-3">
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg"
            >
              <div>
                <p className="text-sm text-slate-400 font-medium">{stat.name}</p>
                <h3 className="text-3xl font-bold text-white mt-1">{stat.value}</h3>
                <span className="text-xs text-slate-500 block mt-2">{stat.change}</span>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white`}>
                <Icon className="h-6 w-6" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Classes List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Assigned Classes</h2>
          </div>
          <div className="space-y-4">
            {courses.length > 0 ? (
              courses.map((cls) => (
                <div key={cls.id} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                      {cls.type}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-2">{cls.title}</h3>
                    <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      {cls.schedule || "Schedule not specified"}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 self-end sm:self-center">
                    <div className="text-right">
                      <span className="text-2xl font-bold text-white">{cls.studentsCount}</span>
                      <span className="text-xs text-slate-500 block">students</span>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${cls.isPublished ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                      {cls.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 text-center text-slate-500">
                You have not been assigned to any courses yet. Contact an administrator to receive course assignments.
              </div>
            )}
          </div>
        </div>

        {/* Schedule/Activities */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white">Your Schedule</h2>
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6 shadow-md">
            {courses.length > 0 ? (
              courses.map((cls, idx) => (
                <div key={cls.id} className={`relative pl-6 border-l-2 ${idx === 0 ? "border-blue-500" : "border-slate-800"}`}>
                  <span className="text-xs font-bold text-blue-400 block uppercase">Weekly Schedule</span>
                  <h4 className="text-sm font-semibold text-white mt-1">{cls.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{cls.schedule}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm italic">No classes scheduled.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
