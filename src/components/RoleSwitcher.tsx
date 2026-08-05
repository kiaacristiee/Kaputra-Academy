"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function RoleSwitcher() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!session?.user?.originalRole) return null;

  const originalRole = session.user.originalRole;
  const currentRole = session.user.role;

  // Only show this for high-level officials (Owner, Co-Owner, Super Admin)
  if (!["OWNER", "CO_OWNER", "SUPER_ADMIN"].includes(originalRole)) {
    return null;
  }

  const handleRoleSwitch = async (role: "TEACHER" | "SUPER_ADMIN") => {
    setIsOpen(false);
    if (currentRole === role) return;

    if (role === "TEACHER") {
      await update({ action: "SWITCH_TO_TEACHER" });
      window.location.href = "/teacher";
    } else {
      await update({ action: "SWITCH_TO_SUPER_ADMIN" });
      window.location.href = "/admin";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-900 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 transition rounded-xl px-3 py-1.5 text-sm"
      >
        <div className="text-left">
          <span className="text-[10px] text-slate-400 font-semibold block leading-none uppercase">Role</span>
          <span className="text-white font-bold block leading-tight">
            {currentRole === "TEACHER" ? "Teacher" : "Super Admin"}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="p-1">
            <button
              onClick={() => handleRoleSwitch("SUPER_ADMIN")}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                currentRole !== "TEACHER"
                  ? "bg-purple-500/10 text-purple-400"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="font-semibold">Super Admin</span>
              {currentRole !== "TEACHER" && <Check className="h-4 w-4" />}
            </button>
            <button
              onClick={() => handleRoleSwitch("TEACHER")}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors mt-1 ${
                currentRole === "TEACHER"
                  ? "bg-purple-500/10 text-purple-400"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="font-semibold">Teacher</span>
              {currentRole === "TEACHER" && <Check className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
