import { isRunManifest } from "../types/runManifest";
import type { HackathonRunRecord } from "../types/runExport";

function row(label: string, value: string | null | undefined) {
  if (!value?.trim()) return null;
  return (
    <div className="manifest-row">
      <dt>{label}</dt>
      <dd className="mono">{value}</dd>
    </div>
  );
}

export function RunManifestPanel({ run }: { run: HackathonRunRecord }) {
  const manifest = run.data.manifest;
  if (!manifest || !isRunManifest(manifest)) return null;

  const exp = manifest.experiment;
  const template = manifest.template;
  const git = manifest.git;
  const model = manifest.model;
  const modelLine =
    model && typeof model === "object"
      ? [model.provider, model.model].filter((x) => typeof x === "string" && x).join(" / ")
      : "";

  return (
    <section className="panel">
      <h3>Run manifest</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: "0.88rem" }}>
        Provenance snapshot — what was mounted for this run (sibling to export, not in harness metrics).
      </p>
      <dl className="manifest-dl">
        {row("Schema", manifest.schema)}
        {row("Run ID", manifest.run_id)}
        {row("Config hash", manifest.config_hash)}
        {row("Config schema", manifest.config_schema_version)}
        {row("Template", template?.id)}
        {row("Template tree", template?.tree_hash)}
        {row("Experiment cohort", exp?.cohort ?? undefined)}
        {row("Experiment arm", exp?.arm ?? undefined)}
        {row(
          "Experiment rep",
          typeof exp?.rep === "number" ? String(exp.rep) : undefined,
        )}
        {row("Git branch", git?.branch ?? undefined)}
        {row("Git commit", git?.commit ?? undefined)}
        {row("Model", modelLine || undefined)}
        {row("Created", manifest.created_at)}
      </dl>
    </section>
  );
}
