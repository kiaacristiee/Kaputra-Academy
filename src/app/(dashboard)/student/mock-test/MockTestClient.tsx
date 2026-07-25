"use client";

import { useState, useEffect, useRef } from "react";
import {
  Lock,
  Award,
  Clock,
  Check,
  X,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  BookOpen,
  Play,
  Save,
  HelpCircle,
  CheckCircle,
  FileText,
  Search,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createMockTest,
  updateMockTest,
  deleteMockTest,
  submitMockTest,
  createBankQuestion,
  deleteBankQuestion
} from "@/actions/dashboard";
import Link from "next/link";

interface MockQuestion {
  id: string;
  questionText: string;
  options: string; // JSON Array string
  correctAnswer: string;
  explanation: string | null;
}

interface MockSubmission {
  id: string;
  score: number;
  isPassed: boolean;
  answers: string; // JSON string
  submittedAt: Date;
  student?: {
    name: string;
  };
}

interface MockTest {
  id: string;
  title: string;
  timeLimit: number; // in minutes
  passingScore: number;
  isPublished: boolean;
  isTrial: boolean;
  questions: MockQuestion[];
  submissions: MockSubmission[];
}

interface Course {
  id: string;
  title: string;
  type: string;
  mockTests: MockTest[];
}

interface MockTestClientProps {
  initialCourses: Course[];
  isUnlocked: boolean;
  userRole: string;
  initialBankQuestions?: MockQuestion[];
}

export default function MockTestClient({
  initialCourses,
  isUnlocked,
  userRole,
  initialBankQuestions = []
}: MockTestClientProps) {
  const [activeTab, setActiveTab] = useState<"mockTests" | "bankSoal">("mockTests");
  const [bankQuestions, setBankQuestions] = useState<MockQuestion[]>(initialBankQuestions);
  const [bankSearchQuery, setBankSearchQuery] = useState("");

  // Bank Soal Form State
  const [isBankFormOpen, setIsBankFormOpen] = useState(false);
  const [bankFormData, setBankFormData] = useState({
    questionText: "",
    options: ["", ""],
    correctAnswer: "",
    explanation: "",
    topic: "",
    difficulty: "EASY",
    questionType: "MULTIPLE_CHOICE",
    imageFile: null as File | null
  });
  const [isBankSaving, setIsBankSaving] = useState(false);
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [selectedCourseIdx, setSelectedCourseIdx] = useState(0);

  // Active exam taking state
  const [activeTest, setActiveTest] = useState<MockTest | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({});
  const [timeSpentPerQuestion, setTimeSpentPerQuestion] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [testResult, setTestResult] = useState<{ score: number; isPassed: boolean; id: string } | null>(null);
  const [reviewMode, setReviewMode] = useState(false);

  // CMS state
  const [isCmsOpen, setIsCmsOpen] = useState(false);
  const [isSelectingForTest, setIsSelectingForTest] = useState(false);
  const [selectedBankQuestionIds, setSelectedBankQuestionIds] = useState<string[]>([]);
  const [editingTest, setEditingTest] = useState<MockTest | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    timeLimit: 15,
    passingScore: 70,
    isPublished: true,
    isTrial: false,
    selectedQuestionIds: [] as string[],
  });

  const [cmsQuestions, setCmsQuestions] = useState<{
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }[]>([
    { questionText: "", options: ["", ""], correctAnswer: "", explanation: "" }
  ]);

  const isStaff = ["ADMIN", "TEACHER"].includes(userRole);
  const activeCourse = courses[selectedCourseIdx];

  // Timer Effect
  useEffect(() => {
    if (activeTest && timeLeft > 0 && !testResult && !reviewMode) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });

        const currentQ = activeTest.questions[currentQuestionIdx];
        if (currentQ) {
          setTimeSpentPerQuestion((prev) => ({
            ...prev,
            [currentQ.id]: (prev[currentQ.id] || 0) + 1
          }));
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTest, timeLeft, testResult, reviewMode, currentQuestionIdx]);

  const handleStartTest = (test: MockTest) => {
    setActiveTest(test);
    setCurrentQuestionIdx(0);
    setTestAnswers({});
    setTimeSpentPerQuestion({});
    setTimeLeft(test.timeLimit * 60);
    setTestResult(null);
    setReviewMode(false);
  };

  const handleSelectAnswer = (questionId: string, option: string) => {
    setTestAnswers({ ...testAnswers, [questionId]: option });
  };

  const handleSubmitTest = async () => {
    if (!activeTest) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const res = await submitMockTest(activeTest.id, testAnswers, timeSpentPerQuestion);
    if (res.success && res.submission) {
      setTestResult({
        score: res.score || 0,
        isPassed: res.isPassed || false,
        id: res.submission.id,
      });

      // Update submissions list locally
      const updatedTests = activeCourse.mockTests.map((t) => {
        if (t.id === activeTest.id) {
          return {
            ...t,
            submissions: [res.submission as any, ...t.submissions]
          };
        }
        return t;
      });

      setCourses(
        courses.map((c) =>
          c.id === activeCourse.id ? { ...c, mockTests: updatedTests } : c
        )
      );
    } else {
      alert("Failed to submit test. Please check connection.");
    }
  };

  const handleAutoSubmit = () => {
    alert("Time limit reached! Submitting your answers automatically.");
    handleSubmitTest();
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // CMS functions
  const handleOpenCms = (test?: MockTest) => {
    if (!activeCourse) return;
    if (test) {
      setEditingTest(test);
      setFormData({
        title: test.title,
        timeLimit: test.timeLimit,
        passingScore: test.passingScore,
        isPublished: test.isPublished,
        isTrial: test.isTrial,
        selectedQuestionIds: test.questions.map((q) => q.id),
      });
    } else {
      setEditingTest(null);
      setFormData({
        title: "",
        timeLimit: 20,
        passingScore: 75,
        isPublished: true,
        isTrial: false,
        selectedQuestionIds: [],
      });
    }
    setIsCmsOpen(true);
  };

  const handleAddCmsQuestion = () => {
    setCmsQuestions([
      ...cmsQuestions,
      { questionText: "", options: ["", ""], correctAnswer: "", explanation: "" }
    ]);
  };

  const handleRemoveCmsQuestion = (idx: number) => {
    setCmsQuestions(cmsQuestions.filter((_, i) => i !== idx));
  };

  const handleCmsQuestionChange = (idx: number, field: string, val: any) => {
    setCmsQuestions(
      cmsQuestions.map((q, i) => (i === idx ? { ...q, [field]: val } : q))
    );
  };

  const handleAddOption = (qIdx: number) => {
    setCmsQuestions(
      cmsQuestions.map((q, i) => {
        if (i === qIdx) {
          return { ...q, options: [...q.options, ""] };
        }
        return q;
      })
    );
  };

  const handleRemoveOption = (qIdx: number, optIdx: number) => {
    setCmsQuestions(
      cmsQuestions.map((q, i) => {
        if (i === qIdx) {
          return { ...q, options: q.options.filter((_, oi) => oi !== optIdx) };
        }
        return q;
      })
    );
  };

  const handleOptionTextChange = (qIdx: number, optIdx: number, text: string) => {
    setCmsQuestions(
      cmsQuestions.map((q, i) => {
        if (i === qIdx) {
          const newOpts = [...q.options];
          newOpts[optIdx] = text;
          return { ...q, options: newOpts };
        }
        return q;
      })
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse) return;

    if (editingTest) {
      const res = await updateMockTest(editingTest.id, {
        title: formData.title,
        timeLimit: Number(formData.timeLimit),
        passingScore: Number(formData.passingScore),
        isPublished: formData.isPublished,
        isTrial: formData.isTrial,
        questionIds: formData.selectedQuestionIds,
      });
      if (res.success && res.test) {
        // Refetch/update locally
        alert("Mock Test updated successfully!");
        window.location.reload(); // Simplest way to refresh deep relations
      }
    } else {
      const res = await createMockTest({
        courseId: activeCourse.id,
        title: formData.title,
        timeLimit: Number(formData.timeLimit),
        passingScore: Number(formData.passingScore),
        isPublished: formData.isPublished,
        isTrial: formData.isTrial,
        questionIds: formData.selectedQuestionIds,
      });
      if (res.success && res.test) {
        alert("Quiz created successfully!");
        window.location.reload();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this quiz?")) {
      const res = await deleteMockTest(id);
      if (res.success) {
        const updated = activeCourse.mockTests.filter((t) => t.id !== id);
        setCourses(
          courses.map((c) =>
            c.id === activeCourse.id ? { ...c, mockTests: updated } : c
          )
        );
      }
    }
  };

  const handleSaveBankQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBankSaving(true);

    // Convert options based on question type
    let finalOptions = bankFormData.options;
    let finalAnswer = bankFormData.correctAnswer;

    if (bankFormData.questionType === "SHORT_ANSWER") {
      finalOptions = []; // No options for short answer
    }

    let imageUrl = undefined;
    if (bankFormData.imageFile) {
      const formData = new FormData();
      formData.append("file", bankFormData.imageFile);
      const uploadRes = await fetch("/api/upload-image", { method: "POST", body: formData });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        imageUrl = data.url;
      } else {
        alert("Gagal mengunggah gambar");
        setIsBankSaving(false);
        return;
      }
    }

    const res = await createBankQuestion({
      questionText: bankFormData.questionText,
      options: finalOptions,
      correctAnswer: finalAnswer,
      explanation: bankFormData.explanation,
      topic: bankFormData.topic,
      difficulty: bankFormData.difficulty,
      imageUrl: imageUrl,
    });

    if (res.success && res.question) {
      setBankQuestions([res.question, ...bankQuestions]);
      setIsBankFormOpen(false);
      setBankFormData({
        questionText: "",
        options: ["", ""],
        correctAnswer: "",
        explanation: "",
        topic: "",
        difficulty: "EASY",
        questionType: "MULTIPLE_CHOICE",
        imageFile: null
      });
      alert("Soal berhasil ditambahkan ke Bank Soal!");
    } else {
      alert("Gagal menambahkan soal: " + res.error);
    }
    setIsBankSaving(false);
  };

  const handleDeleteBankQuestion = async (id: string) => {
    if (confirm("Are you sure you want to delete this question? It will be removed from all associated mock tests.")) {
      const res = await deleteBankQuestion(id);
      if (res.success) {
        setBankQuestions(bankQuestions.filter(q => q.id !== id));
      } else {
        alert("Gagal menghapus soal: " + res.error);
      }
    }
  };

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-lg mx-auto text-center space-y-6">
        <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center relative">
          <Lock className="h-8 w-8 text-[#CA8E25]" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white">Quizzes Locked</h1>
        <p className="text-slate-400">
          This portal hosts regular practice papers, Olympiad quiz sessions, and timers. Complete your enrollment payment to activate quiz credentials.
        </p>
        <Link href="/catalog">
          <Button className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-semibold rounded-xl px-8 py-2.5 flex items-center gap-2">
            Browse Classes &amp; Register <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {!activeTest && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <Award className="h-8 w-8 text-[#CA8E25]" />
              Quizzes
            </h1>
            <p className="text-slate-400 mt-1">
              Test your knowledge under real exam conditions with instant feedback.
            </p>
          </div>
        </div>
      )}

      {/* Main Panel */}
      {!activeTest ? (
        courses.length === 0 ? (
          <div className="py-20 text-center text-slate-500 bg-slate-950/20 border border-slate-850 rounded-2xl">
            <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p>No active courses allocated to view mock tests.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="w-full md:max-w-xs space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#CA8E25] block">Filter Course</span>
                <select
                  value={selectedCourseIdx}
                  onChange={(e) => setSelectedCourseIdx(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                >
                  {courses.map((course, idx) => (
                    <option key={course.id} value={idx}>
                      {course.title} ({course.type})
                    </option>
                  ))}
                </select>
              </div>

              {isStaff && (
                <Button
                  onClick={() => handleOpenCms()}
                  className="w-full md:w-auto bg-blue-650 hover:bg-blue-600 text-white rounded-xl px-5 py-2.5 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Create Mock Paper
                </Button>
              )}
            </div>

            {/* Test Cards */}
            <div className="grid grid-cols-1 gap-6">
              {activeCourse?.mockTests.length > 0 ? (
                activeCourse.mockTests.map((test) => {
                  const latestSubmission = test.submissions[0];
                  return (
                    <div
                      key={test.id}
                      className="bg-slate-950 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-slate-750 transition"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-lg flex items-center gap-2">
                            {test.title}
                            {test.isTrial && (
                              <span className="bg-amber-500/10 border border-amber-500/20 text-[#CA8E25] text-[8px] font-bold px-2 py-0.5 rounded-full">
                                Trial
                              </span>
                            )}
                            {!test.isPublished && (
                              <span className="bg-red-500/10 border border-red-500/20 text-red-450 text-[8px] font-bold px-2 py-0.5 rounded-full">
                                Draft
                              </span>
                            )}
                          </h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-[#CA8E25]" /> {test.timeLimit} Minutes
                          </span>
                          <span>•</span>
                          <span>{test.questions.length} Questions</span>
                          <span>•</span>
                          <span>Passing Grade: {test.passingScore}%</span>
                        </div>
                        {latestSubmission && (
                          <div className="text-xs pt-1">
                            <span className="text-slate-500">Last Attempt: </span>
                            <span className={`font-bold ${latestSubmission.isPassed ? "text-emerald-450" : "text-red-450"}`}>
                              {latestSubmission.score}% ({latestSubmission.isPassed ? "PASSED" : "FAILED"})
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <Button
                          onClick={() => handleStartTest(test)}
                          className="flex-1 md:flex-none bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-semibold rounded-xl px-5 py-2.5 text-xs flex items-center justify-center gap-1.5"
                        >
                          {latestSubmission ? (
                            <><RotateCcw className="w-3.5 h-3.5" /> Retake Exam</>
                          ) : (
                            <><Play className="w-3.5 h-3.5" /> Start Exam</>
                          )}
                        </Button>

                        {isStaff && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenCms(test)}
                              className="text-slate-400 hover:text-white"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(test.id)}
                              className="text-red-450 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center text-slate-500 bg-slate-950/20 border border-slate-850 rounded-3xl">
                  No mock examinations scheduled for this program.
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        /* Test Taking / Review layout */
        <div className="bg-slate-950 border border-slate-800 p-6 md:p-8 rounded-3xl space-y-6 max-w-3xl mx-auto shadow-2xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-white text-lg">{activeTest.title}</h3>
              <p className="text-xs text-slate-400">
                {reviewMode ? "Review Mode" : `Question ${currentQuestionIdx + 1} of ${activeTest.questions.length}`}
              </p>
            </div>

            {!testResult && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 font-mono text-sm">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-white font-bold">{formatTime(timeLeft)}</span>
              </div>
            )}

            {(testResult || reviewMode) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveTest(null);
                  setTestResult(null);
                  setReviewMode(false);
                }}
                className="text-slate-400 hover:text-white flex items-center gap-1"
              >
                <X className="w-4 h-4" /> Exit
              </Button>
            )}
          </div>

          {!testResult && !reviewMode ? (
            <div className="space-y-6">
              {/* Question */}
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                <p className="text-white text-base font-medium">
                  {activeTest.questions[currentQuestionIdx]?.questionText}
                </p>
                {(activeTest.questions[currentQuestionIdx] as any)?.imageUrl && (
                  <div className="mt-4">
                    <img
                      src={(activeTest.questions[currentQuestionIdx] as any).imageUrl}
                      alt="Question Image"
                      className="max-h-64 rounded-xl border border-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-3">
                {(() => {
                  const q = activeTest.questions[currentQuestionIdx];
                  if (!q) return null;
                  let opts: string[] = [];
                  try {
                    opts = JSON.parse(q.options);
                  } catch (e) {
                    opts = [];
                  }
                  return opts.length > 0 ? opts.map((opt, i) => {
                    const isSelected = testAnswers[q.id] === opt;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectAnswer(q.id, opt)}
                        className={`w-full text-left p-4 rounded-xl border text-sm font-medium transition flex items-center justify-between ${isSelected
                            ? "bg-[#CA8E25]/10 border-[#CA8E25] text-white"
                            : "bg-slate-900 border-slate-850 text-slate-350 hover:border-slate-700"
                          }`}
                      >
                        <span>{opt}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#CA8E25]" />}
                      </button>
                    );
                  }) : (
                    <div className="mt-2">
                      <label className="text-xs text-slate-400 font-bold block mb-2 uppercase tracking-wider">Tulis Jawaban Anda</label>
                      <input
                        type="text"
                        placeholder="Ketik jawaban di sini..."
                        value={testAnswers[q.id] || ""}
                        onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  );
                })()}
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-850">
                <Button
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx(currentQuestionIdx - 1)}
                  variant="outline"
                  className="border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs"
                >
                  Previous
                </Button>

                {currentQuestionIdx < activeTest.questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                    className="bg-blue-650 hover:bg-blue-600 text-white rounded-xl text-xs px-5"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitTest}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs px-6 font-bold"
                  >
                    Submit Answers
                  </Button>
                )}
              </div>
            </div>
          ) : testResult && !reviewMode ? (
            // Score summary card
            <div className="text-center py-8 space-y-6 max-w-md mx-auto">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border ${testResult.isPassed
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                  : "bg-red-500/10 border-red-500/25 text-red-400"
                }`}>
                {testResult.isPassed ? <Check className="w-8 h-8" /> : <X className="w-8 h-8" />}
              </div>

              <div>
                <h4 className="text-3xl font-black text-white">{testResult.score}%</h4>
                <p className={`text-sm font-bold mt-1 ${testResult.isPassed ? "text-emerald-450" : "text-red-450"}`}>
                  {testResult.isPassed ? "EXAM PASSED" : "EXAM FAILED"}
                </p>
                <p className="text-xs text-slate-450 mt-1">
                  Required Passing Score: {activeTest.passingScore}%
                </p>
              </div>

              <div className="flex gap-2 justify-center pt-4 border-t border-slate-850">
                <Button
                  onClick={() => {
                    setReviewMode(true);
                    setCurrentQuestionIdx(0);
                  }}
                  className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-semibold rounded-xl text-xs"
                >
                  Review Answers &amp; Explanations
                </Button>
                <Button
                  onClick={() => {
                    setActiveTest(null);
                    setTestResult(null);
                  }}
                  variant="outline"
                  className="border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs"
                >
                  Back to Portal
                </Button>
              </div>
            </div>
          ) : (
            // Review mode with explanations
            <div className="space-y-6">
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Question {currentQuestionIdx + 1}</span>
                  {(() => {
                    const q = activeTest.questions[currentQuestionIdx];
                    if (!q) return null;

                    const studentAns = testAnswers[q.id]?.toLowerCase().trim() || "";
                    const correctAns = q.correctAnswer?.toLowerCase().trim() || "";
                    const isCorrect = studentAns === correctAns;

                    const spent = timeSpentPerQuestion[q.id] || 0;
                    const min = Math.floor(spent / 60);
                    const sec = spent % 60;
                    const timeStr = `${min}:${sec.toString().padStart(2, "0")}`;
                    let label = "Normal";
                    let color = "text-amber-400 bg-amber-400/10 border-amber-400/20";

                    if (!isCorrect) {
                      label = "Kesulitan";
                      color = "text-red-400 bg-red-400/10 border-red-400/20";
                    } else if (spent <= 120) {
                      label = "Cepat";
                      color = "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
                    } else if (spent > 180) {
                      label = "Kesulitan";
                      color = "text-red-400 bg-red-400/10 border-red-400/20";
                    }
                    return (
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md border flex items-center gap-1 ${color}`}>
                        <Clock className="w-3 h-3" />
                        {timeStr} ({label})
                      </span>
                    );
                  })()}
                </div>
                <p className="text-white text-base font-medium">
                  {activeTest.questions[currentQuestionIdx]?.questionText}
                </p>
                {(activeTest.questions[currentQuestionIdx] as any)?.imageUrl && (
                  <div className="mt-4">
                    <img
                      src={(activeTest.questions[currentQuestionIdx] as any).imageUrl}
                      alt="Question Image"
                      className="max-h-64 rounded-xl border border-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Answers Review */}
              <div className="grid grid-cols-1 gap-3">
                {(() => {
                  const q = activeTest.questions[currentQuestionIdx];
                  if (!q) return null;
                  let opts: string[] = [];
                  try {
                    opts = JSON.parse(q.options);
                  } catch (e) {
                    opts = [];
                  }
                  const studentAns = testAnswers[q.id];
                  const correctAns = q.correctAnswer;

                  if (opts.length === 0) {
                    const isCorrectChoice = studentAns?.toLowerCase().trim() === correctAns?.toLowerCase().trim();
                    return (
                      <div className="space-y-4">
                        <div className={`w-full p-4 rounded-xl border text-sm font-medium ${isCorrectChoice
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-red-500/10 border-red-500/30 text-red-400"
                          }`}>
                          <p className="text-[10px] uppercase font-bold mb-1">Your Answer</p>
                          <p>{studentAns || "(No answer)"}</p>
                        </div>
                        {!isCorrectChoice && (
                          <div className="w-full p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-sm font-medium">
                            <p className="text-[10px] uppercase font-bold mb-1">Correct Answer</p>
                            <p>{correctAns}</p>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return opts.map((opt, i) => {
                    const isStudentChoice = studentAns === opt;
                    const isCorrectChoice = correctAns === opt;
                    let style = "bg-slate-900 border-slate-850 text-slate-400";
                    if (isCorrectChoice) {
                      style = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
                    } else if (isStudentChoice && !isCorrectChoice) {
                      style = "bg-red-500/10 border-red-500/30 text-red-400";
                    }
                    return (
                      <div
                        key={i}
                        className={`w-full p-4 rounded-xl border text-sm font-medium flex items-center justify-between ${style}`}
                      >
                        <span>{opt}</span>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          {isCorrectChoice && <span className="text-emerald-450 font-bold">CORRECT CHOICE</span>}
                          {isStudentChoice && !isCorrectChoice && <span className="text-red-450 font-bold">YOUR CHOICE (WRONG)</span>}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Explanation block */}
              {activeTest.questions[currentQuestionIdx]?.explanation && (
                <div className="p-5 bg-blue-950/15 border border-blue-900/30 rounded-2xl space-y-1">
                  <h5 className="text-xs font-bold text-blue-400 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" /> Explanation
                  </h5>
                  <p className="text-xs text-slate-300">
                    {activeTest.questions[currentQuestionIdx].explanation}
                  </p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-850">
                <Button
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx(currentQuestionIdx - 1)}
                  variant="outline"
                  className="border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs"
                >
                  Previous
                </Button>

                {currentQuestionIdx < activeTest.questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                    className="bg-blue-650 hover:bg-blue-600 text-white rounded-xl text-xs px-5"
                  >
                    Next Question
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setActiveTest(null);
                      setTestResult(null);
                      setReviewMode(false);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs px-6 font-bold"
                  >
                    Finish Review
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CMS Modal */}
      {isCmsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-850 rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg">
                {editingTest ? "Edit Quiz" : "Create Quiz"}
              </h3>
              <button onClick={() => setIsCmsOpen(false)} className="text-slate-450 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Paper Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Olympiad Math Quiz A"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Timer (Mins)</label>
                    <input
                      type="number"
                      required
                      value={formData.timeLimit}
                      onChange={(e) => setFormData({ ...formData, timeLimit: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Passing %</label>
                    <input
                      type="number"
                      required
                      value={formData.passingScore}
                      onChange={(e) => setFormData({ ...formData, passingScore: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-600"
                  />
                  <span className="text-xs text-slate-350 select-none">Publish Paper</span>
                </label>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Content Visibility</label>
                <select
                  value={formData.isTrial ? "TRIAL" : activeCourse?.type === "COMPETITION" ? "COMPETITION" : "REGULAR"}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      isTrial: val === "TRIAL",
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-700"
                >
                  <option value="REGULAR">Regular Class</option>
                  <option value="COMPETITION">Competition Class</option>
                  <option value="TRIAL">Trial Content</option>
                </select>
              </div>

              {/* Questions Selection from Bank */}
              <div className="space-y-4 pt-3 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white text-sm">Select Questions from Bank ({formData.selectedQuestionIds.length} selected)</h4>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {bankQuestions.map((q) => {
                    const isSelected = formData.selectedQuestionIds.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        className={`border p-3 rounded-xl flex items-start gap-3 cursor-pointer transition-colors ${isSelected ? "bg-blue-900/20 border-blue-600" : "bg-slate-950 border-slate-800 hover:border-slate-700"
                          }`}
                        onClick={() => {
                          if (isSelected) {
                            setFormData({
                              ...formData,
                              selectedQuestionIds: formData.selectedQuestionIds.filter(id => id !== q.id)
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedQuestionIds: [...formData.selectedQuestionIds, q.id]
                            });
                          }
                        }}
                      >
                        <div className="mt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-xs text-white line-clamp-2">{q.questionText}</p>
                          <div className="flex gap-2">
                            {(q as any).topic && <span className="px-2 py-0.5 bg-slate-800 text-[10px] text-slate-300 rounded-full">{(q as any).topic}</span>}
                            {(q as any).difficulty && <span className="px-2 py-0.5 bg-slate-800 text-[10px] text-slate-300 rounded-full">{(q as any).difficulty}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {bankQuestions.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4">No questions available in the Bank Soal.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCmsOpen(false)}
                  className="text-slate-400 hover:text-white rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-650 hover:bg-blue-600 text-white rounded-xl px-5 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save Quiz
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
