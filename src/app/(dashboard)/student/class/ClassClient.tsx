"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Play, 
  FileText, 
  Award, 
  Check, 
  X, 
  BookOpen, 
  Video, 
  ExternalLink,
  Clock,
  ChevronRight,
  Activity,
  Lock,
  Sparkles,
  ArrowLeft,
  Trophy,
  CheckSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import InteractivePlayer from "@/components/InteractivePlayer";
import { submitMockTest } from "@/actions/dashboard";

interface ClassItem {
  id: string;
  type: string; // "VIDEO", "MATERIAL"
  title: string;
  url: string | null;
  description: string | null;
  isPublished: boolean;
  courseType?: string; // "REGULAR", "COMPETITION", etc.
  quizzes?: any[];
}

interface MockQuestion {
  id: string;
  questionText: string;
  options: string;
  correctAnswer: string;
  explanation: string | null;
  explanationImageUrl?: string | null;
  imageUrl?: string | null;
}

interface MockTest {
  id: string;
  title: string;
  timeLimit: number;
  passingScore: number;
  isPublished: boolean;
  courseType?: string;
  questions: MockQuestion[];
  submissions?: any[];
}

interface ClassClientProps {
  initialItems: ClassItem[];
  initialMockTests: MockTest[];
  enrolledTypes: string[]; // e.g. ["REGULAR"], ["COMPETITION"], or both
  userRole: string;
}

const CLASS_CATEGORIES = [
  {
    type: "REGULAR",
    title: "Regular Class",
    badge: "Standard Curriculum",
    description: "Access core academic modules, recorded interactive lessons, practice materials, and foundational quizzes.",
    icon: BookOpen,
    gradient: "from-blue-600/20 via-cyan-500/10 to-transparent border-blue-500/30 hover:border-blue-400/50",
    badgeColor: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  },
  {
    type: "COMPETITION",
    title: "Competition Class",
    badge: "Olympiad & Advanced",
    description: "Advanced problem solving, competition-grade mock exams, past paper walkthroughs, and elite coaching materials.",
    icon: Trophy,
    gradient: "from-[#CA8E25]/20 via-amber-600/10 to-transparent border-[#CA8E25]/30 hover:border-[#CA8E25]/50",
    badgeColor: "bg-amber-500/10 border-amber-500/20 text-[#CA8E25]",
  },
  // Future extension cards can be easily added here (e.g. PRIVATE, SEMI_PRIVATE)
];

export default function ClassClient({ 
  initialItems, 
  initialMockTests,
  enrolledTypes, 
  userRole 
}: ClassClientProps) {
  const [items] = useState<ClassItem[]>(initialItems);
  const [mockTests, setMockTests] = useState<MockTest[]>(initialMockTests);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"videos" | "materials" | "tests">("videos");
  const [selectedVideo, setSelectedVideo] = useState<ClassItem | null>(null);

  // Quiz session state
  const [activeTest, setActiveTest] = useState<MockTest | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{ score: number; isPassed: boolean; totalQuestions: number; correctCount: number; id?: string } | null>(null);

  const [reviewMode, setReviewMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [timeSpentPerQuestion, setTimeSpentPerQuestion] = useState<Record<string, number>>({});
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);

  const isStaff = ["ADMIN", "TEACHER", "OWNER", "CO_OWNER"].includes(userRole);

  const isCategoryUnlocked = (catType: string) => {
    if (isStaff) return true;
    return enrolledTypes.includes(catType.toUpperCase());
  };

  useEffect(() => {
    if (activeTest && timeLeft > 0 && !testResult && !reviewMode) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSubmitTest();
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
    setTotalTimeSpent(0);
    setTimeLeft(test.timeLimit * 60);
    setTestResult(null);
    setReviewMode(false);
  };

  const handleSelectAnswer = (questionId: string, option: string) => {
    setTestAnswers({ ...testAnswers, [questionId]: option });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitTest = async (skipConfirm = false) => {
    if (!activeTest || isSubmitting) return;
    
    const unansweredCount = activeTest.questions.filter(q => !testAnswers[q.id]).length;
    if (!skipConfirm && unansweredCount > 0) {
      const confirmed = confirm(`You have ${unansweredCount} unanswered question(s). Submit anyway?`);
      if (!confirmed) return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setIsSubmitting(true);
    const elapsed = activeTest.timeLimit * 60 - timeLeft;
    setTotalTimeSpent(elapsed);
    
    let correct = 0;
    activeTest.questions.forEach((q) => {
      if (testAnswers[q.id]?.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim()) {
        correct++;
      }
    });

    const score = Math.round((correct / activeTest.questions.length) * 100);
    const isPassed = score >= activeTest.passingScore;
    
    const res = await submitMockTest(activeTest.id, testAnswers, timeSpentPerQuestion);
    setIsSubmitting(false);

    if (res.success && res.submission) {
      setTestResult({ 
         score, 
         isPassed,
         id: res.submission.id,
         correctCount: correct,
         totalQuestions: activeTest.questions.length
      });

      // Update submissions list locally
      setMockTests((prevTests: MockTest[]) => prevTests.map((t: MockTest) => {
        if (t.id === activeTest.id) {
          return {
            ...t,
            submissions: [res.submission as any, ...(t.submissions || [])]
          };
        }
        return t;
      }));
    } else {
      alert(res.error || "Failed to submit test. Please check connection.");
      // Render locally as fallback anyway so they aren't stuck
      setTestResult({ 
         score, 
         isPassed,
         id: "local_id",
         correctCount: correct,
         totalQuestions: activeTest.questions.length
      });
    }
  };

  const handleReviewTest = (test: MockTest) => {
    const submission = test.submissions && test.submissions[0];
    if (!submission) return;

    let parsedAnswers = {};
    let parsedTimeSpent = {};
    try { parsedAnswers = JSON.parse(submission.answers || "{}"); } catch (e) {}
    try { submission.timeSpent && (parsedTimeSpent = JSON.parse(submission.timeSpent || "{}")); } catch (e) {}

    let correctCount = 0;
    test.questions.forEach((q) => {
      const studentAns = (parsedAnswers as Record<string, string>)[q.id];
      if (studentAns?.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim()) {
        correctCount++;
      }
    });

    const calculatedTotal = Object.values(parsedTimeSpent as Record<string, number>).reduce((sum, val) => sum + val, 0);

    setActiveTest(test);
    setCurrentQuestionIdx(0);
    setTestAnswers(parsedAnswers as Record<string, string>);
    setTimeSpentPerQuestion(parsedTimeSpent as Record<string, number>);
    setTotalTimeSpent(calculatedTotal || submission.totalCompletionTime || 0);
    setTestResult({
      score: submission.score,
      isPassed: submission.isPassed,
      id: submission.id,
      correctCount: correctCount,
      totalQuestions: test.questions.length
    });
    setReviewMode(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Filter items based on selected category & staff status
  const categoryFilteredItems = items.filter(item => {
    if (!selectedCategory) return true;
    return (item.courseType || "REGULAR") === selectedCategory;
  });

  const publishedItems = isStaff ? categoryFilteredItems : categoryFilteredItems.filter((i) => i.isPublished);
  const videos = publishedItems.filter((i) => i.type === "VIDEO");
  const materials = publishedItems.filter((i) => i.type === "MATERIAL");

  const categoryFilteredTests = mockTests.filter(test => {
    if (!selectedCategory) return true;
    return (test.courseType || "REGULAR") === selectedCategory;
  });
  const displayTests = isStaff ? categoryFilteredTests : categoryFilteredTests.filter((t) => t.isPublished);

  // Render Card Components
  const renderVideoCard = (item: ClassItem) => (
    <div key={item.id} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between hover:border-slate-700 transition">
      <div className="p-5 space-y-3">
        <div 
          onClick={() => setSelectedVideo(item)}
          className="w-full aspect-video bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800 relative group overflow-hidden cursor-pointer"
        >
          <Play className="w-12 h-12 text-[#CA8E25] group-hover:scale-110 transition" />
          {!item.isPublished && (
            <span className="absolute top-2 left-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded">
              Draft
            </span>
          )}
        </div>
        <div>
          <h4 
            onClick={() => setSelectedVideo(item)}
            className="font-bold text-white text-base line-clamp-1 flex items-center gap-2 cursor-pointer hover:text-[#CA8E25] transition"
          >
            {item.title}
          </h4>
          <p className="text-slate-400 text-xs mt-1 line-clamp-2">{item.description || "No description provided."}</p>
        </div>
      </div>
      <div className="px-5 pb-5 pt-2">
        <Button 
          onClick={() => setSelectedVideo(item)}
          className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl text-xs py-1.5 flex items-center justify-center gap-1"
        >
          Watch Now <Play className="w-3.5 h-3.5 fill-current" />
        </Button>
      </div>
    </div>
  );

  const renderMaterialCard = (item: ClassItem) => (
    <div key={item.id} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-700 transition">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#CA8E25]/10 border border-[#CA8E25]/20 flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-[#CA8E25]" />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-white text-sm flex items-center gap-2 truncate">
            {item.title}
            {!item.isPublished && (
              <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0">
                Draft
              </span>
            )}
          </h4>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{item.description || "Downloadable PDF / Study Guide"}</p>
        </div>
      </div>
      <a href={item.url || "#"} target="_blank" rel="noopener noreferrer" className="shrink-0">
        <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs py-1.5 px-4 flex items-center gap-1">
          Download <ExternalLink className="w-3 h-3" />
        </Button>
      </a>
    </div>
  );

  const renderMockTestCard = (test: MockTest) => (
    <div key={test.id} className="bg-slate-950 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition">
      <div className="space-y-2">
        <h4 className="font-bold text-white text-base flex items-center gap-2">
          {test.title}
          {!test.isPublished && (
            <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded">
              Draft
            </span>
          )}
        </h4>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5 text-[#CA8E25]" /> {test.timeLimit} Minutes
          </span>
          <span>•</span>
          <span>{test.questions.length} Questions</span>
          <span>•</span>
          <span>Passing Score: {test.passingScore}%</span>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {test.submissions && test.submissions.length > 0 && !isStaff ? (
            <Button
              onClick={() => handleReviewTest(test)}
              className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl px-5 py-2.5 text-xs flex items-center justify-center gap-1.5 border border-slate-700"
            >
              <FileText className="w-3.5 h-3.5" /> Review Quiz
            </Button>
          ) : (
            <Button 
              onClick={() => handleStartTest(test)}
              className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-semibold rounded-xl px-5 py-2 text-xs flex items-center gap-1 w-full md:w-auto justify-center"
            >
              Start Quiz <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  // 1. CLASS SELECTION VIEW (when no category selected)
  if (!selectedCategory) {
    return (
      <div className="space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-[#CA8E25]" />
            Class
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Select a class category to access your learning modules, videos, materials, and quizzes.
          </p>
        </div>

        {/* Scalable Class Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CLASS_CATEGORIES.map((cat) => {
            const unlocked = isCategoryUnlocked(cat.type);
            const IconComponent = cat.icon;

            return (
              <div 
                key={cat.type}
                className={`bg-slate-950 border rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                  unlocked 
                    ? `bg-gradient-to-br ${cat.gradient} shadow-lg cursor-pointer group`
                    : "border-slate-850 opacity-85 bg-slate-950/60"
                }`}
                onClick={() => {
                  if (unlocked) {
                    setSelectedCategory(cat.type);
                    setActiveTab("videos");
                  }
                }}
              >
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${cat.badgeColor}`}>
                      {cat.badge}
                    </span>

                    {unlocked ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                        <Check className="w-3.5 h-3.5" /> ✅ {cat.title} Unlocked
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                        <Lock className="w-3.5 h-3.5" /> 🔒 Locked
                      </span>
                    )}
                  </div>

                  {/* Header Title & Description */}
                  <div className="flex items-start gap-4">
                    <div className={`p-3.5 rounded-2xl border shrink-0 ${
                      unlocked ? "bg-slate-900 border-slate-700 text-[#CA8E25]" : "bg-slate-900/50 border-slate-800 text-slate-500"
                    }`}>
                      <IconComponent className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-[#CA8E25] transition flex items-center gap-2">
                        {cat.title}
                      </h3>
                      <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  {/* Lock Notice Message */}
                  {!unlocked && (
                    <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2 mt-4">
                      <p className="text-xs text-amber-300 flex items-start gap-2">
                        <Lock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                        <span>
                          {enrolledTypes.length > 0 
                            ? `You are currently enrolled in ${enrolledTypes.join(", ")} Class. Register for ${cat.title} to unlock this content.`
                            : `You are not currently enrolled in ${cat.title}. Register to unlock this class.`}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-6 mt-6 border-t border-slate-900 flex items-center justify-between">
                  {unlocked ? (
                    <Button 
                      className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl py-2 text-xs flex items-center justify-center gap-2"
                    >
                      Enter {cat.title} <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Link href="/student/enroll" className="w-full">
                      <Button 
                        variant="outline"
                        className="w-full border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl py-2 text-xs flex items-center justify-center gap-2"
                      >
                        Enroll Now to Unlock <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. INSIDE UNLOCKED CLASS VIEW
  const currentCategoryObj = CLASS_CATEGORIES.find(c => c.type === selectedCategory);

  return (
    <div className="space-y-8">
      {/* Back Switcher Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <button 
            onClick={() => { setSelectedCategory(null); setActiveTest(null); }}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 mb-2 font-medium transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to All Classes
          </button>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            {currentCategoryObj?.title || selectedCategory}
            <span className="text-xs font-bold px-3 py-1 rounded-full border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
              ✅ Unlocked
            </span>
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Access learning videos, materials, and quizzes for {currentCategoryObj?.title}.
          </p>
        </div>
        <Button
          onClick={() => setSelectedCategory(null)}
          variant="outline"
          className="border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs"
        >
          Switch Class
        </Button>
      </div>

      {/* Learning Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">

        <button
          onClick={() => { setActiveTab("videos"); setActiveTest(null); }}
          className={`px-5 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
            activeTab === "videos"
              ? "border-[#CA8E25] text-white font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <Video className="w-4 h-4" /> Videos ({videos.length})
          </span>
        </button>
        <button
          onClick={() => { setActiveTab("materials"); setActiveTest(null); }}
          className={`px-5 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
            activeTab === "materials"
              ? "border-[#CA8E25] text-white font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Learning Materials ({materials.length})
          </span>
        </button>
        <button
          onClick={() => { setActiveTab("tests"); }}
          className={`px-5 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
            activeTab === "tests"
              ? "border-[#CA8E25] text-white font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <Award className="w-4 h-4" /> Quiz ({displayTests.length})
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">

        {/* VIDEOS Tab */}
        {activeTab === "videos" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.length > 0 ? (
              videos.map(renderVideoCard)
            ) : (
              <div className="col-span-full py-12 text-center text-slate-500 bg-slate-950/20 border border-slate-800/50 rounded-2xl">
                No videos available for this class yet.
              </div>
            )}
          </div>
        )}

        {/* MATERIALS Tab */}
        {activeTab === "materials" && (
          <div className="space-y-4">
            {materials.length > 0 ? (
              materials.map(renderMaterialCard)
            ) : (
              <div className="py-12 text-center text-slate-500 bg-slate-950/20 border border-slate-800/50 rounded-2xl">
                No learning materials available for this class yet.
              </div>
            )}
          </div>
        )}

        {/* TESTS Tab - Selection View */}
        {activeTab === "tests" && !activeTest && (
          <div className="space-y-4">
            {displayTests.length > 0 ? (
              displayTests.map(renderMockTestCard)
            ) : (
              <div className="py-12 text-center text-slate-500 bg-slate-950/20 border border-slate-800/50 rounded-2xl">
                No quizzes available for this class yet.
              </div>
            )}
          </div>
        )}

        {/* Live Quiz Session UI */}
        {activeTab === "tests" && activeTest && (
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
                    {reviewMode ? "Review Mode — Read Only" : testResult ? "Quiz Complete" : `Question ${currentQuestionIdx + 1} / ${activeTest.questions.length}`}
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
                    onClick={() => {
                      if (reviewMode) {
                        setReviewMode(false);
                      } else {
                        setActiveTest(null);
                        setTestResult(null);
                        setReviewMode(false);
                        setActiveTab("tests");
                      }
                    }}
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
                    {activeTest.questions[currentQuestionIdx]?.imageUrl && (
                      <img
                        src={activeTest.questions[currentQuestionIdx].imageUrl!}
                        alt="Question"
                        className="mt-3 max-h-48 rounded-lg border border-slate-800"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
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
                        className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black rounded-lg text-[11px] h-8 px-4 font-bold"
                      >
                        Next →
                      </Button>
                    ) : (
                      <Button
                        disabled={isSubmitting}
                        onClick={() => {
                          const unanswered = activeTest.questions.filter(q => !testAnswers[q.id]).length;
                          if (unanswered > 0 && !confirm(`You have ${unanswered} unanswered questions. Submit anyway?`)) return;
                          handleSubmitTest(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] h-8 px-5 font-bold"
                      >
                        {isSubmitting ? "Submitting..." : "Submit Answers"}
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
                        {parseFloat(testResult.score.toFixed(2))}%
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
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-xl p-3 text-center">
                      <p className="text-lg font-black text-emerald-400">{testResult.correctCount}</p>
                      <p className="text-[10px] text-emerald-400/70 font-semibold uppercase tracking-wider">Correct</p>
                    </div>
                    <div className="bg-red-500/8 border border-red-500/15 rounded-xl p-3 text-center">
                      <p className="text-lg font-black text-red-400">{testResult.totalQuestions - testResult.correctCount}</p>
                      <p className="text-[10px] text-red-400/70 font-semibold uppercase tracking-wider">Wrong</p>
                    </div>
                    <div className="bg-amber-500/8 border border-amber-500/15 rounded-xl p-3 text-center">
                      <p className="text-lg font-black text-amber-400">{Math.floor(totalTimeSpent / 60)}:{(totalTimeSpent % 60).toString().padStart(2, "0")}</p>
                      <p className="text-[10px] text-amber-400/70 font-semibold uppercase tracking-wider">Time</p>
                    </div>
                  </div>

                  {/* Time Per Question */}
                  <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 space-y-1.5">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Time Per Question</h5>
                    {activeTest.questions.map((q, idx) => {
                      const spent = timeSpentPerQuestion[q.id] || 0;
                      const isCorrect = testAnswers[q.id]?.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim();
                      return (
                        <div key={q.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800/40 text-[12px]">
                          <div className="flex items-center gap-2 text-slate-300 truncate max-w-[70%]">
                            <span className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center shrink-0 ${
                              isCorrect ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                            }`}>{isCorrect ? "✓" : "✗"}</span>
                            <span className="truncate">Q{idx + 1}. {q.questionText}</span>
                          </div>
                          <span className="text-slate-500 font-mono text-[11px] shrink-0">
                            {Math.floor(spent / 60)}:{(spent % 60).toString().padStart(2, "0")}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-center pt-3 border-t border-slate-800/60">
                    <Button
                      onClick={() => { setReviewMode(true); setCurrentQuestionIdx(0); }}
                      className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-semibold rounded-lg text-[11px] h-8 px-4 font-bold"
                    >
                      Review Quiz
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

                  {/* Question + Status Badges */}
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
                    {activeTest.questions[currentQuestionIdx]?.imageUrl && (
                      <img
                        src={activeTest.questions[currentQuestionIdx].imageUrl!}
                        alt="Question"
                        className="mt-2 max-h-44 rounded-lg border border-slate-800"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
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
                              <div className="px-4 py-3 rounded-xl border bg-amber-500/10 border-amber-500/25 text-amber-400 text-[13px] font-medium">
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
                          style = "bg-amber-500/10 border-amber-500/25 text-amber-400";
                          badge = <span className="text-[9px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded">CORRECT ANSWER</span>;
                        } else if (isStudentChoice) {
                          style = "bg-red-500/10 border-red-500/25 text-red-400";
                          badge = <span className="text-[9px] bg-red-500/20 text-red-400 font-bold px-1.5 py-0.5 rounded">✗ YOUR ANSWER</span>;
                        }

                        return (
                          <div key={i} className={`px-4 py-3 rounded-xl border text-[13px] font-medium flex items-center justify-between gap-3 ${style}`}>
                            <div className="flex items-center gap-2.5">
                              <span className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center border shrink-0 ${
                                (isCorrectChoice && isStudentChoice) ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                                : isCorrectChoice ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
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
                        <BookOpen className="w-3 h-3" /> Explanation
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
                        onClick={() => { setReviewMode(false); }}
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
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-4 relative">
            <div className="flex justify-between items-center pb-2">
              <h3 className="font-bold text-white text-lg truncate flex items-center gap-2">
                <Video className="w-5 h-5 text-[#CA8E25]" />
                {selectedVideo.title}
              </h3>
              <button 
                onClick={() => setSelectedVideo(null)} 
                className="text-slate-400 hover:text-white bg-slate-950 p-1.5 rounded-full border border-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="w-full aspect-video bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden relative flex items-center justify-center">
              {selectedVideo.url ? (
                <InteractivePlayer
                  videoUrl={selectedVideo.url}
                  title={selectedVideo.title}
                  quizzes={selectedVideo.quizzes || []}
                />
              ) : (
                <p className="text-slate-500 text-sm">No video URL provided.</p>
              )}
            </div>

            {selectedVideo.description && (
              <p className="text-slate-400 text-xs px-2 pb-2 leading-relaxed">
                {selectedVideo.description}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
