"use client";

import { useState } from "react";
import { BookOpen, Calendar, DollarSign, Layers, PlusCircle, CheckCircle2, ChevronRight, AlertCircle, Sparkles, Clock, UserCheck, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enrollInClass, getAvailablePrivateSchedules } from "@/actions/enrollClass";
import { enrollInCamp } from "@/actions/camps";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  title: string;
  type: string;
  shortDescription?: string;
  price: number;
  pricePrivateOnce: number;
  pricePrivateTwice: number;
  priceSemiPrivateOnce: number;
  priceSemiPrivateTwice: number;
  registrationFee: number;
  schedule: string;
  category: { name: string };
  teachers: { teacher: { name: string } }[];
}

function getCoursePrice(course: Course, method: "PRIVATE" | "SEMI_PRIVATE", frequency: 1 | 2) {
  if (method === "PRIVATE") {
    return frequency === 1 ? course.pricePrivateOnce : course.pricePrivateTwice;
  } else {
    return frequency === 1 ? course.priceSemiPrivateOnce : course.priceSemiPrivateTwice;
  }
}

interface ScheduleSlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  className: string;
  capacity: number;
  teacher?: { id: string; name: string } | null;
  _count?: { registrationSlots: number };
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
  allow1xWeek: boolean;
  price1xWeek: number;
  allow2xWeek: boolean;
  price2xWeek: number;
  capacity: number | null;
  status: string;
  visibility: string;
  schedules?: ScheduleSlot[];
}

interface EnrollClientProps {
  initialCourses: Course[];
  initialCamps: Camp[];
  studentId: string;
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

export default function EnrollClient({ initialCourses, initialCamps, studentId }: EnrollClientProps) {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [camps, setCamps] = useState<Camp[]>(initialCamps);
  const [activeTab, setActiveTab] = useState<"all" | "class" | "camp">("all");

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);

  // Camp Selection state inside modal
  const [campFrequency, setCampFrequency] = useState<"1x_WEEK" | "2x_WEEK">("1x_WEEK");
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInvoiceId, setSuccessInvoiceId] = useState<string | null>(null);
  const [successType, setSuccessType] = useState<"CLASS" | "PLACEMENT_TEST" | "CAMP">("CLASS");
  const [successAmount, setSuccessAmount] = useState(300000);

  const [learningMethod, setLearningMethod] = useState<"SEMI_PRIVATE" | "PRIVATE">("SEMI_PRIVATE");
  const [sessionFrequency, setSessionFrequency] = useState<1 | 2>(1);
  const [availableSchedules, setAvailableSchedules] = useState<any[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [showPTPopup, setShowPTPopup] = useState(false);

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
    if (!selectedCourse) return;
    setLoading(true);
    setError(null);

    const wasRegular = selectedCourse.type === "REGULAR";
    const amount = wasRegular ? (getCoursePrice(selectedCourse, learningMethod, sessionFrequency) + selectedCourse.registrationFee) : 300000;

    const res = await enrollInClass(
      studentId, 
      selectedCourse.id, 
      learningMethod, 
      learningMethod === "PRIVATE" ? selectedScheduleId : undefined,
      sessionFrequency
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
      setShowPTPopup(false);
    }
    setLoading(false);
  };

  const openCampModal = (camp: Camp) => {
    setSelectedCamp(camp);
    setModalError(null);
    const defaultFreq = camp.allow1xWeek ? "1x_WEEK" : "2x_WEEK";
    setCampFrequency(defaultFreq);
    setSelectedScheduleIds([]);
  };

  const toggleCampScheduleSelection = (schedId: string) => {
    const isAlreadySelected = selectedScheduleIds.includes(schedId);
    const maxAllowed = campFrequency === "1x_WEEK" ? 1 : 2;

    if (isAlreadySelected) {
      setSelectedScheduleIds(selectedScheduleIds.filter((id) => id !== schedId));
    } else {
      if (maxAllowed === 1) {
        setSelectedScheduleIds([schedId]);
      } else {
        if (selectedScheduleIds.length >= 2) {
          setSelectedScheduleIds([selectedScheduleIds[1], schedId]);
        } else {
          setSelectedScheduleIds([...selectedScheduleIds, schedId]);
        }
      }
    }
  };

  const handleCampEnroll = async () => {
    if (!selectedCamp) return;
    setModalError(null);

    const requiredCount = campFrequency === "1x_WEEK" ? 1 : 2;
    if (selectedScheduleIds.length !== requiredCount) {
      setModalError(`Please select exactly ${requiredCount} class schedule slot(s) for your ${campFrequency === "1x_WEEK" ? "1 Session/Week" : "2 Sessions/Week"} frequency.`);
      return;
    }

    setLoading(true);
    const price = campFrequency === "1x_WEEK" ? selectedCamp.price1xWeek : selectedCamp.price2xWeek;

    const res = await enrollInCamp(studentId, selectedCamp.id, campFrequency, selectedScheduleIds);
    if (res.success && res.invoiceId) {
      setSuccessType("CAMP");
      setSuccessAmount(price);
      setSuccessInvoiceId(res.invoiceId);
      setCamps(camps.filter((c) => c.id !== selectedCamp.id));
      setSelectedCamp(null);
    } else {
      setModalError(res.error || "Failed to register camp program. Please try again.");
    }
    setLoading(false);
  };

  if (successInvoiceId) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12 px-4">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-white font-mono">Registration Submitted!</h1>
          <p className="text-slate-400 text-sm">
            {successType === "CLASS" && "A tuition invoice has been generated for your registration. Please complete the payment to proceed."}
            {successType === "PLACEMENT_TEST" && "A placement test invoice has been generated for your registration. Please complete the payment to proceed to the test."}
            {successType === "CAMP" && "A camp program registration invoice has been generated. Please complete the payment to proceed."}
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl text-left space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-900">
            <span className="text-xs text-slate-500 font-bold uppercase">Item Type</span>
            <span className="text-sm font-bold text-white">
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
          <Link href={`/student/invoices/${successInvoiceId}`}>
            <Button className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl py-3 flex items-center justify-center gap-2">
              View Invoice &amp; Pay <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={() => setSuccessInvoiceId(null)}
            className="text-slate-400 hover:text-white"
          >
            Register for Another Program
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <PlusCircle className="h-8 w-8 text-[#CA8E25]" />
          Register Class &amp; Programs
        </h1>
        <p className="text-slate-400 mt-2">
          Explore and enroll in premium Singapore Curriculum courses and educational camps.
        </p>
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

      {/* Content Rendering based on active tab */}
      {activeTab === "class" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white">Available Classes</h2>
          {courses.length === 0 ? (
            <div className="py-20 text-center text-slate-500 bg-slate-950/20 border border-slate-850 rounded-3xl space-y-3">
              <BookOpen className="w-12 h-12 text-slate-700 mx-auto" />
              <p className="font-bold text-white text-lg">No new classes available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all group relative"
                >
                  <div>
                    {/* Type Badge & Publish Status */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                            course.type === "COMPETITION"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {course.type}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                          Flexible Sessions
                        </span>
                      </div>

                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 font-semibold">
                        Published
                      </span>
                    </div>

                    {/* Title & Short Description */}
                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-slate-400 text-sm mt-2 line-clamp-2">
                      {course.shortDescription || "Focused learning program tailored for student success."}
                    </p>

                    {/* Course Meta Info */}
                    <div className="mt-4 pt-4 border-t border-slate-900 space-y-2.5">
                      <div className="flex items-center gap-2.5 text-xs text-slate-400">
                        <Layers className="h-4 w-4 text-[#CA8E25] shrink-0" />
                        <span>Category: <span className="text-white font-medium">{course.category?.name || "Mathematics"}</span></span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-slate-400">
                        <Calendar className="h-4 w-4 text-[#CA8E25] shrink-0" />
                        <span className="line-clamp-1">Schedule: <span className="text-white font-medium">{course.schedule}</span></span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-slate-400">
                        <DollarSign className="h-4 w-4 text-[#CA8E25] shrink-0" />
                        <span>
                          From: <span className="text-[#CA8E25] font-bold">Rp {course.price ? course.price.toLocaleString("id-ID") : "0"}</span>
                        </span>
                      </div>
                    </div>

                    {/* Assigned Teachers */}
                    <div className="mt-4">
                      <p className="text-xs text-slate-500 font-bold mb-2">Assigned Teachers:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {course.teachers && course.teachers.length > 0 ? (
                          course.teachers.map((ta: any, i: number) => (
                            <span
                              key={i}
                              className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-md font-semibold"
                            >
                              {ta.teacher?.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-600 text-xs italic">No teachers assigned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 pt-4 border-t border-slate-900">
                    <Button
                      onClick={() => {
                        setSelectedCourse(course);
                        setLearningMethod("SEMI_PRIVATE");
                      }}
                      className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl text-xs py-2.5 transition"
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
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {camps.map((camp) => (
                <div
                  key={camp.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all group relative"
                >
                  <div>
                    {/* Type Badge & Status */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          CAMP PROGRAM
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-mono border ${
                            camp.status === "OPEN"
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}
                        >
                          {camp.status || "OPEN"}
                        </span>
                      </div>

                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 font-semibold">
                        Published
                      </span>
                    </div>

                    {/* Title & Desc */}
                    <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors font-mono">
                      {camp.name}
                    </h3>
                    <p className="text-slate-400 text-sm mt-2 line-clamp-2">{camp.description}</p>

                    {/* Learning Frequencies & Pricing */}
                    <div className="mt-4 p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Learning Frequencies</p>
                      {camp.allow1xWeek && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300 font-medium">1x / Week (4 Sessions/mo):</span>
                          <span className="text-[#CA8E25] font-bold font-mono">
                            Rp {(camp.price1xWeek || camp.price || 0).toLocaleString("id-ID")}
                          </span>
                        </div>
                      )}
                      {camp.allow2xWeek && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300 font-medium">2x / Week (8 Sessions/mo):</span>
                          <span className="text-[#CA8E25] font-bold font-mono">
                            Rp {(camp.price2xWeek || camp.price || 0).toLocaleString("id-ID")}
                          </span>
                        </div>
                      )}
                      {!camp.allow1xWeek && !camp.allow2xWeek && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300 font-medium">Program Fee:</span>
                          <span className="text-[#CA8E25] font-bold font-mono">
                            Rp {(camp.price || 0).toLocaleString("id-ID")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Camp Meta & Dates */}
                    <div className="mt-4 pt-4 border-t border-slate-900 space-y-2.5">
                      <div className="flex items-center gap-2.5 text-xs text-slate-400">
                        <Calendar className="h-4 w-4 text-[#CA8E25] shrink-0" />
                        <span>
                          Duration:{" "}
                          <span className="text-white font-medium">
                            {formatDate(camp.startDate)} - {formatDate(camp.endDate)}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-slate-400">
                        <Clock className="h-4 w-4 text-[#CA8E25] shrink-0" />
                        <span>
                          Open until:{" "}
                          <span className="text-white font-medium">{formatDate(camp.registrationDeadline)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 pt-4 border-t border-slate-900">
                    <Button
                      onClick={() => openCampModal(camp)}
                      className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl text-xs py-2.5 transition"
                    >
                      Register Camp
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
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all group relative"
                  >
                    <div>
                      {/* Type Badge & Publish Status */}
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                              course.type === "COMPETITION"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            }`}
                          >
                            {course.type}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                            Flexible Sessions
                          </span>
                        </div>

                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 font-semibold">
                          Published
                        </span>
                      </div>

                      {/* Title & Short Description */}
                      <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-slate-400 text-sm mt-2 line-clamp-2">
                        {course.shortDescription || "Focused learning program tailored for student success."}
                      </p>

                      {/* Course Meta Info */}
                      <div className="mt-4 pt-4 border-t border-slate-900 space-y-2.5">
                        <div className="flex items-center gap-2.5 text-xs text-slate-400">
                          <Layers className="h-4 w-4 text-[#CA8E25] shrink-0" />
                          <span>Category: <span className="text-white font-medium">{course.category?.name || "Mathematics"}</span></span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-slate-400">
                          <Calendar className="h-4 w-4 text-[#CA8E25] shrink-0" />
                          <span className="line-clamp-1">Schedule: <span className="text-white font-medium">{course.schedule}</span></span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-slate-400">
                          <DollarSign className="h-4 w-4 text-[#CA8E25] shrink-0" />
                          <span>
                            From: <span className="text-[#CA8E25] font-bold">Rp {course.price ? course.price.toLocaleString("id-ID") : "0"}</span>
                          </span>
                        </div>
                      </div>

                      {/* Assigned Teachers */}
                      <div className="mt-4">
                        <p className="text-xs text-slate-500 font-bold mb-2">Assigned Teachers:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {course.teachers && course.teachers.length > 0 ? (
                            course.teachers.map((ta: any, i: number) => (
                              <span
                                key={i}
                                className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-md font-semibold"
                              >
                                {ta.teacher?.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-600 text-xs italic">No teachers assigned</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 pt-4 border-t border-slate-900">
                      <Button
                        onClick={() => {
                          setSelectedCourse(course);
                          setLearningMethod("SEMI_PRIVATE");
                        }}
                        className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl text-xs py-2.5 transition"
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
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all group relative"
                  >
                    <div>
                      {/* Type Badge & Status */}
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            CAMP PROGRAM
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-mono border ${
                              camp.status === "OPEN"
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}
                          >
                            {camp.status || "OPEN"}
                          </span>
                        </div>

                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 font-semibold">
                          Published
                        </span>
                      </div>

                      {/* Title & Desc */}
                      <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors font-mono">
                        {camp.name}
                      </h3>
                      <p className="text-slate-400 text-sm mt-2 line-clamp-2">{camp.description}</p>

                      {/* Learning Frequencies & Pricing */}
                      <div className="mt-4 p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Learning Frequencies</p>
                        {camp.allow1xWeek && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-300 font-medium">1x / Week (4 Sessions/mo):</span>
                            <span className="text-[#CA8E25] font-bold font-mono">
                              Rp {(camp.price1xWeek || camp.price || 0).toLocaleString("id-ID")}
                            </span>
                          </div>
                        )}
                        {camp.allow2xWeek && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-300 font-medium">2x / Week (8 Sessions/mo):</span>
                            <span className="text-[#CA8E25] font-bold font-mono">
                              Rp {(camp.price2xWeek || camp.price || 0).toLocaleString("id-ID")}
                            </span>
                          </div>
                        )}
                        {!camp.allow1xWeek && !camp.allow2xWeek && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-300 font-medium">Program Fee:</span>
                            <span className="text-[#CA8E25] font-bold font-mono">
                              Rp {(camp.price || 0).toLocaleString("id-ID")}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Camp Meta & Dates */}
                      <div className="mt-4 pt-4 border-t border-slate-900 space-y-2.5">
                        <div className="flex items-center gap-2.5 text-xs text-slate-400">
                          <Calendar className="h-4 w-4 text-[#CA8E25] shrink-0" />
                          <span>
                            Duration:{" "}
                            <span className="text-white font-medium">
                              {formatDate(camp.startDate)} - {formatDate(camp.endDate)}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-slate-400">
                          <Clock className="h-4 w-4 text-[#CA8E25] shrink-0" />
                          <span>
                            Open until:{" "}
                            <span className="text-white font-medium">{formatDate(camp.registrationDeadline)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 pt-4 border-t border-slate-900">
                      <Button
                        onClick={() => openCampModal(camp)}
                        className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl text-xs py-2.5 transition"
                      >
                        Register Camp
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation & Options Modal for Classes */}
      {selectedCourse && !showPTPopup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-900 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Select Learning Method &amp; Frequency</h3>
              <button
                onClick={() => setSelectedCourse(null)}
                className="text-slate-500 hover:text-white text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Learning Method */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Learning Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLearningMethod("SEMI_PRIVATE")}
                    className={`p-4 rounded-xl border text-left transition flex flex-col justify-between h-28 ${
                      learningMethod === "SEMI_PRIVATE"
                        ? "border-[#CA8E25] bg-[#CA8E25]/10"
                        : "border-slate-800 bg-slate-950 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-sm font-bold text-white">Semi-Private</span>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      Follow the schedule assigned by the instructor.
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
                        ? "border-[#CA8E25] bg-[#CA8E25]/10"
                        : "border-slate-800 bg-slate-950 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-sm font-bold text-white">Private</span>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      Choose your preferred schedule &amp; teacher.
                    </span>
                  </button>
                </div>
              </div>

              {/* Session Frequency */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Session Frequency</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSessionFrequency(1)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      sessionFrequency === 1
                        ? "border-[#CA8E25] bg-[#CA8E25]/10"
                        : "border-slate-800 bg-slate-950 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-xs font-bold text-white">1 Session / Week</span>
                    <span className="text-[10px] text-slate-400 font-mono">4 Sessions/mo</span>
                    <span className="text-xs font-bold text-[#CA8E25] font-mono mt-1">
                      {formatCurrency(getCoursePrice(selectedCourse, learningMethod, 1))}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSessionFrequency(2)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      sessionFrequency === 2
                        ? "border-[#CA8E25] bg-[#CA8E25]/10"
                        : "border-slate-800 bg-slate-950 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-xs font-bold text-white">2 Sessions / Week</span>
                    <span className="text-[10px] text-slate-400 font-mono">8 Sessions/mo</span>
                    <span className="text-xs font-bold text-[#CA8E25] font-mono mt-1">
                      {formatCurrency(getCoursePrice(selectedCourse, learningMethod, 2))}
                    </span>
                  </button>
                </div>
              </div>

              {/* Schedule Info / Select */}
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

              {/* Price Breakdown */}
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Tuition Fee ({sessionFrequency}x/wk):</span>
                  <span className="text-white font-mono">{formatCurrency(getCoursePrice(selectedCourse, learningMethod, sessionFrequency))}</span>
                </div>
                {selectedCourse.registrationFee > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Registration Fee:</span>
                    <span className="text-white font-mono">{formatCurrency(selectedCourse.registrationFee)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm font-bold">
                  <span className="text-white">Total Amount:</span>
                  <span className="text-[#CA8E25] font-mono">
                    {formatCurrency(getCoursePrice(selectedCourse, learningMethod, sessionFrequency) + selectedCourse.registrationFee)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedCourse(null)}
                  className="flex-1 text-slate-400 hover:text-white rounded-xl border border-slate-850"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRegisterClick}
                  disabled={loading || (learningMethod === "PRIVATE" && availableSchedules.length === 0)}
                  className="flex-1 bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Register"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Camps with Frequency & Schedule Selection */}
      {selectedCamp && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl my-6 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div>
                <h3 className="font-bold text-white text-base font-mono flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#CA8E25]" />
                  Camp Program Registration
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedCamp.name}</p>
              </div>
              <button
                onClick={() => setSelectedCamp(null)}
                className="text-slate-400 hover:text-white text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {modalError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 text-xs">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-red-400" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Step 1: Learning Frequency */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#CA8E25] uppercase tracking-wider block border-b border-slate-900 pb-1">
                  1. Select Learning Frequency
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedCamp.allow1xWeek && (
                    <button
                      type="button"
                      onClick={() => {
                        setCampFrequency("1x_WEEK");
                        setSelectedScheduleIds([]);
                      }}
                      className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                        campFrequency === "1x_WEEK"
                          ? "border-[#CA8E25] bg-[#CA8E25]/10"
                          : "border-slate-800 bg-slate-900 hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-white block">1 Session / Week</span>
                        <span className="text-[10px] text-slate-400 font-mono">4 Sessions / Month</span>
                      </div>
                      <span className="text-sm font-black text-[#CA8E25] font-mono mt-3">
                        {formatCurrency(selectedCamp.price1xWeek || selectedCamp.price)}
                      </span>
                    </button>
                  )}

                  {selectedCamp.allow2xWeek && (
                    <button
                      type="button"
                      onClick={() => {
                        setCampFrequency("2x_WEEK");
                        setSelectedScheduleIds([]);
                      }}
                      className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                        campFrequency === "2x_WEEK"
                          ? "border-[#CA8E25] bg-[#CA8E25]/10"
                          : "border-slate-800 bg-slate-900 hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-white block">2 Sessions / Week</span>
                        <span className="text-[10px] text-slate-400 font-mono">8 Sessions / Month</span>
                      </div>
                      <span className="text-sm font-black text-[#CA8E25] font-mono mt-3">
                        {formatCurrency(selectedCamp.price2xWeek || selectedCamp.price)}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Step 2: Schedule Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-900 pb-1">
                  <label className="text-xs font-bold text-[#CA8E25] uppercase tracking-wider">
                    2. Select Fixed Class Schedule Slots
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Select {campFrequency === "1x_WEEK" ? "1 slot" : "2 slots"} ({selectedScheduleIds.length}/{campFrequency === "1x_WEEK" ? 1 : 2} selected)
                  </span>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {selectedCamp.schedules && selectedCamp.schedules.length > 0 ? (
                    selectedCamp.schedules.map((sched) => {
                      const booked = sched._count?.registrationSlots || 0;
                      const isFull = booked >= (sched.capacity || 4);
                      const isSelected = selectedScheduleIds.includes(sched.id);

                      return (
                        <div
                          key={sched.id}
                          onClick={() => {
                            if (!isFull) toggleCampScheduleSelection(sched.id);
                          }}
                          className={`p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                            isFull
                              ? "bg-slate-950 border-slate-900 opacity-50 cursor-not-allowed"
                              : isSelected
                              ? "border-blue-500 bg-blue-600/10 shadow-lg shadow-blue-500/10"
                              : "bg-slate-900 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">
                                {sched.className} • {sched.dayOfWeek} ({sched.startTime} - {sched.endTime})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <UserCheck className="w-3.5 h-3.5 text-[#CA8E25]" />
                              <span>Teacher: <strong className="text-slate-200">{sched.teacher?.name || "Unassigned"}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isFull
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              }`}
                            >
                              {isFull ? "FULL (4/4)" : `${booked}/4 Booked`}
                            </span>

                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                                isSelected
                                  ? "bg-blue-600 border-blue-500 text-white"
                                  : "border-slate-700 bg-slate-950"
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-500 italic">No schedule slots configured for this camp.</p>
                  )}
                </div>
              </div>

              {/* Total Summary */}
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400 block">Total Tuition Fee:</span>
                  <span className="text-white font-bold">
                    {campFrequency === "1x_WEEK" ? "1x/week (4 Sessions/mo)" : "2x/week (8 Sessions/mo)"}
                  </span>
                </div>
                <span className="text-lg font-black text-[#CA8E25] font-mono">
                  {formatCurrency(campFrequency === "1x_WEEK" ? selectedCamp.price1xWeek || selectedCamp.price : selectedCamp.price2xWeek || selectedCamp.price)}
                </span>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setSelectedCamp(null)}
                className="flex-1 text-slate-400 hover:text-white rounded-xl border border-slate-800"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCampEnroll}
                disabled={loading || selectedScheduleIds.length !== (campFrequency === "1x_WEEK" ? 1 : 2)}
                className="flex-1 bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Confirm & Enroll"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
