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
    wall_seconds: number;
    seconds_per_call: number | null;
    time_to_final_green_s: number | null;
    time_to_first_failing_test_s: number | null;
    npm_test_command_count: number;
    auto_test_trigger_hits: number;
    phase_heuristic: PhaseBucket[];
  };
};

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
  git_branch: string | null;
  git_commit: string | null;
  approach_kind: string | null;
  app_rating: number | null;
  app_comment: string;
  run_comment: string;
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
  "ali",
  "sina",
  "shivam",
] as const;

export type HackathonAuthor = (typeof HACKATHON_AUTHORS)[number];
