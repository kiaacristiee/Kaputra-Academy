import prisma from "@/lib/db";
import RegistrationList from "@/components/admin/RegistrationList";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  Mail,
  MessageSquare,
  Clock,
  Shield,
  DollarSign
} from "lucide-react";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Dashboard | Kaputra Academy",
};

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdminRole(session.user.role)) {
    redirect("/login");
  }

  // Time metrics
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const todayDay = days[now.getDay()];

  const isSuperAdmin = ["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role);

  // Fetch Stats from DB
  const [
    totalStudents,
    totalTeachers,
    pendingPayments,
    pendingEmails,
    todaysClasses,
    todaysPrivateClasses,
    revenueMonthAgg,
    unreadChats
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.invoice.count({ 
      where: { 
        status: "WAITING_VERIFICATION",
        ...(!isSuperAdmin && {
          OR: [
            { learningMethod: null },
            { learningMethod: { not: "PRIVATE" } }
          ]
        }) 
      } 
    }),
    prisma.emailDraft.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.schedule.count({ 
      where: { 
        dayOfWeek: todayDay, 
        ...(!isSuperAdmin && { type: { not: "PRIVATE" } })
      } 
    }),
    isSuperAdmin ? prisma.privateSession.count({ where: { date: { gte: startOfDay, lte: endOfDay }, status: "SCHEDULED" } }) : Promise.resolve(0),
    prisma.invoice.aggregate({
      _sum: { amount: true },
      where: { 
        status: "PAID", 
        paidAt: { gte: startOfMonth },
        ...(!isSuperAdmin && {
          OR: [
            { learningMethod: null },
            { learningMethod: { not: "PRIVATE" } }
          ]
        })
      }
    }),
    prisma.liveChatSession.count({ where: { status: { in: ["NEW", "WAITING_REPLY"] } } })
  ]);

  const revenueMonth = revenueMonthAgg._sum.amount || 0;

  const stats = [
    { name: "Total Students", value: totalStudents.toString(), icon: GraduationCap, color: "from-blue-600 to-indigo-600" },
    { name: "Total Teachers", value: totalTeachers.toString(), icon: Users, color: "from-emerald-600 to-teal-600" },
    { name: "Pending Payments", value: pendingPayments.toString(), icon: CreditCard, color: "from-rose-600 to-pink-600" },
    { name: "Pending Emails", value: pendingEmails.toString(), icon: Mail, color: "from-purple-600 to-fuchsia-600" },
    { name: "Today's Classes", value: todaysClasses.toString(), icon: Clock, color: "from-amber-600 to-orange-600" },
    ...(isSuperAdmin ? [{ name: "Today's Private Classes", value: todaysPrivateClasses.toString(), icon: Shield, color: "from-cyan-600 to-blue-600" }] : []),
    { name: "Revenue This Month", value: `Rp ${revenueMonth.toLocaleString()}`, icon: DollarSign, color: "from-emerald-600 to-emerald-800" },
    { name: "Unread CS Chats", value: unreadChats.toString(), icon: MessageSquare, color: "from-pink-600 to-rose-800" },
  ];

  // Fetch Registrations
  const registrations = await prisma.registration.findMany({
    where: {
      ...(!isSuperAdmin && {
        OR: [
          { learningMethod: null },
          { learningMethod: { not: "PRIVATE" } }
        ]
      })
    },
    include: {
      course: true,
      payment: true,
      placementTest: {
        select: {
          studentIdStr: true,
          testCode: true,
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 50 // Limit to avoid massive DB pull on dashboard
  });

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Admin Control Panel</h1>
          <p className="text-slate-400">System overview and registration approval hubs.</p>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex items-center justify-between shadow-sm"
            >
              <div>
                <p className="text-sm text-slate-400 font-medium">{stat.name}</p>
                <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shrink-0 shadow-lg`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending Invoices Banner */}
      {pendingPayments > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-400">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <CreditCard className="h-6 w-6 text-[#CA8E25]" />
            </div>
            <div>
              <p className="font-bold text-white">Pending Invoice Payments</p>
              <p className="text-xs text-slate-400 mt-0.5">There are {pendingPayments} invoice payments waiting for verification.</p>
            </div>
          </div>
          <Link href="/admin/payments">
            <Button size="sm" className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl px-4 py-2">
              Verify Payments
            </Button>
          </Link>
        </div>
      )}

      {/* Registrations List Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white">Verification & Enrollment Requests</h2>
        <RegistrationList initialRegistrations={registrations} />
      </div>
    </div>
  );
}
