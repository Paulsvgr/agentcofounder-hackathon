import {
  RUN_EXPORT_SCHEMA,
  type PasteKind,
  type PasteOverrides,
  type RunExport,
} from "../types/runExport";

export type DetectedPaste =
  | { kind: PasteKind; raw: Record<string, unknown> }
  | { kind: "unknown"; error: string };

export type NormalizeOk = {
  ok: true;
  kind: PasteKind;
  export: RunExport;
  suggested: PasteOverrides;
  needsMeta: boolean;
};

export type NormalizeFail = { ok: false; error: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function strList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x));
}

function testRuns(value: unknown): RunExport["harness"]["tests_run"] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isObject)
    .map((item) => {
      const raw = str(item.result).toLowerCase();
      const result =
        raw === "passed" || raw === "pass" || raw === "ok" || raw === "success"
          ? ("passed" as const)
          : ("failed" as const);
      return {
        command: str(item.command),
        journey: str(item.journey),
        result,
      };
    });
}

export function computeWeightedTotal(
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
): number {
  return inputTokens + outputTokens * 3 + cacheReadTokens * 0.1;
}

export function detectPaste(raw: unknown): DetectedPaste {
  if (!isObject(raw)) {
    return { kind: "unknown", error: "Paste must be a JSON object." };
  }
  if (
    raw.schema === RUN_EXPORT_SCHEMA &&
    isObject(raw.meta) &&
    isObject(raw.harness) &&
    isObject(raw.efficiency)
  ) {
    return { kind: "run_export_v1", raw };
  }
  if (
    typeof raw.status === "string" &&
    Array.isArray(raw.tests_run) &&
    typeof raw.input_tokens === "number"
  ) {
    return { kind: "result_json", raw };
  }
  return {
    kind: "unknown",
    error:
      "Unrecognized JSON. Paste agentcofounder.run_export.v1 (schema/meta/harness/efficiency) or a harness result.json (status, tests_run, input_tokens).",
  };
}

function hintModelFromCallLog(raw: Record<string, unknown>): string | undefined {
  const log = raw.call_log;
  if (!Array.isArray(log) || !log.length) return undefined;
  const first = log[0];
  if (isObject(first) && typeof first.model === "string" && first.model.trim()) {
    return first.model.trim();
  }
  return undefined;
}

function applyOverrides(
  meta: RunExport["meta"],
  overrides: PasteOverrides,
): RunExport["meta"] {
  return {
    ...meta,
    run_id: overrides.run_id?.trim() || meta.run_id,
    approach: overrides.approach?.trim() || meta.approach,
    provider: overrides.provider?.trim() || meta.provider,
    model: overrides.model?.trim() || meta.model,
    git_branch:
      overrides.git_branch !== undefined
        ? overrides.git_branch?.trim() || null
        : meta.git_branch,
    git_commit:
      overrides.git_commit !== undefined
        ? overrides.git_commit?.trim() || null
        : meta.git_commit,
  };
}

function normalizeV1(
  raw: Record<string, unknown>,
  overrides: PasteOverrides,
): NormalizeOk | NormalizeFail {
  const metaIn = isObject(raw.meta) ? raw.meta : {};
  const harness = isObject(raw.harness) ? raw.harness : {};
  const efficiencyIn = isObject(raw.efficiency) ? raw.efficiency : {};

  let meta: RunExport["meta"] = {
    run_id: str(metaIn.run_id),
    recorded_at: str(metaIn.recorded_at) || new Date().toISOString(),
    git_branch: typeof metaIn.git_branch === "string" ? metaIn.git_branch : null,
    git_commit: typeof metaIn.git_commit === "string" ? metaIn.git_commit : null,
    approach: typeof metaIn.approach === "string" ? metaIn.approach : null,
    provider: typeof metaIn.provider === "string" ? metaIn.provider : null,
    model: typeof metaIn.model === "string" ? metaIn.model : null,
  };
  meta = applyOverrides(meta, overrides);

  if (!meta.run_id) return { ok: false, error: "meta.run_id is required." };
  if (!str(harness.status)) return { ok: false, error: "harness.status is required." };

  let weighted: number;
  const existingWeighted = efficiencyIn.weighted_total;
  if (typeof existingWeighted === "number" && Number.isFinite(existingWeighted)) {
    weighted = existingWeighted;
  } else {
    weighted = computeWeightedTotal(
      num(harness.input_tokens),
      num(harness.output_tokens),
      num(harness.cache_read_tokens),
    );
  }

  const exp: RunExport = {
    schema: RUN_EXPORT_SCHEMA,
    meta,
    harness: harness as RunExport["harness"],
    efficiency: {
      ...(efficiencyIn as RunExport["efficiency"]),
      weighted_total: weighted,
    },
  };

  const needsMeta = !meta.approach;
  return {
    ok: true,
    kind: "run_export_v1",
    export: exp,
    suggested: {
      approach: meta.approach || undefined,
      provider: meta.provider || undefined,
      model: meta.model || undefined,
      run_id: meta.run_id,
      git_branch: meta.git_branch,
      git_commit: meta.git_commit,
    },
    needsMeta,
  };
}

function normalizeResultJson(
  raw: Record<string, unknown>,
  overrides: PasteOverrides,
): NormalizeOk | NormalizeFail {
  const inputTokens = num(raw.input_tokens);
  const outputTokens = num(raw.output_tokens);
  const cacheRead = num(raw.cache_read_tokens);
  const cacheWrite = num(raw.cache_write_tokens);
  const features = raw.implemented_features ?? raw.features;
  let modelCalls = raw.model_calls;
  if (typeof modelCalls !== "number") {
    modelCalls = Array.isArray(raw.call_log) ? raw.call_log.length : 0;
  }

  const suggested: PasteOverrides = {
    approach: overrides.approach,
    provider: overrides.provider,
    model: overrides.model || hintModelFromCallLog(raw),
    run_id: overrides.run_id,
    git_branch: overrides.git_branch,
    git_commit: overrides.git_commit,
  };

  const meta = applyOverrides(
    {
      run_id: suggested.run_id || `legacy-${crypto.randomUUID().slice(0, 8)}`,
      recorded_at: new Date().toISOString(),
      git_branch: suggested.git_branch ?? null,
      git_commit: suggested.git_commit ?? null,
      approach: suggested.approach ?? null,
      provider: suggested.provider ?? null,
      model: suggested.model ?? null,
    },
    overrides,
  );

  const missing: string[] = [];
  if (!meta.approach?.trim()) missing.push("approach");
  if (!meta.provider?.trim()) missing.push("provider");
  if (!meta.model?.trim()) missing.push("model");
  if (!meta.run_id?.trim()) missing.push("run_id");

  const needsMeta = missing.length > 0;
  if (needsMeta && Object.keys(overrides).length === 0) {
    // First pass after detect — return suggested blanks for the form.
    return {
      ok: true,
      kind: "result_json",
      export: {
        schema: RUN_EXPORT_SCHEMA,
        meta: {
          ...meta,
          run_id: meta.run_id || "",
        },
        harness: {
          status: str(raw.status) || "unknown",
          summary: str(raw.summary),
          implemented_features: strList(features),
          assumptions: strList(raw.assumptions),
          tests_run: testRuns(raw.tests_run),
          harness_checks: testRuns(raw.harness_checks),
          model_calls: num(modelCalls),
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cache_read_tokens: cacheRead,
          cache_write_tokens: cacheWrite,
          total_tokens: num(raw.total_tokens, inputTokens + outputTokens),
          reasoning_tokens: num(raw.reasoning_tokens),
          cost_total: num(raw.cost_total),
          pi_exit_code: num(raw.pi_exit_code),
        },
        efficiency: {
          weighted_total: computeWeightedTotal(inputTokens, outputTokens, cacheRead),
          wall_seconds: null,
          seconds_per_call: null,
          time_to_final_green_s: null,
          time_to_first_failing_test_s: null,
          npm_test_command_count: 0,
          auto_test_trigger_hits: 0,
          phase_heuristic: [],
        },
      },
      suggested: {
        ...suggested,
        run_id: suggested.run_id || meta.run_id,
        model: suggested.model || meta.model || undefined,
      },
      needsMeta: true,
    };
  }

  if (missing.length) {
    return {
      ok: false,
      error: `Complete run info required: ${missing.join(", ")}.`,
    };
  }

  if (!str(raw.status)) {
    return { ok: false, error: "result.json status is required." };
  }

  const exp: RunExport = {
    schema: RUN_EXPORT_SCHEMA,
    meta,
    harness: {
      status: str(raw.status),
      summary: str(raw.summary),
      implemented_features: strList(features),
      assumptions: strList(raw.assumptions),
      tests_run: testRuns(raw.tests_run),
      harness_checks: testRuns(raw.harness_checks),
      model_calls: num(modelCalls),
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_read_tokens: cacheRead,
      cache_write_tokens: cacheWrite,
      total_tokens: num(raw.total_tokens, inputTokens + outputTokens),
      reasoning_tokens: num(raw.reasoning_tokens),
      cost_total: num(raw.cost_total),
      pi_exit_code: num(raw.pi_exit_code),
    },
    efficiency: {
      weighted_total: computeWeightedTotal(inputTokens, outputTokens, cacheRead),
      wall_seconds: null,
      seconds_per_call: null,
      time_to_final_green_s: null,
      time_to_first_failing_test_s: null,
      npm_test_command_count: 0,
      auto_test_trigger_hits: 0,
      phase_heuristic: [],
    },
  };

  return {
    ok: true,
    kind: "result_json",
    export: exp,
    suggested: {
      approach: meta.approach || undefined,
      provider: meta.provider || undefined,
      model: meta.model || undefined,
      run_id: meta.run_id,
      git_branch: meta.git_branch,
      git_commit: meta.git_commit,
    },
    needsMeta: false,
  };
}

/** Parse textarea JSON and detect format (no overrides yet). */
export function inspectPaste(rawText: string): DetectedPaste | { kind: "invalid"; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { kind: "invalid", error: "Invalid JSON — paste the file contents." };
  }
  return detectPaste(parsed);
}

/** Build canonical v1 from detected paste + optional overrides. */
export function normalizeDetected(
  detected: Extract<DetectedPaste, { kind: PasteKind }>,
  overrides: PasteOverrides = {},
): NormalizeOk | NormalizeFail {
  if (detected.kind === "run_export_v1") {
    return normalizeV1(detected.raw, overrides);
  }
  return normalizeResultJson(detected.raw, overrides);
}

/** @deprecated prefer inspectPaste + normalizeDetected */
export function parseRunExport(rawText: string): NormalizeOk | NormalizeFail {
  const inspected = inspectPaste(rawText);
  if (inspected.kind === "invalid" || inspected.kind === "unknown") {
    return { ok: false, error: inspected.error };
  }
  return normalizeDetected(inspected, {});
}
