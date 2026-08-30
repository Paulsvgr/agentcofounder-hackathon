import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExperimentStudyCard } from "../components/ExperimentStudyCard";
import { listRuns } from "../lib/api";
import { loadClassificationManifest } from "../lib/classification";
import { studiesSorted } from "../lib/experimentCatalog";
import type { HackathonRunRecord } from "../types/runExport";

export function ExperimentsPage() {
  const studies = studiesSorted();
  const [runs, setRuns] = useState<HackathonRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await loadClassificationManifest();
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

  return (
    <div className="stack page-center">
      <section className="panel">
        <h2>Experiments</h2>
        <p className="muted lead">
          V2 stack on <code>setup/measure</code>: change, goal, result, and verdict per study.
          Normalized cumulative curves and stage mix compare control vs treatment medians.
        </p>
        <p className="muted">
          Run-level arms link to the{" "}
          <Link to="/">Runs</Link> filter and charts. Curated compare views — see{" "}
          <Link to="/compare">Compare</Link> for Exp1 RTL and the early 7-run study.
        </p>
        {loading && <p className="muted">Loading run trajectories…</p>}
        {error && <div className="alert alert-error">{error}</div>}
      </section>

      <div className="experiment-grid">
        {studies.map((study) => (
          <div key={study.id} id={study.id}>
            <ExperimentStudyCard study={study} runs={runs} />
          </div>
        ))}
      </div>
    </div>
  );
}
