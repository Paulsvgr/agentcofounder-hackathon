export function HowToExportPanel({ defaultOpen = true }: { defaultOpen?: boolean }) {
  return (
    <details className="panel howto" open={defaultOpen}>
      <summary>
        <span className="howto-title">How to get a run JSON</span>
        <span className="muted howto-sub">from the harness repo</span>
      </summary>

      <div className="howto-body stack">
        <p style={{ margin: 0 }}>
          Use branch <code>setup/measure</code> for analyze + export.{" "}
          <strong>Not</strong> thin <code>main</code>/<code>base</code> — those have no{" "}
          <code>export:run</code> (<code>main</code>/<code>base</code> = stock + pi-agent only).
        </p>

        <pre className="code-block">{`git checkout setup/measure
npm ci --ignore-scripts   # if first time on this branch`}</pre>

        <p className="muted" style={{ margin: 0 }}>
          After a challenge run:
        </p>

        <pre className="code-block">{`npm run challenge
# …wait until finished…
ls -1dt artifacts/runs/*/ | head -1    # note the run-id folder name
npm run analyze -- <run-id>
npm run export:run -- <run-id> --approach base`}</pre>

        <ul className="list-plain">
          <li>
            Paste file: <code>artifacts/exports/&lt;run-id&gt;.json</code>
          </li>
          <li>
            Schema must be <code>agentcofounder.run_export.v1</code>
          </li>
          <li>
            <code>--approach</code> = label for comparisons (e.g. <code>base</code>,{" "}
            <code>harness/paul</code>). Optional: <code>RUN_APPROACH=…</code>
          </li>
          <li>
            Ratings / comments are <strong>not</strong> in that file — enter them in this app
            after paste
          </li>
          <li>Export is manual (not automatic after challenge)</li>
        </ul>

        <h3 style={{ marginBottom: 0 }}>Branch cheat-sheet</h3>
        <div className="table-wrap">
          <table className="runs howto-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Use for</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>setup/measure</code>
                </td>
                <td>Analyze + export JSON for this app</td>
              </tr>
              <tr>
                <td>
                  <code>main</code> / <code>base</code>
                </td>
                <td>Run challenges (pi-agent setup); no export tooling</td>
              </tr>
              <tr>
                <td>
                  <code>original</code>
                </td>
                <td>Stock organizer repo only</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p style={{ margin: 0 }}>
          Full hackathon checklist (including Phase I — export):{" "}
          <a href="/steps.html" target="_blank" rel="noreferrer">
            open steps.html
          </a>
          .
        </p>
      </div>
    </details>
  );
}
