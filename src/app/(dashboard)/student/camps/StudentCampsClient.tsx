"use client";

import { useState } from "react";
import { 
  Play, 
  FileText, 
  Award, 
  Check, 
  BookOpen,
  Calendar,
  ExternalLink,
  Clock,
  ChevronRight,
  Activity,
  Lock,
  Sparkles,
  ArrowLeft,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import InteractivePlayer from "@/components/InteractivePlayer";

interface CampProgram {
  id: string;
  name: string;
  description: string;
  learningObjectives?: string;
  topicsCovered?: string;
  scheduleInfo?: string;
  instructor?: string;
  duration?: string;
  startDate: Date;
  endDate: Date;
}

interface ClassItem {
  id: string;
  type: string; // "VIDEO", "MATERIAL"
  title: string;
  url: string | null;
  description: string | null;
  isPublished: boolean;
  campProgramId?: string;
  quizzes?: any[];
}

interface MockQuestion {
  id: string;
  questionText: string;
  options: string;
  correctAnswer: string;
  explanation: string | null;
}

interface MockSubmission {
  id: string;
  score: number;
  isPassed: boolean;
}

interface MockTest {
  id: string;
  title: string;
  timeLimit: number;
  passingScore: number;
  isPublished: boolean;
  campProgramId?: string;
  questions: MockQuestion[];
  submissions?: MockSubmission[];
}

interface StudentCampsClientProps {
  enrolledCamps: CampProgram[];
  allCamps: CampProgram[];
  initialItems: ClassItem[];
  initialMockTests: MockTest[];
  userRole: string;
}

export default function StudentCampsClient({ 
  enrolledCamps, 
  allCamps,
  initialItems, 
  initialMockTests,
  userRole 
}: StudentCampsClientProps) {
  const [selectedCampId, setSelectedCampId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "videos" | "materials" | "tests">("all");
  const [selectedVideo, setSelectedVideo] = useState<ClassItem | null>(null);

  const isStaff = ["ADMIN", "TEACHER", "OWNER", "CO_OWNER"].includes(userRole);

  const isCampUnlocked = (campId: string) => {
    if (isStaff) return true;
    return enrolledCamps.some(c => c.id === campId);
  };

  const getActiveCamp = () => {
    return allCamps.find(c => c.id === selectedCampId) || enrolledCamps.find(c => c.id === selectedCampId);
  };

  // Filter items based on selected camp
  const campFilteredItems = initialItems.filter(item => {
    if (!selectedCampId) return false;
    return item.campProgramId === selectedCampId;
  });

  const publishedItems = isStaff ? campFilteredItems : campFilteredItems.filter((i) => i.isPublished);
  const videos = publishedItems.filter((i) => i.type === "VIDEO");
  const materials = publishedItems.filter((i) => i.type === "MATERIAL");

  const campFilteredTests = initialMockTests.filter(test => {
    if (!selectedCampId) return false;
    return test.campProgramId === selectedCampId;
  });
  const displayTests = isStaff ? campFilteredTests : campFilteredTests.filter((t) => t.isPublished);

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
          <p className="text-xs text-slate-400 mt-0.5 truncate">{item.description || "Downloadable Resource"}</p>
        </div>
      </div>
      <a href={item.url || "#"} target="_blank" rel="noopener noreferrer" className="shrink-0">
        <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs py-1.5 px-4 flex items-center gap-1">
          Download <ExternalLink className="w-3 h-3" />
        </Button>
      </a>
    </div>
  );

  const renderMockTestCard = (test: MockTest) => {
    const latestSubmission = test.submissions && test.submissions.length > 0 ? test.submissions[0] : null;
    return (
      <div key={test.id} className="bg-slate-950 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-white text-base flex items-center gap-2">
              {test.title}
            </h4>
            {!test.isPublished && (
              <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded">
                Draft
              </span>
            )}
            {latestSubmission && (
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md border ${
                latestSubmission.isPassed ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}>
                {latestSubmission.isPassed ? "PASSED" : "FAILED"} ({latestSubmission.score}%)
              </span>
            )}
          </div>
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
           <Link href="/student/mock-test">
             <Button 
               className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-semibold rounded-xl px-5 py-2 text-xs flex items-center gap-1 w-full md:w-auto justify-center"
             >
               Start Quiz <ChevronRight className="w-4 h-4" />
             </Button>
           </Link>
        </div>
      </div>
    );
  };

  // 1. CAMP SELECTION VIEW (when no camp selected)
  if (!selectedCampId) {
    // Merge enrolled + un-enrolled camps, avoiding duplicates
    const displayedCamps = [...enrolledCamps];
    allCamps.forEach(c => {
      if (!displayedCamps.find(ec => ec.id === c.id)) {
        displayedCamps.push(c);
      }
    });

    return (
      <div className="space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Calendar className="h-8 w-8 text-[#CA8E25]" />
            Camp Programs
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Select a camp to access modules, videos, materials, and quizzes.
          </p>
        </div>

        {/* Camp Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedCamps.length === 0 ? (
             <div className="md:col-span-2 py-20 text-center text-slate-500 bg-slate-950/20 border border-slate-850 rounded-2xl">
              <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p>No active camp programs available at the moment.</p>
            </div>
          ) : (
            displayedCamps.map((camp) => {
              const unlocked = isCampUnlocked(camp.id);
              return (
                <div 
                  key={camp.id}
                  className={`bg-slate-950 border rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                    unlocked 
                      ? "bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-transparent border-indigo-500/30 hover:border-indigo-400/50 shadow-lg cursor-pointer group"
                      : "border-slate-850 opacity-85 bg-slate-950/60"
                  }`}
                  onClick={() => {
                    if (unlocked) {
                      setSelectedCampId(camp.id);
                      setActiveTab("all");
                    }
                  }}
                >
                  <div className="space-y-4">
                    {/* Status Banner */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-3 py-1 rounded-full border bg-indigo-500/10 border-indigo-500/20 text-indigo-400">
                        Holiday Camp
                      </span>

                      {unlocked ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                          <Check className="w-3.5 h-3.5" /> ✅ Enrolled
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
                        unlocked ? "bg-slate-900 border-slate-700 text-indigo-400" : "bg-slate-900/50 border-slate-800 text-slate-500"
                      }`}>
                        <Calendar className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition flex items-center gap-2">
                          {camp.name}
                        </h3>
                        <p className="text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed">
                          {camp.description}
                        </p>
                      </div>
                    </div>

                    {/* Lock Notice Message */}
                    {!unlocked && (
                      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2 mt-4">
                        <p className="text-xs text-amber-300 flex items-start gap-2">
                          <Lock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                          <span>
                            You are not currently enrolled in {camp.name}. Register to unlock this content.
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer Action */}
                  <div className="pt-6 mt-6 border-t border-slate-900 flex items-center justify-between">
                    {unlocked ? (
                      <Button 
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl py-2 text-xs flex items-center justify-center gap-2"
                      >
                        Enter Camp <ChevronRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Link href={`/student/enroll`} className="w-full">
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
            })
          )}
        </div>
      </div>
    );
  }

  // 2. INSIDE UNLOCKED CAMP VIEW
  const activeCampObj = getActiveCamp();

  return (
    <div className="space-y-8">
      {/* Back Switcher Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <button 
            onClick={() => { setSelectedCampId(null); setSelectedVideo(null); }}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 mb-2 font-medium transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Camps
          </button>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            {activeCampObj?.name}
            <span className="text-xs font-bold px-3 py-1 rounded-full border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
              ✅ Enrolled
            </span>
          </h1>
          <p className="text-slate-400 mt-1 text-sm leading-relaxed max-w-3xl">
            {activeCampObj?.description}
          </p>
          
          {/* Camp Metadata Section */}
          {(activeCampObj?.learningObjectives || activeCampObj?.instructor || activeCampObj?.duration || activeCampObj?.scheduleInfo) && (
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs bg-slate-950 border border-slate-800 p-4 rounded-2xl">
              {activeCampObj.instructor && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Instructor:</span>
                  <span className="text-white font-medium">{activeCampObj.instructor}</span>
                </div>
              )}
              {activeCampObj.duration && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Duration:</span>
                  <span className="text-white font-medium">{activeCampObj.duration}</span>
                </div>
              )}
              {activeCampObj.scheduleInfo && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Schedule:</span>
                  <span className="text-white font-medium">{activeCampObj.scheduleInfo}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <Button
          onClick={() => setSelectedCampId(null)}
          variant="outline"
          className="border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs"
        >
          Switch Camp
        </Button>
      </div>

      {/* Learning Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => { setActiveTab("all"); setSelectedVideo(null); }}
          className={`px-5 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
            activeTab === "all"
              ? "border-indigo-500 text-white font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <Activity className="w-4 h-4" /> All Content
          </span>
        </button>
        <button
          onClick={() => { setActiveTab("videos"); setSelectedVideo(null); }}
          className={`px-5 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
            activeTab === "videos"
              ? "border-indigo-500 text-white font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <Play className="w-4 h-4" /> Videos ({videos.length})
          </span>
        </button>
        <button
          onClick={() => { setActiveTab("materials"); setSelectedVideo(null); }}
          className={`px-5 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
            activeTab === "materials"
              ? "border-indigo-500 text-white font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Materials ({materials.length})
          </span>
        </button>
        <button
          onClick={() => { setActiveTab("tests"); setSelectedVideo(null); }}
          className={`px-5 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
            activeTab === "tests"
              ? "border-indigo-500 text-white font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <Award className="w-4 h-4" /> Quizzes ({displayTests.length})
          </span>
        </button>
      </div>

      {/* Interactive Video Player Override */}
      {selectedVideo && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedVideo(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" /> Close Player
          </Button>
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-[#CA8E25]" /> {selectedVideo.title}
              </h3>
              <p className="text-sm text-slate-400 mt-1">{selectedVideo.description}</p>
            </div>
            {selectedVideo.url && (
              <InteractivePlayer videoUrl={selectedVideo.url} title={selectedVideo.title} quizzes={selectedVideo.quizzes as any || []} />
            )}
            {!selectedVideo.url && (
              <div className="aspect-video bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800">
                <p className="text-slate-500 font-medium">Video is currently unavailable.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Rendering */}
      {!selectedVideo && (
        <div className="space-y-10">
          {/* Empty State */}
          {videos.length === 0 && materials.length === 0 && displayTests.length === 0 && (
            <div className="py-20 text-center text-slate-500 bg-slate-950/40 border border-slate-850 rounded-3xl">
              <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p>No content has been published for this camp yet.</p>
            </div>
          )}

          {/* Videos Section */}
          {(activeTab === "all" || activeTab === "videos") && videos.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-[#CA8E25]" /> Video Lessons
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map(item => renderVideoCard(item))}
              </div>
            </section>
          )}

          {/* Separator */}
          {activeTab === "all" && videos.length > 0 && (materials.length > 0 || displayTests.length > 0) && (
            <hr className="border-slate-800" />
          )}

          {/* Materials Section */}
          {(activeTab === "all" || activeTab === "materials") && materials.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#CA8E25]" /> Study Materials
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {materials.map(item => renderMaterialCard(item))}
              </div>
            </section>
          )}

          {/* Separator */}
          {activeTab === "all" && materials.length > 0 && displayTests.length > 0 && (
            <hr className="border-slate-800" />
          )}

          {/* Quizzes Section */}
          {(activeTab === "all" || activeTab === "tests") && displayTests.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-[#CA8E25]" /> Quizzes &amp; Mock Tests
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayTests.map(test => renderMockTestCard(test))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
