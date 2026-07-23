"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BulkUpload({ courses }: { courses: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMockTestId, setSelectedMockTestId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleUpload = async () => {
    if (!file) {
      alert("Pilih file ZIP terlebih dahulu.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/teacher/mock-tests/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Berhasil mengunggah ${data.count} soal!`);
        setIsOpen(false);
        setFile(null);
        router.refresh();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      alert("Terjadi kesalahan saat mengunggah file.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <Button onClick={() => setIsOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
        <Upload className="w-4 h-4" />
        Bulk Upload Soal
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white text-slate-900 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Bulk Upload Soal (ZIP)</h2>
            


            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Pilih File (.zip)</label>
              <input 
                type="file" 
                accept=".zip" 
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full border rounded p-2"
              />
              <p className="text-xs text-slate-500 mt-1">Upload file ZIP yang berisi Excel dan folder images.</p>
            </div>

            <div className="mb-6">
              <a href="/api/teacher/mock-tests/template" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-sm">
                <Download className="w-4 h-4" />
                Download Template ZIP
              </a>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? "Mengunggah..." : "Upload"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
