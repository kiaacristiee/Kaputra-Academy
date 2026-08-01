import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import * as xlsx from "xlsx";
import AdmZip from "adm-zip";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

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

    let excelEntry = null;
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      const ext = entry.entryName.split(".").pop()?.toLowerCase();
      if (ext === "xlsx" || ext === "xls" || ext === "csv") {
        excelEntry = entry;
        break;
      }
    }

    if (!excelEntry) {
      return NextResponse.json({ error: "No Excel/CSV file found in the ZIP archive" }, { status: 400 });
    }

    // Read excel file
    const workbook = xlsx.read(excelEntry.getData(), { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (jsonData.length < 2) {
      return NextResponse.json({ error: "Excel file is empty or missing data rows" }, { status: 400 });
    }

    const headerRow = jsonData[0] as string[];
    const rows = jsonData.slice(1);

    const getColIndex = (possibleNames: string[]) => {
      for (const name of possibleNames) {
        const idx = headerRow.findIndex((h) => String(h).toLowerCase().trim() === name.toLowerCase());
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

    const newQuestions: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const teksSoal = idxTeksSoal !== -1 ? row[idxTeksSoal] : null;
      if (!teksSoal) continue;

      const options = [];
      if (idxOpsiA !== -1 && row[idxOpsiA]) options.push(String(row[idxOpsiA]).trim());
      if (idxOpsiB !== -1 && row[idxOpsiB]) options.push(String(row[idxOpsiB]).trim());
      if (idxOpsiC !== -1 && row[idxOpsiC]) options.push(String(row[idxOpsiC]).trim());
      if (idxOpsiD !== -1 && row[idxOpsiD]) options.push(String(row[idxOpsiD]).trim());

      let correctAns = idxKunci !== -1 ? String(row[idxKunci] || "").trim() : "";
      const upperAns = correctAns.toUpperCase();
      if (upperAns === "A" && options.length > 0) correctAns = options[0];
      else if (upperAns === "B" && options.length > 1) correctAns = options[1];
      else if (upperAns === "C" && options.length > 2) correctAns = options[2];
      else if (upperAns === "D" && options.length > 3) correctAns = options[3];

      newQuestions.push({
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        question: String(teksSoal).trim(),
        options: options.length > 0 ? options : ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: correctAns || (options.length > 0 ? options[0] : "Option A"),
      });
    }

    if (newQuestions.length === 0) {
      return NextResponse.json({ error: "No valid questions found in Excel file" }, { status: 400 });
    }

    // Fetch existing config from ContentBlock
    const block = await prisma.contentBlock.findUnique({
      where: { section: "placement_test_config" },
    });

    let config = { passingScore: 60, questions: [] as any[] };
    if (block) {
      try {
        config = JSON.parse(block.content);
      } catch (e) {
        console.error("Failed to parse config", e);
      }
    }

    config.questions = [...config.questions, ...newQuestions];

    await prisma.contentBlock.upsert({
      where: { section: "placement_test_config" },
      update: { content: JSON.stringify(config) },
      create: { section: "placement_test_config", content: JSON.stringify(config) },
    });

    return NextResponse.json({ success: true, count: newQuestions.length, config });
  } catch (error) {
    console.error("Placement test bulk upload error:", error);
    return NextResponse.json({ error: "Failed to process ZIP upload" }, { status: 500 });
  }
}
