"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { getUserTermsStatus } from "@/actions/dashboard";
import TermsModal from "@/components/TermsModal";
import {
  BookOpen,
  GraduationCap,
  Users,
  Layers,
  Calendar,
  CreditCard,
  LogOut,
  LayoutDashboard,
  Settings,
  Menu,
  Play,
  Video,
  FileText,
  Award,
  BarChart2,
  CheckSquare,
  Clock,
  TrendingUp,
  DollarSign,
  Sliders,
  FileEdit,
  UserCheck,
  Megaphone,
  Plus,
  ClipboardList
} from "lucide-react";


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Determine user role from pathname
  const isTeacher = pathname.startsWith("/teacher");
  const isAdmin = pathname.startsWith("/admin");
  const isStudent = pathname.startsWith("/student");
  const isParent = pathname.startsWith("/parent");

  useEffect(() => {
    async function checkTerms() {
      // Parents have their own per-visit terms modal in ParentDashboardClient
      if (isParent) return;
      const res = await getUserTermsStatus();
      if (res.success && !res.acceptedTerms) {
        setShowTerms(true);
      }
    }
    checkTerms();
  }, [isParent]);

  const menuItems = [
    ...(isStudent ? [
      { name: "Overview", href: "/student", icon: LayoutDashboard },
      { name: "Register Class", href: "/student/enroll", icon: Plus },
      { name: "Placement Test", href: "/student/placement-test", icon: ClipboardList },
      { name: "Trial Content", href: "/student/trial", icon: Play },
      { name: "Class Videos", href: "/student/videos", icon: Video },
      { name: "Learning Materials", href: "/student/materials", icon: FileText },
      { name: "Mock Tests", href: "/student/mock-test", icon: Award },
      { name: "Academic Report", href: "/student/report", icon: BarChart2 },
      { name: "Attendance", href: "/student/attendance", icon: CheckSquare },
      { name: "Schedule", href: "/student/schedule", icon: Clock },
      { name: "Announcements", href: "/student/announcements", icon: Megaphone },
      { name: "Invoices", href: "/student/invoices", icon: CreditCard },
      { name: "Profile", href: "/student/profile", icon: Settings },
    ] : []),
    ...(isTeacher ? [
      { name: "Overview", href: "/teacher", icon: LayoutDashboard },
      { name: "Mock Tests CMS", href: "/teacher/mock-tests", icon: Award },
    ] : []),
    ...(isAdmin ? [
      { name: "Overview", href: "/admin", icon: LayoutDashboard },
      { name: "Teacher Management", href: "/admin/teachers", icon: Users },
      { name: "Teacher Assignment", href: "/admin/teacher-assignments", icon: UserCheck },
      { name: "Course CMS", href: "/admin/courses", icon: BookOpen },
      { name: "Videos CMS", href: "/admin/videos", icon: Video },
      { name: "Materials CMS", href: "/admin/materials", icon: FileText },
      { name: "Mock Tests CMS", href: "/admin/mock-tests", icon: Award },
      { name: "Salary CMS", href: "/admin/salary", icon: DollarSign },
      { name: "Student Management", href: "/admin/students", icon: GraduationCap },
      { name: "Parent Management", href: "/admin/parents", icon: Users },
      { name: "Placement Test CMS", href: "/admin/placement-tests", icon: Award },
      { name: "Payment Management", href: "/admin/payments", icon: CreditCard },
      { name: "Schedule Management", href: "/admin/schedules", icon: Clock },
      { name: "CMS Content", href: "/admin/cms", icon: Layers },
    ] : []),
    ...(isParent ? [
      { name: "Overview", href: "/parent", icon: LayoutDashboard },
      { name: "Register Class", href: "/parent/enroll", icon: Plus },
      { name: "Children List", href: "/parent/children", icon: Users },
      { name: "Progress Track", href: "/parent/progress", icon: TrendingUp },
      { name: "Academic Reports", href: "/parent/reports", icon: BookOpen },
      { name: "Attendance", href: "/parent/attendance", icon: Calendar },
      { name: "Payment History", href: "/parent/payments", icon: CreditCard },
      { name: "Invoices", href: "/parent/invoices", icon: FileText },
      { name: "Schedule", href: "/parent/schedule", icon: Clock },
      { name: "Profile", href: "/parent/profile", icon: Settings },
    ] : []),
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-100">
      {showTerms && <TermsModal onAccept={() => setShowTerms(false)} />}

      {/* Sidebar for Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform transform md:translate-x-0 md:relative ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} bg-slate-950 border-r border-slate-800`}>
        <div className="h-16 flex items-center px-6 justify-between border-b border-slate-800">
          <Link href="/" className="text-xl font-bold flex items-center gap-2 text-white">
            <GraduationCap className="h-6 w-6 text-[#CA8E25]" />
            <span>Kaputra Academy <span className="text-xs bg-[#CA8E25]/20 text-[#CA8E25] px-2 py-0.5 rounded-full capitalize">{isTeacher ? "Teacher" : isAdmin ? "Admin" : isParent ? "Parent" : "Student"}</span></span>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            &times;
          </Button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <span className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                  ? "bg-blue-650 text-white shadow-md shadow-blue-650/20"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}>
                  <Icon className="h-5 w-5" />
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-slate-900">
              <LogOut className="h-5 w-5" />
              Back To Home
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 z-10 bg-slate-950 border-b border-slate-800">
          <Button variant="ghost" size="icon" className="md:hidden text-slate-400" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-4 ml-auto">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-white">Dashboard</p>
              <p className="text-xs text-slate-400 capitalize">{isTeacher ? "Instructor" : isAdmin ? "Administrator" : isParent ? "Parent" : "Student"}</p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold border bg-slate-800 border-slate-700 text-white">
              JD
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-900">
          {showTerms ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center bg-slate-950/20 rounded-3xl border border-slate-800/50 backdrop-blur-sm">
              <p className="text-lg font-bold text-white mb-2">Terms &amp; Conditions Agreement Required</p>
              <p className="max-w-md text-sm text-slate-400">Please review and accept the terms and conditions in the overlay to unlock dashboard access.</p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
