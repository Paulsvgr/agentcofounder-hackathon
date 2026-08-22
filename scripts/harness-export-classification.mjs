/**
 * Derive meta.classification for agentcofounder.run_export.v1 at export time.
 * Copy into the harness repo (setup/measure) and call from export-run.ts.
 *
 * Machine fields only — ratings/comments/flags stay in the runs app / manifest.
 */

/** @param {string} approach */
function parseRunIndex(approach) {
  const m = approach.match(/-(\d+)$/);
  return m ? Number(m[1]) : null;
}

/** @param {string} approach */
function lineFromApproach(approach) {
  if (!approach) return "unknown";
  const low = approach.toLowerCase();
  if (low.startsWith("a-prime")) return "A-prime";
  if (low.startsWith("b-prime")) return "B-prime";
  if (low.startsWith("c-prime")) return "C-prime";
  if (low.startsWith("a-")) return "A";
  if (approach === "C-original" || low.startsWith("c-")) return "C";
  if (low.includes("run-d") || approach === "D" || approach === "run-d / D") return "D";
  return "unknown";
}

/**
 * @param {string} approach
 * @param {string | null | undefined} gitBranch
 */
function experimentFromApproach(approach, gitBranch) {
  if (!approach) return gitBranch === "exp/auto-verify" ? "unknown" : "unknown";
  if (approach.startsWith("A-autoverify-owned-gated") || approach.toLowerCase().includes("gated")) {
    return "autoverify-gated";
  }
  if (approach.startsWith("A-autoverify-owned")) return "autoverify-owned";
  if (approach.startsWith("A-autoverify-supplement")) return "autoverify-supplement";
  if (approach.startsWith("A-autoverify-off")) return "autoverify-off";
  if (approach.startsWith("A-prompt")) return "no-dev-server-prompt";
  if (approach.startsWith("A-autotest")) return "auto-test";
  if (approach.startsWith("A-baseline") || approach.startsWith("A-raw")) return "baseline";
  if (gitBranch === "exp/auto-verify") return "unknown";
  if (approach.toLowerCase().includes("abort")) return "legacy-smoke";
  if (approach.includes("-prime") || ["A-prime", "B-prime"].includes(approach)) {
    return "prime-comparison";
  }
  if (["A-original", "C-original", "run-d / D"].includes(approach)) return "legacy";
  return "unknown";
}

/** @param {string} experiment */
function experimentLabel(experiment) {
  return experiment.replace(/-/g, " ");
}

/** @param {string} line @param {string} experiment @param {number | null} runIndex */
function buildDisplayLabel(line, experiment, runIndex) {
  const base = `${line} · ${experimentLabel(experiment)}`;
  return runIndex !== null ? `${base} · run ${runIndex}` : base;
}

/**
 * @param {{
 *   approach?: string | null;
 *   gitBranch?: string | null;
 *   gitCommit?: string | null;
 *   weightedTotal?: number | null;
 * }} input
 */
export function buildExportClassification(input) {
  const approach = (input.approach || "").trim();
  const gitBranch = input.gitBranch ?? null;
  const gitCommit = input.gitCommit ?? null;

  let line = lineFromApproach(approach);
  let experiment = experimentFromApproach(approach, gitBranch);

  if (
    gitBranch === "main" &&
    gitCommit?.startsWith("d0f0b49") &&
    experiment === "unknown" &&
    line === "unknown"
  ) {
    line = "A";
    experiment = "baseline";
  }

  if (
    experiment === "unknown" &&
    ["unknown", "early-smoke", ""].includes(approach.toLowerCase()) &&
    typeof input.weightedTotal === "number" &&
    input.weightedTotal < 20000
  ) {
    experiment = "legacy-smoke";
  }

  const runIndex = parseRunIndex(approach);
  return {
    line,
    experiment,
    run_index: runIndex,
    display_label: buildDisplayLabel(line, experiment, runIndex),
    legacy_approach: approach || "unknown",
  };
}

/**
 * Attach classification to export meta before writing JSON.
 * @param {Record<string, unknown>} meta
 * @param {{ weighted_total?: number | null }} [efficiency]
 */
export function attachClassificationToMeta(meta, efficiency = {}) {
  meta.classification = buildExportClassification({
    approach: typeof meta.approach === "string" ? meta.approach : null,
    gitBranch: typeof meta.git_branch === "string" ? meta.git_branch : null,
    gitCommit: typeof meta.git_commit === "string" ? meta.git_commit : null,
    weightedTotal:
      typeof efficiency.weighted_total === "number" ? efficiency.weighted_total : null,
  });
  return meta;
}
