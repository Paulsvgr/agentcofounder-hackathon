import type {
  HackathonRunRecord,
  RunClassification,
  RunFlags,
  RunHuman,
} from "../types/runExport";

const LINES = ["A", "A-prime", "B-prime", "C", "C-prime", "D", "F", "unknown"] as const;
const EXPERIMENTS = [
  "baseline",
  "no-dev-server-prompt",
  "auto-test",
  "autoverify-off",
  "autoverify-supplement",
  "autoverify-owned",
  "autoverify-gated",
  "prime-comparison",
  "exp1-rtl-control",
  "exp1-rtl-cleanup",
  "exp2-stop-control",
  "exp2-stop-treatment",
  "exp3-test-control",
  "exp3-test-treatment",
  "legacy",
  "legacy-smoke",
  "unknown",
] as const;

export { LINES, EXPERIMENTS };

type ManifestTaxonomy = {
  line: string[];
  experiment: string[];
};

type ManifestEntry = {
  classification?: RunClassification;
  human?: Partial<RunHuman>;
  flags?: RunFlags;
};

let manifestRuns: Record<string, ManifestEntry> | null = null;
let manifestTaxonomy: ManifestTaxonomy | null = null;
let manifestPromise: Promise<Record<string, ManifestEntry>> | null = null;

function parseTaxonomy(body: unknown): ManifestTaxonomy | null {
  if (!body || typeof body !== "object") return null;
  const tax = (body as { taxonomy?: unknown }).taxonomy;
  if (!tax || typeof tax !== "object") return null;
  const line = (tax as { line?: unknown }).line;
  const experiment = (tax as { experiment?: unknown }).experiment;
  if (!Array.isArray(line) || !Array.isArray(experiment)) return null;
  return {
    line: line.filter((v): v is string => typeof v === "string"),
    experiment: experiment.filter((v): v is string => typeof v === "string"),
  };
}

export async function loadClassificationManifest(): Promise<Record<string, ManifestEntry>> {
  if (manifestRuns) return manifestRuns;
  if (!manifestPromise) {
    manifestPromise = fetch("/runs-classification.json")
      .then((r) => (r.ok ? r.json() : { runs: {} }))
      .then((body) => {
        manifestTaxonomy = parseTaxonomy(body);
        manifestRuns = (body?.runs as Record<string, ManifestEntry>) || {};
        return manifestRuns;
      })
      .catch(() => {
        manifestTaxonomy = null;
        manifestRuns = {};
        return manifestRuns;
      });
  }
  return manifestPromise;
}

export function getManifestTaxonomy(): ManifestTaxonomy | null {
  return manifestTaxonomy;
}

function mergeFilterOptions(fromRuns: Iterable<string>, fromTaxonomy: string[] | undefined): string[] {
  const set = new Set<string>();
  for (const value of fromTaxonomy ?? []) {
    if (value) set.add(value);
  }
  for (const value of fromRuns) {
    if (value) set.add(value);
  }
  return [...set].sort((a, b) => {
    if (a === "unknown") return 1;
    if (b === "unknown") return -1;
    return a.localeCompare(b);
  });
}

export function lineFilterOptions(runs: HackathonRunRecord[]): string[] {
  return mergeFilterOptions(
    runs.map((run) => lineKey(run)),
    manifestTaxonomy?.line,
  );
}

export function experimentFilterOptions(runs: HackathonRunRecord[]): string[] {
  return mergeFilterOptions(
    runs.map((run) => experimentKey(run)),
    manifestTaxonomy?.experiment,
  );
}

function parseRunIndex(approach: string): number | null {
  const m = approach.match(/-(\d+)$/);
  return m ? Number(m[1]) : null;
}

function lineFromApproach(approach: string): RunClassification["line"] {
  if (!approach) return "unknown";
  const low = approach.toLowerCase();
  if (low.startsWith("rtl-control") || low.startsWith("rtl-cleanup")) return "F";
  if (low.startsWith("stop-") || low.startsWith("test-policy-") || low.startsWith("test-")) {
    return "F";
  }
  if (low.startsWith("a-prime")) return "A-prime";
  if (low.startsWith("b-prime")) return "B-prime";
  if (low.startsWith("c-prime")) return "C-prime";
  if (low.startsWith("a-")) return "A";
  if (approach === "C-original" || low.startsWith("c-")) return "C";
  if (low.includes("run-d") || approach === "D" || approach === "run-d / D") return "D";
  if (approach.startsWith("rtl-")) return "F";
  return "unknown";
}

function experimentFromApproach(
  approach: string,
  gitBranch: string | null | undefined,
): RunClassification["experiment"] {
  if (!approach) return gitBranch === "exp/auto-verify" ? "unknown" : "unknown";
  const low = approach.toLowerCase();
  if (low.startsWith("rtl-control")) return "exp1-rtl-control";
  if (low.startsWith("rtl-cleanup")) return "exp1-rtl-cleanup";
  if (low.startsWith("stop-control")) return "exp2-stop-control";
  if (low.startsWith("stop-treatment")) return "exp2-stop-treatment";
  if (low.startsWith("test-policy-control") || low.startsWith("test-control")) {
    return "exp3-test-control";
  }
  if (low.startsWith("test-policy-treatment") || low.startsWith("test-treatment")) {
    return "exp3-test-treatment";
  }
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

function experimentLabel(experiment: string): string {
  return experiment.replace(/-/g, " ");
}

function buildDisplayLabel(
  line: RunClassification["line"],
  experiment: RunClassification["experiment"],
  runIndex: number | null,
): string {
  const base = `${line} · ${experimentLabel(experiment)}`;
  return runIndex !== null ? `${base} · run ${runIndex}` : base;
}

function shouldExclude(experiment: string, runComment: string, appComment: string): boolean {
  if (experiment === "legacy-smoke") return true;
  const text = `${runComment} ${appComment}`.toLowerCase();
  return text.includes("don't rank") || text.includes("dont rank") || text.includes("not a real attempt");
}

export function deriveClassification(run: HackathonRunRecord): RunClassification {
  const meta = run.data.export?.meta;
  const exportCls = meta?.classification;
  if (exportCls?.display_label) {
    return exportCls;
  }

  const approach = (meta?.approach || run.data.approach_kind || "").trim();
  const gitBranch = run.data.git_branch || meta?.git_branch;
  const gitCommit = run.data.git_commit || meta?.git_commit;

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

  const weighted = run.data.export?.efficiency?.weighted_total;
  if (
    experiment === "unknown" &&
    ["unknown", "early-smoke", ""].includes(approach.toLowerCase()) &&
    typeof weighted === "number" &&
    weighted < 20000
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

export function deriveFlags(
  classification: RunClassification,
  runComment: string,
  appComment: string,
): RunFlags {
  const exclude = shouldExclude(classification.experiment, runComment, appComment);
  return {
    exclude_from_ranking: exclude,
    hide_early_smoke: classification.experiment === "legacy-smoke",
    include_in_efficiency_compare: !exclude,
  };
}

export function effectiveClassification(run: HackathonRunRecord): RunClassification {
  if (run.data.classification?.display_label) {
    return run.data.classification;
  }
  const runId = run.data.export?.meta?.run_id || run.data.run_id;
  if (runId && manifestRuns?.[runId]?.classification) {
    return manifestRuns[runId]!.classification!;
  }
  return deriveClassification(run);
}

export function effectiveFlags(run: HackathonRunRecord): RunFlags {
  if (run.data.flags) {
    return run.data.flags;
  }
  const runId = run.data.export?.meta?.run_id || run.data.run_id;
  if (runId && manifestRuns?.[runId]?.flags) {
    return manifestRuns[runId]!.flags!;
  }
  const cls = effectiveClassification(run);
  return deriveFlags(
    cls,
    run.data.run_comment || "",
    run.data.app_comment || "",
  );
}

export function effectiveHuman(run: HackathonRunRecord): RunHuman {
  const base: RunHuman = {
    app_rating: run.data.app_rating ?? null,
    app_comment: run.data.app_comment || "",
    run_comment: run.data.run_comment || "",
  };
  if (run.data.human) {
    return {
      app_rating: run.data.human.app_rating ?? base.app_rating,
      app_comment: run.data.human.app_comment || base.app_comment,
      run_comment: run.data.human.run_comment || base.run_comment,
    };
  }
  const runId = run.data.export?.meta?.run_id || run.data.run_id;
  if (runId && manifestRuns?.[runId]?.human) {
    const h = manifestRuns[runId]!.human!;
    return {
      app_rating: h.app_rating ?? base.app_rating,
      app_comment: base.app_comment,
      run_comment: h.run_comment || base.run_comment,
    };
  }
  return base;
}

export function methodLabel(run: HackathonRunRecord): string {
  return effectiveClassification(run).display_label;
}

export function experimentKey(run: HackathonRunRecord): string {
  return effectiveClassification(run).experiment;
}

export function lineKey(run: HackathonRunRecord): string {
  return effectiveClassification(run).line;
}

export function shouldHideEarlySmoke(run: HackathonRunRecord): boolean {
  const flags = effectiveFlags(run);
  const exp = effectiveClassification(run).experiment;
  return flags.hide_early_smoke === true || exp === "legacy-smoke";
}

export function includeInEfficiencyCompare(run: HackathonRunRecord): boolean {
  return effectiveFlags(run).include_in_efficiency_compare !== false;
}

export function methodTooltip(run: HackathonRunRecord): string {
  const cls = effectiveClassification(run);
  const human = effectiveHuman(run);
  const branch = run.data.git_branch || run.data.export?.meta?.git_branch || "—";
  const commit = run.data.git_commit || run.data.export?.meta?.git_commit || "—";
  const parts = [
    `Legacy: ${cls.legacy_approach}`,
    `Branch: ${branch}`,
    `Commit: ${commit}`,
  ];
  if (human.run_comment) parts.push(human.run_comment);
  return parts.join("\n");
}

export function setManifestCache(runs: Record<string, ManifestEntry>): void {
  manifestRuns = runs;
}
