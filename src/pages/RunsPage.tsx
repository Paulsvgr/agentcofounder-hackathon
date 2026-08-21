import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listRuns } from "../lib/api";
import {
  approachKey,
  formatNumber,
  medianWeightedByApproach,
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

export function RunsPage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<HackathonRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [author, setAuthor] = useState("");
  const [approach, setApproach] = useState("");
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<SortKey>("weighted_asc");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
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

  const approaches = useMemo(() => {
    const set = new Set<string>();
    for (const r of runs) set.add(approachKey(r));
    return [...set].sort();
  }, [runs]);

  const branches = useMemo(() => {
    const set = new Set<string>();
    for (const r of runs) {
      const b = r.data.git_branch || r.data.export?.meta?.git_branch;
      if (b) set.add(b);
    }
    return [...set].sort();
  }, [runs]);

  const medians = useMemo(() => medianWeightedByApproach(runs), [runs]);

  const filtered = useMemo(() => {
    let list = [...runs];
    if (author) list = list.filter((r) => r.person === author);
    if (approach) list = list.filter((r) => approachKey(r) === approach);
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
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sort === "rating_desc") {
        const ra = a.data.app_rating ?? -1;
        const rb = b.data.app_rating ?? -1;
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
  }, [runs, author, approach, branch, status, sort]);

  return (
    <div className="stack">
      <section className="panel">
        <h2>Compare runs</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Lower <code>weighted_total</code> is better when status is comparable. Median is
          shown per approach.
        </p>

        <div className="row" style={{ marginBottom: "0.75rem" }}>
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
          <div className="field">
            <label htmlFor="f-approach">Approach</label>
            <select
              id="f-approach"
              value={approach}
              onChange={(e) => setApproach(e.target.value)}
            >
              <option value="">All</option>
              {approaches.map((a) => (
                <option key={a} value={a}>
                  {a}
                  {medians.has(a) ? ` (med ${formatNumber(medians.get(a))})` : ""}
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
        </div>

        {loading && <p className="muted">Loading…</p>}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && (
          <div className="table-wrap">
            <table className="runs">
              <thead>
                <tr>
                  <th>run_id</th>
                  <th>author</th>
                  <th>approach</th>
                  <th>branch</th>
                  <th>commit</th>
                  <th>provider / model</th>
                  <th>status</th>
                  <th>weighted</th>
                  <th>approach med</th>
                  <th>calls</th>
                  <th>wall s</th>
                  <th>rating</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={12} className="muted">
                      No runs yet — add one from the Add run tab.
                    </td>
                  </tr>
                )}
                {filtered.map((run) => {
                  const exp = run.data.export;
                  const key = approachKey(run);
                  const st = exp?.harness?.status;
                  return (
                    <tr key={run.id} onClick={() => navigate(`/runs/${run.id}`)}>
                      <td>{exp?.meta?.run_id || "—"}</td>
                      <td>{run.person}</td>
                      <td>{key}</td>
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
                      <td>{formatNumber(medians.get(key) ?? null)}</td>
                      <td>{exp?.harness?.model_calls ?? "—"}</td>
                      <td>{formatNumber(exp?.efficiency?.wall_seconds)}</td>
                      <td>{run.data.app_rating ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
