export const GRADING_COMPANIES = ["PSA", "BGS", "CGC", "TAG", "SGC"] as const;

export const GRADE_SCALES = {
  PSA: ["10", "9", "8", "7", "6", "5", "4", "3", "2", "1"],
  BGS: ["10", "9.5", "9", "8.5", "8", "7.5", "7"],
  CGC: ["10", "9.5", "9", "8.5", "8"],
  TAG: ["10", "9.5", "9", "8.5", "8", "7.5"],
  SGC: ["10", "9.5", "9", "8.5", "8"],
} as const;

export const COMPANY_COLORS = {
  PSA: "#C9A84C",
  BGS: "#378ADD",
  CGC: "#3DAA6E",
  TAG: "#D85A30",
  SGC: "#7F77DD",
} as const;
