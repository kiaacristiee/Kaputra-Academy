/**
 * Shared Quiz Grading & Normalisation Pipeline
 * 
 * Normalisation Pipeline Rules (applied in order to both student answer and stored answer):
 * 1. Trim leading and trailing whitespace.
 * 2. Collapse runs of whitespace to a single space.
 * 3. Lowercase.
 * 4. Normalise Unicode to canonical form (NFC), mapping specific symbols:
 *    × -> x, ÷ -> /, −/– -> -, ’/‘/` -> ', ≠ -> !=, ² -> 2, non-breaking spaces -> space
 * 5. Hyphens to spaces, then collapse whitespace again (twenty-two = twenty two).
 * 6. Drop trailing punctuation (full stop or comma at very end only).
 * 7. Remove thousands separators inside numbers (6 550 -> 6550, 6,550 -> 6550).
 * 8. Normalise the word "and" in number words (eight thousand and seventy two -> eight thousand seventy two).
 * 9. Tidy spacing around /, :, . and between digits & unit letters (3 / 8 -> 3/8, 4 kg -> 4kg).
 */

export function normaliseAnswer(input: string): string {
  if (!input || typeof input !== "string") return "";

  // 1. Trim whitespace
  let str = input.trim();
  if (!str) return "";

  // 2. Collapse runs of whitespace
  str = str.replace(/\s+/g, " ");

  // 3. Lowercase
  str = str.toLowerCase();

  // 4. Unicode normalisation (NFC) & symbol mapping
  str = str.normalize("NFC");
  str = str
    .replace(/\u00A0|\u2009|\u202F/g, " ") // Non-breaking / thin spaces
    .replace(/×/g, "x")
    .replace(/÷/g, "/")
    .replace(/−|–/g, "-") // U+2212 minus & en-dash to hyphen
    .replace(/’|‘|`/g, "'")
    .replace(/≠/g, "!=")
    .replace(/²/g, "2");

  // 5. Currency symbols & currency unit words removal
  str = str.replace(/[$€£¥¢₹]/g, "");
  str = str.replace(/\b(rp\.?|usd|dollars?|cents?|rupiah)\b/g, "");

  // 6. Hyphens to spaces, then collapse whitespace
  str = str.replace(/-/g, " ").replace(/\s+/g, " ");

  // 7. Drop trailing punctuation (full stop or comma at the very end only)
  str = str.replace(/[.,]+$/, "");

  // 8. Remove thousands separators inside numbers (must be 3 digits e.g. 6,550 or 6 550 or 80.000)
  str = str.replace(/(\d)[,.\s](\d{3})\b/g, "$1$2");
  str = str.replace(/(\d)[,.\s](\d{3})\b/g, "$1$2"); // Repeat for 1,000,000

  // 9. Remove trailing .00 or .0 on whole numbers (e.g. 80.00 -> 80)
  str = str.replace(/(\d+)\.00?\b/g, "$1");

  // 10. Normalise the word "and"
  str = str.replace(/\band\b/g, " ").replace(/\s+/g, " ");

  // 11. Tidy spacing around operators
  str = str.replace(/\s*([/:.])\s*/g, "$1");

  return str.trim();
}

/**
 * Strips common unit and label words from an answer string for flexible comparison.
 */
export function stripLabelWords(input: string): string {
  let str = normaliseAnswer(input);
  if (!str) return "";

  // Insert space between digits and words (e.g. "8teams" -> "8 teams", "12cm" -> "12 cm")
  str = str.replace(/(\d)([a-zA-Z])/g, "$1 $2").replace(/([a-zA-Z])(\d)/g, "$1 $2");

  // Common descriptive unit / label / math descriptor words in quiz answers
  const labelWordsRegex = /\b(greatest|smallest|largest|least|highest|lowest|max|maximum|min|minimum|bigger|smaller|more|less|most|fewest|total|sum|difference|product|quotient|remainder|ans|answer|result|value|first|second|third|fourth|fifth|part|full|teams?|pupils?|students?|children|left|leftover|remaining|over|pieces?|items?|objects?|units?|apples?|oranges?|cars?|boxes?|cm|m|km|mm|g|kg|l|ml|lb|lbs|oz|sec|secs|seconds?|min|mins|minutes?|hr|hrs|hours?|days?|weeks?|months?|years?)\b/gi;

  // Replace label words
  str = str.replace(labelWordsRegex, "");

  // Clean up punctuation like commas, extra spaces
  str = str.replace(/[,;:]+/g, " ").replace(/\s+/g, " ").trim();

  return str;
}

/**
 * Compare two normalised answers (handling multi-part answers split by commas, label words, etc.).
 */
export function compareSingleAnswer(
  studentAns: string,
  targetAns: string,
  allowAnyOrder: boolean = false
): boolean {
  if (!targetAns) return false;

  const normStudent = normaliseAnswer(studentAns);
  const normTarget = normaliseAnswer(targetAns);

  // 1. Direct normalised match
  if (normStudent === normTarget) return true;

  // 2. Multi-part match by comma/semicolon splitting
  if (targetAns.includes(",") || targetAns.includes(";")) {
    const targetParts = targetAns.split(/[,;]/).map((p) => normaliseAnswer(p)).filter(Boolean);
    const studentParts = studentAns.split(/[,;]/).map((p) => normaliseAnswer(p)).filter(Boolean);

    if (targetParts.length === studentParts.length) {
      if (allowAnyOrder) {
        const sortedTarget = [...targetParts].sort();
        const sortedStudent = [...studentParts].sort();
        if (sortedTarget.every((val, idx) => val === sortedStudent[idx])) return true;
      } else {
        if (targetParts.every((val, idx) => val === studentParts[idx])) return true;
      }
    }
  }

  // 3. Label-stripped comparison (handles "8 full teams, 2 left" vs "8, 2" or "8 teams" vs "8")
  const strippedStudent = stripLabelWords(studentAns);
  const strippedTarget = stripLabelWords(targetAns);

  if (strippedStudent && strippedTarget && strippedStudent === strippedTarget) {
    return true;
  }

  // 4. Label-stripped multi-part comparison (handles space/comma separation)
  if (strippedTarget.includes(" ") || strippedStudent.includes(" ")) {
    const targetPartsStripped = strippedTarget.split(" ").filter(Boolean);
    const studentPartsStripped = strippedStudent.split(" ").filter(Boolean);

    if (targetPartsStripped.length > 0 && targetPartsStripped.length === studentPartsStripped.length) {
      if (allowAnyOrder) {
        const sortedTarget = [...targetPartsStripped].sort();
        const sortedStudent = [...studentPartsStripped].sort();
        if (sortedTarget.every((val, idx) => val === sortedStudent[idx])) return true;
      } else {
        if (targetPartsStripped.every((val, idx) => val === studentPartsStripped[idx])) return true;
      }
    }
  }

  return false;
}

export interface EvaluationResult {
  isCorrect: boolean;
  isNearMiss: boolean;
  isMultipleChoice: boolean;
  matchedAnswer?: string;
}

/**
 * Evaluates a student's answer against a question's correct answer and accepted variants.
 */
export function evaluateQuestionAnswer(
  question: {
    options?: string | string[];
    correctAnswer: string;
    acceptedAnswers?: string | string[] | null;
    allowAnyOrder?: boolean;
  },
  studentAnswer: string
): EvaluationResult {
  const rawStudent = String(studentAnswer || "").trim();

  // Parse options to determine if question is multiple choice
  let parsedOptions: string[] = [];
  if (Array.isArray(question.options)) {
    parsedOptions = question.options;
  } else if (typeof question.options === "string" && question.options.trim()) {
    try {
      parsedOptions = JSON.parse(question.options);
    } catch {
      parsedOptions = [];
    }
  }

  const isMultipleChoice = parsedOptions.length > 0 && parsedOptions.some((o) => o.trim() !== "");

  // Multiple Choice Questions: Compare exact trimmed lowercase option
  if (isMultipleChoice) {
    const studentChoice = rawStudent.toLowerCase();
    const correctChoice = String(question.correctAnswer || "").trim().toLowerCase();
    const isCorrect = studentChoice !== "" && studentChoice === correctChoice;
    return {
      isCorrect,
      isNearMiss: false,
      isMultipleChoice: true,
      matchedAnswer: isCorrect ? question.correctAnswer : undefined,
    };
  }

  // Short Answer Questions: Use Normalisation Pipeline
  if (!rawStudent) {
    return { isCorrect: false, isNearMiss: false, isMultipleChoice: false };
  }

  // Build target answers list (primary correctAnswer + acceptedAnswers variants)
  const targetAnswers: string[] = [question.correctAnswer];
  if (question.acceptedAnswers) {
    let variants: string[] = [];
    if (Array.isArray(question.acceptedAnswers)) {
      variants = question.acceptedAnswers;
    } else if (typeof question.acceptedAnswers === "string" && question.acceptedAnswers.trim()) {
      try {
        variants = JSON.parse(question.acceptedAnswers);
      } catch {
        variants = [question.acceptedAnswers];
      }
    }
    variants.forEach((v) => {
      if (v && typeof v === "string" && v.trim()) {
        targetAnswers.push(v.trim());
      }
    });
  }

  const allowAnyOrder = !!question.allowAnyOrder;

  // Check exact normalised match
  for (const target of targetAnswers) {
    if (compareSingleAnswer(rawStudent, target, allowAnyOrder)) {
      return {
        isCorrect: true,
        isNearMiss: false,
        isMultipleChoice: false,
        matchedAnswer: target,
      };
    }
  }

  // Check for Near-Miss (e.g. matched if order were free on multi-part, or if extra spaces ignored)
  let isNearMiss = false;
  if (!allowAnyOrder) {
    for (const target of targetAnswers) {
      if (compareSingleAnswer(rawStudent, target, true)) {
        isNearMiss = true;
        break;
      }
    }
  }

  return {
    isCorrect: false,
    isNearMiss,
    isMultipleChoice: false,
  };
}
