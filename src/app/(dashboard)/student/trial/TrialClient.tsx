"use client";

import { useState } from "react";
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
  Activity
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
  const [testResult, setTestResult] = useState<{ score: number; isPassed: boolean } | null>(null);

  const isStaff = ["ADMIN", "TEACHER"].includes(userRole);

  const handleStartTest = (test: MockTest) => {
    setActiveTest(test);
    setCurrentQuestionIdx(0);
    setTestAnswers({});
    setTestResult(null);
  };

  const handleSelectAnswer = (questionId: string, option: string) => {
    setTestAnswers({ ...testAnswers, [questionId]: option });
  };

  const handleSubmitTest = async () => {
    if (!activeTest) return;
    
    // Calculate locally for immediate feedback in Trial
    let correct = 0;
    activeTest.questions.forEach((q) => {
      if (testAnswers[q.id] === q.correctAnswer) {
        correct++;
      }
    });

    const score = Math.round((correct / activeTest.questions.length) * 100);
    const isPassed = score >= activeTest.passingScore;
    setTestResult({ score, isPassed });
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
          <div className="bg-slate-950 border border-slate-800 p-6 md:p-8 rounded-3xl space-y-6 shadow-xl max-w-3xl mx-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-white text-lg">{activeTest.title}</h3>
                <p className="text-xs text-slate-400">Question {currentQuestionIdx + 1} of {activeTest.questions.length}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveTest(null)}
                className="text-slate-400 hover:text-white flex items-center gap-1"
              >
                <X className="w-4 h-4" /> Exit
              </Button>
            </div>

            {!testResult ? (
              <div className="space-y-6">
                {/* Question */}
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                  <p className="text-white text-base font-medium">
                    {activeTest.questions[currentQuestionIdx]?.questionText}
                  </p>
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
                      opts = ["Option A", "Option B", "Option C", "Option D"];
                    }
                    return opts.map((opt, i) => {
                      const isSelected = testAnswers[q.id] === opt;
                      return (
                        <button
                          key={i}
                          onClick={() => handleSelectAnswer(q.id, opt)}
                          className={`w-full text-left p-4 rounded-xl border text-sm font-medium transition flex items-center justify-between ${
                            isSelected
                              ? "bg-[#CA8E25]/10 border-[#CA8E25] text-white"
                              : "bg-slate-900 border-slate-850 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <span>{opt}</span>
                          {isSelected && <Check className="w-4 h-4 text-[#CA8E25]" />}
                        </button>
                      );
                    });
                  })()}
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-850">
                  <Button
                    disabled={currentQuestionIdx === 0}
                    onClick={() => setCurrentQuestionIdx(currentQuestionIdx - 1)}
                    variant="outline"
                    className="border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs px-4"
                  >
                    Previous
                  </Button>

                  {currentQuestionIdx < activeTest.questions.length - 1 ? (
                    <Button
                      onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                      className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs px-5"
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmitTest}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs px-6 font-bold"
                    >
                      Submit Exam
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              // Results UI
              <div className="text-center py-6 space-y-6 max-w-md mx-auto">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border ${
                  testResult.isPassed 
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" 
                    : "bg-red-500/10 border-red-500/25 text-red-400"
                }`}>
                  {testResult.isPassed ? <Check className="w-8 h-8" /> : <X className="w-8 h-8" />}
                </div>

                <div>
                  <h4 className="text-2xl font-black text-white">{testResult.score}%</h4>
                  <p className={`text-sm font-bold mt-1 ${testResult.isPassed ? "text-emerald-450" : "text-red-450"}`}>
                    {testResult.isPassed ? "PASSED (Trial)" : "NOT PASSED (Trial)"}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    Required Passing Score: {activeTest.passingScore}%
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-850 space-y-3">
                  <p className="text-xs text-slate-450">
                    Want to unlock full quizzes and receive complete review logs? Register for a premium course to get full credentials!
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      onClick={() => setActiveTest(null)} 
                      variant="outline" 
                      className="border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs"
                    >
                      Back to Trial Hub
                    </Button>
                    <Link href="/catalog">
                      <Button className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-semibold rounded-xl text-xs">
                        View Course Programs
                      </Button>
                    </Link>
                  </div>
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
