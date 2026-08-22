"use client";

import { useState } from "react";
import { Plus, Search, Edit2, Trash2, X, Calendar, DollarSign, Clock, AlertCircle, UserCheck, Users, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCamp, updateCamp, deleteCamp, uploadCampThumbnail, ScheduleInput } from "@/actions/camps";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function CampsClient({
  initialCamps,
  teachers = [],
}: {
  initialCamps: any[];
  teachers?: { id: string; name: string; email: string }[];
}) {
  const router = useRouter();
  const [camps, setCamps] = useState(initialCamps);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [visibilityFilter, setVisibilityFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCamp, setEditingCamp] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  
  // Frequency & Pricing State
  const [allow1xWeek, setAllow1xWeek] = useState(true);
  const [price1xWeek, setPrice1xWeek] = useState("1500000");
  const [allow2xWeek, setAllow2xWeek] = useState(true);
  const [price2xWeek, setPrice2xWeek] = useState("2800000");

  const [capacity, setCapacity] = useState("4");
  const [status, setStatus] = useState("OPEN");
  const [visibility, setVisibility] = useState("DRAFT");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Schedules State
  const [schedules, setSchedules] = useState<ScheduleInput[]>([
    { dayOfWeek: "FRIDAY", startTime: "15:00", endTime: "16:30", className: "Class A", capacity: 4, teacherId: null },
    { dayOfWeek: "SATURDAY", startTime: "09:00", endTime: "10:30", className: "Class A", capacity: 4, teacherId: null },
    { dayOfWeek: "FRIDAY", startTime: "16:30", endTime: "18:00", className: "Class B", capacity: 4, teacherId: null },
    { dayOfWeek: "SATURDAY", startTime: "10:30", endTime: "12:00", className: "Class B", capacity: 4, teacherId: null },
  ]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("thumbnailFile", file);
      
      const res = await uploadCampThumbnail(formData);
      if (res.success && res.thumbnailUrl) {
        setThumbnailUrl(res.thumbnailUrl);
      } else {
        setError(res.error || "Failed to upload image.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
    );
  };

  const openAddModal = () => {
    setEditingCamp(null);
    setName("");
    setSlug("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setRegistrationDeadline("");
    setAllow1xWeek(true);
    setPrice1xWeek("1500000");
    setAllow2xWeek(true);
    setPrice2xWeek("2800000");
    setCapacity("4");
    setStatus("OPEN");
    setVisibility("DRAFT");
    setThumbnailUrl("");
    setError(null);

    // Default pre-filled schedules
    setSchedules([
      { dayOfWeek: "FRIDAY", startTime: "15:00", endTime: "16:30", className: "Class A", capacity: 4, teacherId: null },
      { dayOfWeek: "SATURDAY", startTime: "09:00", endTime: "10:30", className: "Class A", capacity: 4, teacherId: null },
      { dayOfWeek: "FRIDAY", startTime: "16:30", endTime: "18:00", className: "Class B", capacity: 4, teacherId: null },
      { dayOfWeek: "SATURDAY", startTime: "10:30", endTime: "12:00", className: "Class B", capacity: 4, teacherId: null },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (camp: any) => {
    setEditingCamp(camp);
    setName(camp.name);
    setSlug(camp.slug);
    setDescription(camp.description);
    
    const formatToInputDate = (dStr: string) => {
      if (!dStr) return "";
      const d = new Date(dStr);
      return d.toISOString().split("T")[0];
    };

    setStartDate(formatToInputDate(camp.startDate));
    setEndDate(formatToInputDate(camp.endDate));
    setRegistrationDeadline(formatToInputDate(camp.registrationDeadline));
    
    setAllow1xWeek(camp.allow1xWeek ?? true);
    setPrice1xWeek((camp.price1xWeek ?? camp.price ?? 0).toString());
    setAllow2xWeek(camp.allow2xWeek ?? true);
    setPrice2xWeek((camp.price2xWeek ?? camp.price ?? 0).toString());

    setCapacity(camp.capacity ? camp.capacity.toString() : "4");
    setStatus(camp.status);
    setVisibility(camp.visibility);
    setThumbnailUrl(camp.thumbnailUrl || "");
    setError(null);

    if (camp.schedules && camp.schedules.length > 0) {
      setSchedules(
        camp.schedules.map((s: any) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          className: s.className,
          capacity: s.capacity || 4,
          teacherId: s.teacherId || s.teacher?.id || null,
        }))
      );
    } else {
      setSchedules([
        { dayOfWeek: "FRIDAY", startTime: "15:00", endTime: "16:30", className: "Class A", capacity: 4, teacherId: null },
        { dayOfWeek: "SATURDAY", startTime: "09:00", endTime: "10:30", className: "Class A", capacity: 4, teacherId: null },
        { dayOfWeek: "FRIDAY", startTime: "16:30", endTime: "18:00", className: "Class B", capacity: 4, teacherId: null },
        { dayOfWeek: "SATURDAY", startTime: "10:30", endTime: "12:00", className: "Class B", capacity: 4, teacherId: null },
      ]);
    }

    setIsModalOpen(true);
  };

  const handleAddScheduleSlot = () => {
    setSchedules([
      ...schedules,
      { dayOfWeek: "FRIDAY", startTime: "15:00", endTime: "16:30", className: "Class A", capacity: 4, teacherId: null },
    ]);
  };

  const handleRemoveScheduleSlot = (index: number) => {
    if (schedules.length <= 1) {
      alert("At least one schedule slot is required.");
      return;
    }
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleScheduleChange = (index: number, field: keyof ScheduleInput, value: any) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], [field]: value };
    setSchedules(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !slug || !description || !startDate || !endDate || !registrationDeadline) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!allow1xWeek && !allow2xWeek) {
      setError("Please enable at least one learning frequency option (1x/week or 2x/week).");
      return;
    }

    const p1 = parseFloat(price1xWeek);
    const p2 = parseFloat(price2xWeek);

    if (allow1xWeek && (isNaN(p1) || p1 < 0)) {
      setError("Please enter a valid price for 1 Session / Week.");
      return;
    }

    if (allow2xWeek && (isNaN(p2) || p2 < 0)) {
      setError("Please enter a valid price for 2 Sessions / Week.");
      return;
    }

    if (schedules.length === 0) {
      setError("Please configure at least one class schedule slot.");
      return;
    }

    const payload = {
      name,
      slug,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      registrationDeadline: new Date(registrationDeadline),
      allow1xWeek,
      price1xWeek: allow1xWeek ? p1 : 0,
      allow2xWeek,
      price2xWeek: allow2xWeek ? p2 : 0,
      capacity: capacity ? parseInt(capacity) : 4,
      status,
      visibility,
      thumbnailUrl: thumbnailUrl || null,
      schedules,
    };

    let result;
    if (editingCamp) {
      result = await updateCamp(editingCamp.id, payload);
    } else {
      result = await createCamp(payload);
    }

    if (result.success && result.camp) {
      setIsModalOpen(false);
      router.refresh();
    } else {
      setError(result.error || "Something went wrong.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this camp program? This action cannot be undone.")) return;
    const result = await deleteCamp(id);
    if (result.success) {
      setCamps(camps.filter((c) => c.id !== id));
      router.refresh();
    } else {
      alert(result.error || "Failed to delete camp program.");
    }
  };

  const filteredCamps = camps.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchesVisibility = visibilityFilter === "ALL" || c.visibility === visibilityFilter;
    return matchesSearch && matchesStatus && matchesVisibility;
  });

  const formatDate = (dStr: string) => {
    if (!dStr) return "-";
    return new Date(dStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatPrice = (val?: number) => {
    if (val == null) return "0";
    return val.toLocaleString("id-ID");
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Calendar className="h-8 w-8 text-[#CA8E25]" />
            Camp Program CMS
          </h1>
          <p className="text-slate-400 mt-1">
            Configure learning frequencies, fixed schedules, and capacity-constrained class groups.
          </p>
        </div>
        <Button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl px-5 py-2.5 flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <Plus className="h-5 w-5" />
          Create Camp Program
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
            placeholder="Search camp programs..."
            className="pl-12 bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
          >
            <option value="ALL">All Visibilities</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {/* Grid List of Camps */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCamps.map((camp) => (
          <motion.div
            layout
            key={camp.id}
            className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all group relative"
          >
            <div>
              {/* Type Badge & Publish Status */}
              <div className="flex justify-between items-center mb-4">
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                    camp.status === "OPEN"
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  {camp.status}
                </span>

                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full ${
                    camp.visibility === "PUBLISHED"
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/25"
                      : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                  }`}
                >
                  {camp.visibility}
                </span>
              </div>

              {/* Title & Desc */}
              <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors font-mono">
                {camp.name}
              </h3>
              <p className="text-slate-400 text-sm mt-2 line-clamp-2">{camp.description}</p>

              {/* Learning Frequencies & Pricing */}
              <div className="mt-4 p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Learning Frequencies</p>
                {camp.allow1xWeek && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">1x / Week (4 Sessions/mo):</span>
                    <span className="text-[#CA8E25] font-bold">Rp {formatPrice(camp.price1xWeek || camp.price)}</span>
                  </div>
                )}
                {camp.allow2xWeek && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">2x / Week (8 Sessions/mo):</span>
                    <span className="text-[#CA8E25] font-bold">Rp {formatPrice(camp.price2xWeek || camp.price)}</span>
                  </div>
                )}
              </div>

              {/* Camp Meta & Schedule Details */}
              <div className="mt-4 pt-4 border-t border-slate-900 space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                  <Calendar className="h-4 w-4 text-[#CA8E25]" />
                  <span>Duration: <span className="text-white">{formatDate(camp.startDate)} - {formatDate(camp.endDate)}</span></span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                  <Clock className="h-4 w-4 text-[#CA8E25]" />
                  <span>Open until: <span className="text-white">{formatDate(camp.registrationDeadline)}</span></span>
                </div>

                {/* Schedules Summary */}
                <div className="pt-2 space-y-2">
                  <p className="text-xs font-bold text-slate-400 flex items-center justify-between">
                    <span>Fixed Schedule Slots (Strict 4/Class)</span>
                    <span className="text-blue-400">{camp.schedules?.length || 0} slots</span>
                  </p>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {camp.schedules && camp.schedules.length > 0 ? (
                      camp.schedules.map((s: any) => {
                        const booked = s._count?.registrationSlots || 0;
                        const isFull = booked >= (s.capacity || 4);
                        return (
                          <div
                            key={s.id}
                            className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2 text-xs flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">
                                {s.className} • {s.dayOfWeek} ({s.startTime} - {s.endTime})
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isFull
                                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                }`}
                              >
                                {booked} / {s.capacity || 4} Students
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <UserCheck className="h-3.5 w-3.5 text-[#CA8E25]" />
                              <span>Teacher: <strong className="text-slate-200">{s.teacher?.name || "Unassigned"}</strong></span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-500 italic">No schedule slots configured.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-900">
              <Button
                variant="ghost"
                onClick={() => openEditModal(camp)}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2 flex items-center justify-center gap-2 text-xs border border-slate-800"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit Camp & Schedules
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleDelete(camp.id)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl px-4 py-2 flex items-center justify-center gap-2 text-xs border border-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        ))}

        {filteredCamps.length === 0 && (
          <div className="col-span-full bg-slate-950 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            No camp programs found matching filters.
          </div>
        )}
      </div>

      {/* Modal - Add / Edit Camp */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl my-8"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <h2 className="text-xl font-bold text-white">
                  {editingCamp ? "Edit Camp Program & Schedules" : "Add New Camp Program"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 shrink-0 text-red-400" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                )}

                {/* Section 1: Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#CA8E25] uppercase tracking-wider border-b border-slate-900 pb-2">
                    1. Basic Camp Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-300">
                        Program Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="e.g. Science Summer Camp 2026"
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
                        placeholder="e.g. summer-camp-2026"
                        className="bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600 font-mono text-sm"
                      />
                    </div>

                    {/* Start Date */}
                    <div className="space-y-2">
                      <Label htmlFor="startDate" className="text-slate-300">
                        Start Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600"
                      />
                    </div>

                    {/* End Date */}
                    <div className="space-y-2">
                      <Label htmlFor="endDate" className="text-slate-300">
                        End Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600"
                      />
                    </div>

                    {/* Registration Deadline */}
                    <div className="space-y-2">
                      <Label htmlFor="deadline" className="text-slate-300">
                        Registration Open Until <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={registrationDeadline}
                        onChange={(e) => setRegistrationDeadline(e.target.value)}
                        className="bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600"
                      />
                    </div>

                    {/* Thumbnail File Upload */}
                    <div className="space-y-2">
                      <Label className="text-slate-300 font-medium">Thumbnail Image</Label>
                      {thumbnailUrl ? (
                        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 h-28 w-44 group">
                          <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setThumbnailUrl("")}
                            className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black text-rose-500 p-1.5 rounded-full transition-all"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-full">
                          <label
                            htmlFor="thumbnail-upload"
                            className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-800 bg-slate-900/50 hover:bg-slate-900 rounded-xl cursor-pointer hover:border-blue-600/50 transition-all group"
                          >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Plus className="h-6 w-6 text-slate-500 group-hover:text-blue-500 mb-2" />
                              <p className="text-xs text-slate-500 group-hover:text-slate-300">
                                {uploading ? "Uploading..." : "Click to upload camp image"}
                              </p>
                            </div>
                            <input
                              id="thumbnail-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              disabled={uploading}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Status Dropdown */}
                    <div className="space-y-2">
                      <Label className="text-slate-300">Registration Status</Label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                      >
                        <option value="OPEN">Open</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </div>

                    {/* Visibility Dropdown */}
                    <div className="space-y-2">
                      <Label className="text-slate-300">Visibility</Label>
                      <select
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Published</option>
                      </select>
                    </div>

                    {/* Description */}
                    <div className="space-y-2 col-span-full">
                      <Label htmlFor="desc" className="text-slate-300">
                        Description <span className="text-red-500">*</span>
                      </Label>
                      <textarea
                        id="desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter camp details, activities, agenda, etc."
                        rows={3}
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 focus:border-blue-600 focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Session Frequencies & Pricing */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-sm font-bold text-[#CA8E25] uppercase tracking-wider border-b border-slate-900 pb-2">
                    2. Learning Frequency Options & Pricing
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Option 1: 1x/week */}
                    <div
                      className={`p-4 rounded-xl border transition-all ${
                        allow1xWeek ? "bg-slate-900/90 border-blue-600/50" : "bg-slate-950 border-slate-800 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allow1xWeek}
                            onChange={(e) => setAllow1xWeek(e.target.checked)}
                            className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-700"
                          />
                          <span className="font-bold text-white text-sm">Option 1: 1 Session / Week</span>
                        </label>
                        <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono">
                          4 Sessions / Month
                        </span>
                      </div>

                      {allow1xWeek && (
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-400">Price for 1x/Week (Rp)</Label>
                          <Input
                            type="number"
                            value={price1xWeek}
                            onChange={(e) => setPrice1xWeek(e.target.value)}
                            placeholder="e.g. 1500000"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl focus:border-blue-600"
                          />
                        </div>
                      )}
                    </div>

                    {/* Option 2: 2x/week */}
                    <div
                      className={`p-4 rounded-xl border transition-all ${
                        allow2xWeek ? "bg-slate-900/90 border-blue-600/50" : "bg-slate-950 border-slate-800 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allow2xWeek}
                            onChange={(e) => setAllow2xWeek(e.target.checked)}
                            className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-700"
                          />
                          <span className="font-bold text-white text-sm">Option 2: 2 Sessions / Week</span>
                        </label>
                        <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-mono">
                          8 Sessions / Month
                        </span>
                      </div>

                      {allow2xWeek && (
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-400">Price for 2x/Week (Rp)</Label>
                          <Input
                            type="number"
                            value={price2xWeek}
                            onChange={(e) => setPrice2xWeek(e.target.value)}
                            placeholder="e.g. 2800000"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl focus:border-blue-600"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 3: Schedule Slots & Teacher Assignments */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#CA8E25] uppercase tracking-wider">
                        3. Fixed Schedule Slots & Teacher Assignments
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Strict capacity limit: <strong>4 students per class group slot</strong>.
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={handleAddScheduleSlot}
                      className="bg-slate-900 hover:bg-slate-800 text-blue-400 border border-blue-500/30 rounded-lg px-3 py-1 text-xs flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Custom Slot
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {schedules.map((sched, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3 relative group"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-xs font-bold text-white flex items-center gap-2 font-mono">
                            <Users className="h-3.5 w-3.5 text-[#CA8E25]" />
                            Slot #{idx + 1}: {sched.className} ({sched.dayOfWeek})
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveScheduleSlot(idx)}
                            className="text-slate-500 hover:text-red-400 transition-colors p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                          {/* Class Name */}
                          <div>
                            <Label className="text-[11px] text-slate-400">Class Group</Label>
                            <Input
                              value={sched.className}
                              onChange={(e) => handleScheduleChange(idx, "className", e.target.value)}
                              placeholder="e.g. Class A"
                              className="bg-slate-950 border-slate-800 text-white rounded-lg text-xs"
                            />
                          </div>

                          {/* Day of Week */}
                          <div>
                            <Label className="text-[11px] text-slate-400">Day</Label>
                            <select
                              value={sched.dayOfWeek}
                              onChange={(e) => handleScheduleChange(idx, "dayOfWeek", e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2.5 py-2 text-xs focus:outline-none"
                            >
                              <option value="FRIDAY">FRIDAY</option>
                              <option value="SATURDAY">SATURDAY</option>
                            </select>
                          </div>

                          {/* Start Time */}
                          <div>
                            <Label className="text-[11px] text-slate-400">Start Time</Label>
                            <Input
                              value={sched.startTime}
                              onChange={(e) => handleScheduleChange(idx, "startTime", e.target.value)}
                              placeholder="15:00"
                              className="bg-slate-950 border-slate-800 text-white rounded-lg text-xs"
                            />
                          </div>

                          {/* End Time */}
                          <div>
                            <Label className="text-[11px] text-slate-400">End Time</Label>
                            <Input
                              value={sched.endTime}
                              onChange={(e) => handleScheduleChange(idx, "endTime", e.target.value)}
                              placeholder="16:30"
                              className="bg-slate-950 border-slate-800 text-white rounded-lg text-xs"
                            />
                          </div>

                          {/* Capacity */}
                          <div>
                            <Label className="text-[11px] text-slate-400">Capacity Limit</Label>
                            <Input
                              type="number"
                              value={sched.capacity || 4}
                              onChange={(e) => handleScheduleChange(idx, "capacity", parseInt(e.target.value))}
                              max={4}
                              min={1}
                              className="bg-slate-950 border-slate-800 text-white rounded-lg text-xs font-bold text-center"
                            />
                          </div>
                        </div>

                        {/* Teacher Assignment */}
                        <div className="pt-1">
                          <Label className="text-[11px] text-slate-400">Assigned Teacher</Label>
                          <select
                            value={sched.teacherId || ""}
                            onChange={(e) => handleScheduleChange(idx, "teacherId", e.target.value || null)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:border-blue-600 focus:outline-none"
                          >
                            <option value="">-- Unassigned --</option>
                            {teachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.email})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
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
                    Save Camp Program & Schedules
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
