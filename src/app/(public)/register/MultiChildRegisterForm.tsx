"use client";

import { useState, useRef } from "react";
import { submitRegistration } from "@/actions/register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, UserPlus, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

interface ChildInput {
  id: string;
  studentName: string;
  dateOfBirth: string;
}

export function MultiChildRegisterForm() {
  const [children, setChildren] = useState<ChildInput[]>([
    { id: "1", studentName: "", dateOfBirth: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleAddChild = () => {
    setChildren((prev) => [
      ...prev,
      { id: Date.now().toString(), studentName: "", dateOfBirth: "" },
    ]);
  };

  const handleRemoveChild = (id: string) => {
    if (children.length <= 1) return;
    setChildren((prev) => prev.filter((c) => c.id !== id));
  };

  const handleChildChange = (id: string, field: "studentName" | "dateOfBirth", value: string) => {
    setChildren((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (isSubmittingRef.current) {
      e.preventDefault();
      return;
    }
    isSubmittingRef.current = true;
    setSubmitting(true);
  };

  return (
    <form
      action={submitRegistration}
      onSubmit={handleSubmit}
      className="space-y-8"
    >
      {/* Hidden input to pass multi-child JSON data */}
      <input
        type="hidden"
        name="childrenJson"
        value={JSON.stringify(
          children.map((c) => ({
            studentName: c.studentName,
            dateOfBirth: c.dateOfBirth,
          }))
        )}
      />

      {/* PARENT INFORMATION SECTION */}
      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
          <div className="w-8 h-8 rounded-lg bg-[#CA8E25]/10 text-[#CA8E25] flex items-center justify-center font-bold text-sm">
            1
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#072147]">Parent Information</h3>
            <p className="text-xs text-gray-500">Your account and contact details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="parentName">Parent Full Name</Label>
            <Input
              id="parentName"
              name="parentName"
              required
              placeholder="e.g. John Doe"
              className="w-full bg-white rounded-xl focus-visible:ring-[#CA8E25]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="parentPhone">Parent Phone Number</Label>
            <Input
              id="parentPhone"
              name="parentPhone"
              required
              placeholder="e.g. +628123456789"
              className="w-full bg-white rounded-xl focus-visible:ring-[#CA8E25]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="parentEmail">Parent Email Address</Label>
            <Input
              id="parentEmail"
              name="parentEmail"
              type="email"
              required
              placeholder="e.g. john@example.com"
              className="w-full bg-white rounded-xl focus-visible:ring-[#CA8E25]"
            />
          </div>
        </div>
      </div>

      {/* CHILDREN INFORMATION SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#CA8E25]/10 text-[#CA8E25] flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#072147]">Child Information</h3>
              <p className="text-xs text-gray-500">Add one or multiple children to register</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#CA8E25]/10 text-[#CA8E25] border border-[#CA8E25]/20">
            {children.length} {children.length === 1 ? "Child" : "Children"}
          </span>
        </div>

        {children.map((child, index) => (
          <div
            key={child.id}
            className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4 relative group transition-all"
          >
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <span className="text-xs font-black uppercase tracking-wider text-[#CA8E25] bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">
                CHILD {index + 1}
              </span>
              {children.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveChild(child.id)}
                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl h-8 px-2 flex items-center gap-1 text-xs transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Remove</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor={`child-name-${child.id}`}>Full Name</Label>
                <Input
                  id={`child-name-${child.id}`}
                  required
                  value={child.studentName}
                  onChange={(e) => handleChildChange(child.id, "studentName", e.target.value)}
                  placeholder="e.g. Bryan Doe"
                  className="w-full bg-white rounded-xl focus-visible:ring-[#CA8E25]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`child-dob-${child.id}`}>Date of Birth</Label>
                <Input
                  id={`child-dob-${child.id}`}
                  type="date"
                  required
                  value={child.dateOfBirth}
                  onChange={(e) => handleChildChange(child.id, "dateOfBirth", e.target.value)}
                  className="w-full bg-white rounded-xl focus-visible:ring-[#CA8E25]"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Add Another Child Button */}
        <Button
          type="button"
          onClick={handleAddChild}
          className="w-full py-3 bg-white border-2 border-dashed border-slate-300 hover:border-[#CA8E25] text-slate-700 hover:text-[#CA8E25] font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Plus className="h-5 w-5 text-[#CA8E25]" />
          <span>+ Add Another Child</span>
        </Button>
      </div>

      {/* SUBMIT BUTTON */}
      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-extrabold py-4 rounded-2xl shadow-lg transition-all text-lg flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Processing Registration...</span>
          </>
        ) : (
          <>
            <span>Register Account</span>
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </Button>

      <div className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="text-[#CA8E25] font-bold hover:underline">
          Log In
        </Link>
      </div>
    </form>
  );
}
