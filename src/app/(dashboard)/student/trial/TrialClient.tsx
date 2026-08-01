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
  HelpCircle,
  Activity,
  CheckSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import InteractivePlayer from "@/components/InteractivePlayer";

interface TrialItem {
  id: string;
  type: string; // "VIDEO", "MATERIAL"
  title: string;
  url: string | null;
  description: string | null;
  isPublished: boolean;
  quizzes?: any[];
}

interface MockQuestion {
  id: string;
  questionText: string;
  options: string; // JSON Array string
  correctAnswer: string;
  explanation: string | null;
  imageUrl?: string | null;
}

interface MockTest {
  id: string;
  title: string;
  timeLimit: number;
  passingScore: number;
  isPublished: boolean;
  questions: MockQuestion[];
}

interface TrialClientProps {
  initialItems: TrialItem[];
  initialMockTests: MockTest[];
  hasEnrollment: boolean;
  userRole: string;
}

export default function TrialClient({ 
  initialItems, 
  initialMockTests,
  hasEnrollment, 
  userRole 
}: TrialClientProps) {
  const [items] = useState<TrialItem[]>(initialItems);
  const [mockTests] = useState<MockTest[]>(initialMockTests);
  const [activeTab, setActiveTab] = useState<"all" | "videos" | "materials" | "tests">("all");
  const [selectedVideo, setSelectedVideo] = useState<TrialItem | null>(null);

  // Quiz taking state
  const [activeTest, setActiveTest] = useState<MockTest | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{ score: number; isPassed: boolean; correctCount: number; totalQuestions: number } | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [timeSpentPerQuestion, setTimeSpentPerQuestion] = useState<Record<string, number>>({});
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);

  const isStaff = ["ADMIN", "TEACHER"].includes(userRole);

  useEffect(() => {
    if (activeTest && timeLeft > 0 && !testResult && !reviewMode) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSubmitTest(true);
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

  const handleSubmitTest = async (skipConfirm = false) => {
    if (!activeTest) return;
    
    // Calculate locally for immediate feedback in Trial
    const unansweredCount = activeTest.questions.filter(q => !testAnswers[q.id]).length;
    if (!skipConfirm && unansweredCount > 0) {
      const confirmed = confirm(`You have ${unansweredCount} unanswered question(s). Submit anyway?`);
      if (!confirmed) return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
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
    setTestResult({ 
       score, 
       isPassed,
       correctCount: correct,
       totalQuestions: activeTest.questions.length
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Filter items based on publication and staff status
  const publishedItems = isStaff ? items : items.filter((i) => i.isPublished);
  const videos = publishedItems.filter((i) => i.type === "VIDEO");
  const materials = publishedItems.filter((i) => i.type === "MATERIAL");
  const displayTests = isStaff ? mockTests : mockTests.filter((t) => t.isPublished);

  // If user is a student and is already enrolled
  if (hasEnrollment && !isStaff) {
    return (
      <div className="max-w-3xl mx-auto text-center space-y-6 py-12">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
          <BookOpen className="h-10 w-10 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">You Are Fully Enrolled!</h1>
        <p className="text-slate-400 max-w-md mx-auto">
          Since you are already enrolled in our academic program, you have full access to all classroom videos, resources, and live quizzes.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link href="/student/videos">
            <Button className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-semibold rounded-xl px-6 py-2.5">
              Go to Class Videos
            </Button>
          </Link>
          <Link href="/student/materials">
            <Button variant="outline" className="border-slate-800 text-slate-300 hover:text-white rounded-xl px-6 py-2.5">
              Access Materials
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const getEmbedUrl = (url: string | null): string => {
    if (!url) return "";
    let videoId = "";
    if (url.includes("/embed/")) {
      return url;
    }
    if (url.includes("youtube.com/watch")) {
      try {
        const urlParams = new URLSearchParams(url.split("?")[1]);
        videoId = urlParams.get("v") || "";
      } catch (e) {}
    } else if (url.includes("youtu.be/")) {
      const parts = url.split("/");
      videoId = parts[parts.length - 1].split("?")[0];
    }
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  // Render Video Item Component
  const renderVideoCard = (item: TrialItem) => (
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
            <span className="bg-amber-500/10 border border-amber-500/20 text-[#CA8E25] text-[9px] font-bold px-1.5 py-0.5 rounded">
              Trial Video
            </span>
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

  // Render Material Item Component
  const renderMaterialCard = (item: TrialItem) => (
    <div key={item.id} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-700 transition">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#CA8E25]/10 border border-[#CA8E25]/20 flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-[#CA8E25]" />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-white text-sm flex items-center gap-2 truncate">
            {item.title}
            <span className="bg-amber-500/10 border border-amber-500/20 text-[#CA8E25] text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0">
              Trial Doc
            </span>
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

  // Render Quiz Card Component
  const renderMockTestCard = (test: MockTest) => (
    <div key={test.id} className="bg-slate-950 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition">
      <div className="space-y-2">
        <h4 className="font-bold text-white text-base flex items-center gap-2">
          {test.title}
          <span className="bg-amber-500/10 border border-amber-500/20 text-[#CA8E25] text-[9px] font-bold px-1.5 py-0.5 rounded">
            Trial Quiz
          </span>
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
        <Button 
          onClick={() => handleStartTest(test)}
          className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-semibold rounded-xl px-5 py-2 text-xs flex items-center gap-1 w-full md:w-auto justify-center"
        >
          Start Quiz <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <Activity className="h-8 w-8 text-[#CA8E25]" />
            Free Trial Hub
          </h1>
          <p className="text-slate-400 mt-1">
            Experience our premium curriculum with free preview videos, materials, and practice exams.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
        <button
          onClick={() => { setActiveTab("all"); setActiveTest(null); }}
          className={`px-5 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
            activeTab === "all"
              ? "border-[#CA8E25] text-white font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <Activity className="w-4 h-4" /> All Trial Content
          </span>
        </button>
        <button
          onClick={() => { setActiveTab("videos"); setActiveTest(null); }}
          className={`px-5 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
            activeTab === "videos"
              ? "border-[#CA8E25] text-white font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <Video className="w-4 h-4" /> Videos
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
            <FileText className="w-4 h-4" /> Materials
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
            <Award className="w-4 h-4" /> Quizzes
          </span>
        </button>
      </div>

      {/* Contents */}
      <div className="space-y-6">
        {/* ALL Tab */}
        {activeTab === "all" && (
          <div className="space-y-10">
            {/* Trial Videos Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Video className="w-5 h-5 text-[#CA8E25]" /> Trial Videos
                </h3>
              </div>
              {videos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.slice(0, 3).map(renderVideoCard)}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 bg-slate-950/20 border border-slate-800/50 rounded-2xl text-sm">
                  No trial videos available yet.
                </div>
              )}
              {videos.length > 3 && (
                <div className="flex justify-end">
                  <Button 
                    variant="link" 
                    onClick={() => setActiveTab("videos")}
                    className="text-[#CA8E25] hover:text-[#D89A2B] text-xs font-semibold"
                  >
                    View All Videos ({videos.length}) →
                  </Button>
                </div>
              )}
            </div>

            {/* Trial Materials List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#CA8E25]" /> Learning Materials
                </h3>
              </div>
              {materials.length > 0 ? (
                <div className="space-y-4">
                  {materials.slice(0, 3).map(renderMaterialCard)}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 bg-slate-950/20 border border-slate-800/50 rounded-2xl text-sm">
                  No trial learning materials available yet.
                </div>
              )}
              {materials.length > 3 && (
                <div className="flex justify-end">
                  <Button 
                    variant="link" 
                    onClick={() => setActiveTab("materials")}
                    className="text-[#CA8E25] hover:text-[#D89A2B] text-xs font-semibold"
                  >
                    View All Materials ({materials.length}) →
                  </Button>
                </div>
              )}
            </div>

            {/* Quizzes List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#CA8E25]" /> Trial Quizzes
                </h3>
              </div>
              {displayTests.length > 0 ? (
                <div className="space-y-4">
                  {displayTests.slice(0, 3).map(renderMockTestCard)}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 bg-slate-950/20 border border-slate-800/50 rounded-2xl text-sm">
                  No trial quizzes available yet.
                </div>
              )}
              {displayTests.length > 3 && (
                <div className="flex justify-end">
                  <Button 
                    variant="link" 
                    onClick={() => setActiveTab("tests")}
                    className="text-[#CA8E25] hover:text-[#D89A2B] text-xs font-semibold"
                  >
                    View All Quizzes ({displayTests.length}) →
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIDEOS Tab */}
        {activeTab === "videos" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.length > 0 ? (
              videos.map(renderVideoCard)
            ) : (
              <div className="col-span-full py-12 text-center text-slate-500 bg-slate-950/20 border border-slate-800/50 rounded-2xl">
                No trial videos available yet.
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
                No trial learning materials available yet.
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
                No trial quizzes registered.
              </div>
            )}
          </div>
        )}

        {/* Live Quiz Session UI */}
        {activeTab === "tests" && activeTest && (
          <div className="max-w-[900px] mx-auto bg-[#090E17] p-8 md:p-12 rounded-[40px] shadow-2xl">
            {/* Top Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800/40">
              <div>
                 <h3 className="font-black text-white text-2xl tracking-wide">{activeTest.title}</h3>
                 <p className="text-sm text-slate-400 mt-1">
                   {reviewMode ? "Review Mode (Trial)" : testResult ? `Trial Exam Completed` : `Question ${currentQuestionIdx + 1} of ${activeTest.questions.length}`}
                 </p>
              </div>
              {(testResult || reviewMode) ? (
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => { setActiveTest(null); setTestResult(null); setReviewMode(false); }}
                   className="bg-[#1E293B]/50 hover:bg-[#1E293B] text-slate-300 hover:text-white rounded-xl px-5 py-2.5 h-auto text-[13px] font-bold"
                 >
                   <X className="w-4 h-4 mr-1.5" /> Exit
                 </Button>
              ) : (
                 <div className="flex items-center gap-2 bg-[#121827] border border-slate-800 rounded-full px-4 py-2 shadow-inner">
                   <Clock className="w-4 h-4 text-[#D89A2B]" />
                   <span className="text-white font-bold font-mono tracking-wider">{formatTime(timeLeft)}</span>
                 </div>
              )}
            </div>

            {!testResult ? (
              <div className="space-y-6">
                {/* Question Navigation Bar (Squares!) */}
                {!reviewMode && (
                  <div className="flex flex-wrap gap-3 mb-8 pb-8 border-b border-white/5">
                    {activeTest.questions.map((q, idx) => {
                       const isCurrent = idx === currentQuestionIdx;
                       const isAnswered = !!testAnswers[q.id];
                       return (
                          <button
                            key={q.id}
                            onClick={() => setCurrentQuestionIdx(idx)}
                            className={`w-11 h-11 rounded-[14px] text-sm font-black flex items-center justify-center transition-all ${
                               isCurrent
                                 ? "bg-[#D89A2B] text-black shadow-lg shadow-[#D89A2B]/20"
                                 : isAnswered 
                                   ? "bg-slate-700 text-white border border-slate-600 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]" 
                                   : "bg-[#1E293B] text-slate-400 hover:bg-slate-700 hover:text-white border border-transparent"
                            }`}
                          >
                             {idx + 1}
                          </button>
                       )
                    })}
                  </div>
                )}

                {/* Main Question Box */}
                <div className="bg-[#111827] border border-slate-800/80 rounded-[32px] p-8 md:p-10 shadow-xl">
                   {reviewMode && (
                     <div className="flex justify-between items-center mb-6">
                        <span className="text-xs text-slate-500 uppercase font-black tracking-widest">
                          Review Mode (Trial)
                        </span>
                        {(() => {
                          const q = activeTest.questions[currentQuestionIdx];
                          if (!q) return null;
                          const spent = timeSpentPerQuestion[q.id] || 0;
                          const min = Math.floor(spent / 60); const sec = spent % 60;
                          return (
                            <span className="text-[11px] uppercase font-bold tracking-widest px-4 py-2 rounded-xl text-slate-400 bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> {min}:{sec.toString().padStart(2, "00")}
                            </span>
                          );
                        })()}
                     </div>
                   )}

                   {/* Question text + image */}
                   <div>
                      <h2 className="text-white text-lg font-medium leading-relaxed">
                         {activeTest.questions[currentQuestionIdx]?.questionText}
                      </h2>
                      {activeTest.questions[currentQuestionIdx]?.imageUrl && (
                         <div className="mt-8 mb-4 inline-block">
                            <img
                               src={activeTest.questions[currentQuestionIdx].imageUrl!}
                               alt="Question Image"
                               className="max-w-[320px] w-full rounded-[24px] shadow-lg object-cover border border-slate-800/50"
                               onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                         </div>
                      )}
                   </div>

                   {/* Answer Options INSIDE the box */}
                   <div className="mt-10 space-y-3">
                      {(() => {
                         const q = activeTest.questions[currentQuestionIdx];
                         if (!q) return null;
                         let opts: string[] = [];
                         try { opts = JSON.parse(q.options); } catch { opts = []; }

                         if (reviewMode) {
                           const studentAns = testAnswers[q.id];
                           const correctAns = q.correctAnswer;
                           if (opts.length === 0) {
                             const isCorrect = studentAns?.toLowerCase().trim() === correctAns?.toLowerCase().trim();
                             return (
                               <div className="space-y-4 pt-2">
                                  <div className={`w-full p-5 rounded-[20px] border ${isCorrect ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-300" : "bg-[#121827] border-slate-800 text-slate-300"}`}>
                                     {isCorrect && <p className="text-[10px] uppercase font-bold mb-1 opacity-70">Your Answer (Correct)</p>}
                                     <p className="text-sm font-medium pl-2">{studentAns || "(No answer)"}</p>
                                  </div>
                                  {!isCorrect && (
                                    <div className="w-full p-5 rounded-[20px] border bg-emerald-950/20 border-emerald-900/40 text-emerald-300">
                                      <p className="text-[10px] uppercase font-bold mb-1 opacity-70">Correct Answer</p>
                                      <p className="text-sm font-medium pl-2">{correctAns}</p>
                                    </div>
                                  )}
                               </div>
                             );
                           }
                           
                           return (
                             <div className="space-y-3 pt-2">
                               {opts.map((opt, i) => {
                                 const isStudentChoice = studentAns === opt;
                                 const isCorrectChoice = correctAns === opt;
                                 let style = "bg-transparent border-slate-700/70 text-slate-300";
                                 if (isCorrectChoice) style = "bg-emerald-900/20 border-emerald-600/50 text-emerald-400";
                                 else if (isStudentChoice && !isCorrectChoice) style = "bg-rose-900/10 border-rose-800/40 text-rose-400 opacity-60";
                                 
                                 return (
                                   <div key={i} className={`w-full p-4 rounded-[16px] border text-sm font-medium flex items-center justify-between transition-colors ${style}`}>
                                     <div className="flex items-center gap-4 pl-1">
                                       <span>{opt}</span>
                                     </div>
                                     <div className="flex items-center gap-2 text-[10px] font-bold shrink-0">
                                       {isCorrectChoice && <span className="text-emerald-400 tracking-widest hidden sm:inline">✓ CORRECT</span>}
                                       {isStudentChoice && !isCorrectChoice && <span className="text-rose-400 tracking-widest hidden sm:inline opacity-70">✗ YOUR CHOICE</span>}
                                     </div>
                                   </div>
                                 );
                               })}
                             </div>
                           );
                         }

                         // Normal active quiz mode
                         return (
                           <div className="space-y-3 pt-2">
                             {opts.length > 0 ? opts.map((opt, i) => {
                               const isSelected = testAnswers[q.id] === opt;
                               return (
                                 <button
                                   key={i}
                                   onClick={() => handleSelectAnswer(q.id, opt)}
                                   className={`w-full text-left p-4 rounded-[16px] border text-[15px] font-medium transition-all duration-200 flex items-center justify-between ${
                                     isSelected
                                       ? "bg-slate-800 border-slate-600 text-white"
                                       : "bg-transparent border-slate-700/70 text-slate-300 hover:border-slate-500 hover:bg-slate-800/50"
                                   }`}
                                 >
                                   <div className="flex items-center gap-4 pl-1">
                                     <span>{opt}</span>
                                   </div>
                                 </button>
                               );
                             }) : (
                                <div className="pt-2">
                                  <input
                                    type="text"
                                    placeholder="Type your answer here..."
                                    value={testAnswers[q.id] || ""}
                                    onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700/70 rounded-[16px] px-5 py-4 text-[15px] text-white focus:outline-none focus:border-slate-500 placeholder:text-slate-600"
                                  />
                                </div>
                             )}
                           </div>
                         )
                      })()}
                   </div>
                </div>

                {/* Navigation buttons */}
                <div className="flex justify-between items-center mt-12 pt-4">
                  <Button
                    disabled={currentQuestionIdx === 0}
                    onClick={() => setCurrentQuestionIdx(currentQuestionIdx - 1)}
                    variant="outline"
                    className={`rounded-xl px-6 h-14 font-bold border-0 bg-[#1E293B] text-slate-400 hover:bg-slate-700 hover:text-white ${currentQuestionIdx === 0 ? "opacity-0 pointer-events-none" : ""}`}
                  >
                    ←
                  </Button>

                  {currentQuestionIdx < activeTest.questions.length - 1 ? (
                     <Button
                       onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                       className="bg-[#D89A2B] hover:bg-[#c98319] text-black rounded-xl px-12 h-14 font-extrabold ml-auto text-[15px]"
                     >
                       Next →
                     </Button>
                  ) : reviewMode ? (
                     <Button
                       onClick={() => { setActiveTest(null); setTestResult(null); setReviewMode(false); }}
                       className="bg-white hover:bg-slate-200 text-black rounded-xl px-10 h-14 font-black ml-auto text-[15px] uppercase tracking-wider"
                    >
                       Finish Review
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        const unanswered = activeTest.questions.filter(q => !testAnswers[q.id]).length;
                        if (unanswered > 0 && !confirm(`You have ${unanswered} unanswered questions. Submit anyway?`)) return;
                        handleSubmitTest(true);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl px-12 h-14 font-black tracking-widest ml-auto text-[15px] shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    >
                      SUBMIT
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              // ===== RESULTS SCREEN =====
              <div className="max-w-[700px] mx-auto space-y-10 pb-8 pt-4">
                {/* Checkmark and Pass Status */}
                <div className="flex flex-col items-center justify-center space-y-5">
                   <div className="w-[110px] h-[110px] rounded-full flex items-center justify-center bg-[#07241C] border-[4px] border-[#0E3D31] shadow-[0_0_60px_rgba(16,185,129,0.15)]">
                      <Check className="w-[50px] h-[50px] text-[#2DD4BF]" strokeWidth={3} />
                   </div>
                   <h2 className="text-[72px] font-black text-white leading-none tracking-tighter">{testResult.score}%</h2>
                   <div className={`px-4 py-1.5 rounded-lg bg-[#0A3225] flex items-center gap-2 border border-[#104D39]`}>
                      <CheckSquare className="w-4 h-4 text-[#2DD4BF]" /> 
                      <span className="text-[14px] font-black tracking-widest text-[#2DD4BF] uppercase">{testResult.isPassed ? "PASSED (TRIAL)" : "NOT PASSED"}</span>
                   </div>
                </div>

                {/* 4 Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                   <div className="bg-[#051F19] border border-[#0A3D31] rounded-[24px] p-5 text-center shadow-lg py-7">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-[#568579] mb-4">Correct</p>
                      <p className="text-[32px] font-black text-[#2DD4BF] leading-none">{testResult.correctCount} <span className="text-[#328D7D] text-xl font-bold mx-0.5">/</span> {testResult.totalQuestions}</p>
                   </div>
                   <div className="bg-[#1A0C16] border border-[#3E1A29] rounded-[24px] p-5 text-center shadow-lg py-7">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-[#88576C] mb-4">Wrong</p>
                      <p className="text-[32px] font-black text-[#F43F5E] leading-none">{testResult.totalQuestions - testResult.correctCount} <span className="text-[#9E3E58] text-xl font-bold mx-0.5">/</span> {testResult.totalQuestions}</p>
                   </div>
                   <div className="bg-[#1D170A] border border-[#3C3012] rounded-[24px] p-5 text-center shadow-lg py-7">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-[#887754] mb-4">Time Taken</p>
                      <p className="text-[32px] font-black text-[#FACC15] leading-none">
                         {Math.floor(totalTimeSpent / 60)}m {totalTimeSpent % 60}s
                      </p>
                   </div>
                   <div className="bg-[#1D170A] border border-[#3C3012] rounded-[24px] p-5 text-center shadow-lg py-7">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-[#887754] mb-4">Passing Score</p>
                      <p className="text-[32px] font-black text-[#D8A741] leading-none">{activeTest.passingScore}%</p>
                   </div>
                </div>

                {/* Time per question table */}
                <div className="bg-[#111827] border border-slate-800/80 rounded-[32px] p-8 shadow-xl mt-8">
                   <h5 className="text-[12px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 px-1">TIME PER QUESTION</h5>
                   <div className="space-y-[4px]">
                      {activeTest.questions.map((q, idx) => {
                         const spent = timeSpentPerQuestion[q.id] || 0;
                         const isCorrect = testAnswers[q.id]?.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim();
                         return (
                            <div key={q.id} className="flex items-center justify-between px-4 py-3.5 rounded-2xl hover:bg-[#1A2234] transition-colors bg-[#080d16] border border-slate-800/50">
                               <div className="text-[14px] text-slate-200 truncate pr-6 max-w-sm md:max-w-md font-medium flex items-center gap-3">
                                  <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black ${isCorrect ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                                    {isCorrect ? "✓" : "✗"}
                                  </span>
                                  Q{idx + 1}. {q.questionText}
                               </div>
                               <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-slate-400 text-[14px] font-bold font-mono tracking-wider text-right">
                                     {Math.floor(spent / 60)}:{Math.floor(spent % 60).toString().padStart(2, "0")}
                                  </span>
                               </div>
                            </div>
                         )
                      })}
                   </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-8 mt-8 border-t border-slate-800/40">
                   <Button
                      onClick={() => { setReviewMode(true); setCurrentQuestionIdx(0); }}
                      className="bg-[#D89A2B] hover:bg-[#c98319] text-black font-black tracking-wider rounded-xl px-10 py-7 h-auto text-[14px] uppercase shadow-[0_0_20px_rgba(216,154,43,0.3)] w-full sm:w-auto"
                   >
                      Review All Answers
                   </Button>
                   <Link href="/catalog" className="w-full sm:w-auto">
                     <Button
                        className="bg-white hover:bg-slate-200 text-black font-black tracking-wider rounded-xl px-10 py-7 h-auto text-[14px] uppercase w-full sm:w-auto"
                     >
                        View Course Programs
                     </Button>
                   </Link>
                </div>
              </div>
            )}
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
                className="text-slate-455 hover:text-white bg-slate-950 p-1.5 rounded-full border border-slate-800"
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
