import { useEffect, useMemo, useState } from "react";
import { getExperimentTitle, getExperimentTaxonomy } from "../lib/classification";
import {
  applyClassificationFieldPatch,
  type ClassificationFormState,
} from "../lib/classificationForm";

const ADD_NEW_EXPERIMENT = "__new__";
const EXPERIMENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;

type Props = {
  value: ClassificationFormState;
  onChange: (next: ClassificationFormState) => void;
  experiments?: string[];
  overlayRunId?: string | null;
  idPrefix?: string;
  accessKey?: string;
  onCreateExperiment?: (input: {
    id: string;
    title: string;
    accessKey: string;
  }) => Promise<{ slug: string; title: string }>;
  onExperimentsChanged?: (experiments: string[]) => void;
};

function sortedUnique(values: Iterable<string>, current: string): string[] {
  const set = new Set(values);
  if (current.trim()) set.add(current.trim());
  return [...set].sort((a, b) => a.localeCompare(b));
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ClassificationFields({
  value,
  onChange,
  experiments,
  overlayRunId,
  idPrefix = "cls",
  accessKey,
  onCreateExperiment,
  onExperimentsChanged,
}: Props) {
  const experimentOptions = useMemo(
    () => sortedUnique(experiments ?? getExperimentTaxonomy(), value.experiment),
    [experiments, value.experiment],
  );

  const [experimentSelect, setExperimentSelect] = useState(() =>
    experimentOptions.includes(value.experiment) ? value.experiment : ADD_NEW_EXPERIMENT,
  );
  const [newExperimentId, setNewExperimentId] = useState("");
  const [newExperimentTitle, setNewExperimentTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (experimentOptions.includes(value.experiment)) {
      setExperimentSelect(value.experiment);
      return;
    }
    if (value.experiment && value.experiment !== "unknown") {
      setExperimentSelect(ADD_NEW_EXPERIMENT);
      setNewExperimentId(value.experiment);
    }
  }, [value.experiment, experimentOptions]);

  function setField(patch: Partial<ClassificationFormState>) {
    onChange({ ...value, ...patch });
  }

  function setStructural(
    patch: Partial<Pick<ClassificationFormState, "experiment" | "runIndex">>,
  ) {
    onChange(applyClassificationFieldPatch(value, patch));
  }

  function onExperimentSelectChange(next: string) {
    setExperimentSelect(next);
    setCreateError(null);
    if (next === ADD_NEW_EXPERIMENT) return;
    setStructural({ experiment: next });
  }

  async function onAddExperiment() {
    if (!onCreateExperiment) {
      setCreateError("Experiment creation is not configured.");
      return;
    }
    const id = newExperimentId.trim().toLowerCase();
    if (!EXPERIMENT_ID_PATTERN.test(id)) {
      setCreateError("Use lowercase letters, numbers, and hyphens (e.g. exp7-planner-treatment).");
      return;
    }
    if (!accessKey?.trim()) {
      setCreateError("Enter the shared hackathon access key to add experiments.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const title = newExperimentTitle.trim() || titleFromSlug(id);
      const created = await onCreateExperiment({
        id,
        title,
        accessKey: accessKey.trim(),
      });
      onExperimentsChanged?.(sortedUnique(experimentOptions, created.slug));
      setExperimentSelect(created.slug);
      setNewExperimentId("");
      setNewExperimentTitle("");
      setStructural({ experiment: created.slug });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not add experiment.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <fieldset className="stack" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "1rem" }}>
      <legend style={{ padding: "0 0.35rem" }}>Classification</legend>

      {overlayRunId ? (
        <div className="alert alert-warn" style={{ margin: 0 }}>
          This run also has a classification entry in{" "}
          <code>runs-classification.json</code> ({overlayRunId}). That overlay wins in the UI until
          the manifest is updated.
        </div>
      ) : null}

      <div className="row">
        <div className="field" style={{ flex: "2 1 240px" }}>
          <label htmlFor={`${idPrefix}-experiment`}>Experiment</label>
          <select
            id={`${idPrefix}-experiment`}
            value={experimentSelect}
            onChange={(e) => onExperimentSelectChange(e.target.value)}
          >
            {experimentOptions.map((experiment) => (
              <option key={experiment} value={experiment}>
                {getExperimentTitle(experiment)} ({experiment})
              </option>
            ))}
            {onCreateExperiment ? <option value={ADD_NEW_EXPERIMENT}>Add new…</option> : null}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-runIndex`}>Run index</label>
          <input
            id={`${idPrefix}-runIndex`}
            type="number"
            min={0}
            step={1}
            value={value.runIndex}
            onChange={(e) => setStructural({ runIndex: e.target.value })}
            placeholder="optional"
          />
        </div>
      </div>

      {experimentSelect === ADD_NEW_EXPERIMENT && onCreateExperiment ? (
        <div className="stack" style={{ gap: "0.75rem" }}>
          <div className="row">
            <div className="field">
              <label htmlFor={`${idPrefix}-newExperimentId`}>New experiment id</label>
              <input
                id={`${idPrefix}-newExperimentId`}
                value={newExperimentId}
                onChange={(e) => setNewExperimentId(e.target.value.toLowerCase())}
                placeholder="exp7-planner-treatment"
                spellCheck={false}
              />
            </div>
            <div className="field">
              <label htmlFor={`${idPrefix}-newExperimentTitle`}>Title</label>
              <input
                id={`${idPrefix}-newExperimentTitle`}
                value={newExperimentTitle}
                onChange={(e) => setNewExperimentTitle(e.target.value)}
                placeholder="Human-readable name"
              />
            </div>
          </div>
          <div className="row">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => void onAddExperiment()}
              disabled={creating || !newExperimentId.trim()}
            >
              {creating ? "Adding…" : "Add experiment"}
            </button>
          </div>
          {createError ? <div className="alert alert-error">{createError}</div> : null}
        </div>
      ) : null}

      <div className="field">
        <label htmlFor={`${idPrefix}-displayLabel`}>Display label</label>
        <input
          id={`${idPrefix}-displayLabel`}
          value={value.displayLabel}
          onChange={(e) =>
            setField({ displayLabel: e.target.value, displayLabelManual: true })
          }
          placeholder="exp3 test treatment · run 4"
        />
        {!value.displayLabelManual ? (
          <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
            Auto-built from experiment and run index.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-legacyApproach`}>Legacy approach (optional)</label>
        <input
          id={`${idPrefix}-legacyApproach`}
          value={value.legacyApproach}
          onChange={(e) => setField({ legacyApproach: e.target.value })}
          placeholder="test-policy-treatment-4"
        />
      </div>
    </fieldset>
  );
}
