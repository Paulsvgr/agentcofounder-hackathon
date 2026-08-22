import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ActionFlowChart } from "../components/ActionFlowChart";
import { getRun } from "../lib/api";
import { RunTokenStats } from "../components/TokenStats";
import { shortRunId } from "../lib/actionFlow";
import {
  effectiveClassification,
  effectiveHuman,
  loadClassificationManifest,
  methodLabel,
} from "../lib/classification";
import { efficiencyOf, WEIGHTED_COST_TOOLTIP } from "../lib/efficiencyFields";
import { formatNumber, shortCommit } from "../lib/stats";
import { hasActionFlow, isExportV2, type HackathonRunRecord, type TestRun } from "../types/runExport";

function TestList({ title, items }: { title: string; items: TestRun[] | undefined }) {
  if (!items?.length) {
    return (
      <div>
        <h3>{title}</h3>
        <p className="muted">None</p>
      </div>
    );
  }
  return (
    <div>
      <h3>{title}</h3>
      <ul className="list-plain">
        {items.map((t, i) => (
          <li key={`${t.command}-${i}`}>
            <span className={t.result === "passed" ? "pass" : "fail"}>{t.result}</span>
            {" · "}
            <code>{t.command}</code>
            <div className="muted">{t.journey}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function schemaBadge(exportDoc: HackathonRunRecord["data"]["export"]) {
  if (isExportV2(exportDoc)) return <span className="badge badge-ok">v2</span>;
  return <span className="badge badge-warn">legacy v1</span>;
}

function timingChip(label: string, value: number | null | undefined) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{formatNumber(value ?? null)}</div>
    </div>
  );
}

export function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<HackathonRunRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await loadClassificationManifest();
        const data = await getRun(id);
        if (!cancelled) setRun(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load run.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!run) return <p className="muted">Not found.</p>;

  const exp = run.data.export;
  const phases = exp?.efficiency?.phase_heuristic || [];
  const cls = effectiveClassification(run);
  const human = effectiveHuman(run);
  const eff = efficiencyOf(run);
  const showActionFlow = hasActionFlow(exp);
  const runId = exp?.meta?.run_id || run.id;
  const status = exp?.harness?.status || "—";

  return (
    <div className="stack">
      <p>
        <Link to="/">← Back to runs</Link>
      </p>

      <section className="panel">
        <div className="detail-head">
          <div>
            <h2>{methodLabel(run)}</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              {shortRunId(runId)} · {run.person} ·{" "}
              {run.data.git_branch || exp?.meta?.git_branch || "—"} @{" "}
              {shortCommit(run.data.git_commit || exp?.meta?.git_commit)} ·{" "}
              {exp?.meta?.recorded_at
                ? new Date(exp.meta.recorded_at).toLocaleString()
                : "—"}
            </p>
            <p className="muted" style={{ marginTop: 0, fontSize: "0.85rem" }}>
              Legacy approach: {cls.legacy_approach}
            </p>
          </div>
          <div className="detail-badges">
            {schemaBadge(exp)}
            <span
              className={
                status.toLowerCase() === "success"
                  ? "badge badge-ok"
                  : status.toLowerCase() === "failed"
                    ? "badge badge-fail"
                    : "badge badge-warn"
              }
            >
              {status}
            </span>
          </div>
        </div>

        <p className="muted" style={{ marginTop: 0 }}>
          {[exp?.meta?.provider, exp?.meta?.model].filter(Boolean).join(" / ") || "—"}
        </p>

        <div className="stat-grid">
          <div className="stat" title={WEIGHTED_COST_TOOLTIP}>
            <div className="label">Weighted total</div>
            <div className="value">{formatNumber(exp?.efficiency?.weighted_total)}</div>
          </div>
          {timingChip("Wall seconds", exp?.efficiency?.wall_seconds)}
          <div className="stat">
            <div className="label">Model calls</div>
            <div className="value">{exp?.harness?.model_calls ?? "—"}</div>
          </div>
          {timingChip("First green (s)", eff.first_green_s)}
          {timingChip("Last green (s)", eff.last_green_s)}
          {timingChip("Green → exit (s)", eff.green_to_exit_s)}
          <div className="stat">
            <div className="label">Test reinspection</div>
            <div className="value">{formatNumber(eff.test_reinspection_calls, 0)}</div>
          </div>
          <div className="stat">
            <div className="label">Post-green verify</div>
            <div className="value">{formatNumber(eff.post_green_verification_calls, 0)}</div>
          </div>
          <div className="stat">
            <div className="label">Manual build calls</div>
            <div className="value">{formatNumber(eff.manual_build_calls, 0)}</div>
          </div>
          {isExportV2(exp) && (
            <>
              <div className="stat">
                <div className="label">RTL DOM leaks</div>
                <div className="value">
                  {formatNumber(exp.efficiency.rtl_dom_leak_failures ?? null, 0)}
                </div>
              </div>
              <div className="stat">
                <div className="label">Query ambiguity</div>
                <div className="value">
                  {formatNumber(exp.efficiency.query_ambiguity_failures ?? null, 0)}
                </div>
              </div>
              <div className="stat">
                <div className="label">Multiple elements (total)</div>
                <div className="value">
                  {formatNumber(exp.efficiency.multiple_element_failures_total ?? null, 0)}
                </div>
              </div>
            </>
          )}
          <div className="stat">
            <div className="label">App rating</div>
            <div className="value">{human.app_rating ?? "—"}</div>
          </div>
        </div>
      </section>

      {showActionFlow && exp && (
        <section className="panel">
          <ActionFlowChart exportDoc={exp} />
        </section>
      )}

      <RunTokenStats run={run} />

      <section className="panel">
        <h3>Summary</h3>
        <p>{exp?.harness?.summary || "—"}</p>

        <h3>Implemented features</h3>
        <ul className="list-plain">
          {(exp?.harness?.implemented_features || []).map((f) => (
            <li key={f}>{f}</li>
          ))}
          {!exp?.harness?.implemented_features?.length && <li className="muted">None</li>}
        </ul>

        <h3>Assumptions</h3>
        <ul className="list-plain">
          {(exp?.harness?.assumptions || []).map((a) => (
            <li key={a}>{a}</li>
          ))}
          {!exp?.harness?.assumptions?.length && <li className="muted">None</li>}
        </ul>
      </section>

      <section className="panel">
        <h3>Human notes</h3>
        <p>
          <strong>App:</strong> {human.app_comment || run.data.app_comment || "—"}
        </p>
        <p>
          <strong>Run:</strong> {human.run_comment || run.data.run_comment || "—"}
        </p>
      </section>

      <section className="panel stack">
        <TestList title="Tests run" items={exp?.harness?.tests_run} />
        <TestList title="Harness checks" items={exp?.harness?.harness_checks} />
      </section>

      <details className="panel phase-details">
        <summary>
          <h3 style={{ display: "inline" }}>
            {showActionFlow ? "Heuristic only (per-call guess)" : "Phase breakdown (heuristic)"}
          </h3>
        </summary>
        <p className="muted" style={{ marginTop: "0.5rem" }}>
          {showActionFlow
            ? "Secondary view — use Action flow above for execution segments."
            : "Heuristic only — not ground truth. Official weighted ≈ input + output×3 + cache_read×0.1."}
        </p>
        <div className="phase-bar">
          {phases.map((p) => (
            <div className="phase-row" key={p.phase}>
              <span>{p.phase}</span>
              <div className="phase-track">
                <div
                  className="phase-fill"
                  style={{ width: `${Math.min(100, (p.share_of_total || 0) * 100)}%` }}
                />
              </div>
              <span className="muted">
                {p.call_count} calls · {formatNumber(p.weighted_cost)} (
                {formatNumber((p.share_of_total || 0) * 100, 0)}%)
              </span>
            </div>
          ))}
          {!phases.length && <p className="muted">No phase heuristic data.</p>}
        </div>
      </details>
    </div>
  );
}
