/** 7-run study cohort for side-by-side action-flow comparison. */
export const STUDY_COHORT: { label: string; run_id: string; notes: string }[] = [
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

export function cohortLabelMap(): Map<string, string> {
  return new Map(STUDY_COHORT.map((c) => [c.run_id, c.label]));
}

export function cohortRunIds(): Set<string> {
  return new Set(STUDY_COHORT.map((c) => c.run_id));
}
