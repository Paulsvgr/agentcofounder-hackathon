import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getRun } from "../lib/api";
import { RunTokenStats } from "../components/TokenStats";
import {
  effectiveClassification,
  effectiveHuman,
  loadClassificationManifest,
  methodLabel,
} from "../lib/classification";
import { formatNumber, shortCommit } from "../lib/stats";
import type { HackathonRunRecord, TestRun } from "../types/runExport";

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

  return (
    <div className="stack">
      <p>
        <Link to="/">← Back to runs</Link>
      </p>

      <section className="panel">
        <h2>{exp?.meta?.run_id || run.id}</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {methodLabel(run)} · {run.person} ·{" "}
          {run.data.git_branch || exp?.meta?.git_branch || "—"} @{" "}
          {shortCommit(run.data.git_commit || exp?.meta?.git_commit)}
        </p>
        <p className="muted" style={{ marginTop: 0, fontSize: "0.85rem" }}>
          Legacy approach: {cls.legacy_approach}
        </p>

        <div className="stat-grid">
          <div className="stat">
            <div className="label">Status</div>
            <div className="value">{exp?.harness?.status || "—"}</div>
          </div>
          <div className="stat">
            <div className="label">Weighted total</div>
            <div className="value">{formatNumber(exp?.efficiency?.weighted_total)}</div>
          </div>
          <div className="stat">
            <div className="label">Model calls</div>
            <div className="value">{exp?.harness?.model_calls ?? "—"}</div>
          </div>
          <div className="stat">
            <div className="label">Wall seconds</div>
            <div className="value">{formatNumber(exp?.efficiency?.wall_seconds)}</div>
          </div>
          <div className="stat">
            <div className="label">App rating</div>
            <div className="value">{human.app_rating ?? "—"}</div>
          </div>
          <div className="stat">
            <div className="label">Provider / model</div>
            <div className="value" style={{ fontSize: "0.95rem" }}>
              {[exp?.meta?.provider, exp?.meta?.model].filter(Boolean).join(" / ") || "—"}
            </div>
          </div>
        </div>
      </section>

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

      <section className="panel">
        <h3>Phase breakdown (heuristic)</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Heuristic only — not ground truth. Official weighted ≈ input + output×3 +
          cache_read×0.1.
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
      </section>
    </div>
  );
}
