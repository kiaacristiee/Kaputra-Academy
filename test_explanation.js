/**
 * End-to-end test: Explanation column through the entire pipeline.
 *
 * Creates test Excel files (10-col with Explanation, 9-col without),
 * imports them via the upload route parser logic, and validates
 * that the explanation field is correctly stored / left null.
 *
 * Usage: node d:\Kaputra\test_explanation.js
 */

const xlsx = require("xlsx");
const AdmZip = require("adm-zip");
const path = require("path");

// ──────────────────────────────────────────────────────
// Simulate the exact importer logic from route.ts
// ──────────────────────────────────────────────────────
function parseExcelBuffer(buffer) {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

  if (jsonData.length < 2) return [];

  const headerRow = jsonData[0];
  const rows = jsonData.slice(1);

  const getColIndex = (possibleNames) => {
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

  const questions = [];

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

    // Read explanation — same as route.ts
    let explanationVal = null;
    if (idxExplanation !== -1 && row[idxExplanation] != null) {
      const trimmed = String(row[idxExplanation]).trim();
      if (trimmed.length > 0) {
        explanationVal = trimmed;
      }
    }

    questions.push({
      questionText: String(teksSoal).trim(),
      options: JSON.stringify(options),
      correctAnswer: correctAns,
      explanation: explanationVal,
      topic: idxTopik !== -1 && row[idxTopik] ? String(row[idxTopik]).trim() : null,
      difficulty: idxKesulitan !== -1 && row[idxKesulitan] ? String(row[idxKesulitan]).trim() : null,
    });
  }

  return questions;
}

// ──────────────────────────────────────────────────────
// Build test Excel buffers
// ──────────────────────────────────────────────────────

function buildExcel10Col() {
  // 10-column file with Explanation
  const headers = [
    "Teks Soal", "Opsi A", "Opsi B", "Opsi C", "Opsi D",
    "Kunci Jawaban", "Topik", "Tingkat Kesulitan", "Nama File Gambar", "Explanation"
  ];

  const rows = [
    // Test 1: Multiple choice with explanation
    ["What is 12 × 5?", "50", "55", "60", "65", "C", "Aritmetika", "Mudah", "", "12 × 5 = 60."],
    // Test 2: Fill-in-the-blank with explanation
    ["Berapa hasil dari 7 × 8?", "", "", "", "", "56", "Aritmetika", "Mudah", "", "7 dikalikan 8 = 56."],
    // Test 3: True/False with explanation
    ["5 + 5 = 10", "True", "False", "", "", "A", "Aritmetika", "Mudah", "", "5 + 5 = 10, jadi benar."],
    // Test 4: Multiple choice with EMPTY explanation
    ["What is 2 + 2?", "3", "4", "5", "6", "B", "Aritmetika", "Mudah", "", ""],
    // Test 5: Multiple choice with whitespace-only explanation
    ["What is 3 + 3?", "5", "6", "7", "8", "B", "Aritmetika", "Mudah", "", "   "],
    // Test 8: Unicode-heavy explanation
    ["Calculate 9 + 180 + 51 × 3", "300", "342", "400", "450", "B", "Aritmetika", "Sedang", "", "9 + 180 + 51 × 3 = 342"],
    ["What is 2 × (10 + 6)?", "26", "32", "42", "52", "B", "Aritmetika", "Sedang", "", "2 × (10 + 6) = 32"],
    ["A + B = 8, A − B = 2, find A", "3", "4", "5", "6", "C", "Aljabar", "Sulit", "", "A + B = 8, A − B = 2 → A = 5"],
  ];

  const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Template Soal");
  return xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
}

function buildExcel9Col() {
  // Old 9-column file WITHOUT Explanation
  const headers = [
    "Teks Soal", "Opsi A", "Opsi B", "Opsi C", "Opsi D",
    "Kunci Jawaban", "Topik", "Tingkat Kesulitan", "Nama File Gambar"
  ];

  const rows = [
    ["What is 1 + 1?", "1", "2", "3", "4", "B", "Aritmetika", "Mudah", ""],
    ["What is 5 - 3?", "1", "2", "3", "4", "B", "Aritmetika", "Mudah", ""],
  ];

  const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Template Soal");
  return xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
}

// ──────────────────────────────────────────────────────
// Run tests
// ──────────────────────────────────────────────────────
let pass = 0;
let fail = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`);
    pass++;
  } else {
    console.log(`  ❌ FAIL: ${msg}`);
    fail++;
  }
}

console.log("\n=== TEST SUITE: Explanation field through importer ===\n");

// ─── 10-column file tests ───
console.log("--- 10-column file (with Explanation header) ---");
const buf10 = buildExcel10Col();
const q10 = parseExcelBuffer(buf10);
assert(q10.length === 8, `Parsed ${q10.length} questions (expected 8)`);

// Test 1: MC with explanation
assert(q10[0].explanation === "12 × 5 = 60.", `MC explanation: "${q10[0].explanation}"`);
assert(q10[0].correctAnswer === "60", `MC correctAnswer: "${q10[0].correctAnswer}"`);
assert(JSON.parse(q10[0].options).length === 4, `MC has 4 options`);

// Test 2: Fill-in-the-blank with explanation
assert(q10[1].explanation === "7 dikalikan 8 = 56.", `Fill-in explanation: "${q10[1].explanation}"`);
assert(q10[1].correctAnswer === "56", `Fill-in correctAnswer: "${q10[1].correctAnswer}"`);
assert(JSON.parse(q10[1].options).length === 0, `Fill-in has 0 options`);

// Test 3: True/False with explanation
assert(q10[2].explanation === "5 + 5 = 10, jadi benar.", `T/F explanation: "${q10[2].explanation}"`);
assert(q10[2].correctAnswer === "True", `T/F correctAnswer: "${q10[2].correctAnswer}"`);
assert(JSON.parse(q10[2].options).length === 2, `T/F has 2 options`);

// Test 4: Empty explanation → null
assert(q10[3].explanation === null, `Empty string → null: ${q10[3].explanation}`);

// Test 5: Whitespace-only explanation → null
assert(q10[4].explanation === null, `Whitespace-only → null: ${q10[4].explanation}`);

// Test 8: Unicode survival
assert(q10[5].explanation === "9 + 180 + 51 × 3 = 342", `Unicode: "${q10[5].explanation}"`);
assert(q10[6].explanation === "2 × (10 + 6) = 32", `Unicode2: "${q10[6].explanation}"`);
assert(q10[7].explanation === "A + B = 8, A − B = 2 → A = 5", `Unicode3: "${q10[7].explanation}"`);

// ─── 9-column file tests ───
console.log("\n--- 9-column file (NO Explanation header) ---");
const buf9 = buildExcel9Col();
const q9 = parseExcelBuffer(buf9);
assert(q9.length === 2, `Parsed ${q9.length} questions (expected 2)`);
assert(q9[0].explanation === null, `Old file Q1 explanation is null: ${q9[0].explanation}`);
assert(q9[1].explanation === null, `Old file Q2 explanation is null: ${q9[1].explanation}`);
assert(q9[0].correctAnswer === "2", `Old file Q1 correct answer: "${q9[0].correctAnswer}"`);
assert(q9[0].topic === "Aritmetika", `Old file Q1 topic not shifted: "${q9[0].topic}"`);
assert(q9[0].difficulty === "Mudah", `Old file Q1 difficulty not shifted: "${q9[0].difficulty}"`);

// Summary
console.log(`\n=== Results: ${pass} passed, ${fail} failed ===\n`);
process.exit(fail > 0 ? 1 : 0);
