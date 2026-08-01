"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, CheckCircle, Scale } from "lucide-react";
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

export default function TermsModal({ onAccept, mode = "persist" }: TermsModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAgree = async () => {
    if (!agreed) return;
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
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <Scale className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Terms & Conditions</h2>
            <p className="text-xs text-slate-400">Please review and agree to continue</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-sm text-slate-350 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          <p className="font-semibold text-white">1. Introduction</p>
          <p>
            Welcome to Kaputra Academy. By enrolling, using our platform, accessing our trial videos, quizzes, or academic reports, you agree to comply with and be bound by the following terms and conditions.
          </p>

          <p className="font-semibold text-white">2. Course Material & Academic Integrity</p>
          <p>
            All learning materials, classroom videos, and quizzes are proprietary property of Kaputra Academy. You may not distribute, record, copy, download, or share any materials with third parties. Violation of this will result in immediate termination of access without refund.
          </p>

          <p className="font-semibold text-white">3. Payments & Refund Policy</p>
          <p>
            Placement test fees and tuition fees are non-refundable. Once payment is verified, course materials will be unlocked for the scheduled duration. Late payments may result in suspension of class access.
          </p>

          <p className="font-semibold text-white">4. Placement Test & Course Recommendation</p>
          <p>
            Placement tests are required for advanced programs. Placement test results and course track recommendations are final and determined solely by academic assessment standards.
          </p>

          <p className="font-semibold text-white">5. Account Usage & Parent Controls</p>
          <p>
            Parent accounts are responsible for payment management and reviewing progress of linked child student accounts. Student accounts are restricted from accessing payment history or invoice modifications.
          </p>

          <p className="font-semibold text-white">6. Consent and Agreement</p>
          <p>
            By checking the box below, you consent to our terms of service, privacy policy, and academic grading metrics.
          </p>
        </div>

        <div className="border-t border-slate-800 pt-6 mt-6 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-900 focus:ring-2"
            />
            <span className="text-sm text-slate-300 select-none group-hover:text-white transition-colors">
              I agree to the Kaputra Academy Terms &amp; Conditions and Privacy Policy.
            </span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              onClick={handleAgree}
              disabled={!agreed || loading}
              className="w-full md:w-auto bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-semibold rounded-xl px-8 py-2.5 flex items-center justify-center gap-2 transition"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Agree and Continue
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
