import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { Clock, BookOpen, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Schedule | Kaputra Academy",
};

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_SHORT: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
};

export default async function StudentSchedulePage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "STUDENT") {
    redirect("/login");
  }

  // Fetch schedules and enrollments concurrently
  const [schedules, enrollments] = await Promise.all([
    prisma.schedule.findMany({
      where: { studentId: session.user.id },
      include: {
        course: { select: { title: true } },
        teacher: { select: { name: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.enrollment.findMany({
      where: { studentId: session.user.id, status: "ACTIVE" },
      select: { itemId: true },
    }),
  ]);

  const courseIds = enrollments.map((e) => e.itemId);

  const reminders = await prisma.reminder.findMany({
    where: {
      OR: [
        { courseId: { in: courseIds } },
        { courseId: null },
      ],
    },
    include: { teacher: { select: { name: true } } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 20,
  });

  // Group schedules by day
  const scheduleByDay = DAYS.reduce<Record<string, typeof schedules>>((acc, day) => {
    acc[day] = schedules.filter((s) => s.dayOfWeek === day);
    return acc;
  }, {});

  const typeColor: Record<string, string> = {
    CLASS_START: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    HOMEWORK: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    MOCK_TEST: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    DEADLINE: "text-red-400 bg-red-500/10 border-red-500/20",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Calendar className="h-8 w-8 text-[#CA8E25]" />
          My Schedule
        </h1>
        <p className="text-slate-400 mt-2">
          Weekly class schedule and active reminders from your instructors.
        </p>
      </div>

      {/* Weekly Matrix */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#CA8E25]" /> Weekly Class Schedule
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DAYS.map((day) => {
            const daySchedules = scheduleByDay[day];
            const hasClasses = daySchedules.length > 0;
            return (
              <div key={day}
                className={`rounded-2xl border p-4 space-y-3 ${hasClasses
                  ? "bg-slate-950 border-slate-800"
                  : "bg-slate-900/20 border-slate-800/40 opacity-50"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-[#CA8E25]">
                    {DAY_SHORT[day]}
                  </span>
                  {hasClasses && (
                    <span className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">
                      {daySchedules.length} class{daySchedules.length > 1 ? "es" : ""}
                    </span>
                  )}
                </div>
                {hasClasses ? (
                  daySchedules.map((s) => (
                    <div key={s.id} className="bg-slate-900 rounded-xl p-3 space-y-1">
                      <p className="text-xs font-bold text-white truncate">{s.course?.title || "—"}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {s.startTime} – {s.endTime}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> {s.teacher.name}
                      </p>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                        {s.type}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-600 text-center py-2">No classes</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reminders */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[#CA8E25]" /> Active Reminders
        </h2>
        {reminders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reminders.map((r) => {
              const cfg = typeColor[r.type] || "text-slate-400 bg-slate-800 border-slate-700";
              return (
                <div key={r.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-white">{r.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${cfg}`}>
                      {r.type.replace("_", " ")}
                    </span>
                  </div>
                  {r.description && (
                    <p className="text-xs text-slate-400">{r.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-800">
                    <span>{r.teacher.name}</span>
                    {r.dueDate && (
                      <span className="font-semibold text-[#CA8E25]">
                        Due: {new Date(r.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
            <BookOpen className="h-10 w-10 text-[#CA8E25] mx-auto opacity-40" />
            <p className="font-bold text-white">No active reminders</p>
            <p className="text-xs text-slate-500">Your teacher's reminders will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
