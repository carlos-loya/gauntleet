export type ProblemUserStatus = "solved" | "attempted" | "unsolved";

export interface ProblemStats {
  totalSubmissions: number;
  acceptedSubmissions: number;
}

export function deriveStatus(stats: ProblemStats): ProblemUserStatus {
  if (stats.acceptedSubmissions > 0) return "solved";
  if (stats.totalSubmissions > 0) return "attempted";
  return "unsolved";
}

/**
 * Acceptance rate as a percentage rounded to the nearest integer, or null
 * when the user has never submitted to this problem (so the UI can render a
 * dash instead of "0%", which would imply attempts that didn't pass).
 */
export function acceptanceRate(stats: ProblemStats): number | null {
  if (stats.totalSubmissions === 0) return null;
  return Math.round((stats.acceptedSubmissions / stats.totalSubmissions) * 100);
}
