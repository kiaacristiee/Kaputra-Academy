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

  // 5. Hyphens to spaces, then collapse whitespace
  str = str.replace(/-/g, " ").replace(/\s+/g, " ");

  // 6. Drop trailing punctuation (full stop or comma at the very end only)
  str = str.replace(/[.,]+$/, "");

  // 7. Remove thousands separators inside numbers (strictly between digits)
  // e.g. "6 550" -> "6550", "6,550" -> "6550"
  str = str.replace(/(\d)[\s,]+(\d)/g, "$1$2");
  str = str.replace(/(\d)[\s,]+(\d)/g, "$1$2"); // Repeat for 1 000 000 -> 1000000

  // 8. Normalise the word "and" in number words
  str = str.replace(/\band\b/g, "").replace(/\s+/g, " ");

  // 9. Tidy spacing around /, :, . and between digits & unit letters
  str = str.replace(/\s*([/:.])\s*/g, "$1");
  // Spacing between digit and unit letter (e.g., 4 kg -> 4kg, 20 cm -> 20cm)
  str = str.replace(/(\d)\s+([a-zA-Z])/g, "$1$2");

  return str.trim();
}

/**
 * Compare two normalised answers (handling multi-part answers split by commas).
 */
export function compareSingleAnswer(
  studentAns: string,
  targetAns: string,
  allowAnyOrder: boolean = false
): boolean {
  if (!targetAns) return false;

  // Check if target is multi-part (contains commas)
  if (targetAns.includes(",")) {
    const targetParts = targetAns.split(",").map((p) => normaliseAnswer(p)).filter(Boolean);
    const studentParts = studentAns.split(",").map((p) => normaliseAnswer(p)).filter(Boolean);

    if (targetParts.length !== studentParts.length) return false;

    if (allowAnyOrder) {
      const sortedTarget = [...targetParts].sort();
      const sortedStudent = [...studentParts].sort();
      return sortedTarget.every((val, idx) => val === sortedStudent[idx]);
    } else {
      return targetParts.every((val, idx) => val === studentParts[idx]);
    }
  }

  // Single-part answer comparison
  const normStudent = normaliseAnswer(studentAns);
  const normTarget = normaliseAnswer(targetAns);

  return normStudent === normTarget;
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
