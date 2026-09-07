import { normaliseAnswer, evaluateQuestionAnswer } from "../src/lib/quizGrading";

const testCases = [
  // User's specific greatest/smallest test cases
  { target: "greatest 9752, smallest 2579", student: "9752, 2579", expected: true },
  { target: "greatest 9752, smallest 2579", student: "9752,2579", expected: true },
  { target: "greatest 9752, smallest 2579", student: "9752 and 2579", expected: true },
  { target: "greatest 9752, smallest 2579", student: "greatest 9752, smallest 2579", expected: true },
  { target: "greatest 9752, smallest 2579", student: "9752, 2570", expected: false },
  { target: "greatest 9752, smallest 2579", student: "2579, 9752", expected: false },

  // Multi-part & Descriptor word test cases (e.g. 50 pupils in teams of 6 -> 8 full teams, 2 left vs 8, 2)
  { target: "8 full teams, 2 left", student: "8, 2", expected: true },
  { target: "8 full teams, 2 left", student: "8,2", expected: true },
  { target: "8 full teams, 2 left", student: "8 and 2", expected: true },
  { target: "8 full teams, 2 left", student: "8 teams, 2 left", expected: true },
  { target: "8 full teams, 2 left", student: "8 teams 2 left", expected: true },
  { target: "8 full teams, 2 left", student: "8 full teams, 2 left", expected: true },
  { target: "8 full teams, 2 left", student: "8, 3", expected: false },
  { target: "8 full teams, 2 left", student: "9, 2", expected: false },
  { target: "8 full teams, 2 left", student: "8", expected: false },

  // Label word test cases
  { target: "8 teams", student: "8", expected: true },
  { target: "8", student: "8 teams", expected: true },
  { target: "50 pupils", student: "50", expected: true },
  { target: "50", student: "50 pupils", expected: true },
  { target: "12 cm, 5 cm", student: "12, 5", expected: true },
  { target: "12cm, 5cm", student: "12, 5", expected: true },

  // Currency test cases
  { target: "$80", student: "80", expected: true },
  { target: "80", student: "$80", expected: true },
  { target: "$80", student: "$ 80", expected: true },
  { target: "$80", student: "80$", expected: true },
  { target: "$80", student: "80 dollars", expected: true },
  { target: "$80", student: "$80.00", expected: true },
  { target: "80 cents", student: "80", expected: true },
  { target: "Rp 80.000", student: "80000", expected: true },
  
  // Previous core test cases
  { target: "two hundred and twenty-two", student: "two hundred and twenty two", expected: true },
  { target: "two hundred and twenty-two", student: "TWO HUNDRED AND TWENTY TWO", expected: true },
  { target: "6550", student: "6 550", expected: true },
  { target: "3/8", student: "3 / 8", expected: true },

  // Incorrect answers must still be rejected!
  { target: "$80", student: "85", expected: false },
  { target: "$80", student: "800", expected: false },
  { target: "3/8", student: "3/7", expected: false },
  { target: "3/8", student: "3, 8", expected: false },
];

console.log("=== RUNNING QUIZ GRADING TESTS ===");
let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = evaluateQuestionAnswer(
    { correctAnswer: tc.target },
    tc.student
  );

  if (result.isCorrect === tc.expected) {
    console.log(`✓ PASS: target="${tc.target}" vs student="${tc.student}" => ${result.isCorrect}`);
    passed++;
  } else {
    console.error(`❌ FAIL: target="${tc.target}" vs student="${tc.student}" => got ${result.isCorrect}, expected ${tc.expected}`);
    failed++;
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
