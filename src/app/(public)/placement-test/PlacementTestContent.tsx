"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { validateTestCode, saveTestProgress, submitPlacementTest } from "@/actions/placementTest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, ShieldCheck, CheckCircle2, AlertTriangle, Play } from "lucide-react";

interface Question {
  id: string;
  question: string;
  options: string[];
}

export default function PlacementTestContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Login form states
  const [studentId, setStudentId] = useState(searchParams.get("studentId") || "");
  const [testCode, setTestCode] = useState(searchParams.get("code") || "");
  const [error, setError] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [loading, setLoading] = useState(false);

  // Exam states
  const [studentName, setStudentName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-validate if params exist
  useEffect(() => {
    const sId = searchParams.get("studentId");
    const code = searchParams.get("code");
    if (sId && code) {
      handleLogin(sId, code);
    }
  }, [searchParams]);

  // Handle validating test code
  const handleLogin = async (sId: string, code: string) => {
    setLoading(true);
    setError(null);
    const res = await validateTestCode(sId, code);
    setLoading(false);

    if (res.success) {
      setStudentName(res.studentName || "");
      setAnswers(res.savedAnswers || {});
      setQuestions((res.questions as Question[]) || []);
      setIsValidated(true);
    } else {
      setError(res.error || "Failed to validate details.");
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!isValidated || isSubmitted) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isValidated, isSubmitted]);

  // Auto-save logic
  const lastSavedAnswers = useRef<string>("");

  const triggerAutoSave = useCallback(async () => {
    const currentAnswersStr = JSON.stringify(answers);
    if (currentAnswersStr === lastSavedAnswers.current) return;

    setIsSaving(true);
    const res = await saveTestProgress(testCode, answers);
    setIsSaving(false);
    if (res.success) {
      lastSavedAnswers.current = currentAnswersStr;
    }
  }, [answers, testCode]);

  useEffect(() => {
    if (!isValidated || isSubmitted) return;
    const interval = setInterval(() => {
      triggerAutoSave();
    }, 10000); // Auto-save every 10 seconds

    return () => clearInterval(interval);
  }, [isValidated, isSubmitted, triggerAutoSave]);

  const handleSelectOption = (qId: string, option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: option,
    }));
  };

  const handleManualSubmit = async () => {
    if (!confirm("Are you sure you want to submit your test? This action is final.")) return;
    await performSubmit();
  };

  const handleAutoSubmit = async () => {
    alert("Time is up! Your test will be submitted automatically.");
    await performSubmit();
  };

  const performSubmit = async () => {
    setLoading(true);
    const res = await submitPlacementTest(testCode, answers);
    setLoading(false);
    if (res.success) {
      setIsSubmitted(true);
    } else {
      alert("Submission failed. Please try again.");
    }
  };

  // Format timer output
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-[#072147] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-white space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="w-20 h-20 text-[#CA8E25]" />
          </div>
          <h2 className="text-3xl font-extrabold">Test Submitted!</h2>
          <p className="text-slate-400">
            Congratulations, {studentName}. You have completed your Kaputra Academy placement test.
            Your answers have been stored and the code is now marked as used.
          </p>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm">
            <p className="text-[#CA8E25] font-bold mb-1">Next Step: Tuition Payment</p>
            <p className="text-slate-400">Your parent has been notified of your results. Please proceed to pay the tuition invoice to complete your class enrollment.</p>
          </div>
          <Button
            onClick={() => router.push("/student")}
            className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold py-3 rounded-xl shadow-lg transition-all"
          >
            Go to Dashboard
          </Button>
        </div>
      </main>
    );
  }

  if (isValidated) {
    return (
      <main className="min-h-screen bg-[#072147] py-12 px-4 text-white">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-xs font-semibold text-[#CA8E25] tracking-wider uppercase">Kaputra Academy Exam Portal</span>
              <h1 className="text-2xl font-black mt-1">Placement Test</h1>
              <p className="text-sm text-slate-400">Student: {studentName} ({studentId})</p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl">
                <Clock className="h-5 w-5 text-amber-500" />
                <span className="font-mono text-lg font-bold">{formatTime(timeLeft)}</span>
              </div>
              <span className="text-xs text-slate-500">
                {isSaving ? "Saving progress..." : "All progress saved"}
              </span>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-bold">
                  {idx + 1}. {q.question}
                </h3>
                {q.options && q.options.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((option) => {
                      const isSelected = answers[q.id] === option;
                      return (
                        <button
                          key={option}
                          onClick={() => handleSelectOption(q.id, option)}
                          className={`w-full text-left p-4 rounded-xl border font-semibold transition-all flex items-center justify-between ${isSelected
                              ? "bg-slate-950 border-[#CA8E25] text-white shadow-lg shadow-[#CA8E25]/10"
                              : "bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-950/80 hover:border-slate-700"
                            }`}
                        >
                          <span>{option}</span>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? "border-[#CA8E25] bg-[#CA8E25]" : "border-slate-700"
                              }`}
                          >
                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-black" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1.5 uppercase tracking-wider">Your Answer</label>
                    <Input
                      type="text"
                      placeholder="Type your answer here..."
                      value={answers[q.id] || ""}
                      onChange={(e) => handleSelectOption(q.id, e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white rounded-xl focus-visible:ring-[#CA8E25]"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit Action */}
          <div className="flex justify-end">
            <Button
              onClick={handleManualSubmit}
              disabled={loading}
              className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-black px-10 py-4 rounded-xl text-lg shadow-lg"
            >
              Submit Placement Test
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Entrance/Login View
  return (
    <main className="min-h-screen bg-[#072147] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 shadow-2xl rounded-3xl p-8 text-white space-y-6">
        <div className="text-center">
          <div className="inline-flex p-3 bg-[#CA8E25]/10 rounded-full mb-3">
            <ShieldCheck className="h-10 w-10 text-[#CA8E25]" />
          </div>
          <h2 className="text-3xl font-black tracking-tight">Placement Portal</h2>
          <p className="mt-2 text-sm text-slate-400">
            Enter your details from the Welcome Email to unlock the exam.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin(studentId, testCode);
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="studentId">Student ID</Label>
            <Input
              id="studentId"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="KPA-2026-0001"
              required
              className="bg-slate-950 border-slate-800 text-white rounded-xl placeholder:text-slate-600 focus-visible:ring-[#CA8E25]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="testCode">Placement Test Code</Label>
            <Input
              id="testCode"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
              placeholder="PT-KPA-XXXXXX"
              required
              className="bg-slate-950 border-slate-800 text-white rounded-xl placeholder:text-slate-600 focus-visible:ring-[#CA8E25]"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold py-3.5 rounded-xl shadow-lg transition-all text-base flex items-center justify-center gap-2"
          >
            <Play className="h-4 w-4 fill-current" />
            Start Placement Test
          </Button>
        </form>
      </div>
    </main>
  );
}
