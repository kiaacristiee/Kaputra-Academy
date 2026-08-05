"use client";

import { useEffect, useState, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getDevUsers } from "@/actions/dev";
import { UserCircle, ChevronDown, Check } from "lucide-react";

type DevUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
};

export default function DevAccountSwitcher() {
  const [users, setUsers] = useState<DevUser[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isError, setIsError] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only execute logic in development
    if (process.env.NODE_ENV !== "development") {
      setIsError(true);
      return;
    }

    const fetchUsers = async () => {
      const res = await getDevUsers();
      if (res.success && res.users) {
        setUsers(res.users);
      } else {
        setIsError(true);
      }
    };
    fetchUsers();

    // Setup outside click listener
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Return nothing in production or if it fails
  if (process.env.NODE_ENV !== "development" || isError || users.length === 0) {
    return null;
  }

  // Group users by role
  const roleGroups = users.reduce((acc, user) => {
    if (!acc[user.role]) acc[user.role] = [];
    acc[user.role].push(user);
    return acc;
  }, {} as Record<string, DevUser[]>);

  const handleSwitchAccount = async (userId: string, role: string) => {
    setIsOpen(false);
    // Use NextAuth credentials sign in
    const result = await signIn("credentials", {
      isDevSwitch: "true",
      userId,
      redirect: false,
    });

    if (result?.ok) {
      // Direct them to the correct dashboard based on role
      const routePath = ["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(role) 
        ? "/admin" 
        : `/${role.toLowerCase()}`;
        
      router.push(routePath);
      router.refresh();
    } else {
      alert("Dev switch failed.");
    }
  };

  const getRoleColor = (role: string) => {
    switch(role) {
      case "SUPER_ADMIN": return "text-purple-400";
      case "ADMIN": return "text-red-400";
      case "TEACHER": return "text-blue-400";
      case "PARENT": return "text-emerald-400";
      case "STUDENT": return "text-amber-400";
      default: return "text-slate-400";
    }
  };

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-indigo-400 font-mono text-xs transition-colors"
        title="Developer Quick Switcher"
      >
        <UserCircle className="w-4 h-4" />
        <span className="hidden sm:inline">Dev Switcher</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 shadow-2xl rounded-xl overflow-hidden flex flex-col max-h-[80vh]">
          <div className="p-3 bg-slate-950 border-b border-slate-800 shrink-0">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Dev Account Switcher</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Click any account to instantly swap sessions.</p>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 space-y-3">
            {Object.keys(roleGroups).sort().map(role => (
              <div key={role} className="space-y-1">
                <div className={`text-[10px] font-bold uppercase tracking-widest px-2 pb-1 border-b border-slate-800 ${getRoleColor(role)}`}>
                  {role.replace("_", " ")}
                </div>
                {roleGroups[role].map(user => {
                  const isCurrent = session?.user?.id === user.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSwitchAccount(user.id, user.role)}
                      disabled={isCurrent}
                      className={`w-full text-left px-2 py-2 flex items-center justify-between rounded-lg text-sm transition-colors ${
                        isCurrent 
                          ? "bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed" 
                          : "hover:bg-slate-800 text-slate-200"
                      }`}
                    >
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-medium truncate">{user.name}</span>
                        {user.email && <span className="text-[10px] text-slate-500 truncate">{user.email}</span>}
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
