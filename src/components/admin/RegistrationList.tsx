"use client";

import { useState } from "react";
import { approveRegistration, rejectRegistration } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, FileText, User, Mail, Phone, BookOpen, ExternalLink, ShieldAlert } from "lucide-react";
import { useCanManageEnrollment } from "@/hooks/usePermissions";

type RegistrationWithCourse = {
  id: string;
  studentName: string;
  studentAge: number;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  status: string;
  learningMethod?: string | null;
  createdAt: Date;
  course: {
    title: string;
    price: number;
    registrationFee: number;
    learningMethod?: string | null;
  };
  payment?: {
    id: string;
    amount: number;
    receiptUrl: string | null;
    status: string;
  } | null;
  placementTest?: {
    studentIdStr: string;
    testCode: string;
  } | null;
};

export default function RegistrationList({
  initialRegistrations,
}: {
  initialRegistrations: RegistrationWithCourse[];
}) {
  const { canManage } = useCanManageEnrollment();
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [activeTab, setActiveTab] = useState<"PENDING" | "VERIFYING" | "APPROVED" | "REJECTED">("VERIFYING");
  const [selectedReg, setSelectedReg] = useState<RegistrationWithCourse | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  const filtered = registrations.filter((r) => {
    if (activeTab === "VERIFYING") {
      return r.status === "VERIFYING" || r.status === "VERIFYING_PT_PAYMENT" || r.status === "VERIFYING_ENROLLMENT_PAYMENT";
    }
    if (activeTab === "PENDING") {
      return r.status === "PENDING_PAYMENT" || r.status === "PENDING_PT_PAYMENT" || r.status === "PENDING_ENROLLMENT_PAYMENT" || r.status === "PT_ELIGIBLE" || r.status === "QUALIFIED" || r.status === "NOT_QUALIFIED";
    }
    return r.status === activeTab;
  });

  const handleApprove = async (id: string) => {
    if (!confirm("Are you sure you want to approve this enrollment?")) return;
    setLoadingId(id);
    const res = await approveRegistration(id);
    setLoadingId(null);
    if (res.success) {
      if (res.isPlacementTest) {
        alert(`Placement Test Fee Approved!\nStudent ID: ${res.studentId}\nTest Code: ${res.testCode}`);
      } else {
        alert(`Enrollment Approved!\nStudent ID: ${res.studentId}\nCourse enrollment is now active.`);
      }
      
      // Update local state
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: res.isPlacementTest ? "PT_ELIGIBLE" : "APPROVED",
                placementTest: res.isPlacementTest 
                  ? { studentIdStr: res.studentId!, testCode: res.testCode! } 
                  : r.placementTest,
              }
            : r
        )
      );
      setSelectedReg(null);
    } else {
      alert(`Failed to approve: ${res.error}`);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this enrollment?")) return;
    setLoadingId(id);
    const res = await rejectRegistration(id);
    setLoadingId(null);
    if (res.success) {
      alert("Enrollment rejected.");
      setRegistrations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "REJECTED" } : r))
      );
      setSelectedReg(null);
    } else {
      alert("Failed to reject.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Controls */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1">
        {(["VERIFYING", "PENDING", "APPROVED", "REJECTED"] as const).map((tab) => {
          const count = registrations.filter((r) => {
            if (tab === "VERIFYING") {
              return r.status === "VERIFYING" || r.status === "VERIFYING_PT_PAYMENT" || r.status === "VERIFYING_ENROLLMENT_PAYMENT";
            }
            if (tab === "PENDING") {
              return r.status === "PENDING_PAYMENT" || r.status === "PENDING_PT_PAYMENT" || r.status === "PENDING_ENROLLMENT_PAYMENT" || r.status === "PT_ELIGIBLE" || r.status === "QUALIFIED" || r.status === "NOT_QUALIFIED";
            }
            return r.status === tab;
          }).length;
          const labelMap = {
            VERIFYING: "Verification Queue",
            PENDING: "Pending Flow",
            APPROVED: "Approved",
            REJECTED: "Rejected",
          };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab
                  ? "border-[#CA8E25] text-white"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {labelMap[tab]} ({count})
            </button>
          );
        })}
      </div>

      {/* List Container */}
      <div className="grid grid-cols-1 gap-4">
        {filtered.length === 0 ? (
          <div className="bg-slate-950 p-12 rounded-2xl border border-slate-800 text-center text-slate-500">
            No registrations found in this category.
          </div>
        ) : (
          filtered.map((reg) => {
            const method = reg.learningMethod || reg.course?.learningMethod || "SEMI_PRIVATE";
            const allowed = canManage(method);

            return (
              <div
                key={reg.id}
                className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      ID: {reg.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(reg.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                    {reg.studentName} (Age: {reg.studentAge})
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                      reg.status.startsWith("VERIFYING") 
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                        : reg.status === "APPROVED" 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : reg.status === "REJECTED"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    }`}>
                      {reg.status}
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5 text-[#CA8E25]" />
                      Program: {reg.course.title} ({method.replace("_", " ")})
                    </span>
                    {reg.placementTest && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle className="h-3.5 w-3.5" />
                        StudentID: {reg.placementTest.studentIdStr}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-800 hover:bg-slate-900 text-white rounded-xl gap-1"
                    onClick={() => setSelectedReg(reg)}
                  >
                    <FileText className="h-4 w-4" />
                    Review Details
                  </Button>

                  {(reg.status === "VERIFYING" || reg.status === "VERIFYING_PT_PAYMENT" || reg.status === "VERIFYING_ENROLLMENT_PAYMENT") && (
                    allowed ? (
                      <>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1"
                          disabled={loadingId === reg.id}
                          onClick={() => handleApprove(reg.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-rose-950 hover:bg-rose-950 text-rose-400 rounded-xl gap-1"
                          disabled={loadingId === reg.id}
                          onClick={() => handleReject(reg.id)}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs bg-slate-900 text-slate-400 px-3 py-1.5 rounded-xl border border-slate-800 font-medium flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-400" /> View Only
                      </span>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Dialog */}
      {selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-white space-y-6 relative">
            <button
              onClick={() => setSelectedReg(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold border-b border-slate-800 pb-3">
              Registration & Payment Details
            </h3>

            <div className="space-y-4">
              {/* Student info */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Student Info</h4>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <p className="flex items-center gap-2"><User className="h-4 w-4 text-[#CA8E25]" /> {selectedReg.studentName} (Age: {selectedReg.studentAge})</p>
                </div>
              </div>

              {/* Parent info */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Parent Info</h4>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <p className="flex items-center gap-2"><User className="h-4 w-4 text-[#CA8E25]" /> {selectedReg.parentName}</p>
                  <p className="flex items-center gap-2 text-sm text-slate-400"><Mail className="h-4 w-4" /> {selectedReg.parentEmail}</p>
                  <p className="flex items-center gap-2 text-sm text-slate-400"><Phone className="h-4 w-4" /> {selectedReg.parentPhone}</p>
                </div>
              </div>

              {/* Program & Payment info */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Billing & Course</h4>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <p className="font-semibold">{selectedReg.course.title}</p>
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Amount Paid:</span>
                    <span className="text-[#CA8E25] font-bold">
                      Rp {(selectedReg.payment?.amount || 0).toLocaleString("id-ID")}
                    </span>
                  </div>
                  {selectedReg.payment?.receiptUrl && (
                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-sm">Payment Receipt:</span>
                      <button
                        type="button"
                        onClick={() => setViewingReceipt(selectedReg.payment?.receiptUrl || null)}
                        className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 font-medium"
                      >
                        View Receipt <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Placement test details (if approved) */}
              {selectedReg.placementTest && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Approved Account Codes</h4>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1 text-sm">
                    <p>Student ID: <span className="font-mono font-bold text-emerald-400">{selectedReg.placementTest.studentIdStr}</span></p>
                    <p>Test Code: <span className="font-mono font-bold text-amber-400">{selectedReg.placementTest.testCode}</span></p>
                  </div>
                </div>
              )}
            </div>

            {(selectedReg.status === "VERIFYING" || selectedReg.status === "VERIFYING_PT_PAYMENT" || selectedReg.status === "VERIFYING_ENROLLMENT_PAYMENT") && (
              canManage(selectedReg.learningMethod || selectedReg.course?.learningMethod) ? (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 font-bold"
                    disabled={loadingId === selectedReg.id}
                    onClick={() => handleApprove(selectedReg.id)}
                  >
                    Approve Payment
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-rose-950 hover:bg-rose-950 text-rose-400 rounded-xl py-2.5 font-bold"
                    disabled={loadingId === selectedReg.id}
                    onClick={() => handleReject(selectedReg.id)}
                  >
                    Reject Payment
                  </Button>
                </div>
              ) : (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center text-amber-400 text-sm font-semibold flex items-center justify-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  View Only: Super Admin access required for Private class enrollments.
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Receipt Image Preview Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 text-white relative shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Payment Receipt Preview</h3>
              <button onClick={() => setViewingReceipt(null)} className="text-slate-400 hover:text-white text-lg font-bold">
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-900/60 rounded-xl p-4 border border-slate-850">
              {viewingReceipt.startsWith("data:application/pdf") ? (
                <iframe src={viewingReceipt} className="w-full h-[500px] rounded-lg" />
              ) : (
                <img src={viewingReceipt} alt="Payment Receipt" className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
