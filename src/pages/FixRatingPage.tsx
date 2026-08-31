import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getRun,
  getStoredAccessKey,
  setStoredAccessKey,
  updateRun,
} from "../lib/api";
import { AppRubricForm, emptyRubricState } from "../components/AppRubricForm";
import { formatAppRating, isLegacyAppRating, rubricFromHuman } from "../lib/app-rubric";
import { methodLabel, loadClassificationManifest } from "../lib/classification";
import { shortRunId } from "../lib/actionFlow";
import { humanFromRun, humanPatchFromForm, patchRunHumanFields } from "../lib/runPatch";
import { formatNumber, weightedOf } from "../lib/stats";
import type { AppRubricScores } from "../lib/app-rubric";

export function FixRatingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [runIdLabel, setRunIdLabel] = useState("");
  const [status, setStatus] = useState("");
  const [weighted, setWeighted] = useState<number | null>(null);
  const [storedRun, setStoredRun] = useState<Awaited<ReturnType<typeof getRun>> | null>(null);
  const [legacyNote, setLegacyNote] = useState<string | null>(null);

  const [rubric, setRubric] = useState<AppRubricScores>(() => emptyRubricState());
  const [runComment, setRunComment] = useState("");
  const [accessKey, setAccessKey] = useState(getStoredAccessKey);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await loadClassificationManifest();
        const run = await getRun(id);
        if (cancelled) return;
        setStoredRun(run);
        const human = humanFromRun(run);
        setTitle(methodLabel(run));
        setRunIdLabel(shortRunId(run.data.export?.meta?.run_id || run.id));
        setStatus(run.data.export?.harness?.status || "—");
        setWeighted(weightedOf(run));
        setRubric(rubricFromHuman(human.app_rubric));
        setRunComment(human.run_comment);
        if (isLegacyAppRating(human.app_rating, human.app_rubric)) {
          setLegacyNote(formatAppRating(human.app_rating, human.app_rubric));
        } else {
          setLegacyNote(null);
        }
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

  async function onSave() {
    if (!storedRun || !id) return;
    setError(null);
    if (!accessKey.trim()) {
      setError("Enter the shared hackathon access key to save.");
      return;
    }

    setSaving(true);
    try {
      let humanPatch;
      try {
        humanPatch = humanPatchFromForm({
          rubric,
          app_comment: storedRun.data.human?.app_comment ?? storedRun.data.app_comment ?? "",
          run_comment: runComment.trim(),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid rubric scores.");
        setSaving(false);
        return;
      }

      setStoredAccessKey(accessKey.trim());
      const data = patchRunHumanFields(storedRun, humanPatch);
      await updateRun({
        id,
        data,
        accessKey: accessKey.trim(),
      });
      navigate(`/runs/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="muted page-center">Loading…</p>;

  return (
    <div className="stack page-center">
      <p>
        <Link to={id ? `/runs/${id}` : "/"}>← Back to run</Link>
      </p>

      <section className="panel">
        <h2>Fix rating</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {title} · {runIdLabel} · status {status}
          {weighted !== null ? ` · weighted ${formatNumber(weighted, 0)}` : ""}
        </p>
        {legacyNote ? (
          <div className="alert alert-warn" style={{ marginTop: 0 }}>
            Previous score: <strong>{legacyNote}</strong>. Enter category scores below to re-score on
            the 100-point rubric.
          </div>
        ) : null}

        <div className="stack">
          <div className="field">
            <label>App quality rubric</label>
            <AppRubricForm rubric={rubric} onChange={setRubric} idPrefix="fix-rubric" />
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
              style={{ maxWidth: 280 }}
            />
          </div>

          <div className="field">
            <label htmlFor="runComment">Run comment (optional)</label>
            <textarea
              id="runComment"
              value={runComment}
              onChange={(e) => setRunComment(e.target.value)}
              style={{ minHeight: 90 }}
              placeholder="Notes about the run / approach…"
            />
          </div>

          <div className="row">
            <Link to={id ? `/runs/${id}/edit` : "/"} className="btn btn-ghost">
              Edit full run instead
            </Link>
            <button type="button" className="btn" onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : "Save rating"}
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
        </div>
      </section>
    </div>
  );
}
