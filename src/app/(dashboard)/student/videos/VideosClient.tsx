"use client";

import { useState } from "react";
import { 
  Lock, 
  Play, 
  Plus, 
  Edit2, 
  Trash2, 
  Video, 
  Tv, 
  Save, 
  X, 
  ArrowUp, 
  ArrowDown, 
  ChevronRight,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  createVideo, 
  updateVideo, 
  deleteVideo 
} from "@/actions/dashboard";
import Link from "next/link";
import InteractivePlayer from "@/components/InteractivePlayer";
import InteractiveQuizzesCMS from "@/components/InteractiveQuizzesCMS";

interface VideoItem {
  id: string;
  courseId: string;
  title: string;
  videoUrl: string;
  category: string | null;
  order: number;
  isPublished: boolean;
  isTrial: boolean;
  quizzes?: any[];
}

interface Course {
  id: string;
  title: string;
  type: string;
  videos: VideoItem[];
}

interface VideosClientProps {
  initialCourses: Course[];
  isUnlocked: boolean;
  userRole: string;
}

export default function VideosClient({ 
  initialCourses, 
  isUnlocked, 
  userRole 
}: VideosClientProps) {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [selectedCourseIdx, setSelectedCourseIdx] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  // CMS state
  const [isCmsOpen, setIsCmsOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    videoUrl: "",
    category: "",
    order: 0,
    isPublished: true,
    isTrial: false,
  });

  const isStaff = ["ADMIN", "TEACHER"].includes(userRole);
  const activeCourse = courses[selectedCourseIdx];

  // Auto select first video if available
  if (activeCourse && activeCourse.videos.length > 0 && !selectedVideo) {
    setSelectedVideo(activeCourse.videos[0]);
  }

  const handleOpenCms = (video?: VideoItem) => {
    if (!activeCourse) return;
    if (video) {
      setEditingVideo(video);
      setFormData({
        title: video.title,
        videoUrl: video.videoUrl,
        category: video.category || "",
        order: video.order,
        isPublished: video.isPublished,
        isTrial: video.isTrial || false,
      });
    } else {
      setEditingVideo(null);
      setFormData({
        title: "",
        videoUrl: "",
        category: "",
        order: activeCourse.videos.length,
        isPublished: true,
        isTrial: false,
      });
    }
    setIsCmsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse) return;

    if (editingVideo) {
      const res = await updateVideo(editingVideo.id, {
        title: formData.title,
        videoUrl: formData.videoUrl,
        category: formData.category,
        order: Number(formData.order),
        isPublished: formData.isPublished,
        isTrial: formData.isTrial,
      });
      if (res.success && res.video) {
        const updatedVideos = activeCourse.videos
          .map((v) => (v.id === editingVideo.id ? (res.video as any) : v))
          .sort((a, b) => a.order - b.order);
        
        setCourses(
          courses.map((c) =>
            c.id === activeCourse.id ? { ...c, videos: updatedVideos } : c
          )
        );
        setSelectedVideo(res.video as any);
        setIsCmsOpen(false);
      }
    } else {
      const isCamp = activeCourse.type === "CAMP PROGRAM";
      const res = await createVideo({
        courseId: isCamp ? undefined : activeCourse.id,
        campProgramId: isCamp ? activeCourse.id : undefined,
        title: formData.title,
        videoUrl: formData.videoUrl,
        category: formData.category,
        order: Number(formData.order),
        isPublished: formData.isPublished,
        isTrial: formData.isTrial,
      });
      if (res.success && res.video) {
        const updatedVideos = [...activeCourse.videos, res.video as any].sort(
          (a, b) => a.order - b.order
        );
        setCourses(
          courses.map((c) =>
            c.id === activeCourse.id ? { ...c, videos: updatedVideos } : c
          )
        );
        setIsCmsOpen(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this video?")) {
      const res = await deleteVideo(id);
      if (res.success) {
        const updatedVideos = activeCourse.videos.filter((v) => v.id !== id);
        setCourses(
          courses.map((c) =>
            c.id === activeCourse.id ? { ...c, videos: updatedVideos } : c
          )
        );
        if (selectedVideo?.id === id) {
          setSelectedVideo(updatedVideos[0] || null);
        }
      }
    }
  };

  const handleReorder = async (video: VideoItem, direction: "up" | "down") => {
    const idx = activeCourse.videos.findIndex((v) => v.id === video.id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === activeCourse.videos.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const targetVideo = activeCourse.videos[swapIdx];

    // Swap locally and trigger updates
    const tempOrder = video.order;
    video.order = targetVideo.order;
    targetVideo.order = tempOrder;

    await updateVideo(video.id, {
      title: video.title,
      videoUrl: video.videoUrl,
      category: video.category || undefined,
      order: video.order,
      isPublished: video.isPublished,
      isTrial: video.isTrial,
    });
    await updateVideo(targetVideo.id, {
      title: targetVideo.title,
      videoUrl: targetVideo.videoUrl,
      category: targetVideo.category || undefined,
      order: targetVideo.order,
      isPublished: targetVideo.isPublished,
      isTrial: targetVideo.isTrial,
    });

    const reordered = [...activeCourse.videos].sort((a, b) => a.order - b.order);
    setCourses(
      courses.map((c) =>
        c.id === activeCourse.id ? { ...c, videos: reordered } : c
      )
    );
  };

  // Locked View
  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-lg mx-auto text-center space-y-6">
        <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center relative">
          <Lock className="h-8 w-8 text-[#CA8E25]" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white">Class Videos Locked</h1>
        <p className="text-slate-400">
          This portal contains exclusive video lessons corresponding to your course structure. Please enroll in a program and complete the payment to unlock this page.
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <Tv className="h-8 w-8 text-[#CA8E25]" />
            Course Video Library
          </h1>
          <p className="text-slate-400 mt-1">
            Access recorded lessons, topic discussions, and learning resources.
          </p>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="py-20 text-center text-slate-500 bg-slate-950/20 border border-slate-850 rounded-2xl">
          <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p>No active courses or classes allocated.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left panel: Courses list and video list */}
          <div className="lg:col-span-4 space-y-6">
            {/* Course Selector */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#CA8E25] block mb-1">Select Course</span>
              <select
                value={selectedCourseIdx}
                onChange={(e) => {
                  setSelectedCourseIdx(Number(e.target.value));
                  setSelectedVideo(null);
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
              >
                {courses.map((course, idx) => (
                  <option key={course.id} value={idx}>
                    {course.title} ({course.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Video List */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                <span className="font-bold text-white text-sm">Course Playlist</span>
                {isStaff && (
                  <Button 
                    size="sm"
                    onClick={() => handleOpenCms()}
                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs py-1 px-2.5 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Video
                  </Button>
                )}
              </div>

              <div className="divide-y divide-slate-850 max-h-[450px] overflow-y-auto">
                {activeCourse?.videos.length > 0 ? (
                  activeCourse.videos.map((video, idx) => {
                    const isActive = selectedVideo?.id === video.id;
                    return (
                      <div 
                        key={video.id}
                        onClick={() => setSelectedVideo(video)}
                        className={`p-4 flex items-center justify-between gap-3 cursor-pointer transition ${
                          isActive 
                            ? "bg-slate-900 text-white border-l-2 border-[#CA8E25]" 
                            : "text-slate-400 hover:bg-slate-900/50 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Play className={`w-4 h-4 shrink-0 ${isActive ? "text-[#CA8E25]" : "text-slate-500"}`} />
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs truncate text-white flex items-center gap-1.5">
                              {video.title}
                              {video.isTrial && (
                                <span className="bg-amber-500/10 border border-amber-500/20 text-[#CA8E25] text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0">
                                  Trial
                                </span>
                              )}
                            </h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">{video.category || "General Video"}</p>
                          </div>
                        </div>

                        {isStaff && (
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleReorder(video, "up")} className="p-1 text-slate-500 hover:text-white">
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleReorder(video, "down")} className="p-1 text-slate-500 hover:text-white">
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleOpenCms(video)} className="p-1 text-slate-500 hover:text-blue-400">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(video.id)} className="p-1 text-red-500/70 hover:text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No videos published in this course.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right panel: Active Video Player */}
          <div className="lg:col-span-8 space-y-4">
            {selectedVideo ? (
              <div className="space-y-4">
                <InteractivePlayer 
                  videoUrl={selectedVideo.videoUrl} 
                  title={selectedVideo.title} 
                  quizzes={selectedVideo.quizzes || []} 
                />
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-2">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {selectedVideo.title}
                        {selectedVideo.isTrial && (
                          <span className="bg-amber-500/10 border border-amber-500/20 text-[#CA8E25] text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Free Trial
                          </span>
                        )}
                      </h2>
                      <span className="inline-block bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 uppercase tracking-wide">
                        {selectedVideo.category || "General Video"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-video bg-slate-950 border border-slate-850 rounded-3xl flex flex-col items-center justify-center text-center p-8">
                <Tv className="w-16 h-16 text-slate-800 mb-3" />
                <h4 className="font-bold text-white">Select a Video</h4>
                <p className="text-xs text-slate-500 mt-1">Pick a lesson from the playlist on the left to start learning.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CMS Modal */}
      {/* CMS Modal */}
      {isCmsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] md:max-h-[85vh]">
            <form onSubmit={handleSave} className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-800 px-6 py-4 shrink-0">
                <h3 className="font-bold text-white text-lg">
                  {editingVideo ? "Edit Course Video" : "Upload Course Video"}
                </h3>
                <button type="button" onClick={() => setIsCmsOpen(false)} className="text-slate-450 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Video Title</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Session 1: Fractions and Ratios"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Embedded Video URL (e.g. YouTube Embed, Vimeo Link)</label>
                    <input
                      type="text"
                      required
                      value={formData.videoUrl}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      placeholder="e.g. https://www.youtube.com/embed/xxx"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Category / Topic Tag</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g. Algebra Prep"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Content Visibility</label>
                    <select
                      value={formData.isTrial ? "TRIAL" : activeCourse.type === "COMPETITION" ? "COMPETITION" : "REGULAR"}
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 font-bold block mb-1">Order Index</label>
                      <input
                        type="number"
                        value={formData.order}
                        onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="isPublished"
                        checked={formData.isPublished}
                        onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-600"
                      />
                      <label htmlFor="isPublished" className="text-xs text-slate-350 select-none cursor-pointer">
                        Publish Video
                      </label>
                    </div>
                  </div>
                </div>

                {/* Interactive Quizzes CMS Section */}
                {editingVideo && (
                  <InteractiveQuizzesCMS 
                    videoId={editingVideo.id} 
                    initialQuizzes={editingVideo.quizzes || []}
                    onUpdate={(newQuizzes) => {
                      const updatedVideo = { ...editingVideo, quizzes: newQuizzes };
                      setEditingVideo(updatedVideo);
                      
                      // Update locally in course state
                      const updatedVideos = activeCourse.videos.map(v => 
                        v.id === editingVideo.id ? updatedVideo : v
                      );
                      setCourses(
                        courses.map((c) =>
                          c.id === activeCourse.id ? { ...c, videos: updatedVideos } : c
                        )
                      );
                      if (selectedVideo?.id === editingVideo.id) {
                        setSelectedVideo(updatedVideo);
                      }
                    }}
                  />
                )}
              </div>

              {/* Sticky Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950 shrink-0">
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
                  className="bg-blue-650 hover:bg-blue-600 text-white rounded-xl px-5 flex items-center gap-1 font-bold"
                >
                  <Save className="w-4 h-4" /> Save Video
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
