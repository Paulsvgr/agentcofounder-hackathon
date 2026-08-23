import { Link } from "react-router-dom";
import { ExperimentStudyCard } from "../components/ExperimentStudyCard";
import { studiesSorted } from "../lib/experimentCatalog";

export function ExperimentsPage() {
  const studies = studiesSorted();

  return (
    <div className="stack page-center">
      <section className="panel">
        <h2>Experiments</h2>
        <p className="muted lead">
          Line F stack on <code>setup/measure</code>: change, goal, result, and verdict per study.
          Run-level arms (control / treatment) link to the{" "}
          <Link to="/">Runs</Link> filter and charts.
        </p>
        <p className="muted">
          Cohort views are separate curated run lists for deep comparison — see{" "}
          <Link to="/cohort">Cohort</Link> for Exp1 RTL (10 runs) and the early 7-run study.
        </p>
      </section>

      <div className="experiment-grid">
        {studies.map((study) => (
          <div key={study.id} id={study.id}>
            <ExperimentStudyCard study={study} />
          </div>
        ))}
      </div>
    </div>
  );
}
