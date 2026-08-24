"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, GraduationCap, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { adminEnrollStudent } from "@/actions/adminEnrollment";

interface CourseItem {
  id: string;
  title: string;
  type: string;
  price: number;
  registrationFee: number;
}

interface CampItem {
  id: string;
  title: string;
  price: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    name: string;
    studentIdStr?: string | null;
  } | null;
  courses: CourseItem[];
  camps: CampItem[];
  onSuccess?: () => void;
}

export default function AdminEnrollModal({ isOpen, onClose, student, courses, camps, onSuccess }: Props) {
  const [itemType, setItemType] = useState<"CLASS" | "CAMP">("CLASS");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [learningMethod, setLearningMethod] = useState<"SEMI_PRIVATE" | "PRIVATE">("SEMI_PRIVATE");
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number>(1);
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "PENDING">("PAID");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(false);
      setItemType("CLASS");
      if (courses.length > 0) setSelectedItemId(courses[0].id);
      else if (camps.length > 0) setSelectedItemId(camps[0].id);
    }
  }, [isOpen, courses, camps]);

  useEffect(() => {
    if (itemType === "CLASS" && courses.length > 0) {
      setSelectedItemId(courses[0].id);
    } else if (itemType === "CAMP" && camps.length > 0) {
      setSelectedItemId(camps[0].id);
    }
  }, [itemType, courses, camps]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      setError("Please select a course or camp program.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await adminEnrollStudent({
      studentId: student.id,
      itemType,
      itemId: selectedItemId,
      learningMethod,
      sessionsPerWeek,
      paymentStatus,
    });

    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 1200);
    } else {
      setError(res.error || "Failed to enroll student.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#CA8E25]/10 border border-[#CA8E25]/20 flex items-center justify-center text-[#CA8E25]">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Enroll Student</h3>
              <p className="text-xs text-slate-400">
                {student.name} {student.studentIdStr ? `(${student.studentIdStr})` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Student successfully enrolled!</span>
            </div>
          )}

          {/* Program Type Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Program Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setItemType("CLASS")}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition ${
                  itemType === "CLASS"
                    ? "bg-[#CA8E25] text-black border-[#CA8E25]"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850"
                }`}
              >
                Regular / Competition Class
              </button>
              <button
                type="button"
                onClick={() => setItemType("CAMP")}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition ${
                  itemType === "CAMP"
                    ? "bg-[#CA8E25] text-black border-[#CA8E25]"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850"
                }`}
              >
                Camp Program
              </button>
            </div>
          </div>

          {/* Select Specific Course or Camp */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
              {itemType === "CLASS" ? "Select Course" : "Select Camp Program"}
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#CA8E25]"
            >
              {itemType === "CLASS" ? (
                courses.length > 0 ? (
                  courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.type}) — Rp {c.price.toLocaleString("id-ID")}
                    </option>
                  ))
                ) : (
                  <option value="">No courses available</option>
                )
              ) : camps.length > 0 ? (
                camps.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} — Rp {c.price.toLocaleString("id-ID")}
                  </option>
                ))
              ) : (
                <option value="">No camps available</option>
              )}
            </select>
          </div>

          {/* Course Specific Options */}
          {itemType === "CLASS" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Learning Method</label>
                <select
                  value={learningMethod}
                  onChange={(e) => setLearningMethod(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#CA8E25]"
                >
                  <option value="SEMI_PRIVATE">Semi-Private</option>
                  <option value="PRIVATE">Private</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Sessions / Week</label>
                <select
                  value={sessionsPerWeek}
                  onChange={(e) => setSessionsPerWeek(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#CA8E25]"
                >
                  <option value={1}>1 Session / Week</option>
                  <option value={2}>2 Sessions / Week</option>
                </select>
              </div>
            </div>
          )}

          {/* Payment Status Option */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Initial Payment Status</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-xs transition ${
                  paymentStatus === "PAID"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                <input
                  type="radio"
                  name="paymentStatus"
                  value="PAID"
                  checked={paymentStatus === "PAID"}
                  onChange={() => setPaymentStatus("PAID")}
                  className="accent-emerald-500"
                />
                <div>
                  <span className="font-bold block text-white">Paid</span>
                  <span className="text-[10px] text-slate-400">Mark as fully paid</span>
                </div>
              </label>

              <label
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-xs transition ${
                  paymentStatus === "PENDING"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                <input
                  type="radio"
                  name="paymentStatus"
                  value="PENDING"
                  checked={paymentStatus === "PENDING"}
                  onChange={() => setPaymentStatus("PENDING")}
                  className="accent-amber-500"
                />
                <div>
                  <span className="font-bold block text-white">Pending</span>
                  <span className="text-[10px] text-slate-400">Generate invoice</span>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-800 text-slate-300 hover:bg-slate-900 rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || success}
              className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-extrabold rounded-xl text-xs px-5 shadow-lg"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enrolling...
                </span>
              ) : (
                "Confirm Enrollment"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
