// ─────────────────────────────────────────────────────────────────
// Grade Calculation Utilities
// ─────────────────────────────────────────────────────────────────

export interface GradeConfig {
  min: number;
  grade: string;
}

/**
 * Default CBSE-style grade mapping.
 * Ordered from highest to lowest.
 */
const DEFAULT_GRADE_MAP: GradeConfig[] = [
  { min: 91, grade: 'A+' },
  { min: 81, grade: 'A' },
  { min: 71, grade: 'B+' },
  { min: 61, grade: 'B' },
  { min: 51, grade: 'C+' },
  { min: 41, grade: 'C' },
  { min: 33, grade: 'D' },
  { min: 0, grade: 'F' },
];

const PASSING_PERCENTAGE = 33;

/**
 * Calculate grade from percentage.
 */
export function getGrade(percentage: number, gradeMap = DEFAULT_GRADE_MAP): string {
  for (const config of gradeMap) {
    if (percentage >= config.min) {
      return config.grade;
    }
  }
  return 'F';
}

/**
 * Calculate pass/fail from percentage.
 */
export function getPassStatus(percentage: number, passingThreshold = PASSING_PERCENTAGE): 'pass' | 'fail' {
  return percentage >= passingThreshold ? 'pass' : 'fail';
}

/**
 * Calculate percentage from marks.
 */
export function calculatePercentage(totalMarks: number, totalMaxMarks: number): number {
  if (totalMaxMarks === 0) return 0;
  return Math.round((totalMarks / totalMaxMarks) * 100 * 100) / 100; // 2 decimal places
}

/**
 * Get grade color for UI badges.
 */
export function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A+': return 'bg-emerald-100 text-emerald-700';
    case 'A': return 'bg-green-100 text-green-700';
    case 'B+': return 'bg-blue-100 text-blue-700';
    case 'B': return 'bg-sky-100 text-sky-700';
    case 'C+': return 'bg-amber-100 text-amber-700';
    case 'C': return 'bg-yellow-100 text-yellow-700';
    case 'D': return 'bg-orange-100 text-orange-700';
    case 'F': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}
