"use client";

import { useState } from "react";
import { Plus, Search, Edit2, Trash2, X, BookOpen, Layers, DollarSign, Calendar, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCourse, updateCourse, deleteCourse } from "@/actions/courses";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function CoursesClient({
  initialCourses,
  categories,
  teachers,
}: {
  initialCourses: any[];
  categories: any[];
  teachers: any[];
}) {
  const router = useRouter();
  const [courses, setCourses] = useState(initialCourses);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState("REGULAR");
  const [categoryId, setCategoryId] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [objectives, setObjectives] = useState("");
  const [learningOutcomes, setLearningOutcomes] = useState("");
  const [schedule, setSchedule] = useState("");
  const [price, setPrice] = useState("0");
  const [pricePrivateOnce, setPricePrivateOnce] = useState("0");
  const [pricePrivateTwice, setPricePrivateTwice] = useState("0");
  const [priceSemiPrivateOnce, setPriceSemiPrivateOnce] = useState("0");
  const [priceSemiPrivateTwice, setPriceSemiPrivateTwice] = useState("0");
  const [registrationFee, setRegistrationFee] = useState("0");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [settlementAccount, setSettlementAccount] = useState("COMPANY");

  const handleTitleChange = (val: string) => {
    setTitle(val);
    // Generate clean slug
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
    );
  };

  const openAddModal = () => {
    setEditingCourse(null);
    setTitle("");
    setSlug("");
    setType("REGULAR");
    setCategoryId(categories[0]?.id || "");
    setShortDescription("");
    setFullDescription("");
    setObjectives("");
    setLearningOutcomes("");
    setSchedule("");
    setPrice("0");
    setPricePrivateOnce("0");
    setPricePrivateTwice("0");
    setPriceSemiPrivateOnce("0");
    setPriceSemiPrivateTwice("0");
    setRegistrationFee("0");
    setThumbnailUrl("");
    setIsPublished(true);
    setSelectedTeacherIds([]);
    setSettlementAccount("COMPANY");
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (course: any) => {
    setEditingCourse(course);
    setTitle(course.title);
    setSlug(course.slug);
    setType(course.type);
    setCategoryId(course.categoryId);
    setShortDescription(course.shortDescription);
    setFullDescription(course.fullDescription);
    setObjectives(course.objectives);
    setLearningOutcomes(course.learningOutcomes);
    setSchedule(course.schedule);
    setPrice(course.price?.toString() || "0");
    setPricePrivateOnce(course.pricePrivateOnce?.toString() || "0");
    setPricePrivateTwice(course.pricePrivateTwice?.toString() || "0");
    setPriceSemiPrivateOnce(course.priceSemiPrivateOnce?.toString() || "0");
    setPriceSemiPrivateTwice(course.priceSemiPrivateTwice?.toString() || "0");
    setRegistrationFee(course.registrationFee?.toString() || "0");
    setThumbnailUrl(course.thumbnailUrl || "");
    setIsPublished(course.isPublished);
    setSelectedTeacherIds(course.teachers.map((ta: any) => ta.teacherId));
    setSettlementAccount(course.settlementAccount || "COMPANY");
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title || !slug || !categoryId || !shortDescription || !schedule) {
      setError("Please fill in all required fields.");
      return;
    }

    const payload = {
      title,
      slug,
      shortDescription,
      fullDescription,
      objectives,
      learningOutcomes,
      schedule,
      price: parseFloat(price) || 0,
      pricePrivateOnce: parseFloat(pricePrivateOnce) || 0,
      pricePrivateTwice: parseFloat(pricePrivateTwice) || 0,
      priceSemiPrivateOnce: parseFloat(priceSemiPrivateOnce) || 0,
      priceSemiPrivateTwice: parseFloat(priceSemiPrivateTwice) || 0,
      registrationFee: parseFloat(registrationFee) || 0,
      thumbnailUrl: thumbnailUrl || undefined,
      categoryId,
      isPublished,
      type,
      settlementAccount,
      teacherIds: selectedTeacherIds,
    };

    let result;
    if (editingCourse) {
      result = await updateCourse(editingCourse.id, payload);
    } else {
      result = await createCourse(payload);
    }

    if (result.success && result.course) {
      // Re-fetch or update state
      if (editingCourse) {
        setCourses(
          courses.map((c) =>
            c.id === editingCourse.id
              ? {
                  ...c,
                  ...result.course,
                  category: categories.find((cat) => cat.id === categoryId),
                  teachers: selectedTeacherIds.map((tid) => ({
                    teacherId: tid,
                    teacher: teachers.find((t) => t.id === tid),
                  })),
                }
              : c
          )
        );
      } else {
        setCourses([
          {
            ...result.course,
            category: categories.find((cat) => cat.id === categoryId),
            teachers: selectedTeacherIds.map((tid) => ({
              teacherId: tid,
              teacher: teachers.find((t) => t.id === tid),
            })),
          },
          ...courses,
        ]);
      }
      setIsModalOpen(false);
      router.refresh();
    } else {
      setError(result.error || "Something went wrong.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) return;
    const result = await deleteCourse(id);
    if (result.success) {
      setCourses(courses.filter((c) => c.id !== id));
      router.refresh();
    } else {
      alert(result.error || "Failed to delete course.");
    }
  };

  const toggleTeacher = (teacherId: string) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(teacherId)
        ? prev.filter((id) => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.shortDescription.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "ALL" || c.type === typeFilter;
    const matchesCategory = categoryFilter === "ALL" || c.categoryId === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-[#CA8E25]" />
            Course Management
          </h1>
          <p className="text-slate-400 mt-1">Configure and manage Kaputra Academy course offerings.</p>
        </div>
        <Button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl px-5 py-2.5 flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <Plus className="h-5 w-5" />
          Add Course
        </Button>
      </div>

      {/* Filters section */}
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses..."
            className="pl-12 bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="REGULAR">Regular Class</option>
            <option value="COMPETITION">Competition Class</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid List of Courses */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <motion.div
            layout
            key={course.id}
            className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all group relative"
          >
            <div>
              {/* Type Badge & Publish Status */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                      course.type === "COMPETITION"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    }`}
                  >
                    {course.type}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700 font-mono">
                    Flexible Sessions
                  </span>
                </div>

                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full ${
                    course.isPublished
                      ? "bg-green-500/10 text-green-400"
                      : "bg-slate-500/10 text-slate-400"
                  }`}
                >
                  {course.isPublished ? "Published" : "Draft"}
                </span>
              </div>

              {/* Title & Desc */}
              <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                {course.title}
              </h3>
              <p className="text-slate-400 text-sm mt-2 line-clamp-2">{course.shortDescription}</p>

              {/* Course Meta Info */}
              <div className="mt-4 pt-4 border-t border-slate-900 space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                  <Layers className="h-4 w-4 text-[#CA8E25]" />
                  <span>Category: <span className="text-white">{course.category?.name || "Mathematics"}</span></span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                  <Calendar className="h-4 w-4 text-[#CA8E25]" />
                  <span className="line-clamp-1">Schedule: <span className="text-white">{course.schedule}</span></span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                  <DollarSign className="h-4 w-4 text-[#CA8E25]" />
                  <span>
                    From: <span className="text-[#CA8E25] font-bold">Rp {course.price.toLocaleString("id-ID")}</span>
                  </span>
                </div>
              </div>

              {/* Assigned Teachers */}
              <div className="mt-4">
                <p className="text-xs text-slate-500 font-bold mb-2">Assigned Teachers:</p>
                <div className="flex flex-wrap gap-1.5">
                  {course.teachers && course.teachers.length > 0 ? (
                    course.teachers.map((ta: any) => (
                      <span
                        key={ta.teacherId}
                        className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-md"
                      >
                        {ta.teacher.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-600 text-xs italic">No teachers assigned</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-900">
              <Button
                variant="ghost"
                onClick={() => openEditModal(course)}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2 flex items-center justify-center gap-2 text-xs border border-slate-800"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleDelete(course.id)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl px-4 py-2 flex items-center justify-center gap-2 text-xs border border-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        ))}

        {filteredCourses.length === 0 && (
          <div className="col-span-full bg-slate-950 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            No courses found matching filters.
          </div>
        )}
      </div>

      {/* Modal - Add / Edit Course */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-8"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <h2 className="text-xl font-bold text-white">
                  {editingCourse ? "Edit Course" : "Add New Course"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-slate-300">
                      Course Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="e.g. Primary Math Olympiad Coaching"
                      className="bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600"
                    />
                  </div>

                  {/* Slug */}
                  <div className="space-y-2">
                    <Label htmlFor="slug" className="text-slate-300">
                      URL Slug <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="e.g. primary-math-olympiad"
                      className="bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600 font-mono text-sm"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label className="text-slate-300">
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Type */}
                  <div className="space-y-2">
                    <Label className="text-slate-300">Program Type</Label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                    >
                      <option value="REGULAR">Regular Class</option>
                      <option value="COMPETITION">Competition Class</option>
                    </select>
                  </div>

                  <div className="space-y-4 col-span-full border border-slate-800 rounded-xl p-4 bg-slate-900/50">
                    <Label className="text-slate-300 font-bold block mb-2">Program Pricing (Rp)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="space-y-2">
                        <Label htmlFor="pricePrivateOnce" className="text-xs text-slate-400">Private - 1 Session/Week</Label>
                        <Input
                          id="pricePrivateOnce" type="number" value={pricePrivateOnce}
                          onChange={(e) => setPricePrivateOnce(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-white rounded-xl focus:border-blue-600 h-9"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="pricePrivateTwice" className="text-xs text-slate-400">Private - 2 Sessions/Week</Label>
                        <Input
                          id="pricePrivateTwice" type="number" value={pricePrivateTwice}
                          onChange={(e) => setPricePrivateTwice(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-white rounded-xl focus:border-blue-600 h-9"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="priceSemiPrivateOnce" className="text-xs text-slate-400">Semi-Private - 1 Session/Week</Label>
                        <Input
                          id="priceSemiPrivateOnce" type="number" value={priceSemiPrivateOnce}
                          onChange={(e) => setPriceSemiPrivateOnce(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-white rounded-xl focus:border-blue-600 h-9"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="priceSemiPrivateTwice" className="text-xs text-slate-400">Semi-Private - 2 Sessions/Week</Label>
                        <Input
                          id="priceSemiPrivateTwice" type="number" value={priceSemiPrivateTwice}
                          onChange={(e) => setPriceSemiPrivateTwice(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-white rounded-xl focus:border-blue-600 h-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Settlement Account */}
                  <div className="space-y-2">
                    <Label className="text-slate-300">Settlement Account</Label>
                    <select
                      value={settlementAccount}
                      onChange={(e) => setSettlementAccount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                    >
                      <option value="COMPANY">Company Account</option>
                      <option value="PERSONAL">Personal Account (Owner)</option>
                    </select>
                  </div>

                  {/* Base Display Price */}
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-slate-300">
                      Catalog Display Price (Starting from)
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600"
                    />
                  </div>

                  {/* Registration Fee */}
                  <div className="space-y-2">
                    <Label htmlFor="regFee" className="text-slate-300">
                      Registration Fee (Rp)
                    </Label>
                    <Input
                      id="regFee"
                      type="number"
                      value={registrationFee}
                      onChange={(e) => setRegistrationFee(e.target.value)}
                      className="bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600"
                    />
                  </div>

                  {/* Schedule */}
                  <div className="space-y-2 col-span-full">
                    <Label htmlFor="schedule" className="text-slate-300">
                      Schedule Details <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="schedule"
                      value={schedule}
                      onChange={(e) => setSchedule(e.target.value)}
                      placeholder="e.g. Saturdays at 10:00 - 12:00 or Flexible Sessions"
                      className="bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600"
                    />
                  </div>

                  {/* Short Description */}
                  <div className="space-y-2 col-span-full">
                    <Label htmlFor="shortDesc" className="text-slate-300">
                      Short Description <span className="text-red-500">*</span>
                    </Label>
                    <textarea
                      id="shortDesc"
                      value={shortDescription}
                      onChange={(e) => setShortDescription(e.target.value)}
                      placeholder="A brief overview displayed on cards and listings."
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 focus:border-blue-600 focus:outline-none text-sm"
                    />
                  </div>

                  {/* Full Description */}
                  <div className="space-y-2 col-span-full">
                    <Label htmlFor="fullDesc" className="text-slate-300">
                      Full Course Syllabus / Details
                    </Label>
                    <textarea
                      id="fullDesc"
                      value={fullDescription}
                      onChange={(e) => setFullDescription(e.target.value)}
                      placeholder="Comprehensive details about course topics, materials, and methodology."
                      rows={4}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 focus:border-blue-600 focus:outline-none text-sm"
                    />
                  </div>

                  {/* Objectives */}
                  <div className="space-y-2">
                    <Label htmlFor="objectives" className="text-slate-300">
                      Learning Objectives (semicolon separated)
                    </Label>
                    <textarea
                      id="objectives"
                      value={objectives}
                      onChange={(e) => setObjectives(e.target.value)}
                      placeholder="e.g. Mastery of geometry; Complex problem-solving skills"
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 focus:border-blue-600 focus:outline-none text-sm"
                    />
                  </div>

                  {/* Learning Outcomes */}
                  <div className="space-y-2">
                    <Label htmlFor="outcomes" className="text-slate-300">
                      Expected Outcomes (semicolon separated)
                    </Label>
                    <textarea
                      id="outcomes"
                      value={learningOutcomes}
                      onChange={(e) => setLearningOutcomes(e.target.value)}
                      placeholder="e.g. Ready for SASMO competition; Certification"
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 focus:border-blue-600 focus:outline-none text-sm"
                    />
                  </div>

                  {/* Thumbnail URL */}
                  <div className="space-y-2 col-span-full">
                    <Label htmlFor="thumbnail" className="text-slate-300">
                      Thumbnail Image URL
                    </Label>
                    <Input
                      id="thumbnail"
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      placeholder="/uploads/course-image.png"
                      className="bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600"
                    />
                  </div>

                  {/* Teacher Assignment */}
                  <div className="space-y-2 col-span-full">
                    <Label className="text-slate-300 font-bold block mb-2">Assign Instructors</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-40 overflow-y-auto bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                      {teachers.map((teacher) => {
                        const isSelected = selectedTeacherIds.includes(teacher.id);
                        return (
                          <div
                            key={teacher.id}
                            onClick={() => toggleTeacher(teacher.id)}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                              isSelected
                                ? "bg-blue-600/10 border-blue-500 text-white"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                                isSelected
                                  ? "bg-blue-600 border-blue-500"
                                  : "border-slate-700 bg-slate-950"
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <div className="text-xs">
                              <p className="font-semibold">{teacher.name}</p>
                              <p className="text-slate-500 font-mono text-[9px]">{teacher.email}</p>
                            </div>
                          </div>
                        );
                      })}
                      {teachers.length === 0 && (
                        <p className="text-slate-600 text-xs italic col-span-full">No instructors available</p>
                      )}
                    </div>
                  </div>

                  {/* Publish Status Toggle */}
                  <div className="flex items-center gap-3 col-span-full">
                    <input
                      type="checkbox"
                      id="publishCheck"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-950"
                    />
                    <Label htmlFor="publishCheck" className="text-slate-300 cursor-pointer select-none">
                      Publish Course (visible to public catalog)
                    </Label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4 border-t border-slate-900">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-3 border border-slate-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 shadow-lg shadow-blue-600/20 font-bold"
                  >
                    Save Course
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
