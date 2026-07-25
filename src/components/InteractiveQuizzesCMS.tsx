"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, Save, X, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createInteractiveQuiz, updateInteractiveQuiz, deleteInteractiveQuiz } from "@/actions/interactiveQuizzes";

interface Quiz {
  id: string;
  videoId: string;
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

interface InteractiveQuizzesCMSProps {
  videoId: string;
  initialQuizzes: Quiz[];
  onUpdate: (quizzes: Quiz[]) => void;
}

export default function InteractiveQuizzesCMS({ videoId, initialQuizzes, onUpdate }: InteractiveQuizzesCMSProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>(initialQuizzes);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const [formData, setFormData] = useState({
    timeStr: "00:00",
    question: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "A",
    explanation: "",
    requireCorrect: true,
  });

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const parseTime = (timeStr: string) => {
    const parts = timeStr.split(":");
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  };

  const handleOpenEdit = (quiz: Quiz) => {
    setIsEditing(quiz.id);
    setIsAdding(false);
    setFormData({
      timeStr: formatTime(quiz.timestamp),
      question: quiz.question,
      optionA: quiz.optionA,
      optionB: quiz.optionB,
      optionC: quiz.optionC,
      optionD: quiz.optionD,
      correctAnswer: quiz.correctAnswer,
      explanation: quiz.explanation || "",
      requireCorrect: quiz.requireCorrect,
    });
  };

  const handleOpenAdd = () => {
    setIsAdding(true);
    setIsEditing(null);
    setFormData({
      timeStr: "00:00",
      question: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctAnswer: "A",
      explanation: "",
      requireCorrect: true,
    });
  };

  const handleCancel = () => {
    setIsEditing(null);
    setIsAdding(false);
  };

  const handleSave = async () => {
    const data = {
      videoId,
      timestamp: parseTime(formData.timeStr),
      question: formData.question,
      optionA: formData.optionA,
      optionB: formData.optionB,
      optionC: formData.optionC,
      optionD: formData.optionD,
      correctAnswer: formData.correctAnswer,
      explanation: formData.explanation || undefined,
      requireCorrect: formData.requireCorrect,
    };

    if (isEditing) {
      const res = await updateInteractiveQuiz(isEditing, data);
      if (res.success && res.quiz) {
        const updated = quizzes.map(q => q.id === isEditing ? res.quiz : q).sort((a, b) => a.timestamp - b.timestamp);
        setQuizzes(updated as any);
        onUpdate(updated as any);
        setIsEditing(null);
      }
    } else {
      const res = await createInteractiveQuiz(data);
      if (res.success && res.quiz) {
        const updated = [...quizzes, res.quiz].sort((a, b) => a.timestamp - b.timestamp);
        setQuizzes(updated as any);
        onUpdate(updated as any);
        setIsAdding(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this quiz?")) {
      const res = await deleteInteractiveQuiz(id);
      if (res.success) {
        const updated = quizzes.filter(q => q.id !== id);
        setQuizzes(updated);
        onUpdate(updated);
      }
    }
  };

  return (
    <div className="mt-8 border-t border-slate-800 pt-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="font-bold text-white flex items-center gap-2">
            <ListPlus className="w-4 h-4 text-[#CA8E25]" /> Interactive Quizzes
          </h4>
          <p className="text-xs text-slate-400">Add checkpoints where the video pauses for a quiz.</p>
        </div>
        {!isAdding && !isEditing && (
          <Button 
            onClick={handleOpenAdd}
            size="sm"
            className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-lg"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Quiz
          </Button>
        )}
      </div>

      {(isAdding || isEditing) && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Timestamp (MM:SS)</label>
              <input
                type="text"
                value={formData.timeStr}
                onChange={(e) => setFormData({ ...formData, timeStr: e.target.value })}
                placeholder="01:30"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Correct Answer</label>
              <select
                value={formData.correctAnswer}
                onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="text-xs text-slate-400 font-bold block mb-1">Question</label>
            <input
              type="text"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="e.g. What is 1/2 + 1/4?"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Option A</label>
              <input
                type="text"
                value={formData.optionA}
                onChange={(e) => setFormData({ ...formData, optionA: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Option B</label>
              <input
                type="text"
                value={formData.optionB}
                onChange={(e) => setFormData({ ...formData, optionB: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Option C</label>
              <input
                type="text"
                value={formData.optionC}
                onChange={(e) => setFormData({ ...formData, optionC: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Option D</label>
              <input
                type="text"
                value={formData.optionD}
                onChange={(e) => setFormData({ ...formData, optionD: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
              />
            </div>
          </div>
          
          <div>
            <label className="text-[10px] text-slate-500 font-bold block mb-1">Explanation (Optional)</label>
            <input
              type="text"
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
            />
          </div>
          
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="requireCorrect"
              checked={formData.requireCorrect}
              onChange={(e) => setFormData({ ...formData, requireCorrect: e.target.checked })}
              className="w-4 h-4 rounded bg-slate-900 border-slate-800 text-blue-600 focus:ring-blue-600"
            />
            <label htmlFor="requireCorrect" className="text-xs text-slate-300">
              Require correct answer before continuing
            </label>
          </div>
          
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 mt-2">
            <Button size="sm" variant="ghost" onClick={handleCancel} className="text-slate-400 hover:text-white">Cancel</Button>
            <Button size="sm" onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1">
              <Save className="w-3.5 h-3.5" /> Save Quiz
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {!isAdding && !isEditing && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-900 text-slate-500 font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 w-20">Time</th>
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3 w-24">Required</th>
                <th className="px-4 py-3 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {quizzes.length > 0 ? (
                quizzes.map((quiz) => (
                  <tr key={quiz.id} className="hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-mono text-xs text-[#CA8E25]">{formatTime(quiz.timestamp)}</td>
                    <td className="px-4 py-3 text-white truncate max-w-[200px]">{quiz.question}</td>
                    <td className="px-4 py-3">
                      {quiz.requireCorrect ? (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Yes</span>
                      ) : (
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleOpenEdit(quiz)} className="p-1.5 text-slate-400 hover:text-blue-400 transition">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(quiz.id)} className="p-1.5 text-slate-400 hover:text-red-400 transition ml-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500 text-xs">
                    No quizzes added to this video.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
