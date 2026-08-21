import type { HackathonRunRecord } from "../types/runExport";

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export function approachKey(run: HackathonRunRecord): string {
  const d = run.data;
  return (
    d.approach_kind ||
    d.export?.meta?.approach ||
    d.git_branch ||
    d.export?.meta?.git_branch ||
    "unknown"
  );
}

export function weightedOf(run: HackathonRunRecord): number | null {
  const w = run.data.export?.efficiency?.weighted_total;
  return typeof w === "number" ? w : null;
}

/** Median weighted_total for runs sharing the same approach / branch. */
export function medianWeightedByApproach(
  runs: HackathonRunRecord[],
): Map<string, number> {
  const buckets = new Map<string, number[]>();
  for (const run of runs) {
    const key = approachKey(run);
    const w = weightedOf(run);
    if (w === null) continue;
    const list = buckets.get(key) ?? [];
    list.push(w);
    buckets.set(key, list);
  }
  const out = new Map<string, number>();
  for (const [key, vals] of buckets) {
    const m = median(vals);
    if (m !== null) out.set(key, m);
  }
  return out;
}

export function formatNumber(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

export function shortCommit(sha: string | null | undefined): string {
  if (!sha) return "—";
  return sha.slice(0, 7);
}
