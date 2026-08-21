import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  buildRunData,
  createRun,
  getStoredAccessKey,
  setStoredAccessKey,
} from "../lib/api";
import { parseRunExport } from "../lib/parseExport";
import { HACKATHON_AUTHORS, type RunExport } from "../types/runExport";

type Step = "paste" | "human";

export function AddRunPage() {
  const navigate = useNavigate();
  const [author, setAuthor] = useState(HACKATHON_AUTHORS[0]);
  const [paste, setPaste] = useState("");
  const [parsed, setParsed] = useState<RunExport | null>(null);
  const [step, setStep] = useState<Step>("paste");
  const [appRating, setAppRating] = useState("7");
  const [appComment, setAppComment] = useState("");
  const [runComment, setRunComment] = useState("");
  const [accessKey, setAccessKey] = useState(getStoredAccessKey);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    if (!parsed) return null;
    return {
      runId: parsed.meta.run_id,
      status: parsed.harness.status,
      weighted: parsed.efficiency.weighted_total,
      approach: parsed.meta.approach || parsed.meta.git_branch || "—",
      model: [parsed.meta.provider, parsed.meta.model].filter(Boolean).join(" / ") || "—",
    };
  }, [parsed]);

  function onValidate() {
    setError(null);
    const result = parseRunExport(paste);
    if (!result.ok) {
      setParsed(null);
      setError(result.error);
      setStep("paste");
      return;
    }
    setParsed(result.export);
    setStep("human");
  }

  async function onLoadSample() {
    setError(null);
    try {
      const res = await fetch("/sample-run-export.json");
      if (!res.ok) throw new Error("Could not load sample export.");
      const text = await res.text();
      setPaste(text);
      setParsed(null);
      setStep("paste");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load sample.");
    }
  }

  async function onSave() {
    if (!parsed) return;
    setError(null);
    const ratingNum = Number(appRating);
    if (!Number.isFinite(ratingNum) || ratingNum < 0 || ratingNum > 10) {
      setError("App rating must be a number from 0 to 10.");
      return;
    }
    if (!accessKey.trim()) {
      setError("Enter the shared hackathon access key to save.");
      return;
    }

    setSaving(true);
    try {
      setStoredAccessKey(accessKey.trim());
      const data = buildRunData(parsed, {
        author,
        app_rating: ratingNum,
        app_comment: appComment.trim(),
        run_comment: runComment.trim(),
      });
      const record = await createRun({
        person: author,
        data,
        accessKey: accessKey.trim(),
      });
      navigate(`/runs/${record.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <section className="panel">
        <h2>Add run</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Paste <code>artifacts/exports/&lt;run_id&gt;.json</code> from{" "}
          <code>npm run export:run</code>. Schema must be{" "}
          <code>agentcofounder.run_export.v1</code>.
        </p>

        <div className="stack">
          <div className="field" style={{ flex: "1 1 200px", maxWidth: 280 }}>
            <label htmlFor="author">Who are you</label>
            <select
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value as typeof author)}
            >
              {HACKATHON_AUTHORS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {step === "paste" && (
            <>
              <div className="field">
                <label htmlFor="paste">Paste run export JSON</label>
                <textarea
                  id="paste"
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  placeholder='{ "schema": "agentcofounder.run_export.v1", ... }'
                  spellCheck={false}
                />
              </div>
              <div className="row">
                <button type="button" className="btn" onClick={onValidate} disabled={!paste.trim()}>
                  Validate paste
                </button>
                <button type="button" className="btn btn-ghost" onClick={onLoadSample}>
                  Load sample JSON
                </button>
              </div>
            </>
          )}

          {step === "human" && preview && (
            <>
              <div className="alert alert-ok">
                Parsed <strong>{preview.runId}</strong> · {preview.approach} · status{" "}
                {preview.status} · weighted {preview.weighted}
              </div>

              <div className="row">
                <div className="field">
                  <label htmlFor="rating">App rating (0–10)</label>
                  <input
                    id="rating"
                    type="number"
                    min={0}
                    max={10}
                    step={1}
                    value={appRating}
                    onChange={(e) => setAppRating(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="key">Access key (write)</label>
                  <input
                    id="key"
                    type="password"
                    autoComplete="off"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    placeholder="Shared team key"
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="appComment">App comment</label>
                <textarea
                  id="appComment"
                  value={appComment}
                  onChange={(e) => setAppComment(e.target.value)}
                  style={{ minHeight: 90 }}
                  placeholder="Product quality of the generated app…"
                />
              </div>

              <div className="field">
                <label htmlFor="runComment">Run comment</label>
                <textarea
                  id="runComment"
                  value={runComment}
                  onChange={(e) => setRunComment(e.target.value)}
                  style={{ minHeight: 90 }}
                  placeholder="Notes about the run / approach…"
                />
              </div>

              <div className="row">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setStep("paste");
                    setParsed(null);
                  }}
                >
                  Back
                </button>
                <button type="button" className="btn" onClick={onSave} disabled={saving}>
                  {saving ? "Saving…" : "Save run"}
                </button>
              </div>
            </>
          )}

          {error && <div className="alert alert-error">{error}</div>}
        </div>
      </section>
    </div>
  );
}
