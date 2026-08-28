import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import * as xlsx from "xlsx";
import AdmZip from "adm-zip";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const courseId = formData.get("courseId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Missing ZIP file" }, { status: 400 });
    }

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json({ error: "File must be a ZIP archive" }, { status: 400 });
    }

    // Read the zip file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    // Ensure the public uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "questions");
    await fs.mkdir(uploadsDir, { recursive: true });

    let excelEntries: any[] = [];
    const imageMap: Record<string, string> = {}; // map of original filename to new URL path

    // Extract images and find all excel files
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      const filename = entry.entryName;
      const ext = path.extname(filename).toLowerCase();
      
      if (ext === ".xlsx" || ext === ".xls" || ext === ".csv") {
        excelEntries.push(entry);
      } else if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
        const originalName = path.basename(filename).trim().toLowerCase();
        const newFileName = `${uuidv4()}${ext}`;

        try {
          const uploadsDir = path.join(process.cwd(), "public", "uploads", "questions");
          await fs.mkdir(uploadsDir, { recursive: true });
          const savePath = path.join(uploadsDir, newFileName);
          await fs.writeFile(savePath, entry.getData());
          imageMap[originalName] = `/uploads/questions/${newFileName}`;
        } catch (fsError) {
          console.warn("Serverless disk write fallback activated for zip image:", fsError);
          const mimeType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
          const base64Data = entry.getData().toString("base64");
          imageMap[originalName] = `data:${mimeType};base64,${base64Data}`;
        }
      }
    }

    if (excelEntries.length === 0) {
      return NextResponse.json({ error: "No Excel/CSV file found in the ZIP archive" }, { status: 400 });
    }

    const questionsToCreate = [];

    for (const excelEntry of excelEntries) {
      // Determine folder name from path
      const parts = excelEntry.entryName.replace(/\\/g, "/").split("/");
      let folderName = null;
      if (parts.length > 1) {
        const potentialFolderName = parts[parts.length - 2].trim();
        if (potentialFolderName && !potentialFolderName.startsWith("__") && !potentialFolderName.toLowerCase().includes("macosx") && !potentialFolderName.toLowerCase().includes("image")) {
          folderName = potentialFolderName;
        }
      }

      let folderId = null;
      if (folderName) {
        let folder = await prisma.questionFolder.findFirst({
          where: { name: folderName }
        });
        if (!folder) {
          folder = await prisma.questionFolder.create({
            data: { name: folderName }
          });
        }
        folderId = folder.id;
      }

      // Read excel file
      const workbook = xlsx.read(excelEntry.getData(), { type: "buffer" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) continue; // skip empty sheets

      const headerRow = jsonData[0] as string[];
      const rows = jsonData.slice(1);

      // Find column indexes based on various possible names
      const getColIndex = (possibleNames: string[]) => {
        for (const name of possibleNames) {
          const idx = headerRow.findIndex(h => h && String(h).toLowerCase().trim() === name.toLowerCase());
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const idxTeksSoal = getColIndex(["Teks Soal", "question", "Soal"]);
      const idxOpsiA = getColIndex(["Opsi A", "A"]);
      const idxOpsiB = getColIndex(["Opsi B", "B"]);
      const idxOpsiC = getColIndex(["Opsi C", "C"]);
      const idxOpsiD = getColIndex(["Opsi D", "D"]);
      const idxKunci = getColIndex(["Kunci Jawaban", "answer", "Kunci"]);
      const idxTopik = getColIndex(["Topik", "questionType", "Materi"]);
      const idxKesulitan = getColIndex(["Tingkat Kesulitan", "difficulty"]);
      const idxGambar = getColIndex(["Nama File Gambar", "image", "gambar", "image url", "imageurl"]);
      const idxExplanation = getColIndex(["Explanation", "explanation", "Penjelasan"]);
      const idxExplanationImage = getColIndex(["Explanation Image", "explanation image", "Gambar Penjelasan", "Gambar Explanation", "explanation_image"]);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const teksSoal = idxTeksSoal !== -1 ? row[idxTeksSoal] : null;
        if (!teksSoal) continue; // Wajib ada teks soal

        const options = [];
        if (idxOpsiA !== -1 && row[idxOpsiA]) options.push(String(row[idxOpsiA]).trim());
        if (idxOpsiB !== -1 && row[idxOpsiB]) options.push(String(row[idxOpsiB]).trim());
        if (idxOpsiC !== -1 && row[idxOpsiC]) options.push(String(row[idxOpsiC]).trim());
        if (idxOpsiD !== -1 && row[idxOpsiD]) options.push(String(row[idxOpsiD]).trim());

        let correctAns = idxKunci !== -1 ? String(row[idxKunci] || "").trim() : "";
        
        // If correctAnswer is A/B/C/D, map to the actual option text if options exist
        const upperAns = correctAns.toUpperCase();
        if (upperAns === "A" && options.length > 0) correctAns = options[0];
        else if (upperAns === "B" && options.length > 1) correctAns = options[1];
        else if (upperAns === "C" && options.length > 2) correctAns = options[2];
        else if (upperAns === "D" && options.length > 3) correctAns = options[3];

        // Question picture
        let finalImageUrl: string | null = null;
        if (idxGambar !== -1 && row[idxGambar] != null) {
          const cleanName = String(row[idxGambar]).trim();
          if (cleanName.length > 0) {
            const lowerName = cleanName.toLowerCase();
            if (cleanName.startsWith("http://") || cleanName.startsWith("https://") || cleanName.startsWith("/uploads/")) {
              finalImageUrl = cleanName;
            } else if (imageMap[lowerName]) {
              finalImageUrl = imageMap[lowerName];
            } else {
              console.warn(`Row ${i + 2}: Question image file "${cleanName}" not found in ZIP archive`);
              finalImageUrl = `/uploads/questions/${cleanName}`;
            }
          }
        }

        // Read explanation text — treat empty/whitespace-only cells as null
        let explanationVal: string | null = null;
        if (idxExplanation !== -1 && row[idxExplanation] != null) {
          const trimmed = String(row[idxExplanation]).trim();
          if (trimmed.length > 0) {
            explanationVal = trimmed;
          }
        }

        // Read explanation image — treat empty/whitespace-only cells as null
        let finalExplanationImageUrl: string | null = null;
        if (idxExplanationImage !== -1 && row[idxExplanationImage] != null) {
          const cleanName = String(row[idxExplanationImage]).trim();
          if (cleanName.length > 0) {
            const lowerName = cleanName.toLowerCase();
            if (cleanName.startsWith("http://") || cleanName.startsWith("https://") || cleanName.startsWith("/uploads/")) {
              finalExplanationImageUrl = cleanName;
            } else if (imageMap[lowerName]) {
              finalExplanationImageUrl = imageMap[lowerName];
            } else {
              console.warn(`Row ${i + 2}: Explanation image file "${cleanName}" not found in ZIP archive`);
              finalExplanationImageUrl = null;
            }
          }
        }

        questionsToCreate.push({
          courseId: courseId || null,
          folderId: folderId,
          questionText: String(teksSoal).trim(),
          options: JSON.stringify(options),
          correctAnswer: correctAns,
          explanation: explanationVal,
          explanationImageUrl: finalExplanationImageUrl,
          topic: idxTopik !== -1 && row[idxTopik] ? String(row[idxTopik]).trim() : null,
          difficulty: idxKesulitan !== -1 && row[idxKesulitan] ? String(row[idxKesulitan]).trim() : null,
          imageUrl: finalImageUrl
        });
      }
    }

    if (questionsToCreate.length === 0) {
      return NextResponse.json({ error: "No valid questions found in Excel file" }, { status: 400 });
    }

    const result = await prisma.mockQuestion.createMany({
      data: questionsToCreate
    });

    return NextResponse.json({ success: true, count: result.count });

  } catch (error) {
    console.error("ZIP Bulk upload error:", error);
    return NextResponse.json({ error: "Failed to process ZIP upload" }, { status: 500 });
  }
}
