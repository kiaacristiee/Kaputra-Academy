"use client";

import { useState, useEffect } from "react";
import { Users, BookOpen, Calendar, DollarSign, PlusCircle, CheckCircle2, ChevronRight, AlertCircle, Sparkles, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAvailableCourses, enrollInClass, getAvailablePrivateSchedules } from "@/actions/enrollClass";
import { getAvailableCamps, enrollInCamp } from "@/actions/camps";
import TermsModal from "@/components/TermsModal";
import Link from "next/link";

interface Child {
  id: string;
  name: string;
  studentIdStr: string | null;
}

interface Course {
  id: string;
  title: string;
  type: string;
  price: number;
  registrationFee: number;
  schedule: string;
  category: { name: string };
  teachers: { teacher: { name: string } }[];
}

interface Camp {
  id: string;
  name: string;
  slug: string;
  description: string;
  thumbnailUrl: string | null;
  startDate: string | Date;
  endDate: string | Date;
  registrationDeadline: string | Date;
  price: number;
  capacity: number | null;
  status: string;
  visibility: string;
}

interface ParentEnrollClientProps {
  childrenList: Child[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dStr: string | Date) {
  if (!dStr) return "-";
  return new Date(dStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ParentEnrollClient({ childrenList }: ParentEnrollClientProps) {
  const [selectedChildId, setSelectedChildId] = useState<string>(childrenList[0]?.id || "");
  const [courses, setCourses] = useState<Course[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "class" | "camp">("all");
  
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInvoiceId, setSuccessInvoiceId] = useState<string | null>(null);
  const [successType, setSuccessType] = useState<"CLASS" | "PLACEMENT_TEST" | "CAMP">("CLASS");
  const [successAmount, setSuccessAmount] = useState(300000);

  // Terms modal state for registration
  const [pendingCourse, setPendingCourse] = useState<Course | null>(null);
  const [pendingCamp, setPendingCamp] = useState<Camp | null>(null);
  const [showTermsForRegistration, setShowTermsForRegistration] = useState(false);

  const [learningMethod, setLearningMethod] = useState<"SEMI_PRIVATE" | "PRIVATE">("SEMI_PRIVATE");
  const [availableSchedules, setAvailableSchedules] = useState<any[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [showPTPopup, setShowPTPopup] = useState(false);

  const activeChild = childrenList.find((c) => c.id === selectedChildId);

  // Fetch courses and camps whenever child selection changes
  useEffect(() => {
    async function loadPrograms() {
      if (!selectedChildId) return;
      setLoadingPrograms(true);
      setError(null);
      
      const [courseRes, campRes] = await Promise.all([
        getAvailableCourses(selectedChildId),
        getAvailableCamps(selectedChildId)
      ]);

      if (courseRes.success && courseRes.courses) {
        setCourses(courseRes.courses as Course[]);
      } else {
        setError(courseRes.error || "Failed to load courses.");
      }

      if (campRes.success && campRes.camps) {
        setCamps(campRes.camps as Camp[]);
      } else {
        setError((prev) => prev || campRes.error || "Failed to load camp programs.");
      }
      
      setLoadingPrograms(false);
    }
    loadPrograms();
  }, [selectedChildId]);

  const loadSchedules = async () => {
    setLoadingSchedules(true);
    const res = await getAvailablePrivateSchedules();
    if (res.success && res.schedules) {
      setAvailableSchedules(res.schedules);
      if (res.schedules.length > 0) {
        setSelectedScheduleId(res.schedules[0].id);
      }
    }
    setLoadingSchedules(false);
  };

  const handleRegisterClick = () => {
    if (!selectedCourse) return;
    if (selectedCourse.type === "COMPETITION") {
      setShowPTPopup(true);
    } else {
      handleEnroll();
    }
  };

  const handleEnroll = async () => {
    if (!selectedCourse || !selectedChildId) return;
    setSubmitting(true);
    setError(null);

    const wasRegular = selectedCourse.type === "REGULAR";
    const amount = wasRegular ? (selectedCourse.price + selectedCourse.registrationFee) : 300000;

    const res = await enrollInClass(
      selectedChildId, 
      selectedCourse.id, 
      learningMethod, 
      learningMethod === "PRIVATE" ? selectedScheduleId : undefined
    );
    if (res.success && res.invoiceId) {
      setSuccessType(wasRegular ? "CLASS" : "PLACEMENT_TEST");
      setSuccessAmount(amount);
      setSuccessInvoiceId(res.invoiceId);
      setCourses(courses.filter((c) => c.id !== selectedCourse.id));
      setSelectedCourse(null);
      setShowPTPopup(false);
    } else {
      setError(res.error || "Failed to register class. Please try again.");
      setSelectedCourse(null);
      setShowPTPopup(false);
    }
    setSubmitting(false);
  };

  const handleCampEnroll = async () => {
    if (!selectedCamp || !selectedChildId) return;
    setSubmitting(true);
    setError(null);

    const res = await enrollInCamp(selectedChildId, selectedCamp.id);
    if (res.success && res.invoiceId) {
      setSuccessType("CAMP");
      setSuccessAmount(selectedCamp.price);
      setSuccessInvoiceId(res.invoiceId);
      setCamps(camps.filter((c) => c.id !== selectedCamp.id));
      setSelectedCamp(null);
    } else {
      setError(res.error || "Failed to register camp program. Please try again.");
      setSelectedCamp(null);
    }
    setSubmitting(false);
  };

  const handleResetSuccess = () => {
    setSuccessInvoiceId(null);
    setSelectedCourse(null);
    setSelectedCamp(null);
  };

  if (childrenList.length === 0) {
    return (
      <div className="py-20 text-center text-slate-500 bg-slate-950/20 border border-slate-850 rounded-3xl space-y-3 max-w-md mx-auto">
        <Users className="w-12 h-12 text-slate-700 mx-auto" />
        <p className="font-bold text-white text-lg">No Linked Children</p>
        <p className="text-sm text-slate-500">
          You don't have any children linked to your account yet. Please contact the administrator to link your child accounts.
        </p>
      </div>
    );
  }

  if (successInvoiceId) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12 px-4">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-white">Enrollment Registered!</h1>
          <p className="text-slate-400 text-sm">
            {successType === "CLASS" && `A tuition invoice has been generated for **${activeChild?.name}**. Please complete the payment to proceed.`}
            {successType === "PLACEMENT_TEST" && `A placement test invoice has been generated for **${activeChild?.name}**. Please complete the payment to proceed to the test.`}
            {successType === "CAMP" && `A camp program registration invoice has been generated for **${activeChild?.name}**. Please complete the payment to proceed.`}
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl text-left space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-900">
            <span className="text-xs text-slate-500 font-bold uppercase">Student</span>
            <span className="text-sm font-bold text-white">{activeChild?.name}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-900 text-xs">
            <span className="text-slate-500">Item</span>
            <span className="text-slate-350 font-bold">
              {successType === "CLASS" ? "Class Tuition & Registration" : successType === "CAMP" ? "Camp Program Registration" : "Placement Test Registration"}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">{successType === "CLASS" ? "Tuition & Reg Fee" : successType === "CAMP" ? "Camp Program Fee" : "Placement Test Fee"}</span>
            <span className="text-slate-300 font-mono">
              {formatCurrency(successAmount)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-900 font-bold text-sm">
            <span className="text-white">Total Amount</span>
            <span className="text-[#CA8E25] font-mono">
              {formatCurrency(successAmount)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link href={`/parent/invoices/${successInvoiceId}`}>
            <Button className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl py-3 flex items-center justify-center gap-2">
              View Invoice Details <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={handleResetSuccess}
            className="text-slate-400 hover:text-white"
          >
            Register Another Program
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Child Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <PlusCircle className="h-8 w-8 text-[#CA8E25]" />
            Register Child Class
          </h1>
          <p className="text-slate-400 mt-2">
            Enroll your children in Kaputra Academy Singapore Curriculum courses and camp programs.
          </p>
        </div>

        {/* Child Dropdown */}
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center gap-3 min-w-[240px]">
          <Users className="w-5 h-5 text-[#CA8E25] shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Select Child</span>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="w-full bg-transparent text-sm text-white font-bold focus:outline-none pr-4"
              disabled={loadingPrograms || submitting}
            >
              {childrenList.map((child) => (
                <option key={child.id} value={child.id} className="bg-slate-950">
                  {child.name} {child.studentIdStr ? `(${child.studentIdStr})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6">
        {["all", "class", "camp"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-3 text-sm font-bold capitalize transition-all relative ${
              activeTab === tab ? "text-[#CA8E25]" : "text-slate-400 hover:text-white"
            }`}
          >
            {tab === "camp" ? "Camp Program" : tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#CA8E25]" />
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loadingPrograms ? (
        <div className="py-20 text-center text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 text-[#CA8E25] animate-spin mx-auto" />
          <p className="text-sm">Fetching available programs for child...</p>
        </div>
      ) : (
        <>
          {activeTab === "class" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Available Classes</h2>
              {courses.length === 0 ? (
                <div className="py-20 text-center text-slate-500 bg-slate-950/20 border border-slate-850 rounded-3xl space-y-3">
                  <BookOpen className="w-12 h-12 text-slate-700 mx-auto" />
                  <p className="font-bold text-white text-lg">No classes available</p>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    **{activeChild?.name}** is already enrolled in all published classes or has pending registrations/invoices for them.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] bg-blue-600/10 border border-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {course.category.name}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            course.type === "COMPETITION"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}>
                            {course.type}
                          </span>
                        </div>

                        <h3 className="font-bold text-white text-lg leading-tight line-clamp-1">{course.title}</h3>

                        <div className="space-y-1.5 pt-2 text-xs text-slate-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>{course.schedule}</span>
                          </div>
                          {course.teachers.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                              <span>Taught by: {course.teachers.map((t) => t.teacher.name).join(", ")}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-900 space-y-3">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-slate-500">Price</span>
                          <span className="text-[#CA8E25] font-black text-lg font-mono">
                            {formatCurrency(course.price)}
                          </span>
                        </div>
                        {course.registrationFee > 0 && (
                          <div className="flex justify-between items-baseline text-xs">
                            <span className="text-slate-500">Reg. Fee</span>
                            <span className="text-slate-400 font-bold font-mono">
                              {formatCurrency(course.registrationFee)}
                            </span>
                          </div>
                        )}
                        <Button
                          onClick={() => {
                            setPendingCourse(course);
                            setShowTermsForRegistration(true);
                          }}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white hover:text-white border border-slate-850 hover:border-slate-700 rounded-xl text-xs py-2"
                        >
                          Register Course
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "camp" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Camp Programs</h2>
              {camps.length === 0 ? (
                <div className="py-20 text-center text-slate-500 bg-slate-950/20 border border-slate-850 rounded-3xl space-y-3">
                  <Calendar className="w-12 h-12 text-slate-700 mx-auto" />
                  <p className="font-bold text-white text-lg">No camp programs available</p>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    **{activeChild?.name}** is already enrolled in all published camp programs or has pending registrations/invoices for them.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {camps.map((camp) => (
                    <div
                      key={camp.id}
                      className="bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-[#CA8E25] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {(camp as any).type || "CAMP"}
                          </span>
                        </div>

                        <h3 className="font-bold text-white text-lg leading-tight line-clamp-1 font-mono">{camp.name}</h3>
                        <p className="text-xs text-slate-400 line-clamp-2">{camp.description}</p>

                        <div className="space-y-1.5 pt-2 text-xs text-slate-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>{formatDate(camp.startDate)} - {formatDate(camp.endDate)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>Deadline: {formatDate(camp.registrationDeadline)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-900 space-y-3">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-slate-500">Price</span>
                          <span className="text-[#CA8E25] font-black text-lg font-mono">
                            {formatCurrency(camp.price)}
                          </span>
                        </div>
                        <Button
                          onClick={() => {
                            setPendingCamp(camp);
                            setShowTermsForRegistration(true);
                          }}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white hover:text-white border border-slate-850 hover:border-slate-700 rounded-xl text-xs py-2"
                        >
                          Register Camp Program
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "all" && (
            <div className="space-y-12">
              {/* Classes Section */}
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-white">Available Classes</h2>
                {courses.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 bg-slate-950/20 border border-slate-850 rounded-3xl space-y-3">
                    <BookOpen className="w-10 h-10 text-slate-700 mx-auto" />
                    <p className="font-bold text-white text-base">No new classes available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                      <div
                        key={course.id}
                        className="bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] bg-blue-600/10 border border-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {course.category.name}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              course.type === "COMPETITION"
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}>
                              {course.type}
                            </span>
                          </div>

                          <h3 className="font-bold text-white text-lg leading-tight line-clamp-1">{course.title}</h3>

                          <div className="space-y-1.5 pt-2 text-xs text-slate-400">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>{course.schedule}</span>
                            </div>
                            {course.teachers.length > 0 && (
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                                <span>Taught by: {course.teachers.map((t) => t.teacher.name).join(", ")}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-900 space-y-3">
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs text-slate-500">Price</span>
                            <span className="text-[#CA8E25] font-black text-lg font-mono">
                              {formatCurrency(course.price)}
                            </span>
                          </div>
                          {course.registrationFee > 0 && (
                            <div className="flex justify-between items-baseline text-xs">
                              <span className="text-slate-500">Reg. Fee</span>
                              <span className="text-slate-400 font-bold font-mono">
                                {formatCurrency(course.registrationFee)}
                              </span>
                            </div>
                          )}
                          <Button
                            onClick={() => {
                              setPendingCourse(course);
                              setShowTermsForRegistration(true);
                            }}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white hover:text-white border border-slate-850 hover:border-slate-700 rounded-xl text-xs py-2"
                          >
                            Register Course
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Camp Programs Section */}
              <div className="space-y-6 pt-4 border-t border-slate-800">
                <h2 className="text-xl font-bold text-white">Camp Programs</h2>
                {camps.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 bg-slate-950/20 border border-slate-850 rounded-3xl space-y-3">
                    <Calendar className="w-10 h-10 text-slate-700 mx-auto" />
                    <p className="font-bold text-white text-base">No new camp programs available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {camps.map((camp) => (
                      <div
                        key={camp.id}
                        className="bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-[#CA8E25] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {(camp as any).type || "CAMP"}
                            </span>
                          </div>

                          <h3 className="font-bold text-white text-lg leading-tight line-clamp-1 font-mono">{camp.name}</h3>
                          <p className="text-xs text-slate-400 line-clamp-2">{camp.description}</p>

                          <div className="space-y-1.5 pt-2 text-xs text-slate-400">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>{formatDate(camp.startDate)} - {formatDate(camp.endDate)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>Deadline: {formatDate(camp.registrationDeadline)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-900 space-y-3">
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs text-slate-500">Price</span>
                            <span className="text-[#CA8E25] font-black text-lg font-mono">
                              {formatCurrency(camp.price)}
                            </span>
                          </div>
                          <Button
                            onClick={() => {
                              setPendingCamp(camp);
                              setShowTermsForRegistration(true);
                            }}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white hover:text-white border border-slate-850 hover:border-slate-700 rounded-xl text-xs py-2"
                          >
                            Register Camp Program
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Terms Modal — shown before registration confirmation */}
      {showTermsForRegistration && (
        <TermsModal
          mode="session"
          onAccept={() => {
            setShowTermsForRegistration(false);
            if (pendingCourse) {
              setSelectedCourse(pendingCourse);
              setLearningMethod("SEMI_PRIVATE");
              setPendingCourse(null);
            } else if (pendingCamp) {
              setSelectedCamp(pendingCamp);
              setPendingCamp(null);
            }
          }}
        />
      )}

      {/* Confirmation & Options Modal for Classes */}
      {selectedCourse && !showTermsForRegistration && !showPTPopup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-900 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Select Learning Method</h3>
              <button
                onClick={() => setSelectedCourse(null)}
                className="text-slate-500 hover:text-white text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Learning Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLearningMethod("SEMI_PRIVATE")}
                    className={`p-4 rounded-xl border text-left transition flex flex-col justify-between h-28 ${
                      learningMethod === "SEMI_PRIVATE"
                        ? "border-[#CA8E25] bg-[#CA8E25]/5"
                        : "border-slate-800 bg-slate-950 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-sm font-bold text-white">Semi-Private</span>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      Follow the schedule assigned by the instructor. Cannot choose schedule/teacher.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLearningMethod("PRIVATE");
                      loadSchedules();
                    }}
                    className={`p-4 rounded-xl border text-left transition flex flex-col justify-between h-28 ${
                      learningMethod === "PRIVATE"
                        ? "border-[#CA8E25] bg-[#CA8E25]/5"
                        : "border-slate-800 bg-slate-950 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-sm font-bold text-white">Private</span>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      Choose your preferred schedule and teacher.
                    </span>
                  </button>
                </div>
              </div>

              {learningMethod === "PRIVATE" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Schedule &amp; Teacher</label>
                  {loadingSchedules ? (
                    <div className="py-4 text-center text-xs text-slate-500 font-mono">Loading schedules...</div>
                  ) : availableSchedules.length === 0 ? (
                    <div className="bg-amber-500/15 border border-amber-500/20 text-amber-400 text-xs p-3 rounded-xl">
                      No available private schedule slots. Please select Semi-Private or contact the administrator.
                    </div>
                  ) : (
                    <select
                      value={selectedScheduleId}
                      onChange={(e) => setSelectedScheduleId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#CA8E25] font-semibold"
                    >
                      {availableSchedules.map((sch) => (
                        <option key={sch.id} value={sch.id}>
                          {sch.dayOfWeek} at {sch.startTime} - {sch.endTime} ({sch.teacher?.name || "No Teacher"})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {learningMethod === "SEMI_PRIVATE" && (
                <div className="space-y-1.5 bg-slate-900 border border-slate-850 p-4 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Class Assigned Schedule</span>
                  <p className="text-xs text-white font-semibold">{selectedCourse.schedule}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedCourse(null)}
                  className="flex-1 text-slate-400 hover:text-white rounded-xl border border-slate-850"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRegisterClick}
                  disabled={submitting || (learningMethod === "PRIVATE" && availableSchedules.length === 0)}
                  className="flex-1 bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl"
                >
                  Register
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Camps */}
      {selectedCamp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-900 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Register Camp Program</h3>
              <button
                onClick={() => setSelectedCamp(null)}
                className="text-slate-500 hover:text-white text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-1.5 bg-slate-900 border border-slate-850 p-4 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Camp Name</span>
                <p className="text-sm text-white font-semibold font-mono">{selectedCamp.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 bg-slate-900 border border-slate-850 p-3 rounded-xl text-xs">
                  <span className="text-slate-500 block font-bold uppercase text-[9px]">Start Date</span>
                  <span className="text-white font-semibold">{formatDate(selectedCamp.startDate)}</span>
                </div>
                <div className="space-y-1 bg-slate-900 border border-slate-850 p-3 rounded-xl text-xs">
                  <span className="text-slate-500 block font-bold uppercase text-[9px]">End Date</span>
                  <span className="text-white font-semibold">{formatDate(selectedCamp.endDate)}</span>
                </div>
              </div>
              <div className="space-y-1.5 bg-slate-900 border border-slate-850 p-4 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Camp Price</span>
                <p className="text-base text-[#CA8E25] font-black font-mono">{formatCurrency(selectedCamp.price)}</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedCamp(null)}
                  className="flex-1 text-slate-400 hover:text-white rounded-xl border border-slate-850"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCampEnroll}
                  disabled={submitting}
                  className="flex-1 bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl"
                >
                  {submitting ? "Registering..." : "Confirm & Register"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Placement Test Required Dialog */}
      {showPTPopup && selectedCourse && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-6">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-white text-lg">Placement Test Required</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Before enrolling in a class, you are required to complete a Placement Test. To access the Placement Test, you must first pay the Placement Test fee.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-4 flex justify-between items-center">
              <span className="text-xs text-slate-400 font-bold uppercase">Placement Test Fee</span>
              <span className="text-sm font-black text-[#CA8E25] font-mono">{formatCurrency(300000)}</span>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowPTPopup(false)}
                className="flex-1 text-slate-400 hover:text-white rounded-xl border border-slate-850"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEnroll}
                disabled={submitting}
                className="flex-1 bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl"
              >
                {submitting ? "Processing..." : "Continue to Payment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
