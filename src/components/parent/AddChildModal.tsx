"use client";

import { useState } from "react";
import { addChildFromParentDashboard } from "@/actions/register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function AddChildModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleOpen = () => {
    setStudentName("");
    setDateOfBirth("");
    setError("");
    setSuccessMessage("");
    setIsOpen(true);
  };

  const handleClose = () => {
    if (loading) return;
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    if (!studentName.trim() || !dateOfBirth.trim()) {
      setError("Full Name and Date of Birth are required.");
      setLoading(false);
      return;
    }

    try {
      const res = await addChildFromParentDashboard({
        studentName: studentName.trim(),
        dateOfBirth: dateOfBirth.trim(),
      });

      if (res.success) {
        setSuccessMessage(res.message || "Child added successfully!");
        setStudentName("");
        setDateOfBirth("");
        setTimeout(() => {
          setIsOpen(false);
          setSuccessMessage("");
        }, 2000);
      } else {
        setError(res.error || "Failed to add child.");
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all text-sm"
      >
        <UserPlus className="h-4 w-4" />
        <span>+ Add Child</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-white shadow-2xl space-y-6 relative">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#CA8E25]/10 flex items-center justify-center text-[#CA8E25]">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Add New Child</h3>
                  <p className="text-xs text-slate-400">Link a new student to your parent account</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error / Success Notifications */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="studentName" className="text-slate-300 font-semibold text-xs">
                  Full Name
                </Label>
                <Input
                  id="studentName"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Child's Full Name"
                  className="bg-slate-950 border-slate-800 text-white rounded-xl focus-visible:ring-[#CA8E25] placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth" className="text-slate-300 font-semibold text-xs">
                  Date of Birth
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white rounded-xl focus-visible:ring-[#CA8E25]"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl py-3"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <span>Add Child</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
