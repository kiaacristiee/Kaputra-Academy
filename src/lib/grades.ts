export const STUDENT_GRADES = [
  { value: "GRADE_1", label: "Grade 1" },
  { value: "GRADE_2", label: "Grade 2" },
  { value: "GRADE_3", label: "Grade 3" },
  { value: "GRADE_4", label: "Grade 4" },
  { value: "GRADE_5", label: "Grade 5" },
  { value: "GRADE_6", label: "Grade 6" },
  { value: "GRADE_7", label: "Grade 7" },
  { value: "GRADE_8", label: "Grade 8" },
  { value: "GRADE_9", label: "Grade 9" },
] as const;

export type GradeValue = typeof STUDENT_GRADES[number]["value"];

export function getGradeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const found = STUDENT_GRADES.find((g) => g.value === value);
  return found ? found.label : "—";
}

export function isValidGrade(value: string | null | undefined): boolean {
  if (!value) return false;
  return STUDENT_GRADES.some((g) => g.value === value);
}
