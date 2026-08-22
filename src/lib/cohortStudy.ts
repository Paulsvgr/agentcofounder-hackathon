/** Preset cohorts for side-by-side action-flow comparison. */

export type CohortEntry = {
  label: string;
  run_id: string;
  notes: string;
};

export type CohortPreset = {
  id: string;
  title: string;
  description: string;
  entries: CohortEntry[];
};

/** Original 7-run study (baseline, autotest floor, snowball, autoverify, A-prime). */
export const STUDY_COHORT: CohortEntry[] = [
  {
    label: "A-baseline-1",
    run_id: "2026-08-21T17-12-43-573Z",
    notes: "test-infra repair",
  },
  {
    label: "A-autotest-1 (floor)",
    run_id: "2026-08-21T17-41-28-455Z",
    notes: "clean trajectory ~54k",
  },
  {
    label: "A-prompt-3 (snowball)",
    run_id: "2026-08-21T17-33-44-063Z",
    notes: "~187k repair+verify tax",
  },
  {
    label: "autoverify-gated",
    run_id: "2026-08-22T00-48-30-278Z",
    notes: "harness tax, no in-session green",
  },
  {
    label: "autoverify-supplement",
    run_id: "2026-08-22T00-16-51-819Z",
    notes: "snowball ~182k",
  },
  {
    label: "A-prime timeout",
    run_id: "2026-08-20T19-13-05-181Z",
    notes: "mega-call + latency",
  },
  {
    label: "A-prime-zai",
    run_id: "2026-08-20T21-51-00-219Z",
    notes: "recoverable repair",
  },
];

/** Experiment 1 — RTL cleanup matched cohort (5 control + 5 treatment). */
export const EXP1_RTL_COHORT: CohortEntry[] = [
  {
    label: "rtl-control-1",
    run_id: "2026-08-22T11-17-34-089Z",
    notes: "control ~69k, 17 calls; snowball",
  },
  {
    label: "rtl-control-2",
    run_id: "2026-08-22T11-20-53-365Z",
    notes: "control ~76k, 25 calls; snowball",
  },
  {
    label: "rtl-control-3",
    run_id: "2026-08-22T11-24-02-704Z",
    notes: "control ~96k, 26 calls; snowball",
  },
  {
    label: "rtl-control-4",
    run_id: "2026-08-22T11-28-00-137Z",
    notes: "control ~157k, 43 calls; snowball",
  },
  {
    label: "rtl-control-5",
    run_id: "2026-08-22T11-33-28-491Z",
    notes: "control ~144k, 43 calls; snowball",
  },
  {
    label: "rtl-cleanup-1",
    run_id: "2026-08-22T11-39-27-224Z",
    notes: "treatment ~101k, 35 calls; snowball",
  },
  {
    label: "rtl-cleanup-2",
    run_id: "2026-08-22T11-43-19-823Z",
    notes: "treatment ~181k, 48 calls; snowball",
  },
  {
    label: "rtl-cleanup-3",
    run_id: "2026-08-22T11-49-46-658Z",
    notes: "treatment ~179k, 44 calls; snowball",
  },
  {
    label: "rtl-cleanup-4",
    run_id: "2026-08-22T11-56-19-753Z",
    notes: "treatment ~96k, 31 calls; snowball",
  },
  {
    label: "rtl-cleanup-5",
    run_id: "2026-08-22T12-00-02-941Z",
    notes: "treatment ~183k, 49 calls; snowball",
  },
];

export const COHORT_PRESETS: Record<string, CohortPreset> = {
  study: {
    id: "study",
    title: "7-run study cohort",
    description:
      "Side-by-side action-flow comparison for baseline, auto-test floor, snowball runs, and prime/autoverify arms. Highlighted segments: repair loop + extra verify.",
    entries: STUDY_COHORT,
  },
  "exp1-rtl": {
    id: "exp1-rtl",
    title: "Experiment 1 — RTL cleanup",
    description:
      "Matched cohort: rtl-control (no afterEach cleanup) vs rtl-cleanup (+ 3-line setup.ts seed). All 10 harness-green; 0/5 clean, 5/5 snowball both arms. Verdict: KEEP cleanup — mechanism counter inconclusive; do not claim token savings.",
    entries: EXP1_RTL_COHORT,
  },
};

export function resolveCohortPreset(presetId: string | null | undefined): CohortPreset {
  if (presetId && COHORT_PRESETS[presetId]) {
    return COHORT_PRESETS[presetId]!;
  }
  return COHORT_PRESETS.study!;
}

export function cohortLabelMap(entries: CohortEntry[]): Map<string, string> {
  return new Map(entries.map((c) => [c.run_id, c.label]));
}

export function cohortRunIds(entries: CohortEntry[]): Set<string> {
  return new Set(entries.map((c) => c.run_id));
}

/** @deprecated Use resolveCohortPreset().entries */
export function cohortLabelMapLegacy(): Map<string, string> {
  return cohortLabelMap(STUDY_COHORT);
}

/** @deprecated Use resolveCohortPreset().entries */
export function cohortRunIdsLegacy(): Set<string> {
  return cohortRunIds(STUDY_COHORT);
}
