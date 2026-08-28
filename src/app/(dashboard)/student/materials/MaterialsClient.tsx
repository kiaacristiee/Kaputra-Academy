"use client";

import { useState } from "react";
import { 
  Lock, 
  FileText, 
  Download, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Save, 
  ChevronRight,
  BookOpen,
  FolderOpen,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  createMaterial, 
  updateMaterial, 
  deleteMaterial 
} from "@/actions/dashboard";
import Link from "next/link";

interface MaterialItem {
  id: string;
  courseId: string;
  title: string;
  fileUrl: string;
  description: string | null;
  isPublished: boolean;
  isTrial: boolean;
}

interface Course {
  id: string;
  title: string;
  type: string;
  materials: MaterialItem[];
}

interface MaterialsClientProps {
  initialCourses: Course[];
  isUnlocked: boolean;
  userRole: string;
}

export default function MaterialsClient({ 
  initialCourses, 
  isUnlocked, 
  userRole 
}: MaterialsClientProps) {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [selectedCourseIdx, setSelectedCourseIdx] = useState(0);

  // CMS state
  const [isCmsOpen, setIsCmsOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    fileUrl: "",
    description: "",
    isPublished: true,
    isTrial: false,
  });

  const isStaff = ["ADMIN", "TEACHER"].includes(userRole);
  const activeCourse = courses[selectedCourseIdx];

  const handleOpenCms = (material?: MaterialItem) => {
    if (!activeCourse) return;
    if (material) {
      setEditingMaterial(material);
      setFormData({
        title: material.title,
        fileUrl: material.fileUrl,
        description: material.description || "",
        isPublished: material.isPublished,
        isTrial: material.isTrial || false,
      });
    } else {
      setEditingMaterial(null);
      setFormData({
        title: "",
        fileUrl: "",
        description: "",
        isPublished: true,
        isTrial: false,
      });
    }
    setIsCmsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse) return;

    if (editingMaterial) {
      const res = await updateMaterial(editingMaterial.id, {
        title: formData.title,
        fileUrl: formData.fileUrl,
        description: formData.description,
        isPublished: formData.isPublished,
        isTrial: formData.isTrial,
      });
      if (res.success && res.material) {
        const updated = activeCourse.materials.map((m) =>
          m.id === editingMaterial.id ? (res.material as any) : m
        );
        setCourses(
          courses.map((c) =>
            c.id === activeCourse.id ? { ...c, materials: updated } : c
          )
        );
        setIsCmsOpen(false);
      }
    } else {
      const res = await createMaterial({
        courseId: activeCourse.id,
        title: formData.title,
        fileUrl: formData.fileUrl,
        description: formData.description,
        isPublished: formData.isPublished,
        isTrial: formData.isTrial,
      });
      if (res.success && res.material) {
        const updated = [res.material as any, ...activeCourse.materials];
        setCourses(
          courses.map((c) =>
            c.id === activeCourse.id ? { ...c, materials: updated } : c
          )
        );
        setIsCmsOpen(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this learning material?")) {
      const res = await deleteMaterial(id);
      if (res.success) {
        const updated = activeCourse.materials.filter((m) => m.id !== id);
        setCourses(
          courses.map((c) =>
            c.id === activeCourse.id ? { ...c, materials: updated } : c
          )
        );
      }
    }
  };

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-lg mx-auto text-center space-y-6">
        <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center relative">
          <Lock className="h-8 w-8 text-[#CA8E25]" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white">Learning Materials Locked</h1>
        <p className="text-slate-400">
          This portal contains syllabus documents, lecture notes, homework templates, and worksheets. Access is restricted to enrolled and paid students.
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
            <FolderOpen className="h-8 w-8 text-[#CA8E25]" />
            Learning Materials
          </h1>
          <p className="text-slate-400 mt-1">
            Download guides, worksheets, PDFs, and classroom assignments.
          </p>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="py-20 text-center text-slate-500 bg-slate-950/20 border border-slate-850 rounded-2xl">
          <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p>No active courses or materials allocated.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Panel Course Selector & CMS Button */}
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
                <Plus className="w-4 h-4" /> Add Material Resource
              </Button>
            )}
          </div>

          {/* Materials List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeCourse?.materials.length > 0 ? (
              activeCourse.materials.map((item) => (
                <div key={item.id} className="bg-slate-950 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between gap-4 hover:border-slate-700 transition">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-base truncate flex items-center gap-2">
                          {item.title}
                          {item.isTrial && (
                            <span className="bg-amber-500/10 border border-amber-500/20 text-[#CA8E25] text-[8px] font-bold px-1.5 py-0.5 rounded">
                              Trial
                            </span>
                          )}
                          {!item.isPublished && (
                            <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-bold px-1.5 py-0.5 rounded">
                              Draft
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-mono">ID: {item.id}</p>
                      </div>
                    </div>
                    <p className="text-slate-400 text-xs line-clamp-2">
                      {item.description || "Study reference guidelines or problem worksheet set."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                    <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button className="w-full bg-slate-850 hover:bg-slate-800 text-white rounded-xl text-xs py-2 flex items-center justify-center gap-1.5">
                        Download Resource <Download className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                    {isStaff && (
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleOpenCms(item)}
                          className="text-slate-400 hover:text-white"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(item.id)}
                          className="text-red-450 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-16 text-center text-slate-500 bg-slate-950/20 border border-slate-850 rounded-3xl">
                No materials uploaded under this program yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CMS Modal */}
      {isCmsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-850 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg">
                {editingMaterial ? "Edit Material" : "Add Material Resource"}
              </h3>
              <button onClick={() => setIsCmsOpen(false)} className="text-slate-450 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Resource Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Workbook Chapter 2 - Ratios"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Resource Download Link (PDF/Doc/Drive URL)</label>
                <input
                  type="text"
                  required
                  value={formData.fileUrl}
                  onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                  placeholder="e.g. https://drive.google.com/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide details or homework submission guidelines..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-700 h-24"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Content Visibility</label>
                <select
                  value={formData.isTrial ? "TRIAL" : activeCourse?.type === "COMPETITION" ? "COMPETITION" : "REGULAR"}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "TRIAL") {
                      setFormData({ ...formData, isTrial: true });
                    } else {
                      const matchIdx = courses.findIndex((c) => c.type === val);
                      if (matchIdx !== -1) {
                        setSelectedCourseIdx(matchIdx);
                      }
                      setFormData({ ...formData, isTrial: false });
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-700"
                >
                  <option value="REGULAR">Regular Class</option>
                  <option value="COMPETITION">Competition Class</option>
                  <option value="TRIAL">Trial Content</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-600"
                />
                <label htmlFor="isPublished" className="text-xs text-slate-350 select-none cursor-pointer">
                  Publish Material
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
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
                  className="bg-blue-650 hover:bg-blue-600 text-white rounded-xl px-5 flex items-center gap-1"
                >
                  <Save className="w-4 h-4" /> Save Material
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
