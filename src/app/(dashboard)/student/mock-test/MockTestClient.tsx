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
  FolderPlus,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Eye,
  EyeOff,
  SendHorizonal
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
  updateBankQuestion,
  toggleMockTestPublished
} from "@/actions/dashboard";
import { evaluateQuestionAnswer } from "@/lib/quizGrading";
import Link from "next/link";
import { STUDENT_GRADES, getGradeLabel } from "@/lib/grades";

interface MockQuestion {
  id: string;
  questionText: string;
  options: string; // JSON Array string
  correctAnswer: string;
  acceptedAnswers?: string | null;
  allowAnyOrder?: boolean;
  explanation: string | null;
  explanationImageUrl?: string | null;
  imageUrl?: string | null;
  topic?: string | null;
  difficulty?: string | null;
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
  targetedGrade?: string | null;
  updatedAt?: Date | string | null;
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
  initialCamps?: { id: string; name: string }[];
}

export default function MockTestClient({
  initialCourses,
  isUnlocked,
  userRole,
  initialBankQuestions = [],
  initialFolders = [],
  initialCamps = [],
}: MockTestClientProps) {
  const [activeTab, setActiveTab] = useState<"mockTests" | "bankSoal">("mockTests");
  const [bankQuestions, setBankQuestions] = useState<MockQuestion[]>(initialBankQuestions);
  const [folders, setFolders] = useState<any[]>(initialFolders);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [bankSearchQuery, setBankSearchQuery] = useState("");
  const [selectedAdminBankQuestionIds, setSelectedAdminBankQuestionIds] = useState<string[]>([]);
  
  // Quiz Grade Filter
  const [selectedQuizGradeFilter, setSelectedQuizGradeFilter] = useState<string>("ALL");

  // Paper status tab (CMS only): "published" | "drafts" | "all"
  const [paperStatusTab, setPaperStatusTab] = useState<"published" | "drafts" | "all">("published");

  // Bank Question form states
  const [isBankFormOpen, setIsBankFormOpen] = useState(false);
  const [editingBankQuestionId, setEditingBankQuestionId] = useState<string | null>(null);
  const [isBankSaving, setIsBankSaving] = useState(false);
  const [bankFormData, setBankFormData] = useState({
    questionText: "",
    options: ["", ""],
    correctAnswer: "",
    explanation: "",
    topic: "",
    difficulty: "EASY",
    questionType: "MULTIPLE_CHOICE",
    imageFile: null as File | null,
    explanationImageFile: null as File | null,
  });

  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [selectedCourseIdx, setSelectedCourseIdx] = useState<number>(0);
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
  const [selectedFolderForImport, setSelectedFolderForImport] = useState<string>("");
  const [showManualBankPicker, setShowManualBankPicker] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    timeLimit: 20,
    passingScore: 75,
    isPublished: true,
    isTrial: false,
    targetedGrade: "ALL",
    courseId: "",
    campProgramId: "",
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

  const getOrderedQuestions = (test: MockTest): MockQuestion[] => {
    if (!test || !test.questions) return [];
    const questionOrder = (test as any).questionOrder;
    if (!questionOrder) return test.questions;
    try {
      const orderArr: string[] = JSON.parse(questionOrder);
      if (!Array.isArray(orderArr) || orderArr.length === 0) return test.questions;
      const orderMap = new Map<string, number>();
      orderArr.forEach((id, index) => orderMap.set(id, index));
      return [...test.questions].sort((a, b) => {
        const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
        const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
        return idxA - idxB;
      });
    } catch (e) {
      return test.questions;
    }
  };

  const handleReviewTest = (test: MockTest) => {
    const submission = test.submissions[0];
    if (!submission) return;

    let parsedAnswers = {};
    let parsedTimeSpent = {};
    try { parsedAnswers = JSON.parse(submission.answers || "{}"); } catch (e) {}
    try { (submission as any).timeSpent && (parsedTimeSpent = JSON.parse((submission as any).timeSpent || "{}")); } catch (e) {}

    const orderedQuestions = getOrderedQuestions(test);

    let correctCount = 0;
    orderedQuestions.forEach((q) => {
      const studentAns = (parsedAnswers as Record<string, string>)[q.id] || "";
      if (evaluateQuestionAnswer(q, studentAns).isCorrect) {
        correctCount++;
      }
    });

    setActiveTest({ ...test, questions: orderedQuestions });
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
    const orderedQuestions = getOrderedQuestions(test);
    setActiveTest({ ...test, questions: orderedQuestions });
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
    if (!activeCourse && courses.length === 0) return;
    if (test) {
      setEditingTest(test);
      let initialOrder: string[] = test.questions.map((q) => q.id);
      if ((test as any).questionOrder) {
        try {
          const orderArr = JSON.parse((test as any).questionOrder);
          if (Array.isArray(orderArr) && orderArr.length > 0) {
            initialOrder = orderArr;
          }
        } catch (e) {}
      }
      setFormData({
        title: test.title,
        description: (test as any).description || "",
        timeLimit: test.timeLimit,
        passingScore: test.passingScore,
        isPublished: test.isPublished,
        isTrial: test.isTrial,
        targetedGrade: test.targetedGrade || "ALL",
        courseId: (test as any).courseId || (activeCourse ? activeCourse.id : courses[0]?.id || ""),
        campProgramId: (test as any).campProgramId || "",
        selectedQuestionIds: initialOrder,
      });
    } else {
      setEditingTest(null);
      setFormData({
        title: "",
        description: "",
        timeLimit: 20,
        passingScore: 75,
        isPublished: true,
        isTrial: false,
        targetedGrade: "ALL",
        courseId: activeCourse ? activeCourse.id : courses[0]?.id || "",
        campProgramId: "",
        selectedQuestionIds: [],
      });
    }
    setSelectedFolderForImport("");
    setShowManualBankPicker(false);
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
    if (!formData.title.trim()) {
      alert("Please enter a title for the Mock Paper.");
      return;
    }

    // Validate question count only when publishing
    if (formData.isPublished && formData.selectedQuestionIds.length === 0) {
      alert("Cannot publish: this paper has no questions. Add at least one question before publishing, or save as a Draft.");
      return;
    }

    const isCamp = Boolean(formData.campProgramId);
    const targetCourseId = isCamp ? undefined : (formData.courseId || activeCourse?.id);
    if (!isCamp && !targetCourseId && courses.length > 0) {
      alert("Please select a target course for this Mock Paper.");
      return;
    }

    const targetedGrade = formData.targetedGrade === "ALL" ? null : formData.targetedGrade;

    if (editingTest) {
      const res = await updateMockTest(editingTest.id, {
        title: formData.title,
        timeLimit: Number(formData.timeLimit),
        passingScore: Number(formData.passingScore),
        isPublished: formData.isPublished,
        isTrial: formData.isTrial,
        targetedGrade,
        courseId: targetCourseId,
        campProgramId: formData.campProgramId || undefined,
        questionIds: formData.selectedQuestionIds,
        questionOrder: formData.selectedQuestionIds,
      });
      if (res.success && res.test) {
        alert("Mock Paper updated successfully!");
        window.location.reload();
      } else {
        alert("Failed to update Mock Paper: " + res.error);
      }
    } else {
      const res = await createMockTest({
        courseId: targetCourseId,
        campProgramId: formData.campProgramId || undefined,
        title: formData.title,
        timeLimit: Number(formData.timeLimit),
        passingScore: Number(formData.passingScore),
        isPublished: formData.isPublished,
        isTrial: formData.isTrial,
        targetedGrade,
        questionIds: formData.selectedQuestionIds,
        questionOrder: formData.selectedQuestionIds,
      });
      if (res.success && res.test) {
        alert("Mock Paper created successfully!");
        window.location.reload();
      } else {
        alert("Failed to create Mock Paper: " + res.error);
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
        alert("Failed to upload question image.");
        setIsBankSaving(false);
        return;
      }
    }

    let explanationImageUrl = undefined;
    if (bankFormData.explanationImageFile) {
      const formData = new FormData();
      formData.append("file", bankFormData.explanationImageFile);
      const uploadRes = await fetch("/api/teacher/mock-tests/upload-image", { method: "POST", body: formData });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        explanationImageUrl = data.url;
      } else {
        alert("Failed to upload explanation image.");
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
        explanationImageUrl: explanationImageUrl,
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
        explanationImageUrl: explanationImageUrl,
        topic: bankFormData.topic,
        difficulty: bankFormData.difficulty,
        imageUrl: imageUrl,
        folderId: activeFolderId,
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
        questionText: "", options: ["", ""], correctAnswer: "", explanation: "", topic: "", difficulty: "EASY", questionType: "MULTIPLE_CHOICE", imageFile: null, explanationImageFile: null
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

                    <div>
                      <label className="text-xs text-slate-400 font-bold block mb-1">Explanation Image (Optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setBankFormData({ ...bankFormData, explanationImageFile: e.target.files?.[0] || null })}
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
                  
                  <Button onClick={() => { setIsBankFormOpen(!isBankFormOpen); setEditingBankQuestionId(null); setBankFormData({ questionText: "", options: ["", ""], correctAnswer: "", explanation: "", topic: "", difficulty: "EASY", questionType: "MULTIPLE_CHOICE", imageFile: null, explanationImageFile: null }); }} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl px-4 py-2.5 transition text-xs shadow-lg shadow-emerald-500/20">
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
                                 imageFile: null,
                                 explanationImageFile: null
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
          ) : (() => {
            // Collect all mock tests across courses for staff; students see only their course's tests
            const allTests = courses.flatMap((c) => c.mockTests.map((t) => ({ ...t, _courseTitle: c.title, _courseType: c.type })));

            const draftCount = isStaff ? allTests.filter((t) => !t.isPublished).length : 0;

            // Build visible list for student (per course) or staff (tabbed across all)
            const visibleTests = isStaff
              ? allTests.filter((t) => {
                  const gradeOk = selectedQuizGradeFilter === "ALL" || t.targetedGrade === selectedQuizGradeFilter;
                  const tabOk =
                    paperStatusTab === "all" ||
                    (paperStatusTab === "published" && t.isPublished) ||
                    (paperStatusTab === "drafts" && !t.isPublished);
                  return gradeOk && tabOk;
                })
              : (activeCourse?.mockTests ?? []).filter(
                  (t) => selectedQuizGradeFilter === "ALL" || t.targetedGrade === selectedQuizGradeFilter
                );

            return (
              <div className="space-y-6">
                {/* Toolbar */}
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-3xl flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                      {/* Course filter (student only) */}
                      {!isStaff && (
                        <div className="w-full sm:w-64 space-y-1">
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
                      )}

                      <div className="w-full sm:w-48 space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#CA8E25] block">Filter Grade</span>
                        <select
                          value={selectedQuizGradeFilter}
                          onChange={(e) => setSelectedQuizGradeFilter(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                        >
                          <option value="ALL">All Grades</option>
                          {STUDENT_GRADES.map((g) => (
                            <option key={g.value} value={g.value}>
                              {g.label}
                            </option>
                          ))}
                        </select>
                      </div>
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

                  {/* Published / Drafts / All tabs — staff only */}
                  {isStaff && (
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl self-start">
                      {(["published", "drafts", "all"] as const).map((tab) => {
                        const labels: Record<string, string> = { published: "Published", drafts: "Drafts", all: "All" };
                        const isDraftsTab = tab === "drafts";
                        return (
                          <button
                            key={tab}
                            onClick={() => setPaperStatusTab(tab)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              paperStatusTab === tab
                                ? tab === "drafts"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-[#CA8E25] text-black"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            {isDraftsTab ? <EyeOff className="w-3 h-3" /> : tab === "published" ? <Eye className="w-3 h-3" /> : null}
                            {labels[tab]}
                            {isDraftsTab && draftCount > 0 && (
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none ${
                                paperStatusTab === "drafts"
                                  ? "bg-amber-500/30 text-amber-300"
                                  : "bg-slate-700 text-slate-300"
                              }`}>
                                {draftCount}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Test Cards */}
                <div className="grid grid-cols-1 gap-4">
                  {visibleTests.length > 0 ? (
                    visibleTests.map((test) => {
                      const latestSubmission = test.submissions[0];
                      const isDraft = !test.isPublished;
                      return (
                        <div
                          key={test.id}
                          className={`bg-slate-950 border p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-slate-700 transition ${
                            isDraft ? "border-amber-500/20 bg-amber-950/5" : "border-slate-800"
                          }`}
                        >
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-white text-lg flex items-center gap-2 flex-wrap">
                                {test.title}
                                {test.targetedGrade && (
                                  <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-bold px-2 py-0.5 rounded-full">
                                    {getGradeLabel(test.targetedGrade)}
                                  </span>
                                )}
                                {test.isTrial && (
                                  <span className="bg-amber-500/10 border border-amber-500/20 text-[#CA8E25] text-[8px] font-bold px-2 py-0.5 rounded-full">
                                    Trial
                                  </span>
                                )}
                                {isDraft && (
                                  <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <EyeOff className="w-2.5 h-2.5" /> Draft
                                  </span>
                                )}
                                {!isDraft && isStaff && (
                                  <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Eye className="w-2.5 h-2.5" /> Live
                                  </span>
                                )}
                              </h4>
                              {/* Course badge for staff (shown when viewing All) */}
                              {isStaff && (test as any)._courseTitle && (
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                                  {(test as any)._courseTitle} · {(test as any)._courseType}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="w-3.5 h-3.5 text-[#CA8E25]" /> {test.timeLimit} Minutes
                              </span>
                              <span>•</span>
                              <span>{test.questions.length} Questions</span>
                              <span>•</span>
                              <span>Passing Grade: {test.passingScore}%</span>
                              {isDraft && test.updatedAt && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-500/70">
                                    Last edited {new Date(test.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                  </span>
                                </>
                              )}
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

                          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
                            {/* Student actions */}
                            {!isStaff && (
                              hasAttempted(test) ? (
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
                                  <Play className="w-3.5 h-3.5" /> Start Quiz
                                </Button>
                              )
                            )}

                            {/* Staff actions */}
                            {isStaff && (
                              <>
                                {/* Start / Retake for staff preview */}
                                <Button
                                  onClick={() => handleStartTest(test)}
                                  className="bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl px-4 py-2.5 text-xs flex items-center justify-center gap-1.5 border border-slate-700"
                                >
                                  {latestSubmission ? (
                                    <><RotateCcw className="w-3.5 h-3.5" /> Retake</>
                                  ) : (
                                    <><Play className="w-3.5 h-3.5" /> Preview</>
                                  )}
                                </Button>

                                {/* Publish / Unpublish quick action */}
                                {isDraft ? (
                                  <Button
                                    onClick={async () => {
                                      if (test.questions.length === 0) {
                                        alert("Cannot publish: this paper has no questions. Open the editor to add questions first.");
                                        return;
                                      }
                                      if (!confirm(`Publish "${test.title}"? Students will be able to see it immediately.`)) return;
                                      const res = await toggleMockTestPublished(test.id, true);
                                      if (res.success) {
                                        window.location.reload();
                                      } else {
                                        alert("Failed to publish: " + res.error);
                                      }
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-4 py-2.5 text-xs flex items-center gap-1.5"
                                  >
                                    <SendHorizonal className="w-3.5 h-3.5" /> Publish
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={async () => {
                                      if (!confirm(`Unpublish "${test.title}"? Students will no longer see it. All existing submissions are preserved.`)) return;
                                      const res = await toggleMockTestPublished(test.id, false);
                                      if (res.success) {
                                        window.location.reload();
                                      } else {
                                        alert("Failed to unpublish: " + res.error);
                                      }
                                    }}
                                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded-xl px-4 py-2.5 text-xs flex items-center gap-1.5 border border-slate-600"
                                  >
                                    <EyeOff className="w-3.5 h-3.5" /> Unpublish
                                  </Button>
                                )}

                                {/* Edit & Delete */}
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
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-16 text-center text-slate-500 bg-slate-950/20 border border-slate-850 rounded-3xl space-y-2">
                      {isStaff && paperStatusTab === "drafts" ? (
                        <>
                          <EyeOff className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                          <p className="font-semibold text-slate-400">No drafts yet.</p>
                          <p className="text-xs text-slate-500">Papers you save without publishing will appear here.</p>
                        </>
                      ) : isStaff && paperStatusTab === "published" ? (
                        <>
                          <Eye className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                          <p className="text-slate-400">No published papers yet.</p>
                          <p className="text-xs text-slate-500">Create a mock paper and publish it to make it visible to students.</p>
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                          <p>No mock examinations scheduled for this program.</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()
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
                {(activeTest.questions[currentQuestionIdx]?.explanation || activeTest.questions[currentQuestionIdx]?.explanationImageUrl) && (
                  <div className="px-4 py-3 bg-blue-950/10 border border-blue-900/20 rounded-xl space-y-2">
                    <h5 className="text-[10px] font-bold text-blue-400 flex items-center gap-1 mb-1">
                      <HelpCircle className="w-3 h-3" /> Explanation
                    </h5>
                    {activeTest.questions[currentQuestionIdx].explanation && (
                      <p className="text-[12px] text-slate-400 leading-relaxed">
                        {activeTest.questions[currentQuestionIdx].explanation}
                      </p>
                    )}
                    {activeTest.questions[currentQuestionIdx].explanationImageUrl && (
                      <img
                        src={activeTest.questions[currentQuestionIdx].explanationImageUrl}
                        alt={activeTest.questions[currentQuestionIdx].explanation || "Explanation image"}
                        className="max-w-full rounded-lg border border-blue-900/30 object-contain max-h-80"
                      />
                    )}
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
              <h3 className="font-bold text-white text-lg flex items-center gap-2 flex-wrap">
                <FileText className="w-5 h-5 text-blue-500" />
                {editingTest ? "Edit Mock Paper" : "Create Mock Paper"}
                {editingTest && (
                  editingTest.isPublished ? (
                    <span className="text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Live — visible to students
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <EyeOff className="w-3 h-3" /> Draft — hidden from students
                    </span>
                  )
                )}
              </h3>
              <button onClick={() => setIsCmsOpen(false)} className="text-slate-450 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Target Course & Targeted Grade Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Target Course</label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => {
                      const newCourseId = e.target.value;
                      setFormData({
                        ...formData,
                        courseId: newCourseId,
                        isTrial: false,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-700"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Target Grade</label>
                  <select
                    value={formData.targetedGrade}
                    onChange={(e) => setFormData({ ...formData, targetedGrade: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-700"
                  >
                    <option value="ALL">All Grades (General)</option>
                    {STUDENT_GRADES.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title & Timing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Mock Paper Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Algebra Mid-Term Quiz A"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Timer (Mins)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.timeLimit}
                      onChange={(e) => setFormData({ ...formData, timeLimit: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Passing Grade (%)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={formData.passingScore}
                      onChange={(e) => setFormData({ ...formData, passingScore: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Folder Selector for Importing Questions */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-emerald-400" />
                    Select Question Bank Folder
                  </h4>
                </div>

                <div>
                  <select
                    value={selectedFolderForImport}
                    onChange={(e) => setSelectedFolderForImport(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="" disabled>-- Select Question Bank Folder --</option>
                    <option value="unfiled">
                      📁 All Unfiled Questions ({bankQuestions.filter(q => !(q as any).folderId).length} questions available)
                    </option>
                    {folders.map(f => {
                      const count = bankQuestions.filter(q => (q as any).folderId === f.id).length;
                      return (
                        <option key={f.id} value={f.id}>
                          📁 {f.name} ({count} questions available)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Folder Info & Import Action Box */}
                {selectedFolderForImport && (() => {
                  const folderQuestions = bankQuestions.filter(q => {
                    if (selectedFolderForImport === "unfiled") return !(q as any).folderId;
                    return (q as any).folderId === selectedFolderForImport;
                  });
                  const folderName = selectedFolderForImport === "unfiled"
                    ? "All Unfiled Questions"
                    : folders.find(f => f.id === selectedFolderForImport)?.name || "Folder";
                  const count = folderQuestions.length;

                  if (count === 0) {
                    return (
                      <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs flex items-center gap-2 font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>This folder does not contain any questions.</span>
                      </div>
                    );
                  }

                  const folderQuestionIds = folderQuestions.map(q => q.id);
                  const importedCountFromThisFolder = folderQuestionIds.filter(id => formData.selectedQuestionIds.includes(id)).length;
                  const isFullyImported = importedCountFromThisFolder === count;

                  return (
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">
                          📁 <strong>{folderName}</strong> contains <strong>{count} questions</strong>.
                        </span>
                        {importedCountFromThisFolder > 0 && (
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            ✓ {importedCountFromThisFolder} / {count} Added
                          </span>
                        )}
                      </div>

                      <Button
                        type="button"
                        onClick={() => {
                          const combined = Array.from(new Set([...formData.selectedQuestionIds, ...folderQuestionIds]));
                          setFormData(prev => ({ ...prev, selectedQuestionIds: combined }));
                        }}
                        disabled={isFullyImported}
                        className={`w-full font-bold rounded-xl text-xs py-2.5 flex items-center justify-center gap-2 transition ${
                          isFullyImported
                            ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white"
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        {isFullyImported
                          ? `✓ All ${count} Questions Already Imported`
                          : `Import Questions From Folder (${count} Questions)`}
                      </Button>
                    </div>
                  );
                })()}
              </div>

              {/* Options & Visibility */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                      className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-600"
                    />
                    <span className="text-xs text-slate-300 font-medium select-none">Publish Paper</span>
                  </label>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Content Visibility</label>
                  <select
                    value={
                      formData.isTrial
                        ? "TRIAL"
                        : formData.campProgramId
                        ? "CAMP"
                        : (courses.find((c) => c.id === formData.courseId) || activeCourse)?.type === "COMPETITION"
                        ? "COMPETITION"
                        : "REGULAR"
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "TRIAL") {
                        setFormData({
                          ...formData,
                          isTrial: true,
                          campProgramId: "",
                        });
                      } else if (val === "CAMP") {
                        setFormData({
                          ...formData,
                          isTrial: false,
                          campProgramId: initialCamps[0]?.id || "",
                        });
                      } else {
                        const currentCourse = courses.find((c) => c.id === formData.courseId) || activeCourse;
                        const matchingCourse = courses.find((c) => c.type === val);
                        setFormData({
                          ...formData,
                          isTrial: false,
                          campProgramId: "",
                          courseId: (currentCourse?.type === val ? formData.courseId : matchingCourse?.id) || formData.courseId,
                        });
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-700"
                  >
                    <option value="REGULAR">Regular Class</option>
                    <option value="COMPETITION">Competition Class</option>
                    {initialCamps.length > 0 && <option value="CAMP">Camp Program</option>}
                    <option value="TRIAL">Trial Content</option>
                  </select>
                </div>

                {Boolean(formData.campProgramId) && initialCamps.length > 0 && (
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Target Camp Program</label>
                    <select
                      value={formData.campProgramId}
                      onChange={(e) => setFormData({ ...formData, campProgramId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-700"
                    >
                      {initialCamps.map((camp) => (
                        <option key={camp.id} value={camp.id}>
                          {camp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Questions in Mock Paper (Review, Reorder & Remove) */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-white text-sm">Questions in Mock Paper</h4>
                    <p className="text-xs text-slate-400 font-medium">Total: {formData.selectedQuestionIds.length} Questions</p>
                  </div>
                  {formData.selectedQuestionIds.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setFormData({ ...formData, selectedQuestionIds: [] })}
                      className="text-red-400 hover:text-red-300 text-xs h-7 px-2"
                    >
                      Clear All Questions
                    </Button>
                  )}
                </div>

                {formData.selectedQuestionIds.length === 0 ? (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center text-slate-500 text-xs">
                    No questions added yet. Select a folder above and click &quot;Import Questions From Folder&quot;.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {formData.selectedQuestionIds.map((qid, idx) => {
                      const q = bankQuestions.find(bq => bq.id === qid);
                      if (!q) return null;
                      return (
                        <div key={qid} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="w-6 h-6 rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-white truncate font-medium">{q.questionText}</p>
                              <div className="flex items-center gap-2 mt-1 text-[10px]">
                                {(q as any).topic && <span className="text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{(q as any).topic}</span>}
                                <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Ans: {q.correctAnswer}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Move Up */}
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => {
                                const newArr = [...formData.selectedQuestionIds];
                                const temp = newArr[idx - 1];
                                newArr[idx - 1] = newArr[idx];
                                newArr[idx] = temp;
                                setFormData({ ...formData, selectedQuestionIds: newArr });
                              }}
                              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 rounded hover:bg-slate-800"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>

                            {/* Move Down */}
                            <button
                              type="button"
                              disabled={idx === formData.selectedQuestionIds.length - 1}
                              onClick={() => {
                                const newArr = [...formData.selectedQuestionIds];
                                const temp = newArr[idx + 1];
                                newArr[idx + 1] = newArr[idx];
                                newArr[idx] = temp;
                                setFormData({ ...formData, selectedQuestionIds: newArr });
                              }}
                              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 rounded hover:bg-slate-800"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Remove */}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  selectedQuestionIds: formData.selectedQuestionIds.filter(id => id !== qid)
                                });
                              }}
                              className="p-1.5 text-red-500/60 hover:text-red-400 rounded hover:bg-red-500/10 ml-1"
                              title="Remove from Mock Paper"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Optional Manual Individual Question Selection */}
              <div className="pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowManualBankPicker(!showManualBankPicker)}
                  className="text-xs text-slate-400 hover:text-white p-0 h-auto font-normal flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showManualBankPicker ? "Hide Individual Question Selector" : "Manually Select Individual Questions from Bank"}
                </Button>

                {showManualBankPicker && (
                  <div className="mt-3 space-y-2 max-h-[200px] overflow-y-auto pr-1 bg-slate-950 border border-slate-800 p-3 rounded-xl">
                    {bankQuestions.map((q) => {
                      const isSelected = formData.selectedQuestionIds.includes(q.id);
                      return (
                        <div
                          key={q.id}
                          className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition ${
                            isSelected ? "bg-blue-900/20 border-blue-600" : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
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
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-blue-600 mt-0.5 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate">{q.questionText}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCmsOpen(false)}
                  className="text-slate-400 hover:text-white rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={formData.selectedQuestionIds.length === 0}
                  className="bg-blue-650 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl px-5 text-xs flex items-center gap-1.5 font-bold"
                >
                  <Save className="w-4 h-4" /> {editingTest ? "Save Changes" : "Create Mock Paper"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
