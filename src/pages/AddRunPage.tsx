import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HowToExportPanel } from "../components/HowToExportPanel";
import {
  createRunFromPaste,
  getStoredAccessKey,
  setStoredAccessKey,
} from "../lib/api";
import {
  inspectPaste,
  normalizeDetected,
  type DetectedPaste,
} from "../lib/parseExport";
import {
  HACKATHON_AUTHORS,
  type PasteKind,
  type PasteOverrides,
  type RunExport,
} from "../types/runExport";

type Step = "paste" | "meta" | "human";

export function AddRunPage() {
  const navigate = useNavigate();
  const [author, setAuthor] = useState(HACKATHON_AUTHORS[0]);
  const [paste, setPaste] = useState("");
  const [detected, setDetected] = useState<Extract<DetectedPaste, { kind: PasteKind }> | null>(
    null,
  );
  const [parsed, setParsed] = useState<RunExport | null>(null);
  const [pasteKind, setPasteKind] = useState<PasteKind | null>(null);
  const [step, setStep] = useState<Step>("paste");

  const [approach, setApproach] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [runId, setRunId] = useState("");
  const [gitBranch, setGitBranch] = useState("");
  const [gitCommit, setGitCommit] = useState("");

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

  function overridesFromForm(): PasteOverrides {
    return {
      approach: approach.trim() || undefined,
      provider: provider.trim() || undefined,
      model: model.trim() || undefined,
      run_id: runId.trim() || undefined,
      git_branch: gitBranch.trim() || null,
      git_commit: gitCommit.trim() || null,
    };
  }

  function fillMetaForm(suggested: PasteOverrides) {
    setApproach(suggested.approach || "");
    setProvider(suggested.provider || "");
    setModel(suggested.model || "");
    setRunId(suggested.run_id || "");
    setGitBranch(suggested.git_branch || "");
    setGitCommit(suggested.git_commit || "");
  }

  function onValidate() {
    setError(null);
    const inspected = inspectPaste(paste);
    if (inspected.kind === "invalid" || inspected.kind === "unknown") {
      setDetected(null);
      setParsed(null);
      setPasteKind(null);
      setError(inspected.error);
      setStep("paste");
      return;
    }

    setDetected(inspected);
    setPasteKind(inspected.kind);
    const first = normalizeDetected(inspected, {});
    if (!first.ok) {
      setError(first.error);
      return;
    }

    fillMetaForm(first.suggested);
    setParsed(first.export);

    if (inspected.kind === "result_json" || first.needsMeta) {
      setStep("meta");
      return;
    }
    setStep("human");
  }

  function onConfirmMeta() {
    setError(null);
    if (!detected) {
      setError("Paste again.");
      setStep("paste");
      return;
    }
    const next = normalizeDetected(detected, overridesFromForm());
    if (!next.ok) {
      setError(next.error);
      return;
    }
    setParsed(next.export);
    fillMetaForm(next.suggested);
    setStep("human");
  }

  async function onLoadSample() {
    setError(null);
    try {
      const res = await fetch("/sample-run-export.json");
      if (!res.ok) throw new Error("Could not load sample export.");
      const text = await res.text();
      setPaste(text);
      setDetected(null);
      setParsed(null);
      setPasteKind(null);
      setStep("paste");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load sample.");
    }
  }

  async function onSave() {
    if (!detected || !parsed) return;
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
      const record = await createRunFromPaste({
        author,
        paste: detected.raw,
        overrides: overridesFromForm(),
        app_rating: ratingNum,
        app_comment: appComment.trim(),
        run_comment: runComment.trim(),
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
    <div className="stack page-center">
      <HowToExportPanel defaultOpen={false} />

      <section className="panel">
        <h2>Add run</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Paste <code>artifacts/exports/&lt;run_id&gt;.json</code> (preferred) or legacy{" "}
          <code>artifacts/runs/&lt;run_id&gt;/result.json</code>. Server stores{" "}
          <code>agentcofounder.run_export.v1</code> only. See{" "}
          <Link to="/how-to">How to export</Link>.
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
                <label htmlFor="paste">Paste run JSON</label>
                <textarea
                  id="paste"
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  placeholder='run_export.v1 or result.json'
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

          {step === "meta" && (
            <>
              {pasteKind === "result_json" && (
                <div className="alert alert-error" style={{ borderColor: "rgba(255,184,107,0.45)", color: "#ffe0b5", background: "rgba(255,184,107,0.08)" }}>
                  Legacy <code>result.json</code> — wall time and phase breakdown unavailable
                  unless you export from <code>setup/measure</code>.
                </div>
              )}
              <h3 style={{ margin: 0 }}>Complete run info</h3>
              <div className="row">
                <div className="field">
                  <label htmlFor="approach">Approach (required)</label>
                  <input
                    id="approach"
                    value={approach}
                    onChange={(e) => setApproach(e.target.value)}
                    placeholder="base, harness/paul, …"
                  />
                </div>
                <div className="field">
                  <label htmlFor="runId">Run id (required)</label>
                  <input
                    id="runId"
                    value={runId}
                    onChange={(e) => setRunId(e.target.value)}
                    placeholder="artifacts/runs/&lt;run-id&gt; folder name"
                  />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label htmlFor="provider">Provider (required)</label>
                  <input
                    id="provider"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder="zai, berget, openai, …"
                  />
                </div>
                <div className="field">
                  <label htmlFor="model">Model (required)</label>
                  <input
                    id="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="prefilled from call_log when possible"
                  />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label htmlFor="gitBranch">Git branch (optional)</label>
                  <input
                    id="gitBranch"
                    value={gitBranch}
                    onChange={(e) => setGitBranch(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="gitCommit">Git commit (optional)</label>
                  <input
                    id="gitCommit"
                    value={gitCommit}
                    onChange={(e) => setGitCommit(e.target.value)}
                  />
                </div>
              </div>
              <div className="row">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setStep("paste");
                    setParsed(null);
                    setDetected(null);
                  }}
                >
                  Back
                </button>
                <button type="button" className="btn" onClick={onConfirmMeta}>
                  Continue
                </button>
              </div>
            </>
          )}

          {step === "human" && preview && (
            <>
              <div className="alert alert-ok">
                {pasteKind === "result_json" ? "Normalized legacy paste" : "Parsed"}{" "}
                <strong>{preview.runId}</strong> · {preview.approach} · status {preview.status} ·
                weighted {preview.weighted}
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
                  onClick={() => setStep(pasteKind === "result_json" ? "meta" : "paste")}
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
