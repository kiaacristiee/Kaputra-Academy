"use client";

import { useState } from "react";
import { Megaphone, ChevronDown, ChevronUp, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AnnouncementItem {
  id: string;
  title: string;
  description: string;
  publishDate: string;
  teacherName: string;
  courseName: string | null;
  targetStudents: string[];
}

export default function ParentAnnouncementsClient({
  initialAnnouncements,
}: {
  initialAnnouncements: AnnouncementItem[];
}) {
  const [announcements] = useState<AnnouncementItem[]>(initialAnnouncements);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-[#CA8E25]" />
            Announcements
          </h1>
          <p className="text-slate-400 mt-2">
            Announcements for your children's classes and general updates from instructors.
          </p>
        </div>
      </div>

      {/* Announcements List */}
      {announcements.length > 0 ? (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border bg-slate-950 border-slate-800 transition hover:border-slate-700"
            >
              {/* Header row */}
              <button
                className="w-full text-left px-6 py-4 flex items-start justify-between gap-4"
                onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      {a.targetStudents.length > 0 ? (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-600/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          For: {a.targetStudents.join(", ")}
                        </span>
                      ) : a.courseName ? (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#CA8E25] bg-[#CA8E25]/10 px-2 py-0.5 rounded-full border border-[#CA8E25]/20">
                          {a.courseName}
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-purple-400 bg-purple-600/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                          General
                        </span>
                      )}
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-400 bg-blue-650/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                        By {a.teacherName}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold truncate text-white">
                      {a.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">
                        Published on {new Date(a.publishDate).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                {expandedId === a.id ? (
                  <ChevronUp className="h-4 w-4 text-slate-500 shrink-0 mt-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500 shrink-0 mt-1" />
                )}
              </button>

              {/* Expanded content */}
              <AnimatePresence>
                {expandedId === a.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 space-y-4 border-t border-slate-800">
                      <p className="text-sm text-slate-300 leading-relaxed pt-4 whitespace-pre-wrap">
                        {a.description}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 p-12 rounded-2xl text-center space-y-3">
          <Megaphone className="h-10 w-10 text-[#CA8E25] mx-auto opacity-40" />
          <p className="font-bold text-white text-lg">No announcements yet</p>
          <p className="text-sm text-slate-500">
            Announcements for your children's courses will appear here when published by instructors.
          </p>
        </div>
      )}
    </div>
  );
}
