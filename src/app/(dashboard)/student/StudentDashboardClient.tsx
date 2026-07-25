"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  Award, 
  Calendar,
  Clock,
  User,
  Mail,
  FileText,
  ChevronRight,
  TrendingUp,
  GraduationCap,
  CalendarDays,
  FileCheck,
  CheckCircle,
  HelpCircle,
  Megaphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface CourseWithTeachers {
  id: string;
  title: string;
  schedule: string;
  price: number;
  type: string;
  categoryName: string;
  teachers: Teacher[];
}

interface Announcement {
  id: string;
  title: string;
  description: string;
  publishDate: string;
  teacherName: string;
  courseName: string | null;
}

interface PlacementTest {
  id: string;
  testCode: string;
  status: string;
  score: number | null;
  qualificationStatus: string | null;
  submittedAt: Date | null;
}

export default function StudentDashboardClient({
  studentName,
  studentIdStr,
  courses,
  placementTest,
  announcements,
}: {
  studentName: string;
  studentIdStr: string | null;
  courses: CourseWithTeachers[];
  placementTest: PlacementTest | null;
  announcements: Announcement[];
}) {
  const [activeTab, setActiveTab] = useState<"courses" | "report">("courses");

  // Mock grade data for academic report
  const mockGrades = [
    { courseTitle: "Mathematics Olympiad Prep", grade: "A+", attendance: "98%", quizzes: "94/100", progress: 85 },
    { courseTitle: "General Science G8", grade: "A", attendance: "95%", quizzes: "88/100", progress: 70 },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-[#CA8E25]" />
            Welcome back, {studentName}!
          </h1>
          <p className="text-slate-400 mt-1">
            Student ID: <span className="font-mono text-[#CA8E25] font-bold">{studentIdStr || "Pending Assignment"}</span>
          </p>
        </div>
      </div>

      {placementTest && (placementTest.status === "NOT_STARTED" || placementTest.status === "IN_PROGRESS" || placementTest.status === "NOT_SUBMITTED") && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-[#CA8E25]" />
              Pending Entry Placement Test
            </h4>
            <p className="text-xs text-slate-400">
              Please complete your academy entry assessment (Code: <span className="font-mono text-[#CA8E25] font-bold">{placementTest.testCode}</span>) to finalize your enrollment and class placements.
            </p>
          </div>
          <Link href={`/placement-test?studentId=${studentIdStr}&code=${placementTest.testCode}`}>
            <Button className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-semibold rounded-xl text-xs py-2 px-4 whitespace-nowrap">
              {placementTest.status === "NOT_STARTED" ? "Start Test" : "Resume Test"}
            </Button>
          </Link>
        </div>
      )}

      {/* Latest Announcements */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-[#CA8E25]" />
          Latest Announcements
        </h3>
        {announcements && announcements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map((ann) => (
              <Link key={ann.id} href="/student/announcements" className="block group">
                <div className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all duration-200 hover:shadow-[0_0_20px_rgba(202,142,37,0.03)] h-full flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-sm font-bold text-white group-hover:text-[#CA8E25] transition-colors line-clamp-1">
                        {ann.title}
                      </h4>
                      {ann.courseName && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 bg-blue-600/10 px-2 py-0.5 rounded border border-blue-500/20 shrink-0">
                          {ann.courseName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {ann.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[10px] text-slate-500">
                    <span>By {ann.teacherName}</span>
                    <span>
                      {new Date(ann.publishDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl text-center space-y-2">
            <Megaphone className="h-8 w-8 text-slate-750 mx-auto" />
            <p className="font-bold text-white text-sm">No announcements at the moment</p>
            <p className="text-xs text-slate-500 font-medium">You are all caught up! When instructors publish updates, they will show up here.</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("courses")}
          className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${
            activeTab === "courses"
              ? "border-[#CA8E25] text-white font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          My Classes & Schedule
        </button>
        <button
          onClick={() => setActiveTab("report")}
          className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${
            activeTab === "report"
              ? "border-[#CA8E25] text-white font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Academic Report
        </button>

      </div>

      {/* Tab Contents */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <AnimatePresence mode="wait">
          {activeTab === "courses" && (
            <motion.div
              key="courses"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-8"
            >
              {/* Classes List */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-[#CA8E25]" />
                    Enrolled Courses
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Explore your ongoing classes and view your instructors.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {courses.length > 0 ? (
                    courses.map((course) => (
                      <div
                        key={course.id}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition shadow-sm"
                      >
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-600/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                              {course.type}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">{course.categoryName}</span>
                          </div>

                          <div>
                            <h4 className="text-lg font-bold text-white group-hover:text-blue-400">
                              {course.title}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                              <CalendarDays className="h-4 w-4 text-[#CA8E25]" />
                              <span>{course.schedule}</span>
                            </div>
                          </div>

                          {/* Teachers List */}
                          <div className="pt-4 border-t border-slate-800 space-y-3">
                            <p className="text-xs text-slate-400 font-bold">Course Instructors:</p>
                            {course.teachers.length > 0 ? (
                              course.teachers.map((teacher) => (
                                <div key={teacher.id} className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
                                    <User className="h-4 w-4 text-blue-400" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-white">{teacher.name}</p>
                                    <p className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                      <Mail className="h-3 w-3" /> {teacher.email}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-500 italic">No instructor assigned yet</p>
                            )}
                          </div>
                        </div>

                        <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2 flex items-center justify-center gap-1.5 text-sm">
                          Access Classroom
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-400">
                      You are not currently enrolled in any classes. 
                      <br/>
                      <Link href="/catalog" className="text-[#CA8E25] font-bold mt-2 inline-block hover:underline">
                        Browse our Course Catalog
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Calendar Schedule */}
              {courses.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-[#CA8E25]" />
                    Weekly Schedule Matrix
                  </h4>
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                    {courses.map((course) => (
                      <div key={course.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800 gap-2 shadow-sm">
                        <div>
                          <p className="font-bold text-white text-sm">{course.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Type: {course.type}</p>
                        </div>
                        <div className="text-right sm:text-right">
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#9B6A1A] font-bold bg-[#CA8E25]/10 border border-[#CA8E25]/20 px-3 py-1 rounded-full font-mono">
                            {course.schedule}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "report" && (
            <motion.div
              key="report"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-8"
            >
              {/* Placement Test Results */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-[#CA8E25]" />
                  Entry & Placement Tests
                </h3>
                {placementTest ? (
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                          Test ID: {placementTest.testCode}
                        </span>
                        <span className="text-xs text-slate-400">
                          Status: {placementTest.status}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white">Academy Entry Assessment</h4>
                      <p className="text-xs text-slate-400">
                        {placementTest.submittedAt ? `Completed on ${new Date(placementTest.submittedAt).toLocaleDateString()}` : "Not submitted yet"}
                      </p>
                      {placementTest.status !== "SUBMITTED" && placementTest.status !== "REVIEWED" && (
                        <div className="pt-2">
                          <Link href={`/placement-test?studentId=${studentIdStr}&code=${placementTest.testCode}`}>
                            <Button className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-semibold rounded-xl text-xs py-2 px-4">
                              {placementTest.status === "NOT_STARTED" ? "Start Test" : "Resume Test"}
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-8">
                      {placementTest.score !== null && (
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">Assessment Score</span>
                          <span className="text-3xl font-extrabold text-[#CA8E25]">{placementTest.score} / 100</span>
                        </div>
                      )}
                      {placementTest.qualificationStatus && (
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">Qualification Status</span>
                          <span className={`text-sm font-bold inline-block px-3 py-1 rounded-full mt-1 ${
                            placementTest.qualificationStatus === "QUALIFIED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}>
                            {placementTest.qualificationStatus}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center text-slate-400 text-sm">
                    No active placement tests registered for this profile.
                  </div>
                )}
              </div>

              {/* Dynamic Academic Progress Cards */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#CA8E25]" />
                  Term Progress Reports
                </h3>
                
                {courses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {courses.map((course, idx) => {
                      // Grab mock details or default
                      const mockReport = mockGrades[idx] || {
                        grade: "A",
                        attendance: "95%",
                        quizzes: "85/100",
                        progress: 60
                      };

                      return (
                        <div key={course.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-white text-base">{course.title}</h4>
                              <p className="text-xs text-slate-400 mt-0.5">Academic Performance Index</p>
                            </div>
                            <span className="text-2xl font-black text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 rounded-xl">
                              {mockReport.grade}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-bold text-slate-400">
                              <span>Syllabus Completion</span>
                              <span>{mockReport.progress}%</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2 border border-slate-700">
                              <div
                                className="bg-gradient-to-r from-blue-600 to-indigo-500 h-1.8 rounded-full"
                                style={{ width: `${mockReport.progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Stats matrix */}
                          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
                            <div className="bg-slate-955 p-2.5 rounded-xl border border-slate-850 shadow-sm">
                              <span className="text-slate-400 block">Attendance Rate</span>
                              <span className="font-bold text-white mt-0.5 block">{mockReport.attendance}</span>
                            </div>
                            <div className="bg-slate-955 p-2.5 rounded-xl border border-slate-850 shadow-sm">
                              <span className="text-slate-400 block">Quiz Performance</span>
                              <span className="font-bold text-white mt-0.5 block">{mockReport.quizzes}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center text-slate-400 text-sm">
                    No academic records available as you have no active classes.
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
