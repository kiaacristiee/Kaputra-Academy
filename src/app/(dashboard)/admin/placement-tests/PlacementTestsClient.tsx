"use client";

import { useState } from "react";
import { Award, Plus, Trash2, Edit2, Download, Save, CheckCircle2, AlertCircle, Search, HelpCircle, Settings, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { updatePlacementTestConfig } from "@/actions/adminExtra";

import { getGradeLabel, STUDENT_GRADES } from "@/lib/grades";

interface PlacementTestResult {
  id: string;
  studentIdStr: string;
  testCode: string;
  status: string;
  score: number | null;
  qualificationStatus: string | null;
  submittedAt: string | null;
  registration: {
    studentName: string;
    studentAge: number;
    parentName: string;
    parentEmail: string;
    parentPhone: string;
    grade?: string | null;
    course: { title: string };
  };
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
}

interface Config {
  passingScore: number;
  questions: Question[];
}

interface Props {
  results: PlacementTestResult[];
  config: Config;
}

export default function PlacementTestsClient({ results, config: initialConfig }: Props) {
  const [activeTab, setActiveTab] = useState<"results" | "config">("results");
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");
  const [config, setConfig] = useState<Config>(initialConfig);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleBulkUploadPlacement = async () => {
    if (!file) {
      alert("Pilih file ZIP terlebih dahulu.");
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/placement-tests/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        showStatus("success", `Berhasil mengunggah ${data.count} soal placement test!`);
        setConfig(data.config);
        setIsBulkOpen(false);
        setFile(null);
      } else {
        showStatus("error", `Error: ${data.error}`);
      }
    } catch (e) {
      showStatus("error", "Terjadi kesalahan saat mengunggah file.");
    } finally {
      setIsUploading(false);
    }
  };

  // Question editing form states
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null);
  const [qForm, setQForm] = useState<Question>({ id: "", question: "", options: ["", "", "", ""], correctAnswer: "" });

  const showStatus = (t: "success" | "error", text: string) => {
    setMessage({ type: t, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    const res = await updatePlacementTestConfig(config);
    if (res.success) {
      showStatus("success", "Placement test configuration saved successfully!");
    } else {
      showStatus("error", (res as any).error || "Failed to save configuration.");
    }
    setLoading(false);
  };

  const handleAddQuestion = () => {
    const newId = `q_${Date.now()}`;
    const newQ: Question = {
      id: newId,
      question: "New Multiple Choice Question?",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: "Option A",
    };
    setConfig((prev) => ({
      ...prev,
      questions: [...prev.questions, newQ],
    }));
    setEditingQuestionIdx(config.questions.length);
    setQForm(newQ);
  };

  const handleEditQuestion = (idx: number) => {
    setEditingQuestionIdx(idx);
    setQForm({ ...config.questions[idx] });
  };

  const handleSaveQuestion = () => {
    if (editingQuestionIdx === null) return;
    setConfig((prev) => {
      const qs = [...prev.questions];
      qs[editingQuestionIdx] = { ...qForm };
      return { ...prev, questions: qs };
    });
    setEditingQuestionIdx(null);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (!confirm("Delete this question?")) return;
    setConfig((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx),
    }));
    if (editingQuestionIdx === idx) setEditingQuestionIdx(null);
  };

  const handleExportCSV = () => {
    const headers = [
      "Student ID",
      "Student Name",
      "Grade",
      "Age",
      "Parent Name",
      "Parent Email",
      "Parent Phone",
      "Course",
      "Test Code",
      "Status",
      "Score",
      "Result",
      "Submitted At",
    ];

    const rows = results.map((r) => [
      r.studentIdStr,
      r.registration.studentName,
      getGradeLabel(r.registration.grade),
      r.registration.studentAge,
      r.registration.parentName,
      r.registration.parentEmail,
      r.registration.parentPhone,
      r.registration.course.title,
      r.testCode,
      r.status,
      r.score ?? "N/A",
      r.qualificationStatus ?? "N/A",
      r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : "N/A",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `placement_test_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredResults = results.filter((r) => {
    const matchesSearch =
      r.registration.studentName.toLowerCase().includes(search.toLowerCase()) ||
      r.studentIdStr.toLowerCase().includes(search.toLowerCase()) ||
      r.testCode.toLowerCase().includes(search.toLowerCase());
    const matchesGrade = gradeFilter === "ALL" || r.registration.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Award className="h-8 w-8 text-[#CA8E25]" />
            Placement Test CMS
          </h1>
          <p className="text-slate-400 mt-2">Manage test questions, configurations, and review student grades.</p>
        </div>
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-2 p-4 rounded-xl border ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            {message.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("results")}
          className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${
            activeTab === "results"
              ? "border-[#CA8E25] text-white"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Test Results & Export
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${
            activeTab === "config"
              ? "border-[#CA8E25] text-white"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Question Builder & Passing Grade
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
        {activeTab === "results" ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-3 max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by student name, ID, code..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
                  />
                </div>
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
                >
                  <option value="ALL">All Grades</option>
                  {STUDENT_GRADES.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={handleExportCSV}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl px-5 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Results (CSV)
              </Button>
            </div>

            {filteredResults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase bg-slate-900 text-slate-500 font-bold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Student Info</th>
                      <th className="px-4 py-3">Grade</th>
                      <th className="px-4 py-3">Parent Info</th>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Qualification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-950/60">
                    {filteredResults.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-900/20 transition">
                        <td className="px-4 py-3">
                          <p className="font-bold text-white">{r.registration.studentName}</p>
                          <p className="text-xs text-slate-500 font-mono">{r.studentIdStr}</p>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-amber-400">
                          {getGradeLabel(r.registration.grade)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs">{r.registration.parentName}</p>
                          <p className="text-[10px] text-slate-500">{r.registration.parentEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-xs">{r.registration.course.title}</td>
                        <td className="px-4 py-3 font-mono text-xs text-amber-500">{r.testCode}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            r.status === "SUBMITTED"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : r.status === "IN_PROGRESS"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}>
                            {r.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-white">{r.score !== null ? `${r.score}%` : "—"}</td>
                        <td className="px-4 py-3">
                          {r.qualificationStatus ? (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              r.qualificationStatus === "QUALIFIED"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}>
                              {r.qualificationStatus}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">No placement tests matching search.</p>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Score Config */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Settings className="h-4 w-4 text-[#CA8E25]" /> Passing Score Target
                </h3>
                <p className="text-xs text-slate-500">Students scoring at or above this percentage will be automatically qualified.</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0} max={100}
                  value={config.passingScore}
                  onChange={(e) => setConfig((p) => ({ ...p, passingScore: parseInt(e.target.value) || 0 }))}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-center w-24 font-bold text-white focus:outline-none focus:border-[#CA8E25]"
                />
                <span className="text-lg font-bold text-white">%</span>
              </div>
            </div>

            {/* Question List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-[#CA8E25]" /> Questions ({config.questions.length})
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setIsBulkOpen(true)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <Upload className="h-4 w-4" /> Bulk Upload Soal
                  </Button>
                  <Button
                    onClick={handleAddQuestion}
                    size="sm"
                    className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> Add Question
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Side: Question List */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {config.questions.map((q, idx) => (
                    <div
                      key={q.id}
                      onClick={() => handleEditQuestion(idx)}
                      className={`p-4 rounded-xl border transition cursor-pointer text-left ${
                        editingQuestionIdx === idx
                          ? "bg-[#CA8E25]/10 border-[#CA8E25] text-white"
                          : "bg-slate-900/60 border-slate-850 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-bold text-white leading-snug">
                          {idx + 1}. {q.question}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteQuestion(idx);
                          }}
                          className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {q.options.map((opt) => (
                          <span
                            key={opt}
                            className={`text-[10px] px-2 py-1 rounded truncate border ${
                              opt === q.correctAnswer
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold"
                                : "bg-slate-950/40 text-slate-500 border-slate-800"
                            }`}
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right Side: Question Editor Form */}
                <div className="bg-slate-900/60 border border-slate-850 p-5 rounded-2xl space-y-4 h-fit">
                  {editingQuestionIdx !== null ? (
                    <div className="space-y-4">
                      <h4 className="font-bold text-white text-sm">Edit Question #{editingQuestionIdx + 1}</h4>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase">Question Text</label>
                        <textarea
                          rows={3}
                          value={qForm.question}
                          onChange={(e) => setQForm((p) => ({ ...p, question: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase block">Options</label>
                        {qForm.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex gap-2 items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase">{String.fromCharCode(65 + oIdx)}</span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) =>
                                setQForm((p) => {
                                  const opts = [...p.options];
                                  opts[oIdx] = e.target.value;
                                  return { ...p, options: opts };
                                })
                              }
                              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#CA8E25]"
                            />
                            <input
                              type="radio"
                              name="correctAnswer"
                              checked={qForm.correctAnswer === opt && opt !== ""}
                              onChange={() => setQForm((p) => ({ ...p, correctAnswer: opt }))}
                              className="accent-[#CA8E25] h-4 w-4 shrink-0"
                              title="Mark as correct answer"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <Button
                          onClick={handleSaveQuestion}
                          className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl"
                        >
                          Keep Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-slate-500 space-y-2">
                      <HelpCircle className="h-8 w-8 mx-auto opacity-30 text-[#CA8E25]" />
                      <p className="text-sm font-medium">Select a question to edit or add a new one.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Save Config Button */}
            <div className="pt-6 border-t border-slate-900 flex justify-end">
              <Button
                onClick={handleSaveConfig}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl px-6 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? "Saving config..." : "Save Test Configuration"}
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* Bulk Upload Modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-xl max-w-md w-full space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-[#CA8E25]" />
                Bulk Upload Placement Questions
              </h2>
              <button onClick={() => setIsBulkOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase">Pilih File (.zip)</label>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
              />
              <p className="text-xs text-slate-500">
                Upload file ZIP yang berisi Excel (Template Soal) dan folder images (jika ada gambar).
              </p>
            </div>

            <div className="pt-2">
              <a
                href="/api/teacher/mock-tests/template"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#CA8E25] hover:underline flex items-center gap-1.5 font-bold"
              >
                <Download className="w-4 h-4" /> Download Excel/ZIP Template
              </a>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <Button variant="outline" onClick={() => setIsBulkOpen(false)} className="border-slate-800 text-slate-300 rounded-xl text-xs">
                Batal
              </Button>
              <Button onClick={handleBulkUploadPlacement} disabled={isUploading || !file} className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl text-xs px-5">
                {isUploading ? "Mengunggah..." : "Upload Soal"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
