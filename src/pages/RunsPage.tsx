import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RunsCharts } from "../components/RunsCharts";
import { ExperimentStudyPanel } from "../components/ExperimentStudyPanel";
import { RunActionModal } from "../components/RunActionModal";
import { TokenStatsPanel } from "../components/TokenStats";
import {
  effectiveHuman,
  experimentKey,
  includeInEfficiencyCompare,
  lineKey,
  loadClassificationManifest,
  methodLabel,
  methodTooltip,
  shouldHideEarlySmoke,
} from "../lib/classification";
import { studyById, studiesMatchingArms } from "../lib/experimentCatalog";
import type { ExperimentStudyId } from "../types/experiment";
import { fetchPeople, listRuns } from "../lib/api";
import { shortRunId } from "../lib/actionFlow";
import {
  manifestSearchHaystack,
  runManifestOf,
  shortConfigHash,
  templateTreeHash,
} from "../lib/manifestFields";
import {
  formatNumber,
  medianWeightedByExperiment,
  shortCommit,
  weightedOf,
} from "../lib/stats";
import { type HackathonRunRecord } from "../types/runExport";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [runs, setRuns] = useState<HackathonRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manifestReady, setManifestReady] = useState(false);
  const [authors, setAuthors] = useState<string[]>([]);

  const [author, setAuthor] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [experiments, setExperiments] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<SortKey>("weighted_asc");
  const [hideNoise, setHideNoise] = useState(true);
  const [includeExcluded, setIncludeExcluded] = useState(false);
  const [manifestSearch, setManifestSearch] = useState("");
  const [configHash, setConfigHash] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [manifestCohort, setManifestCohort] = useState("");
  const [manifestArm, setManifestArm] = useState("");
  const [actionRun, setActionRun] = useState<HackathonRunRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await loadClassificationManifest();
        if (!cancelled) setManifestReady(true);
        const [data, people] = await Promise.all([listRuns(), fetchPeople()]);
        if (!cancelled) {
          setRuns(data);
          setAuthors(people);
        }
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

  useEffect(() => {
    const studyParam = searchParams.get("study");
    if (!studyParam || !manifestReady) return;
    const study = studyById(studyParam as ExperimentStudyId);
    if (!study) return;
    setExperiments([...study.arms]);
    if (study.line) setLines([study.line]);
  }, [searchParams, manifestReady]);

  const matchedStudies = useMemo(
    () => studiesMatchingArms(experiments),
    [experiments],
  );

  const activeStudy = matchedStudies.length === 1 ? matchedStudies[0] : null;

  function applyStudyFilter(studyId: ExperimentStudyId) {
    const study = studyById(studyId);
    if (!study) return;
    setExperiments([...study.arms]);
    if (study.line) setLines([study.line]);
    setSearchParams({ study: study.id });
  }

  const branches = useMemo(() => {
    const set = new Set<string>();
    for (const r of runs) {
      const b = r.data.git_branch || r.data.export?.meta?.git_branch;
      if (b) set.add(b);
    }
    return [...set].sort();
  }, [runs]);

  const providers = useMemo(() => {
    const set = new Set<string>();
    for (const r of runs) {
      const p = r.data.export?.meta?.provider;
      if (p) set.add(p);
    }
    return [...set].sort();
  }, [runs]);

  const models = useMemo(() => {
    const set = new Set<string>();
    for (const r of runs) {
      if (provider && r.data.export?.meta?.provider !== provider) continue;
      const m = r.data.export?.meta?.model;
      if (m) set.add(m);
    }
    return [...set].sort();
  }, [runs, provider]);

  const configHashOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of runs) {
      const hash = runManifestOf(r)?.config_hash;
      if (hash) set.add(hash);
    }
    return [...set].sort();
  }, [runs]);

  const templateIdOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of runs) {
      const id = runManifestOf(r)?.template?.id;
      if (id) set.add(id);
    }
    return [...set].sort();
  }, [runs]);

  const manifestCohortOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of runs) {
      const cohort = runManifestOf(r)?.experiment?.cohort;
      if (cohort) set.add(cohort);
    }
    return [...set].sort();
  }, [runs]);

  const manifestArmOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of runs) {
      const arm = runManifestOf(r)?.experiment?.arm;
      if (arm) set.add(arm);
    }
    return [...set].sort();
  }, [runs]);

  useEffect(() => {
    if (model && !models.includes(model)) setModel("");
  }, [model, models]);

  const lineOptions = useMemo(() => {
    if (!manifestReady) return [];
    const set = new Set<string>();
    for (const r of runs) set.add(lineKey(r));
    return [...set].sort();
  }, [runs, manifestReady]);

  const experimentOptions = useMemo(() => {
    if (!manifestReady) return [];
    const set = new Set<string>();
    for (const r of runs) set.add(experimentKey(r));
    return [...set].sort();
  }, [runs, manifestReady]);

  const authorOptions = useMemo(() => {
    const set = new Set<string>(authors);
    for (const r of runs) {
      if (r.person) set.add(r.person);
    }
    return [...set].sort();
  }, [authors, runs]);

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
    if (provider) {
      list = list.filter((r) => r.data.export?.meta?.provider === provider);
    }
    if (model) {
      list = list.filter((r) => r.data.export?.meta?.model === model);
    }
    if (status) {
      list = list.filter(
        (r) => (r.data.export?.harness?.status || "").toLowerCase() === status,
      );
    }
    if (configHash) {
      list = list.filter((r) => runManifestOf(r)?.config_hash === configHash);
    }
    if (templateId) {
      list = list.filter((r) => runManifestOf(r)?.template?.id === templateId);
    }
    if (manifestCohort) {
      list = list.filter((r) => runManifestOf(r)?.experiment?.cohort === manifestCohort);
    }
    if (manifestArm) {
      list = list.filter((r) => runManifestOf(r)?.experiment?.arm === manifestArm);
    }
    if (manifestSearch.trim()) {
      const needle = manifestSearch.trim().toLowerCase();
      list = list.filter((r) => manifestSearchHaystack(r).includes(needle));
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
  }, [
    runs,
    author,
    lines,
    experiments,
    branch,
    provider,
    model,
    status,
    sort,
    hideNoise,
    manifestReady,
    configHash,
    templateId,
    manifestCohort,
    manifestArm,
    manifestSearch,
  ]);

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
          Filter by structured <strong>line</strong> and <strong>experiment</strong>, or by V2{" "}
          <strong>manifest</strong> provenance (config hash, template, cohort/arm).
        </p>

        <div className="filters row">
          <div className="field">
            <label htmlFor="f-author">Author</label>
            <select id="f-author" value={author} onChange={(e) => setAuthor(e.target.value)}>
              <option value="">All</option>
              {authorOptions.map((a) => (
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
              {lineOptions.map((l) => (
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
              {experimentOptions.map((ex) => (
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
            <label htmlFor="f-provider">Provider</label>
            <select id="f-provider" value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="">All</option>
              {providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-model">Model</label>
            <select id="f-model" value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="">All</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
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

        <div className="filters row manifest-filters">
          <div className="field field-wide">
            <label htmlFor="f-manifest-search">Manifest search</label>
            <input
              id="f-manifest-search"
              type="search"
              placeholder="config hash, template, cohort, arm, model…"
              value={manifestSearch}
              onChange={(e) => setManifestSearch(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="f-config-hash">Config hash</label>
            <select
              id="f-config-hash"
              value={configHash}
              onChange={(e) => setConfigHash(e.target.value)}
            >
              <option value="">All</option>
              {configHashOptions.map((hash) => (
                <option key={hash} value={hash}>
                  {shortConfigHash(hash)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-template-id">Template</label>
            <select
              id="f-template-id"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">All</option>
              {templateIdOptions.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-manifest-cohort">Cohort</label>
            <select
              id="f-manifest-cohort"
              value={manifestCohort}
              onChange={(e) => setManifestCohort(e.target.value)}
            >
              <option value="">All</option>
              {manifestCohortOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-manifest-arm">Arm</label>
            <select
              id="f-manifest-arm"
              value={manifestArm}
              onChange={(e) => setManifestArm(e.target.value)}
            >
              <option value="">All</option>
              {manifestArmOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(lines.length > 0 ||
          experiments.length > 0 ||
          configHash ||
          templateId ||
          manifestCohort ||
          manifestArm ||
          manifestSearch.trim()) && (
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
            {configHash && (
              <button type="button" className="chip chip-btn" onClick={() => setConfigHash("")}>
                config: {shortConfigHash(configHash)} ×
              </button>
            )}
            {templateId && (
              <button type="button" className="chip chip-btn" onClick={() => setTemplateId("")}>
                template: {templateId} ×
              </button>
            )}
            {manifestCohort && (
              <button
                type="button"
                className="chip chip-btn"
                onClick={() => setManifestCohort("")}
              >
                cohort: {manifestCohort} ×
              </button>
            )}
            {manifestArm && (
              <button type="button" className="chip chip-btn" onClick={() => setManifestArm("")}>
                arm: {manifestArm} ×
              </button>
            )}
            {manifestSearch.trim() && (
              <button
                type="button"
                className="chip chip-btn"
                onClick={() => setManifestSearch("")}
              >
                manifest search ×
              </button>
            )}
          </div>
        )}

        {activeStudy && (
          <ExperimentStudyPanel
            study={activeStudy}
            onApplyFilter={() => applyStudyFilter(activeStudy.id)}
          />
        )}

        {loading && <p className="muted">Loading…</p>}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && (
          <>
            <TokenStatsPanel runs={filtered} />

            <RunsCharts
              runs={chartRuns}
              onSelectRun={(runId) => {
                const run = chartRuns.find((r) => r.id === runId);
                if (run) setActionRun(run);
              }}
            />

            <div className="table-wrap">
              <table className="runs">
                <thead>
                  <tr>
                    <th className="mono">run_id</th>
                    <th>author</th>
                    <th>method</th>
                    <th>branch</th>
                    <th className="mono">commit</th>
                    <th>provider / model</th>
                    <th className="mono">config</th>
                    <th>template</th>
                    <th>status</th>
                    <th className="num">weighted</th>
                    <th className="num">exp. med</th>
                    <th className="num">calls</th>
                    <th className="num">wall s</th>
                    <th className="num">rating</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={14} className="muted">
                        No runs in this filter — loosen filters or Add run.
                      </td>
                    </tr>
                  )}
                  {filtered.map((run) => {
                    const exp = run.data.export;
                    const manifest = runManifestOf(run);
                    const st = exp?.harness?.status;
                    const exKey = experimentKey(run);
                    const human = effectiveHuman(run);
                    return (
                      <tr key={run.id} onClick={() => setActionRun(run)}>
                        <td className="mono" title={exp?.meta?.run_id}>{shortRunId(exp?.meta?.run_id)}</td>
                        <td>{run.person}</td>
                        <td title={methodTooltip(run)}>{methodLabel(run)}</td>
                        <td>{run.data.git_branch || exp?.meta?.git_branch || "—"}</td>
                        <td className="mono">{shortCommit(run.data.git_commit || exp?.meta?.git_commit)}</td>
                        <td>
                          {[exp?.meta?.provider, exp?.meta?.model].filter(Boolean).join(" / ") ||
                            "—"}
                        </td>
                        <td className="mono" title={manifest?.config_hash}>
                          {shortConfigHash(manifest?.config_hash)}
                        </td>
                        <td title={manifest ? templateTreeHash(manifest) ?? undefined : undefined}>
                          {manifest?.template?.id || "—"}
                        </td>
                        <td>
                          <span className={statusBadge(st)}>{st || "—"}</span>
                        </td>
                        <td className="num">{formatNumber(weightedOf(run))}</td>
                        <td className="num">{formatNumber(chartMedians.get(exKey) ?? null)}</td>
                        <td className="num">{exp?.harness?.model_calls ?? "—"}</td>
                        <td className="num">{formatNumber(exp?.efficiency?.wall_seconds)}</td>
                        <td className="num">{human.app_rating ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {actionRun && (
        <RunActionModal run={actionRun} onClose={() => setActionRun(null)} />
      )}
    </div>
  );
}
