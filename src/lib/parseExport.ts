import {
  RUN_EXPORT_SCHEMA,
  type RunExport,
} from "../types/runExport";

export type ParseResult =
  | { ok: true; export: RunExport }
  | { ok: false; error: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireNumber(obj: Record<string, unknown>, key: string): number | null {
  const v = obj[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function requireString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** Validate paste: schema + meta/harness/efficiency only. */
export function parseRunExport(rawText: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, error: "Invalid JSON — paste the export file contents." };
  }

  if (!isObject(parsed)) {
    return { ok: false, error: "Export must be a JSON object." };
  }

  const keys = Object.keys(parsed).sort();
  const expected = ["efficiency", "harness", "meta", "schema"].sort();
  if (keys.length !== 4 || keys.join(",") !== expected.join(",")) {
    return {
      ok: false,
      error:
        "Paste must have exactly schema, meta, harness, efficiency (no human fields or events).",
    };
  }

  if (parsed.schema !== RUN_EXPORT_SCHEMA) {
    return {
      ok: false,
      error: `schema must be "${RUN_EXPORT_SCHEMA}" (got ${String(parsed.schema)}).`,
    };
  }

  if (!isObject(parsed.meta) || !isObject(parsed.harness) || !isObject(parsed.efficiency)) {
    return { ok: false, error: "meta, harness, and efficiency must be objects." };
  }

  const runId = requireString(parsed.meta, "run_id");
  if (!runId) {
    return { ok: false, error: "meta.run_id is required." };
  }

  const status = requireString(parsed.harness, "status");
  if (!status) {
    return { ok: false, error: "harness.status is required." };
  }

  const weighted = requireNumber(parsed.efficiency, "weighted_total");
  if (weighted === null) {
    return { ok: false, error: "efficiency.weighted_total must be a number." };
  }

  return { ok: true, export: parsed as RunExport };
}
