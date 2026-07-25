"use client";

import { useState } from "react";
import { Plus, Search, Edit2, Trash2, X, Calendar, DollarSign, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCamp, updateCamp, deleteCamp, uploadCampThumbnail } from "@/actions/camps";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function CampsClient({
  initialCamps,
}: {
  initialCamps: any[];
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
  const [price, setPrice] = useState("0");
  const [capacity, setCapacity] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [visibility, setVisibility] = useState("DRAFT");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [uploading, setUploading] = useState(false);

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
    setPrice("0");
    setCapacity("");
    setStatus("OPEN");
    setVisibility("DRAFT");
    setThumbnailUrl("");
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (camp: any) => {
    setEditingCamp(camp);
    setName(camp.name);
    setSlug(camp.slug);
    setDescription(camp.description);
    
    // Format dates to YYYY-MM-DD for input fields
    const formatToInputDate = (dStr: string) => {
      if (!dStr) return "";
      const d = new Date(dStr);
      return d.toISOString().split("T")[0];
    };

    setStartDate(formatToInputDate(camp.startDate));
    setEndDate(formatToInputDate(camp.endDate));
    setRegistrationDeadline(formatToInputDate(camp.registrationDeadline));
    
    setPrice(camp.price.toString());
    setCapacity(camp.capacity ? camp.capacity.toString() : "");
    setStatus(camp.status);
    setVisibility(camp.visibility);
    setThumbnailUrl(camp.thumbnailUrl || "");
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !slug || !description || !startDate || !endDate || !registrationDeadline) {
      setError("Please fill in all required fields.");
      return;
    }

    const payload = {
      name,
      slug,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      registrationDeadline: new Date(registrationDeadline),
      price: parseFloat(price) || 0,
      capacity: capacity ? parseInt(capacity) : null,
      status,
      visibility,
      thumbnailUrl: thumbnailUrl || null,
    };

    let result;
    if (editingCamp) {
      result = await updateCamp(editingCamp.id, payload);
    } else {
      result = await createCamp(payload);
    }

    if (result.success && result.camp) {
      if (editingCamp) {
        setCamps(
          camps.map((c) =>
            c.id === editingCamp.id ? { ...c, ...result.camp } : c
          )
        );
      } else {
        setCamps([result.camp, ...camps]);
      }
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

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Calendar className="h-8 w-8 text-[#CA8E25]" />
            Camp Program CMS
          </h1>
          <p className="text-slate-400 mt-1">Configure and manage Kaputra Academy camp program offerings.</p>
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

              {/* Camp Meta Info */}
              <div className="mt-4 pt-4 border-t border-slate-900 space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                  <Calendar className="h-4 w-4 text-[#CA8E25]" />
                  <span>Start: <span className="text-white">{formatDate(camp.startDate)}</span></span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                  <Calendar className="h-4 w-4 text-[#CA8E25]" />
                  <span>End: <span className="text-white">{formatDate(camp.endDate)}</span></span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                  <Clock className="h-4 w-4 text-[#CA8E25]" />
                  <span>Deadline: <span className="text-white">{formatDate(camp.registrationDeadline)}</span></span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                  <DollarSign className="h-4 w-4 text-[#CA8E25]" />
                  <span>
                    Price: <span className="text-[#CA8E25] font-bold">Rp {camp.price.toLocaleString("id-ID")}</span>
                  </span>
                </div>
                {camp.capacity != null && (
                  <div className="text-xs text-slate-400 flex items-center gap-2.5">
                    <span className="font-bold text-[#CA8E25]">Capacity:</span>
                    <span className="text-white">{camp.capacity} Students</span>
                  </div>
                )}
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
                Edit
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
              className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-8"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <h2 className="text-xl font-bold text-white text-base">
                  {editingCamp ? "Edit Camp Program" : "Add New Camp Program"}
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
                      Registration Deadline <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={registrationDeadline}
                      onChange={(e) => setRegistrationDeadline(e.target.value)}
                      className="bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600"
                    />
                  </div>

                  {/* Price */}
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-slate-300">
                      Price (Rp) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600"
                    />
                  </div>

                  {/* Capacity */}
                  <div className="space-y-2">
                    <Label htmlFor="capacity" className="text-slate-300">
                      Capacity (optional)
                    </Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      placeholder="Unlimited if left blank"
                      className="bg-slate-900 border-slate-800 text-white rounded-xl focus:border-blue-600"
                    />
                  </div>

                  {/* Thumbnail File Upload */}
                  <div className="space-y-2">
                    <Label className="text-slate-300 font-medium">
                      Thumbnail Image
                    </Label>
                    
                    {thumbnailUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 h-28 w-44 group">
                        <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setThumbnailUrl("")}
                          className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black text-rose-500 hover:text-rose-450 p-1.5 rounded-full transition-all"
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
                      rows={5}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 focus:border-blue-600 focus:outline-none text-sm"
                    />
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
                    Save Camp Program
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
