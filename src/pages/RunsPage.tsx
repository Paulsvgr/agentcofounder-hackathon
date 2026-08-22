import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RunsCharts } from "../components/RunsCharts";
import { TokenStatsPanel } from "../components/TokenStats";
import {
  EXPERIMENTS,
  LINES,
  effectiveHuman,
  experimentKey,
  includeInEfficiencyCompare,
  lineKey,
  loadClassificationManifest,
  methodLabel,
  methodTooltip,
  shouldHideEarlySmoke,
} from "../lib/classification";
import { listRuns } from "../lib/api";
import {
  formatNumber,
  medianWeightedByExperiment,
  shortCommit,
  weightedOf,
} from "../lib/stats";
import { HACKATHON_AUTHORS, type HackathonRunRecord } from "../types/runExport";

type SortKey = "weighted_asc" | "rating_desc" | "newest";

function statusBadge(status: string | undefined) {
  const s = (status || "").toLowerCase();
  if (s === "success") return "badge badge-ok";
  if (s === "failed") return "badge badge-fail";
  return "badge badge-warn";
}

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export function RunsPage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<HackathonRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manifestReady, setManifestReady] = useState(false);

  const [author, setAuthor] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [experiments, setExperiments] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<SortKey>("weighted_asc");
  const [hideNoise, setHideNoise] = useState(true);
  const [includeExcluded, setIncludeExcluded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await loadClassificationManifest();
        if (!cancelled) setManifestReady(true);
        const data = await listRuns();
        if (!cancelled) setRuns(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load runs.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const branches = useMemo(() => {
    const set = new Set<string>();
    for (const r of runs) {
      const b = r.data.git_branch || r.data.export?.meta?.git_branch;
      if (b) set.add(b);
    }
    return [...set].sort();
  }, [runs]);

  const filtered = useMemo(() => {
    if (!manifestReady) return [];
    let list = [...runs];
    if (hideNoise) {
      list = list.filter((r) => !shouldHideEarlySmoke(r));
    }
    if (author) list = list.filter((r) => r.person === author);
    if (lines.length) list = list.filter((r) => lines.includes(lineKey(r)));
    if (experiments.length) list = list.filter((r) => experiments.includes(experimentKey(r)));
    if (branch) {
      list = list.filter(
        (r) => (r.data.git_branch || r.data.export?.meta?.git_branch) === branch,
      );
    }
    if (status) {
      list = list.filter(
        (r) => (r.data.export?.harness?.status || "").toLowerCase() === status,
      );
    }

    list.sort((a, b) => {
      if (sort === "newest") {
        const ra = a.data.export?.meta?.recorded_at || a.created_at;
        const rb = b.data.export?.meta?.recorded_at || b.created_at;
        return new Date(rb).getTime() - new Date(ra).getTime();
      }
      if (sort === "rating_desc") {
        const ra = effectiveHuman(a).app_rating ?? -1;
        const rb = effectiveHuman(b).app_rating ?? -1;
        return rb - ra;
      }
      const wa = weightedOf(a);
      const wb = weightedOf(b);
      if (wa === null && wb === null) return 0;
      if (wa === null) return 1;
      if (wb === null) return -1;
      return wa - wb;
    });
    return list;
  }, [runs, author, lines, experiments, branch, status, sort, hideNoise, manifestReady]);

  const chartRuns = useMemo(() => {
    if (includeExcluded) return filtered;
    return filtered.filter((r) => includeInEfficiencyCompare(r));
  }, [filtered, includeExcluded]);

  const chartMedians = useMemo(() => medianWeightedByExperiment(chartRuns), [chartRuns]);

  return (
    <div className="stack page-center">
      <section className="panel">
        <h2>Compare runs</h2>
        <p className="muted lead">
          Filter by structured <strong>line</strong> and <strong>experiment</strong>. Charts group
          by experiment and default to ranking-eligible runs only.
        </p>

        <div className="filters row">
          <div className="field">
            <label htmlFor="f-author">Author</label>
            <select id="f-author" value={author} onChange={(e) => setAuthor(e.target.value)}>
              <option value="">All</option>
              {HACKATHON_AUTHORS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="field field-multi">
            <label htmlFor="f-line">Line</label>
            <select
              id="f-line"
              multiple
              size={4}
              value={lines}
              onChange={(e) => {
                const selected = [...e.target.selectedOptions].map((o) => o.value);
                setLines(selected);
              }}
            >
              {LINES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="field field-multi">
            <label htmlFor="f-experiment">Experiment</label>
            <select
              id="f-experiment"
              multiple
              size={4}
              value={experiments}
              onChange={(e) => {
                const selected = [...e.target.selectedOptions].map((o) => o.value);
                setExperiments(selected);
              }}
            >
              {EXPERIMENTS.map((ex) => (
                <option key={ex} value={ex}>
                  {ex.replace(/-/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-branch">Branch</label>
            <select id="f-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">All</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-status">Status</label>
            <select id="f-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="success">success</option>
              <option value="partial">partial</option>
              <option value="failed">failed</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-sort">Sort</label>
            <select
              id="f-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="weighted_asc">weighted_total ↑</option>
              <option value="rating_desc">app_rating ↓</option>
              <option value="newest">newest</option>
            </select>
          </div>
          <label className="check-field">
            <input
              type="checkbox"
              checked={hideNoise}
              onChange={(e) => setHideNoise(e.target.checked)}
            />
            Hide early-smoke / unknown
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={includeExcluded}
              onChange={(e) => setIncludeExcluded(e.target.checked)}
            />
            Include excluded runs in charts
          </label>
        </div>

        {(lines.length > 0 || experiments.length > 0) && (
          <div className="chips filter-chips">
            {lines.map((l) => (
              <button
                key={`line-${l}`}
                type="button"
                className="chip chip-btn"
                onClick={() => setLines(toggleInList(lines, l))}
              >
                line: {l} ×
              </button>
            ))}
            {experiments.map((ex) => (
              <button
                key={`exp-${ex}`}
                type="button"
                className="chip chip-btn"
                onClick={() => setExperiments(toggleInList(experiments, ex))}
              >
                {ex.replace(/-/g, " ")} ×
              </button>
            ))}
          </div>
        )}

        {loading && <p className="muted">Loading…</p>}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && (
          <>
            <TokenStatsPanel runs={filtered} />

            <RunsCharts runs={chartRuns} onSelectRun={(id) => navigate(`/runs/${id}`)} />

            <div className="table-wrap">
              <table className="runs">
                <thead>
                  <tr>
                    <th>run_id</th>
                    <th>author</th>
                    <th>method</th>
                    <th>branch</th>
                    <th>commit</th>
                    <th>provider / model</th>
                    <th>status</th>
                    <th>weighted</th>
                    <th>exp. med</th>
                    <th>calls</th>
                    <th>wall s</th>
                    <th>rating</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={12} className="muted">
                        No runs in this filter — loosen filters or Add run.
                      </td>
                    </tr>
                  )}
                  {filtered.map((run) => {
                    const exp = run.data.export;
                    const st = exp?.harness?.status;
                    const exKey = experimentKey(run);
                    const human = effectiveHuman(run);
                    return (
                      <tr key={run.id} onClick={() => navigate(`/runs/${run.id}`)}>
                        <td>{exp?.meta?.run_id || "—"}</td>
                        <td>{run.person}</td>
                        <td title={methodTooltip(run)}>{methodLabel(run)}</td>
                        <td>{run.data.git_branch || exp?.meta?.git_branch || "—"}</td>
                        <td>{shortCommit(run.data.git_commit || exp?.meta?.git_commit)}</td>
                        <td>
                          {[exp?.meta?.provider, exp?.meta?.model].filter(Boolean).join(" / ") ||
                            "—"}
                        </td>
                        <td>
                          <span className={statusBadge(st)}>{st || "—"}</span>
                        </td>
                        <td>{formatNumber(weightedOf(run))}</td>
                        <td>{formatNumber(chartMedians.get(exKey) ?? null)}</td>
                        <td>{exp?.harness?.model_calls ?? "—"}</td>
                        <td>{formatNumber(exp?.efficiency?.wall_seconds)}</td>
                        <td>{human.app_rating ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
