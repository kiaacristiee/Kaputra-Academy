"use client";

import { useState } from "react";
import { 
  ChevronRight, 
  Search, 
  ArrowLeft,
  Clock,
  Award,
  HelpCircle,
  FileText,
  User,
  CheckCircle,
  XCircle,
  BarChart2,
  Calendar,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  answers: string;
  timeSpent?: string | null;
  submittedAt: Date;
  student?: {
    name: string;
    studentIdStr?: string | null;
  };
}

interface MockTest {
  id: string;
  title: string;
  timeLimit: number;
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

interface QuizResultsClientProps {
  initialCourses: Course[];
}

export default function QuizResultsClient({ initialCourses }: QuizResultsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Drill-down states
  const [activeQuiz, setActiveQuiz] = useState<MockTest | null>(null);
  const [activeSubmission, setActiveSubmission] = useState<MockSubmission | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Flatten quizzes with course info for Level 0
  const allQuizzes = initialCourses.flatMap(course => 
    course.mockTests.map(test => ({
      ...test,
      courseTitle: course.title,
      courseType: course.type
    }))
  ).filter(quiz => 
    quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quiz.courseTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleReviewTest = (submission: MockSubmission) => {
    setActiveSubmission(submission);
    setCurrentQuestionIdx(0);
    setReviewMode(true);
  };

  const getSubmissionStats = (submission: MockSubmission, test: MockTest) => {
    let parsedAnswers: Record<string, string> = {};
    let parsedTimeSpent: Record<string, number> = {};
    
    try { parsedAnswers = JSON.parse(submission.answers || "{}"); } catch (e) {}
    try { if (submission.timeSpent) parsedTimeSpent = JSON.parse(submission.timeSpent); } catch (e) {}

    let correctCount = 0;
    let wrongCount = 0;
    let totalTime = 0;

    test.questions.forEach((q) => {
      const studentAns = parsedAnswers[q.id]?.toLowerCase().trim() || "";
      const correctAns = q.correctAnswer?.toLowerCase().trim() || "";
      if (studentAns === correctAns) correctCount++;
      else wrongCount++;
      
      totalTime += (parsedTimeSpent[q.id] || 0);
    });

    return { parsedAnswers, parsedTimeSpent, correctCount, wrongCount, totalTime };
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // ---------------------------------------------------------------------------
  // LEVEL 4: REVIEW MODE (Same as MockTestClient review)
  // ---------------------------------------------------------------------------
  if (reviewMode && activeQuiz && activeSubmission) {
    const { parsedAnswers, parsedTimeSpent } = getSubmissionStats(activeSubmission, activeQuiz);
    
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Compact Header Bar */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#CA8E25]/15 flex items-center justify-center">
              <Award className="w-4 h-4 text-[#CA8E25]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm leading-tight">{activeQuiz.title} - {activeSubmission.student?.name}</h3>
              <p className="text-[11px] text-slate-500">
                Review Mode — Read Only | Question {currentQuestionIdx + 1} / {activeQuiz.questions.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReviewMode(false)}
              className="text-slate-400 hover:text-white h-8 px-2.5 rounded-lg text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Summary
            </Button>
          </div>
        </div>

        {/* Question Number Navigation Grid */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {activeQuiz.questions.map((q, idx) => {
              const isCurrent = idx === currentQuestionIdx;
              let btnStyle = "bg-slate-900 border-slate-800 text-slate-500";

              const studentAns = parsedAnswers[q.id]?.toLowerCase().trim() || "";
              const correctAns = q.correctAnswer?.toLowerCase().trim() || "";
              const isCorrect = studentAns === correctAns;
              if (isCurrent) {
                btnStyle = "bg-[#CA8E25] border-[#CA8E25] text-black ring-2 ring-[#CA8E25]/30";
              } else if (isCorrect) {
                btnStyle = "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
              } else {
                btnStyle = "bg-red-500/15 border-red-500/30 text-red-400";
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

        {/* Main Content Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Time spent on this question:</span>
              <span className="font-mono text-amber-500 font-bold">{parsedTimeSpent[activeQuiz.questions[currentQuestionIdx]?.id] || 0}s</span>
            </div>
            
            {/* Question Text */}
            <div className="p-4 bg-slate-900/60 border border-slate-800/60 rounded-xl">
              <p className="text-[13px] text-white font-medium leading-relaxed">
                {activeQuiz.questions[currentQuestionIdx]?.questionText}
              </p>
              {(activeQuiz.questions[currentQuestionIdx] as any)?.imageUrl && (
                <img
                  src={(activeQuiz.questions[currentQuestionIdx] as any).imageUrl}
                  alt="Question"
                  className="mt-3 max-h-48 rounded-lg border border-slate-800"
                />
              )}
            </div>

            {/* Answer Options */}
            <div className="space-y-2">
              {(() => {
                const q = activeQuiz.questions[currentQuestionIdx];
                if (!q) return null;
                let opts: string[] = [];
                try { opts = JSON.parse(q.options); } catch { opts = []; }

                const studentAns = parsedAnswers[q.id];
                const isShortAnswer = opts.length === 0;

                if (isShortAnswer) {
                  const s = studentAns?.toLowerCase().trim() || "";
                  const c = q.correctAnswer?.toLowerCase().trim() || "";
                  const isCorrect = s === c;

                  return (
                    <div className="space-y-3">
                      <div className={`p-4 rounded-xl border ${isCorrect ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 block">Student Answer</label>
                        <p className={`font-medium text-sm ${isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                          {studentAns || "(No answer)"}
                        </p>
                      </div>
                      {!isCorrect && (
                        <div className="p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 block">Correct Answer</label>
                          <p className="font-medium text-sm text-emerald-400">
                            {q.correctAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }

                return opts.map((opt, i) => {
                  const isStudentChoice = studentAns === opt;
                  const isCorrectChoice = q.correctAnswer === opt;

                  let style = "bg-slate-900/40 border-slate-800 text-slate-400";
                  let badge = null;

                  if (isCorrectChoice && isStudentChoice) {
                    style = "bg-emerald-500/10 border-emerald-500/40 text-white";
                    badge = <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded">✓ CORRECT</span>;
                  } else if (isCorrectChoice && !isStudentChoice) {
                    style = "bg-emerald-500/5 border-emerald-500/20 text-slate-300";
                    badge = <span className="text-[9px] border border-emerald-500/30 text-emerald-400 font-bold px-1.5 py-0.5 rounded">CORRECT ANSWER</span>;
                  } else if (!isCorrectChoice && isStudentChoice) {
                    style = "bg-red-500/10 border-red-500/40 text-white";
                    badge = <span className="text-[9px] bg-red-500/20 text-red-400 font-bold px-1.5 py-0.5 rounded">✗ STUDENT ANSWER</span>;
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
            {activeQuiz.questions[currentQuestionIdx]?.explanation && (
              <div className="px-4 py-3 bg-blue-950/10 border border-blue-900/20 rounded-xl mt-4">
                <h5 className="text-[10px] font-bold text-blue-400 flex items-center gap-1 mb-1">
                  <HelpCircle className="w-3 h-3" /> Explanation
                </h5>
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  {activeQuiz.questions[currentQuestionIdx].explanation}
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center pt-5 border-t border-slate-800/60 mt-4">
              <Button
                disabled={currentQuestionIdx === 0}
                onClick={() => setCurrentQuestionIdx(currentQuestionIdx - 1)}
                variant="outline"
                className="border-slate-800 text-slate-400 hover:text-white rounded-lg text-[11px] h-8 px-3"
              >
                ← Previous
              </Button>
              {currentQuestionIdx < activeQuiz.questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                  className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] h-8 px-4"
                >
                  Next →
                </Button>
              ) : (
                <Button
                  onClick={() => setReviewMode(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] h-8 px-5 font-bold"
                >
                  Finish Review
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // LEVEL 3: STUDENT SUMMARY
  // ---------------------------------------------------------------------------
  if (activeSubmission && activeQuiz && !reviewMode) {
    const stats = getSubmissionStats(activeSubmission, activeQuiz);
    const avgTime = activeQuiz.questions.length > 0 ? Math.round(stats.totalTime / activeQuiz.questions.length) : 0;
    
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="mb-6 flex gap-3">
          <Button 
            variant="ghost" 
            onClick={() => setActiveSubmission(null)}
            className="text-slate-400 hover:text-white rounded-xl px-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Student List
          </Button>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-800/50">
            <div>
              <h2 className="text-2xl font-black text-white">{activeSubmission.student?.name}</h2>
              <div className="flex items-center gap-3 mt-2 text-sm text-slate-400 font-medium">
                <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {activeSubmission.student?.studentIdStr || "No ID"}</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {new Date(activeSubmission.submittedAt).toLocaleString("id-ID")}</span>
              </div>
            </div>
            <Button 
              onClick={() => setReviewMode(true)}
              className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl px-6 py-6"
            >
              <FileText className="w-5 h-5 mr-2" />
              Review Answers
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center space-y-3 py-6 bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Final Score</p>
              <div className={`w-28 h-28 mx-auto rounded-full flex items-center justify-center border-4 ${
                activeSubmission.isPassed ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"
              }`}>
                <span className={`text-4xl font-black ${activeSubmission.isPassed ? "text-emerald-400" : "text-red-400"}`}>
                  {activeSubmission.score}%
                </span>
              </div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                activeSubmission.isPassed ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
              }`}>
                {activeSubmission.isPassed ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {activeSubmission.isPassed ? "PASSED" : "FAILED"}
              </div>
              <p className="text-xs text-slate-500">Passing Grade: {activeQuiz.passingScore}%</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-center items-center text-center">
                <CheckCircle className="w-6 h-6 text-emerald-500 mb-2" />
                <p className="text-2xl font-black text-white">{stats.correctCount}</p>
                <p className="text-xs text-slate-400 font-medium">Correct Answers</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-center items-center text-center">
                <XCircle className="w-6 h-6 text-red-500 mb-2" />
                <p className="text-2xl font-black text-white">{stats.wrongCount}</p>
                <p className="text-xs text-slate-400 font-medium">Wrong Answers</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-center items-center text-center">
                <Clock className="w-6 h-6 text-amber-500 mb-2" />
                <p className="text-2xl font-black text-white">{formatTime(stats.totalTime)}</p>
                <p className="text-xs text-slate-400 font-medium">Total Time</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-center items-center text-center">
                <BarChart2 className="w-6 h-6 text-blue-500 mb-2" />
                <p className="text-2xl font-black text-white">{avgTime}s</p>
                <p className="text-xs text-slate-400 font-medium">Avg Time/Question</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // LEVEL 2: STUDENT LIST
  // ---------------------------------------------------------------------------
  if (activeQuiz && !activeSubmission) {
    return (
      <div className="space-y-6">
        <div className="mb-2">
          <Button 
            variant="ghost" 
            onClick={() => setActiveQuiz(null)}
            className="text-slate-400 hover:text-white rounded-xl px-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Quizzes
          </Button>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-2">{activeQuiz.title} - Results</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
               <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {activeQuiz.timeLimit} Mins Limit</span>
               <span className="flex items-center gap-1.5"><HelpCircle className="w-4 h-4" /> {activeQuiz.questions.length} Questions</span>
               <span className="flex items-center gap-1.5"><Award className="w-4 h-4" /> {activeQuiz.passingScore}% to Pass</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 px-4 font-bold">Student Name</th>
                  <th className="pb-3 px-4 font-bold">Student ID</th>
                  <th className="pb-3 px-4 font-bold">Score</th>
                  <th className="pb-3 px-4 font-bold">Status</th>
                  <th className="pb-3 px-4 font-bold">Submitted At</th>
                  <th className="pb-3 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {activeQuiz.submissions.length > 0 ? (
                  activeQuiz.submissions.map(sub => (
                    <tr key={sub.id} className="hover:bg-slate-900/50 transition duration-150">
                      <td className="py-4 px-4 font-bold text-white max-w-[200px] truncate">{sub.student?.name}</td>
                      <td className="py-4 px-4 font-mono text-slate-400">{sub.student?.studentIdStr || "-"}</td>
                      <td className="py-4 px-4">
                        <span className={`font-black ${sub.isPassed ? "text-emerald-400" : "text-red-400"}`}>{sub.score}%</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${sub.isPassed ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
                          {sub.isPassed ? "PASSED" : "FAILED"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-400 text-xs">{new Date(sub.submittedAt).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-4 px-4 text-right">
                        <Button
                          variant="ghost"
                          onClick={() => handleReviewTest(sub)}
                          className="bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-xs"
                        >
                          View Result
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No submissions found for this quiz yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // LEVEL 1: QUIZZES LIST
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
           <h2 className="text-xl font-bold text-white">Select a Quiz</h2>
           <div className="relative w-full sm:w-64">
             <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
             <input
               type="text"
               placeholder="Search quizzes..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-slate-900 border border-slate-850 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-slate-700 transition"
             />
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {allQuizzes.length > 0 ? (
            allQuizzes.map(quiz => (
              <div 
                key={quiz.id}
                onClick={() => setActiveQuiz(quiz)}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-blue-500/50 hover:bg-slate-800/80 transition cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-1 rounded capitalize">
                    {quiz.courseTitle}
                  </span>
                  <div className="bg-blue-500/10 text-blue-400 text-xs font-bold px-2 py-1 rounded flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {quiz.submissions.length} Submissions
                  </div>
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{quiz.title}</h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-[#CA8E25]" /> {quiz.timeLimit}m</span>
                  <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3 text-emerald-500" /> {quiz.questions.length} Qs</span>
                </div>
                
                <div className="mt-4 flex items-center text-xs font-bold text-blue-500 group-hover:text-blue-400">
                  View Results <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center text-slate-500">
              No quizzes found matching your criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


