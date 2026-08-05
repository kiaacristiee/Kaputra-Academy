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
  RotateCcw,
  Folder,
  FolderOpen,
  FolderPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createMockTest,
  updateMockTest,
  deleteMockTest,
  submitMockTest,
  createBankQuestion,
  deleteBankQuestion,
  createQuestionFolder,
  renameQuestionFolder,
  deleteQuestionFolder,
  deleteBankQuestionsInBulk,
  moveQuestionsToFolder,
  updateBankQuestion
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
  initialFolders?: any[];
}

export default function MockTestClient({
  initialCourses,
  isUnlocked,
  userRole,
  initialBankQuestions = [],
  initialFolders = []
}: MockTestClientProps) {
  const [activeTab, setActiveTab] = useState<"mockTests" | "bankSoal">("mockTests");
  const [bankQuestions, setBankQuestions] = useState<MockQuestion[]>(initialBankQuestions);
  const [bankSearchQuery, setBankSearchQuery] = useState("");
  const [folders, setFolders] = useState<any[]>(initialFolders || []);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [selectedAdminBankQuestionIds, setSelectedAdminBankQuestionIds] = useState<string[]>([]);
  const [editingBankQuestionId, setEditingBankQuestionId] = useState<string | null>(null);

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

  const filteredBankQuestions = bankQuestions
    .filter((q) => {
      if (activeFolderId === null) {
        return !(q as any).folderId;
      }
      return (q as any).folderId === activeFolderId;
    })
    .filter((q) => {
      if (!bankSearchQuery.trim()) return true;
      return q.questionText.toLowerCase().includes(bankSearchQuery.toLowerCase());
    });

  const hasAttempted = (test: MockTest) => {
    if (isStaff) return false;
    return test.submissions && test.submissions.length > 0;
  };

  const handleReviewTest = (test: MockTest) => {
    const submission = test.submissions[0];
    if (!submission) return;

    let parsedAnswers = {};
    let parsedTimeSpent = {};
    try { parsedAnswers = JSON.parse(submission.answers || "{}"); } catch (e) {}
    try { (submission as any).timeSpent && (parsedTimeSpent = JSON.parse((submission as any).timeSpent || "{}")); } catch (e) {}

    let correctCount = 0;
    test.questions.forEach((q) => {
      const studentAns = (parsedAnswers as Record<string, string>)[q.id];
      if (studentAns?.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim()) {
        correctCount++;
      }
    });

    setActiveTest(test);
    setCurrentQuestionIdx(0);
    setTestAnswers(parsedAnswers as Record<string, string>);
    setTimeSpentPerQuestion(parsedTimeSpent as Record<string, number>);
    setTestResult({
      score: submission.score,
      isPassed: submission.isPassed,
      id: submission.id,
    });
    setReviewMode(true);
  };

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
    let finalOptions = bankFormData.options;
    let finalAnswer = bankFormData.correctAnswer;
    if (bankFormData.questionType === "SHORT_ANSWER") finalOptions = [];
    
    let imageUrl = undefined;
    if (bankFormData.imageFile) {
      const formData = new FormData();
      formData.append("file", bankFormData.imageFile);
      const uploadRes = await fetch("/api/teacher/mock-tests/upload-image", { method: "POST", body: formData });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        imageUrl = data.url;
      } else {
        alert("Failed to upload image.");
        setIsBankSaving(false);
        return;
      }
    }

    let res: any;
    if (editingBankQuestionId) {
      res = await updateBankQuestion(editingBankQuestionId, {
        questionText: bankFormData.questionText,
        options: finalOptions,
        correctAnswer: finalAnswer,
        explanation: bankFormData.explanation,
        topic: bankFormData.topic,
        difficulty: bankFormData.difficulty,
        imageUrl: imageUrl,
      });
      if (res.success && res.question) {
        setBankQuestions(bankQuestions.map(q => q.id === editingBankQuestionId ? (res.question as MockQuestion) : q));
        alert("Question updated successfully!");
      }
    } else {
      res = await createBankQuestion({
        questionText: bankFormData.questionText,
        options: finalOptions,
        correctAnswer: finalAnswer,
        explanation: bankFormData.explanation,
        topic: bankFormData.topic,
        difficulty: bankFormData.difficulty,
        imageUrl: imageUrl,
        folderId: activeFolderId, // Set folder automatically based on what we're viewing
      });
      if (res.success && res.question) {
        setBankQuestions([res.question as MockQuestion, ...bankQuestions]);
        alert("Question successfully added to Question Bank!");
      }
    }
    
    if (res.success && res.question) {
      setIsBankFormOpen(false);
      setEditingBankQuestionId(null);
      setBankFormData({
        questionText: "", options: ["", ""], correctAnswer: "", explanation: "", topic: "", difficulty: "EASY", questionType: "MULTIPLE_CHOICE", imageFile: null
      });
    } else {
      alert("Failed to add/update question: " + res.error);
    }
    setIsBankSaving(false);
  };

  const handleDeleteBankQuestion = async (id: string, e: any) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this question?")) {
      const res = await deleteBankQuestion(id);
      if (res.success) setBankQuestions(bankQuestions.filter(q => q.id !== id));
      else alert("Failed to delete questions: " + res.error);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const res = await createQuestionFolder({ name: newFolderName, parentId: undefined });
    if (res.success) {
      setFolders([...folders, res.folder]);
      setNewFolderName("");
      setIsCreatingFolder(false);
    } else {
      alert("Failed to create folder: " + res.error);
    }
  };

  const handleDeleteFolder = async (id: string, e: any) => {
    e.stopPropagation();
    if (confirm("Delete this folder? Questions inside will be moved out of the folder.")) {
      const res = await deleteQuestionFolder(id);
      if (res.success) {
        if (activeFolderId === id) setActiveFolderId(null);
        setFolders(folders.filter(f => f.id !== id));
        // Also update bankQuestions that were in this folder
        setBankQuestions(bankQuestions.map(q => (q as any).folderId === id ? { ...q, folderId: null } : q));
      } else {
        alert("Failed to delete folder: " + res.error);
      }
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolderName.trim() || !editingFolderId) return;
    const res = await renameQuestionFolder(editingFolderId, editingFolderName);
    if (res.success && res.folder) {
      setFolders(folders.map(f => f.id === editingFolderId ? { ...f, name: res.folder!.name } : f));
      setEditingFolderId(null);
    } else {
      alert("Failed to rename folder: " + res.error);
    }
  };

  const handleToggleSelectAll = (filteredQuestions: MockQuestion[]) => {
    if (selectedAdminBankQuestionIds.length === filteredQuestions.length && filteredQuestions.length > 0) {
      setSelectedAdminBankQuestionIds([]);
    } else {
      setSelectedAdminBankQuestionIds(filteredQuestions.map(q => q.id));
    }
  };

  const handleDeleteAdminSelected = async () => {
    if (selectedAdminBankQuestionIds.length === 0) return;
    if (confirm(`Delete \${selectedAdminBankQuestionIds.length} selected questions?`)) {
      const res = await deleteBankQuestionsInBulk(selectedAdminBankQuestionIds);
      if (res.success) {
        setBankQuestions(bankQuestions.filter(q => !selectedAdminBankQuestionIds.includes(q.id)));
        setSelectedAdminBankQuestionIds([]);
        alert(`Successfully deleted ${res.deletedCount} questions.`);
      } else {
        alert("Failed to delete questions: " + res.error);
      }
    }
  };

  const handleMoveAdminSelected = async (targetFolderId: string | null) => {
    if (selectedAdminBankQuestionIds.length === 0) return;
    const res = await moveQuestionsToFolder(selectedAdminBankQuestionIds, targetFolderId);
    if (res.success) {
      setBankQuestions(bankQuestions.map(q => selectedAdminBankQuestionIds.includes(q.id) ? { ...q, folderId: targetFolderId } : q));
      setSelectedAdminBankQuestionIds([]);
      // Update folder counts
      alert(`Successfully moved questions.`);
    } else {
      alert("Failed to move questions: " + res.error);
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
              {activeTab === "bankSoal" ? "Question Bank CMS" : "Quizzes"}
            </h1>
            <p className="text-slate-400 mt-1">
              {activeTab === "bankSoal"
                ? "Manage question database, categorized folders, and bulk upload questions."
                : "Test your knowledge under real exam conditions with instant feedback."}
            </p>
          </div>

          {isStaff && (
            <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-850 self-start md:self-auto">
              <button
                onClick={() => { setActiveTab("mockTests"); setIsSelectingForTest(false); }}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === "mockTests"
                    ? "bg-[#CA8E25] text-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Mock Papers
              </button>
              <button
                onClick={() => setActiveTab("bankSoal")}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === "bankSoal"
                    ? "bg-[#CA8E25] text-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Question Bank
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Panel */}
      {!activeTest ? (
        activeTab === "bankSoal" && isStaff ? (
          /* Question Bank CMS Tab */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Folder System */}
            <div className="lg:col-span-1 bg-slate-950 border border-slate-850 p-5 rounded-3xl space-y-6 self-start">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <Folder className="w-4 h-4 text-[#CA8E25]" /> Folders
                </h4>
                <button
                  onClick={() => { setIsCreatingFolder(true); setNewFolderName(""); }}
                  className="text-emerald-500 hover:text-emerald-400 p-1 rounded hover:bg-slate-900"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Folder List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {/* All Unfiled Folder */}
                <button
                  onClick={() => setActiveFolderId(null)}
                  className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl border transition text-left text-xs ${
                    activeFolderId === null
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold"
                      : "bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Folder className="w-4 h-4 text-[#CA8E25] flex-shrink-0" />
                  <span className="truncate">All Unfiled Soal</span>
                  <span className="ml-auto text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 border border-slate-800">
                    {bankQuestions.filter(q => !(q as any).folderId).length}
                  </span>
                </button>

                {/* Database folders */}
                {folders.map(f => (
                  <div key={f.id} className={`w-full flex flex-col px-4 py-3 rounded-xl border transition ${activeFolderId === f.id ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" : "bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white"}`}>
                    {editingFolderId === f.id ? (
                      <form onSubmit={handleRenameSubmit} onClick={e => e.stopPropagation()} className="flex items-center gap-2 w-full">
                        <input autoFocus type="text" value={editingFolderName} onChange={e => setEditingFolderName(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none" />
                        <button type="submit" className="text-emerald-400 hover:text-emerald-300"><Check className="w-4 h-4" /></button>
                        <button type="button" onClick={() => setEditingFolderId(null)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <button onClick={() => setActiveFolderId(f.id)} className="flex items-center gap-2 overflow-hidden text-left flex-1">
                          <FolderOpen className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                          <span className="truncate text-xs">{f.name}</span>
                        </button>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 border border-slate-800">{bankQuestions.filter(q => (q as any).folderId === f.id).length}</span>
                          <button onClick={e => { e.stopPropagation(); setEditingFolderId(f.id); setEditingFolderName(f.name); }} className="text-blue-500/50 hover:text-blue-400"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={e => handleDeleteFolder(f.id, e)} className="text-red-500/50 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Create Folder Form */}
              {isCreatingFolder && (
                <form onSubmit={handleCreateFolder} className="space-y-2 pt-4 border-t border-slate-850">
                  <input
                    type="text"
                    required
                    placeholder="Folder Name..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setIsCreatingFolder(false)} className="text-slate-450 h-7 text-[10px] rounded-lg">Cancel</Button>
                    <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white h-7 text-[10px] rounded-lg">Create</Button>
                  </div>
                </form>
              )}
            </div>

            {/* Questions List Inside Active Folder */}
            <div className="lg:col-span-3 space-y-6">
              {/* Question Form Toggle Section */}
              {isBankFormOpen ? (
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-[2rem] space-y-4">
                  <h4 className="font-bold text-white text-base">
                    {editingBankQuestionId ? "Edit Question" : "Add New Question"}
                  </h4>
                  <form onSubmit={handleSaveBankQuestion} className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 font-bold block mb-1">Question Text</label>
                      <textarea
                        required
                        value={bankFormData.questionText}
                        onChange={(e) => setBankFormData({ ...bankFormData, questionText: e.target.value })}
                        placeholder="Type question here..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none h-24 resize-y"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-400 font-bold block mb-1">Question Type</label>
                        <select
                          value={bankFormData.questionType}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBankFormData({
                              ...bankFormData,
                              questionType: val,
                              options: val === "MULTIPLE_CHOICE" ? ["", ""] : []
                            });
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                        >
                          <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                          <option value="SHORT_ANSWER">Short Answer</option>
                        </select>
                      </div>
                      <div>
                        {bankFormData.questionType === "MULTIPLE_CHOICE" ? (
                          <>
                            <label className="text-xs text-slate-400 font-bold block mb-1">Correct Answer</label>
                            <select
                              required
                              value={bankFormData.correctAnswer}
                              onChange={(e) => setBankFormData({ ...bankFormData, correctAnswer: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                            >
                              <option value="" disabled>--- Select Correct Option ---</option>
                              {bankFormData.options.map((opt, idx) => (
                                <option key={idx} value={opt}>
                                  {`Option ${String.fromCharCode(65 + idx)}: ${opt || "(Empty)"}`}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <>
                            <label className="text-xs text-slate-400 font-bold block mb-1">Correct Answer</label>
                            <input
                              type="text"
                              required
                              value={bankFormData.correctAnswer}
                              onChange={(e) => setBankFormData({ ...bankFormData, correctAnswer: e.target.value })}
                              placeholder="Type exact answer..."
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {bankFormData.questionType === "MULTIPLE_CHOICE" && (
                      <div className="space-y-3">
                        <label className="text-xs text-slate-400 font-bold block">Answer Options</label>
                        {bankFormData.options.map((opt, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <span className="text-xs text-slate-500 font-bold">{String.fromCharCode(65 + i)}</span>
                            <input
                              type="text"
                              required
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...bankFormData.options];
                                newOpts[i] = e.target.value;
                                setBankFormData({ ...bankFormData, options: newOpts });
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + i)}`}
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                            />
                            {bankFormData.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newOpts = bankFormData.options.filter((_, idx) => idx !== i);
                                  setBankFormData({ ...bankFormData, options: newOpts });
                                }}
                                className="text-red-500 hover:text-red-400"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {bankFormData.options.length < 6 && (
                          <button
                            type="button"
                            onClick={() => setBankFormData({ ...bankFormData, options: [...bankFormData.options, ""] })}
                            className="text-xs text-[#CA8E25] hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Option
                          </button>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-400 font-bold block mb-1">Topic / Subject</label>
                        <input
                          type="text"
                          value={bankFormData.topic}
                          onChange={(e) => setBankFormData({ ...bankFormData, topic: e.target.value })}
                          placeholder="e.g. Aljabar"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 font-bold block mb-1">Difficulty</label>
                        <select
                          value={bankFormData.difficulty}
                          onChange={(e) => setBankFormData({ ...bankFormData, difficulty: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                        >
                          <option value="EASY">Easy</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HARD">Hard</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 font-bold block mb-1">Explanation (Optional)</label>
                      <textarea
                        value={bankFormData.explanation}
                        onChange={(e) => setBankFormData({ ...bankFormData, explanation: e.target.value })}
                        placeholder="Detailed explanation if needed..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none h-16 resize-y"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 font-bold block mb-1">Question Image (Optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setBankFormData({ ...bankFormData, imageFile: e.target.files?.[0] || null })}
                        className="w-full text-xs text-slate-400 bg-slate-900 border border-slate-800 p-2 rounded-xl"
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsBankFormOpen(false);
                          setEditingBankQuestionId(null);
                        }}
                        className="text-slate-400 hover:text-white rounded-xl"
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        disabled={isBankSaving}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 font-bold"
                      >
                        {isBankSaving ? "Saving..." : "Save Question"}
                      </Button>
                    </div>
                  </form>
                </div>
              ) : null}

              {/* Toolbar Question Bank */}
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-400" /> Question Bank
                  </h3>
                  <p className="text-sm text-slate-400 font-medium">Folder: {activeFolderId ? folders.find(f => f.id === activeFolderId)?.name || 'Unknown' : 'All Unfiled'}</p>
                </div>
                <div className="relative z-10 w-full md:w-auto flex gap-3 flex-wrap">
                  {!isSelectingForTest && selectedAdminBankQuestionIds.length > 0 && (
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 p-1.5 rounded-xl">
                       <span className="text-xs text-slate-400 font-bold px-2">{selectedAdminBankQuestionIds.length} Questions</span>
                       <Button onClick={handleDeleteAdminSelected} className="bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-lg h-8 px-3 text-[10px] transition font-bold shadow-none border border-transparent">
                          Hapus
                       </Button>
                       <select onChange={(e) => handleMoveAdminSelected(e.target.value || null)} value="" className="bg-slate-800 text-slate-300 text-[10px] h-8 px-2 rounded-xl border-none focus:ring-0 font-bold cursor-pointer pr-8">
                          <option value="" disabled>Move To...</option>
                          <option value="">[ All Unfiled ]</option>
                          {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                       </select>
                    </div>
                  )}
                  {isSelectingForTest && selectedBankQuestionIds.length > 0 && (
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 p-1.5 rounded-xl">
                      <span className="text-xs text-slate-400 font-bold px-2">{selectedBankQuestionIds.length} Questions Selected</span>
                      <Button onClick={() => { handleOpenCms(); setFormData({ ...formData, selectedQuestionIds: selectedBankQuestionIds }); }} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg h-8 px-3 text-[10px] font-bold">
                        Create Exam
                      </Button>
                      <Button onClick={() => setIsSelectingForTest(false)} variant="ghost" className="text-slate-400 hover:text-white rounded-lg h-8 px-2 text-[10px]">
                        Cancel
                      </Button>
                    </div>
                  )}
                  
                  <Button onClick={() => { setIsBankFormOpen(!isBankFormOpen); setEditingBankQuestionId(null); setBankFormData({ questionText: "", options: ["", ""], correctAnswer: "", explanation: "", topic: "", difficulty: "EASY", questionType: "MULTIPLE_CHOICE", imageFile: null }); }} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl px-4 py-2.5 transition text-xs shadow-lg shadow-emerald-500/20">
                    {isBankFormOpen && !editingBankQuestionId ? <X className="w-3.5 h-3.5 mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />} {isBankFormOpen && !editingBankQuestionId ? "Cancel" : "Add Question"}
                  </Button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                <input
                  type="text"
                  placeholder="Search question text..."
                  value={bankSearchQuery}
                  onChange={(e) => setBankSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-slate-700 transition"
                />
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {filteredBankQuestions.length > 0 && (
                  <div className="pl-4 py-2 border-b border-slate-800/50 flex items-center gap-3">
                     <button onClick={() => {
                       if (isSelectingForTest) {
                         if (selectedBankQuestionIds.length === filteredBankQuestions.length) setSelectedBankQuestionIds([]);
                         else setSelectedBankQuestionIds(filteredBankQuestions.map(q => q.id));
                       } else {
                         if (selectedAdminBankQuestionIds.length === filteredBankQuestions.length) setSelectedAdminBankQuestionIds([]);
                         else setSelectedAdminBankQuestionIds(filteredBankQuestions.map(q => q.id));
                       }
                     }} className={`w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-colors ${
                       (isSelectingForTest ? selectedBankQuestionIds.length === filteredBankQuestions.length : selectedAdminBankQuestionIds.length === filteredBankQuestions.length) 
                         ? "bg-blue-500 border-blue-500 text-white" 
                         : "bg-slate-900 border-slate-700 text-transparent"
                     }`}><Check className="w-3.5 h-3.5" /></button>
                     <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Select All</span>
                  </div>
                )}
                {filteredBankQuestions.map((q, idx) => {
                  const isSelectedTest = isSelectingForTest && selectedBankQuestionIds.includes(q.id);
                  const isSelectedAdmin = !isSelectingForTest && selectedAdminBankQuestionIds.includes(q.id);
                  const isSelected = isSelectingForTest ? isSelectedTest : isSelectedAdmin;
                  return (
                    <div key={q.id} onClick={() => { if (isSelectingForTest) { if (isSelectedTest) setSelectedBankQuestionIds(prev => prev.filter(id => id !== q.id)); else setSelectedBankQuestionIds(prev => [...prev, q.id]); } else { if (isSelectedAdmin) setSelectedAdminBankQuestionIds(prev => prev.filter(id => id !== q.id)); else setSelectedAdminBankQuestionIds(prev => [...prev, q.id]); } }} className={`group bg-slate-950 border p-5 rounded-[1.5rem] transition-all cursor-pointer hover:border-slate-700 ${isSelected ? "border-blue-500 bg-blue-900/10 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20" : "border-slate-800"}`}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex gap-4 w-full">
                           <div className={`w-6 h-6 shrink-0 rounded flex items-center justify-center border transition-colors md:mt-0.5 ${isSelected ? "bg-blue-500 border-blue-500 text-white" : "bg-slate-900 border-slate-700 text-transparent group-hover:border-slate-500"}`}><Check className="w-4 h-4 ml-0" /></div>
                           <div className="flex-1">
                             <p className="text-[15px] font-medium text-white leading-relaxed">{q.questionText}</p>
                             {(q as any).imageUrl && <img src={(q as any).imageUrl} className="max-h-40 rounded-xl border border-slate-800 mt-3 shadow-lg" />}
                             <div className="mt-3 flex gap-2">
                               <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold rounded-lg inline-block">ANSWER: {q.correctAnswer}</span>
                             </div>
                           </div>
                        </div>
                        {!isSelectingForTest && (
                          <div className="flex flex-col gap-2 shrink-0">
                             <button onClick={(e) => {
                               e.stopPropagation();
                               setEditingBankQuestionId(q.id);
                               setBankFormData({
                                 questionText: q.questionText,
                                 correctAnswer: q.correctAnswer,
                                 options: (()=>{try{return JSON.parse(q.options)}catch(err){return ["", ""]}})() || ["", ""],
                                 explanation: q.explanation || "",
                                 topic: (q as any).topic || "",
                                 difficulty: (q as any).difficulty || "EASY",
                                 questionType: (q as any).options && JSON.parse(q.options).length > 0 ? "MULTIPLE_CHOICE" : "SHORT_ANSWER",
                                 imageFile: null
                               });
                               setIsBankFormOpen(true);
                               window.scrollTo({ top: 0, behavior: "smooth" });
                             }} className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition"><Edit2 className="w-4 h-4" /></button>
                             <button onClick={(e) => handleDeleteBankQuestion(q.id, e)} className="p-2 text-red-500/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                {filteredBankQuestions.length === 0 && (
                  <div className="py-20 text-center text-slate-500 bg-slate-950/20 border border-slate-850 rounded-3xl">
                    No questions found in this folder or search criteria.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Normal mock papers cards rendering for student or teacher mockTests tab */
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
                          {hasAttempted(test) && !isStaff ? (
                            <Button
                              onClick={() => handleReviewTest(test)}
                              className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl px-5 py-2.5 text-xs flex items-center justify-center gap-1.5 border border-slate-700"
                            >
                              <FileText className="w-3.5 h-3.5" /> Review Answers
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleStartTest(test)}
                              className="flex-1 md:flex-none bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-semibold rounded-xl px-5 py-2.5 text-xs flex items-center justify-center gap-1.5"
                            >
                              {latestSubmission && isStaff ? (
                                <><RotateCcw className="w-3.5 h-3.5" /> Retake (Staff)</>
                              ) : (
                                <><Play className="w-3.5 h-3.5" /> Start Quiz</>
                              )}
                            </Button>
                          )}

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
        )
      ) : (
        /* Test Taking / Review layout */
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Compact Header Bar */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#CA8E25]/15 flex items-center justify-center">
                <Award className="w-4 h-4 text-[#CA8E25]" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm leading-tight">{activeTest.title}</h3>
                <p className="text-[11px] text-slate-500">
                  {reviewMode ? "Review Mode — Read Only" : `Question ${currentQuestionIdx + 1} / ${activeTest.questions.length}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!testResult && !reviewMode && (
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 font-mono text-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-white font-bold">{formatTime(timeLeft)}</span>
                </div>
              )}
              {(testResult || reviewMode) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setActiveTest(null); setTestResult(null); setReviewMode(false); }}
                  className="text-slate-400 hover:text-white h-8 px-2.5 rounded-lg text-xs"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Exit
                </Button>
              )}
            </div>
          </div>

          {/* Question Number Navigation Grid */}
          {((!testResult && !reviewMode) || reviewMode) && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3">
              <div className="flex flex-wrap gap-1.5">
                {activeTest.questions.map((q, idx) => {
                  const isCurrent = idx === currentQuestionIdx;
                  const isAnswered = !!testAnswers[q.id];
                  let btnStyle = "bg-slate-900 border-slate-800 text-slate-500";

                  if (reviewMode) {
                    const studentAns = testAnswers[q.id]?.toLowerCase().trim() || "";
                    const correctAns = q.correctAnswer?.toLowerCase().trim() || "";
                    const isCorrect = studentAns === correctAns;
                    if (isCurrent) {
                      btnStyle = "bg-[#CA8E25] border-[#CA8E25] text-black ring-2 ring-[#CA8E25]/30";
                    } else if (isCorrect) {
                      btnStyle = "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
                    } else {
                      btnStyle = "bg-red-500/15 border-red-500/30 text-red-400";
                    }
                  } else {
                    if (isCurrent) {
                      btnStyle = "bg-[#CA8E25] border-[#CA8E25] text-black ring-2 ring-[#CA8E25]/30";
                    } else if (isAnswered) {
                      btnStyle = "bg-blue-600/15 border-blue-500/30 text-blue-400";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentQuestionIdx(idx)}
                      className={`w-8 h-8 rounded-lg border text-[11px] font-bold flex items-center justify-center transition-all hover:opacity-80 ${btnStyle}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main Content Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            {!testResult && !reviewMode ? (
              /* ── Active Quiz Taking ── */
              <div className="p-5 space-y-4">
                {/* Question Text */}
                <div className="p-4 bg-slate-900/60 border border-slate-800/60 rounded-xl">
                  <p className="text-[13px] text-white font-medium leading-relaxed">
                    {activeTest.questions[currentQuestionIdx]?.questionText}
                  </p>
                  {(activeTest.questions[currentQuestionIdx] as any)?.imageUrl && (
                    <img
                      src={(activeTest.questions[currentQuestionIdx] as any).imageUrl}
                      alt="Question"
                      className="mt-3 max-h-48 rounded-lg border border-slate-800"
                    />
                  )}
                </div>

                {/* Answer Options */}
                <div className="space-y-2">
                  {(() => {
                    const q = activeTest.questions[currentQuestionIdx];
                    if (!q) return null;
                    let opts: string[] = [];
                    try { opts = JSON.parse(q.options); } catch { opts = []; }

                    return opts.length > 0 ? opts.map((opt, i) => {
                      const isSelected = testAnswers[q.id] === opt;
                      return (
                        <button
                          key={i}
                          onClick={() => handleSelectAnswer(q.id, opt)}
                          className={`w-full text-left px-4 py-3 rounded-xl border text-[13px] font-medium transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-[#CA8E25]/10 border-[#CA8E25]/60 text-white"
                              : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-md border text-[10px] font-bold flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-[#CA8E25] border-[#CA8E25] text-black" : "border-slate-700 text-slate-500"
                            }`}>{String.fromCharCode(65 + i)}</span>
                            <span>{opt}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#CA8E25] shrink-0" />}
                        </button>
                      );
                    }) : (
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1.5 uppercase tracking-wider">Your Answer</label>
                        <input
                          type="text"
                          placeholder="Type your answer..."
                          value={testAnswers[q.id] || ""}
                          onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#CA8E25]/50 transition-colors"
                        />
                      </div>
                    );
                  })()}
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center pt-3 border-t border-slate-800/60">
                  <Button
                    disabled={currentQuestionIdx === 0}
                    onClick={() => setCurrentQuestionIdx(currentQuestionIdx - 1)}
                    variant="outline"
                    className="border-slate-800 text-slate-400 hover:text-white rounded-lg text-[11px] h-8 px-3"
                  >
                    ← Previous
                  </Button>
                  {currentQuestionIdx < activeTest.questions.length - 1 ? (
                    <Button
                      onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                      className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] h-8 px-4"
                    >
                      Next →
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmitTest}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] h-8 px-5 font-bold"
                    >
                      Submit Answers
                    </Button>
                  )}
                </div>
              </div>

            ) : testResult && !reviewMode ? (
              /* ── Result Summary ── */
              <div className="p-5 space-y-5">
                {/* Score Circle */}
                <div className="text-center space-y-3 py-2">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto border-2 ${
                    testResult.isPassed
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-red-500/10 border-red-500/30"
                  }`}>
                    <span className={`text-2xl font-black ${testResult.isPassed ? "text-emerald-400" : "text-red-400"}`}>
                      {testResult.score}%
                    </span>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${testResult.isPassed ? "text-emerald-400" : "text-red-400"}`}>
                      {testResult.isPassed ? "EXAM PASSED" : "EXAM FAILED"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Passing Score: {activeTest.passingScore}%
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(() => {
                    let correctCount = 0;
                    let wrongCount = 0;
                    let totalTimeSpent = 0;
                    activeTest.questions.forEach((q) => {
                      const studentAns = testAnswers[q.id]?.toLowerCase().trim() || "";
                      const correctAns = q.correctAnswer?.toLowerCase().trim() || "";
                      if (studentAns === correctAns) correctCount++;
                      else wrongCount++;
                      totalTimeSpent += (timeSpentPerQuestion[q.id] || 0);
                    });
                    const avgTime = activeTest.questions.length > 0 ? Math.round(totalTimeSpent / activeTest.questions.length) : 0;
                    const totalMin = Math.floor(totalTimeSpent / 60);
                    const totalSec = totalTimeSpent % 60;

                    return (
                      <>
                        <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-xl p-3 text-center">
                          <p className="text-lg font-black text-emerald-400">{correctCount}</p>
                          <p className="text-[10px] text-emerald-400/70 font-semibold uppercase tracking-wider">Correct</p>
                        </div>
                        <div className="bg-red-500/8 border border-red-500/15 rounded-xl p-3 text-center">
                          <p className="text-lg font-black text-red-400">{wrongCount}</p>
                          <p className="text-[10px] text-red-400/70 font-semibold uppercase tracking-wider">Wrong</p>
                        </div>
                        <div className="bg-amber-500/8 border border-amber-500/15 rounded-xl p-3 text-center">
                          <p className="text-lg font-black text-amber-400">{totalMin}:{totalSec.toString().padStart(2, "0")}</p>
                          <p className="text-[10px] text-amber-400/70 font-semibold uppercase tracking-wider">Time</p>
                        </div>
                        <div className="bg-blue-500/8 border border-blue-500/15 rounded-xl p-3 text-center">
                          <p className="text-lg font-black text-blue-400">{avgTime}s</p>
                          <p className="text-[10px] text-blue-400/70 font-semibold uppercase tracking-wider">Avg/Q</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 justify-center pt-3 border-t border-slate-800/60">
                  <Button
                    onClick={() => { setReviewMode(true); setCurrentQuestionIdx(0); }}
                    className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-semibold rounded-lg text-[11px] h-8 px-4"
                  >
                    Review Answers
                  </Button>
                  <Button
                    onClick={() => { setActiveTest(null); setTestResult(null); }}
                    variant="outline"
                    className="border-slate-800 text-slate-400 hover:text-white rounded-lg text-[11px] h-8 px-4"
                  >
                    Back to Portal
                  </Button>
                </div>
              </div>

            ) : (
              /* ── Review Mode ── */
              <div className="p-5 space-y-4">
                {/* Review Banner */}
                <div className="flex items-center gap-2 bg-amber-500/8 border border-amber-500/15 rounded-lg px-3 py-2">
                  <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <p className="text-[11px] text-amber-400 font-medium">Read-only review — answers cannot be changed.</p>
                </div>

                {/* Question + Time Badge */}
                <div className="p-4 bg-slate-900/60 border border-slate-800/60 rounded-xl space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider shrink-0 pt-0.5">Q{currentQuestionIdx + 1}</span>
                    {(() => {
                      const q = activeTest.questions[currentQuestionIdx];
                      if (!q) return null;
                      const studentAns = testAnswers[q.id]?.toLowerCase().trim() || "";
                      const correctAns = q.correctAnswer?.toLowerCase().trim() || "";
                      const isCorrect = studentAns === correctAns;
                      const spent = timeSpentPerQuestion[q.id] || 0;
                      const min = Math.floor(spent / 60);
                      const sec = spent % 60;

                      return (
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            isCorrect ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : "text-red-400 bg-red-400/10 border-red-400/20"
                          }`}>
                            {isCorrect ? "✓ Correct" : "✗ Wrong"}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {min}:{sec.toString().padStart(2, "0")}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  <p className="text-[13px] text-white font-medium leading-relaxed">
                    {activeTest.questions[currentQuestionIdx]?.questionText}
                  </p>
                  {(activeTest.questions[currentQuestionIdx] as any)?.imageUrl && (
                    <img
                      src={(activeTest.questions[currentQuestionIdx] as any).imageUrl}
                      alt="Question"
                      className="mt-2 max-h-44 rounded-lg border border-slate-800"
                    />
                  )}
                </div>

                {/* Answer Options — Read Only */}
                <div className="space-y-2">
                  {(() => {
                    const q = activeTest.questions[currentQuestionIdx];
                    if (!q) return null;
                    let opts: string[] = [];
                    try { opts = JSON.parse(q.options); } catch { opts = []; }
                    const studentAns = testAnswers[q.id];
                    const correctAns = q.correctAnswer;

                    if (opts.length === 0) {
                      const isCorrectChoice = studentAns?.toLowerCase().trim() === correctAns?.toLowerCase().trim();
                      return (
                        <div className="space-y-2">
                          <div className={`px-4 py-3 rounded-xl border text-[13px] font-medium ${
                            isCorrectChoice ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-red-500/10 border-red-500/25 text-red-400"
                          }`}>
                            <p className="text-[9px] uppercase font-bold mb-0.5 opacity-70">Your Answer</p>
                            <p>{studentAns || "(No answer)"}</p>
                          </div>
                          {!isCorrectChoice && (
                            <div className="px-4 py-3 rounded-xl border bg-emerald-500/10 border-emerald-500/25 text-emerald-400 text-[13px] font-medium">
                              <p className="text-[9px] uppercase font-bold mb-0.5 opacity-70">Correct Answer</p>
                              <p>{correctAns}</p>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return opts.map((opt, i) => {
                      const isStudentChoice = studentAns === opt;
                      const isCorrectChoice = correctAns === opt;
                      let style = "bg-slate-900/40 border-slate-800 text-slate-500";
                      let badge = null;

                      if (isCorrectChoice && isStudentChoice) {
                        style = "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
                        badge = <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded">✓ YOUR ANSWER</span>;
                      } else if (isCorrectChoice) {
                        style = "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
                        badge = <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded">CORRECT</span>;
                      } else if (isStudentChoice) {
                        style = "bg-red-500/10 border-red-500/25 text-red-400";
                        badge = <span className="text-[9px] bg-red-500/20 text-red-400 font-bold px-1.5 py-0.5 rounded">✗ YOUR ANSWER</span>;
                      }

                      return (
                        <div key={i} className={`px-4 py-3 rounded-xl border text-[13px] font-medium flex items-center justify-between gap-3 ${style}`}>
                          <div className="flex items-center gap-2.5">
                            <span className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center border shrink-0 ${
                              isCorrectChoice ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                              : isStudentChoice ? "bg-red-500/20 border-red-500/30 text-red-400"
                              : "border-slate-700 text-slate-600"
                            }`}>{String.fromCharCode(65 + i)}</span>
                            <span>{opt}</span>
                          </div>
                          {badge}
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Explanation */}
                {activeTest.questions[currentQuestionIdx]?.explanation && (
                  <div className="px-4 py-3 bg-blue-950/10 border border-blue-900/20 rounded-xl">
                    <h5 className="text-[10px] font-bold text-blue-400 flex items-center gap-1 mb-1">
                      <HelpCircle className="w-3 h-3" /> Explanation
                    </h5>
                    <p className="text-[12px] text-slate-400 leading-relaxed">
                      {activeTest.questions[currentQuestionIdx].explanation}
                    </p>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between items-center pt-3 border-t border-slate-800/60">
                  <Button
                    disabled={currentQuestionIdx === 0}
                    onClick={() => setCurrentQuestionIdx(currentQuestionIdx - 1)}
                    variant="outline"
                    className="border-slate-800 text-slate-400 hover:text-white rounded-lg text-[11px] h-8 px-3"
                  >
                    ← Previous
                  </Button>
                  {currentQuestionIdx < activeTest.questions.length - 1 ? (
                    <Button
                      onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                      className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] h-8 px-4"
                    >
                      Next →
                    </Button>
                  ) : (
                    <Button
                      onClick={() => { setActiveTest(null); setTestResult(null); setReviewMode(false); }}
                      className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] h-8 px-5 font-bold"
                    >
                      Finish Review
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
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


              {/* Folder Selection from Bank */}
              <div className="space-y-4 pt-3 border-t border-slate-800">
                <div>
                  <h4 className="font-bold text-white text-sm mb-2">Quick Import from Folders</h4>
                  <div className="flex flex-wrap gap-2">
                    {folders.map(f => {
                      const folderQuestionIds = bankQuestions.filter(q => (q as any).folderId === f.id).map(q => q.id);
                      if (folderQuestionIds.length === 0) return null;
                      const isFullySelected = folderQuestionIds.every(id => formData.selectedQuestionIds.includes(id));
                      return (
                        <div key={f.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] cursor-pointer font-medium transition ${isFullySelected ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"}`} onClick={() => {
                          if (isFullySelected) {
                            setFormData(prev => ({ ...prev, selectedQuestionIds: prev.selectedQuestionIds.filter(id => !folderQuestionIds.includes(id)) }));
                          } else {
                            const newIds = new Set([...formData.selectedQuestionIds, ...folderQuestionIds]);
                            setFormData(prev => ({ ...prev, selectedQuestionIds: Array.from(newIds) }));
                          }
                        }}>
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>{f.name} ({folderQuestionIds.length} Qs)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Individual Questions Selection */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white text-sm">Review & Select Questions ({formData.selectedQuestionIds.length} selected)</h4>
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
