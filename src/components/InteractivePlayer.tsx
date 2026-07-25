"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Quiz {
  id: string;
  timestamp: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
  requireCorrect: boolean;
}

interface InteractivePlayerProps {
  videoUrl: string;
  title: string;
  quizzes: Quiz[];
}

export default function InteractivePlayer({ videoUrl, title, quizzes }: InteractivePlayerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [answeredQuizzes, setAnsweredQuizzes] = useState<Set<string>>(new Set());
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  
  const playerRef = useRef<HTMLIFrameElement>(null);

  // Parse regular links into embed links automatically
  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    
    // YouTube
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      let videoId = "";
      if (url.includes("watch?v=")) {
        const parts = url.split("watch?v=");
        if (parts[1]) {
          videoId = parts[1].split("&")[0];
        }
      } else if (url.includes("youtu.be/")) {
        const parts = url.split("youtu.be/");
        if (parts[1]) {
          videoId = parts[1].split("?")[0];
        }
      } else if (url.includes("youtube.com/embed/")) {
        const parts = url.split("youtube.com/embed/");
        if (parts[1]) {
          videoId = parts[1].split("?")[0];
        }
      }

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
      }
    }

    // Vimeo
    if (url.includes("vimeo.com") && !url.includes("player.vimeo.com")) {
      const parts = url.split("vimeo.com/");
      if (parts[1]) {
        const vimeoId = parts[1].split("?")[0];
        return `https://player.vimeo.com/video/${vimeoId}`;
      }
    }

    return url;
  };

  const embedUrl = getEmbedUrl(videoUrl);

  useEffect(() => {
    // Reset state when video changes
    setCurrentTime(0);
    setActiveQuiz(null);
    setAnsweredQuizzes(new Set());
  }, [videoUrl]);

  useEffect(() => {
    // Poll YouTube iframe for current time
    // Note: To fully support this without an external library, 
    // the iframe needs to emit messages or we need the YT IFrame API.
    // For demonstration in Kaputra CMS without external dependencies, we simulate a mock time progression 
    // or rely on a standard HTML5 video API if passed.
    
    // As a lightweight YT API implementation:
    let interval: NodeJS.Timeout;
    
    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.origin !== "https://www.youtube.com") return;
        const data = JSON.parse(event.data);
        if (data.event === "infoDelivery" && data.info && data.info.currentTime) {
          setCurrentTime(data.info.currentTime);
        }
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener("message", handleMessage);
    
    if (playerRef.current && embedUrl.includes("youtube")) {
      // Poll every 500ms
      interval = setInterval(() => {
        if (playerRef.current && playerRef.current.contentWindow) {
          playerRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "listening", id: 1 }), 
            "*"
          );
        }
      }, 500);
    }

    return () => {
      window.removeEventListener("message", handleMessage);
      clearInterval(interval);
    };
  }, [embedUrl]);

  // Check for quizzes
  useEffect(() => {
    if (activeQuiz) return;
    
    for (const quiz of quizzes) {
      // If we are within 1 second of the quiz timestamp and haven't answered it yet
      if (Math.abs(currentTime - quiz.timestamp) < 1.0 && !answeredQuizzes.has(quiz.id)) {
        setActiveQuiz(quiz);
        setSelectedOption(null);
        setIsCorrect(null);
        setShowExplanation(false);
        
        // Pause the video (YouTube API)
        if (playerRef.current && playerRef.current.contentWindow) {
          playerRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
            "*"
          );
        }
        break;
      }
    }
  }, [currentTime, quizzes, answeredQuizzes, activeQuiz]);

  const handleSubmit = () => {
    if (!activeQuiz || !selectedOption) return;

    const correct = selectedOption === activeQuiz.correctAnswer;
    setIsCorrect(correct);
    setShowExplanation(true);
  };

  const handleContinue = () => {
    if (!activeQuiz) return;
    
    setAnsweredQuizzes(prev => {
      const next = new Set(prev);
      next.add(activeQuiz.id);
      return next;
    });
    
    setActiveQuiz(null);
    
    // Play the video (YouTube API)
    if (playerRef.current && playerRef.current.contentWindow) {
      playerRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "playVideo", args: [] }),
        "*"
      );
    }
  };

  return (
    <div className="relative w-full aspect-video bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
      <iframe
        ref={playerRef}
        src={embedUrl}
        title={title}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />

      {/* Quiz Modal Overlay */}
      {activeQuiz && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="mb-4">
              <span className="inline-block bg-amber-500/10 text-[#CA8E25] text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full mb-2">
                Knowledge Check
              </span>
              <h3 className="text-xl font-bold text-slate-900">{activeQuiz.question}</h3>
            </div>

            {!showExplanation ? (
              <div className="space-y-3 mt-6">
                {[
                  { id: "A", text: activeQuiz.optionA },
                  { id: "B", text: activeQuiz.optionB },
                  { id: "C", text: activeQuiz.optionC },
                  { id: "D", text: activeQuiz.optionD },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedOption(opt.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedOption === opt.id
                        ? "border-[#CA8E25] bg-[#CA8E25]/5 shadow-md"
                        : "border-slate-100 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <span className="font-bold text-slate-400 mr-3">{opt.id}.</span>
                    <span className="text-slate-700 font-medium">{opt.text}</span>
                  </button>
                ))}

                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedOption}
                    className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl px-8"
                  >
                    Submit Answer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className={`p-4 rounded-xl border ${
                  isCorrect 
                    ? "bg-emerald-50 border-emerald-200" 
                    : "bg-red-50 border-red-200"
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    {isCorrect ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-red-500" />
                    )}
                    <h4 className={`font-bold ${isCorrect ? "text-emerald-700" : "text-red-700"}`}>
                      {isCorrect ? "Correct!" : "Incorrect"}
                    </h4>
                  </div>
                  
                  {activeQuiz.explanation && (
                    <p className={`text-sm mt-2 ${isCorrect ? "text-emerald-600" : "text-red-600"}`}>
                      {activeQuiz.explanation}
                    </p>
                  )}
                </div>

                <div className="pt-4 flex justify-end">
                  {!isCorrect && activeQuiz.requireCorrect ? (
                    <Button
                      onClick={() => {
                        setShowExplanation(false);
                        setSelectedOption(null);
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl px-8"
                    >
                      Try Again
                    </Button>
                  ) : (
                    <Button
                      onClick={handleContinue}
                      className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl px-8 flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" /> Continue Video
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
