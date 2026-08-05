"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, CheckCircle, Scale, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptTerms } from "@/actions/dashboard";

interface TermsModalProps {
  onAccept: () => void;
  /** 
   * 'persist' (default): saves acceptedTerms=true to DB.
   * 'session': only calls onAccept without touching the DB — useful for 
   *   per-visit gates (parent dashboard) or pre-action confirmations (class registration).
   */
  mode?: "persist" | "session";
}

const clauses = [
  {
    id: 1,
    title: "1. Introduction",
    text: "Welcome to Kaputra Academy. By enrolling, using our platform, accessing our trial videos, quizzes, or academic reports, you agree to comply with and be bound by the following terms and conditions."
  },
  {
    id: 2,
    title: "2. Course Material & Academic Integrity",
    text: "All learning materials, classroom videos, and quizzes are proprietary property of Kaputra Academy. You may not distribute, record, copy, download, or share any materials with third parties. Violation of this will result in immediate termination of access without refund."
  },
  {
    id: 3,
    title: "3. Payments & Refund Policy",
    text: "Placement test fees and tuition fees are non-refundable. Once payment is verified, course materials will be unlocked for the scheduled duration. Late payments may result in suspension of class access."
  },
  {
    id: 4,
    title: "4. Placement Test & Course Recommendation",
    text: "Placement tests are required for advanced programs. Placement test results and course track recommendations are final and determined solely by academic assessment standards."
  },
  {
    id: 5,
    title: "5. Account Usage & Parent Controls",
    text: "Parent accounts are responsible for payment management and reviewing progress of linked child student accounts. Student accounts are restricted from accessing payment history or invoice modifications."
  },
  {
    id: 6,
    title: "6. Consent and Agreement",
    text: "By reviewing and acknowledging all clauses, you consent to our terms of service, privacy policy, and academic grading metrics."
  }
];

export default function TermsModal({ onAccept, mode = "persist" }: TermsModalProps) {
  const [agreedItems, setAgreedItems] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);

  const allAgreed = clauses.every(clause => agreedItems[clause.id]);

  const handleToggle = (id: number) => {
    setAgreedItems(prev => {
      const next = { ...prev, [id]: !prev[id] };
      if (clauses.every(c => next[c.id])) {
        setShowError(false);
      }
      return next;
    });
  };

  const handleAgree = async () => {
    if (!allAgreed) {
      setShowError(true);
      return;
    }
    
    setLoading(true);
    if (mode === "persist") {
      const res = await acceptTerms();
      setLoading(false);
      if (res.success) {
        onAccept();
      } else {
        alert("Failed to save agreement: " + (res.error || "Please try again."));
      }
    } else {
      // session mode: no DB write, just accept
      setLoading(false);
      onAccept();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <Scale className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Terms & Conditions</h2>
            <p className="text-xs text-slate-400">Please review and formally acknowledge each clause to continue</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-5 text-sm text-slate-300 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent pb-4">
          {clauses.map((clause) => {
            const isChecked = !!agreedItems[clause.id];
            return (
              <label 
                key={clause.id}
                className={`flex gap-3 cursor-pointer group p-4 border rounded-2xl transition-all ${
                  isChecked 
                    ? "bg-emerald-500/5 border-emerald-500/30" 
                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="pt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(clause.id)}
                    className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 focus:ring-2 cursor-pointer transition-colors"
                  />
                </div>
                <div>
                  <p className={`font-bold transition-colors ${isChecked ? "text-emerald-400" : "text-white group-hover:text-slate-200"}`}>
                    {clause.title}
                  </p>
                  <p className={`mt-1.5 leading-relaxed text-[13px] ${isChecked ? "text-emerald-400/80" : "text-slate-400"}`}>
                    {clause.text}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        <div className="border-t border-slate-800 pt-5 mt-2 shrink-0">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              {showError && !allAgreed ? (
                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg text-xs leading-tight animate-in fade-in slide-in-from-bottom-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Please read and agree to all Terms &amp; Conditions before continuing.
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  <span className={allAgreed ? "text-emerald-500 font-bold" : ""}>
                    {Object.values(agreedItems).filter(Boolean).length} of {clauses.length} clauses acknowledged
                  </span>
                </div>
              )}
            </div>

            <Button
              type="button"
              onClick={handleAgree}
              disabled={loading}
              className={`w-full sm:w-auto font-bold rounded-xl px-8 py-2.5 flex items-center justify-center gap-2 transition-all ${
                allAgreed
                  ? "bg-[#CA8E25] hover:bg-[#D89A2B] text-black shadow-lg"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed hover:bg-slate-800"
              }`}
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Continue to Dashboard
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
