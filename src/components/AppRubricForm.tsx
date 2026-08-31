import {
  APP_RUBRIC_CATEGORIES,
  APP_RUBRIC_TOTAL_MAX,
  emptyAppRubric,
  formatAppRating,
  rubricTotal,
  type AppRubricKey,
  type AppRubricScores,
} from "../lib/app-rubric";

export { formatAppRating, rubricTotal, type AppRubricScores };

type AppRubricFormProps = {
  rubric: AppRubricScores;
  onChange: (next: AppRubricScores) => void;
  idPrefix?: string;
  disabled?: boolean;
};

function scoreInputValue(value: number | null): string {
  return value === null ? "" : String(value);
}

export function AppRubricForm({ rubric, onChange, idPrefix = "rubric", disabled = false }: AppRubricFormProps) {
  const total = rubricTotal(rubric);

  function setScore(key: AppRubricKey, raw: string): void {
    const trimmed = raw.trim();
    const next: AppRubricScores = { ...rubric, [key]: trimmed === "" ? null : Number(trimmed) };
    onChange(next);
  }

  return (
    <div className="rubric-form stack">
      {APP_RUBRIC_CATEGORIES.map(({ key, label, max, description }) => (
        <label key={key} className="rubric-row" htmlFor={`${idPrefix}-${key}`}>
          <span className="rubric-label-block">
            <span className="rubric-label">{label}</span>
            <span className="muted rubric-hint">{description}</span>
          </span>
          <span className="rubric-score">
            <input
              id={`${idPrefix}-${key}`}
              type="number"
              min={0}
              max={max}
              step={1}
              disabled={disabled}
              value={scoreInputValue(rubric[key])}
              onChange={(event) => setScore(key, event.target.value)}
              aria-label={`${label} score out of ${max}`}
            />
            <span className="muted">/ {max}</span>
          </span>
        </label>
      ))}
      <div className="rubric-total" aria-live="polite">
        <span className="rubric-label">Total</span>
        <strong>{total !== null ? `${total} / ${APP_RUBRIC_TOTAL_MAX}` : `— / ${APP_RUBRIC_TOTAL_MAX}`}</strong>
      </div>
    </div>
  );
}

export function emptyRubricState(): AppRubricScores {
  return emptyAppRubric();
}
