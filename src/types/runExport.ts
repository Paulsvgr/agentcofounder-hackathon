/** Paste contract from harness: agentcofounder.run_export.v1 */

export const RUN_EXPORT_SCHEMA = "agentcofounder.run_export.v1" as const;

export type TestRun = {
  command: string;
  journey: string;
  result: "passed" | "failed";
};

export type PhaseBucket = {
  phase: "recon" | "build" | "test_debug" | "finalize" | "mixed" | "other";
  call_count: number;
  weighted_cost: number;
  share_of_total: number;
};

export type ClassificationLine = "A" | "A-prime" | "B-prime" | "C" | "C-prime" | "D" | "unknown";

export type ClassificationExperiment =
  | "baseline"
  | "no-dev-server-prompt"
  | "auto-test"
  | "autoverify-off"
  | "autoverify-supplement"
  | "autoverify-owned"
  | "autoverify-gated"
  | "prime-comparison"
  | "legacy"
  | "legacy-smoke"
  | "unknown";

export type RunClassification = {
  line: ClassificationLine;
  experiment: ClassificationExperiment;
  run_index: number | null;
  display_label: string;
  legacy_approach: string;
};

export type RunFlags = {
  exclude_from_ranking: boolean;
  hide_early_smoke: boolean;
  include_in_efficiency_compare: boolean;
};

export type RunHuman = {
  app_rating: number | null;
  app_comment: string;
  run_comment: string;
};

export type RunExport = {
  schema: typeof RUN_EXPORT_SCHEMA;
  meta: {
    run_id: string;
    recorded_at: string;
    git_branch: string | null;
    git_commit: string | null;
    approach: string | null;
    provider: string | null;
    model: string | null;
    /** Set by harness export:run from RUN_APPROACH / --approach (machine fields only). */
    classification?: RunClassification;
  };
  harness: {
    status: string;
    summary: string;
    implemented_features: string[];
    assumptions: string[];
    tests_run: TestRun[];
    harness_checks: TestRun[];
    model_calls: number;
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
    total_tokens: number;
    reasoning_tokens: number;
    cost_total: number;
    pi_exit_code: number;
  };
  efficiency: {
    weighted_total: number;
    wall_seconds: number | null;
    seconds_per_call: number | null;
    time_to_final_green_s: number | null;
    time_to_first_failing_test_s: number | null;
    npm_test_command_count: number | null;
    auto_test_trigger_hits: number | null;
    phase_heuristic: PhaseBucket[];
  };
};

/** Meta fields the user can fill after a legacy result.json paste. */
export type PasteOverrides = {
  approach?: string;
  provider?: string;
  model?: string;
  run_id?: string;
  git_branch?: string | null;
  git_commit?: string | null;
};

export type PasteKind = "run_export_v1" | "result_json";

/** Human fields — UI / DB only, never part of paste schema. */
export type HumanFields = {
  author: string;
  app_rating: number | null;
  app_comment: string;
  run_comment: string;
};

/**
 * Stored in HackathonRun.data on webeditor.
 * Top-level git_* keys keep server filters working.
 */
export type HackathonRunData = {
  run_id?: string | null;
  git_branch: string | null;
  git_commit: string | null;
  approach_kind: string | null;
  app_rating: number | null;
  app_comment: string;
  run_comment: string;
  paste_kind?: string;
  classification?: RunClassification;
  human?: RunHuman;
  flags?: RunFlags;
  export: RunExport;
};

export type HackathonRunRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  person: string;
  data: HackathonRunData;
};

export const HACKATHON_AUTHORS = [
  "paul",
  "mohammed",
  "ali sina",
  "shivam",
] as const;

export type HackathonAuthor = (typeof HACKATHON_AUTHORS)[number];
