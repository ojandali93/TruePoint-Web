import { CenteringAnalysis } from "../types/centering.types";

export const getScoreColor = (score: number): string => {
  if (score >= 90) return "var(--green)";
  if (score >= 75) return "var(--gold)";
  if (score >= 60) return "#E8A838";
  return "var(--red)";
};

export const getScoreLabel = (score: number): string => {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  return "Poor";
};

export const formatCenteringRatio = (worse: number): string => {
  const better = 100 - worse;
  return `${Math.round(worse)}/${Math.round(better)}`;
};
