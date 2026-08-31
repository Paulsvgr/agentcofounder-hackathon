# App rubric contract (100-point hackathon scale)

Cross-repo contract for app quality scoring. **Canonical implementation:** `agentcofounder/control-app/shared/app-rubric.ts`. Production mirrors it in `src/lib/app-rubric.ts` and `webeditor/hackathon/app_rubric.py`.

## Categories (total 100)

| Key | Max | Label |
|-----|-----|--------|
| `usability_ux` | 30 | Usability & UX |
| `data_state_persistence` | 20 | Data & State Persistence |
| `robustness` | 20 | Robustness |
| `api_integration_readiness` | 15 | API & Integration Readiness |
| `maintainability_extensibility` | 15 | Maintainability & Extensibility |

## Stored shape

```typescript
type AppRubricScores = {
  usability_ux: number | null;
  data_state_persistence: number | null;
  robustness: number | null;
  api_integration_readiness: number | null;
  maintainability_extensibility: number | null;
};

type RunHuman = {
  app_rubric: AppRubricScores | null;
  app_rating: number | null;  // 0–100 total; null if rubric incomplete
  app_comment: string;
  run_comment: string;
};
```

**Persist on:**

- `HackathonRun.data.human` (primary)
- `HackathonRun.data.app_rubric` + `data.app_rating` (top-level mirror for filters/sort)

Control-app overlay: `artifacts/runs-overlay.json` → `human.app_rubric`.

## Validation rules

- Each category: integer, `0 … max` for that category, or `null`
- Partial rubrics allowed while editing; **`app_rating` is `null` until all five categories are set**
- When complete: `app_rating = sum(categories)` (must not disagree with rubric)
- Legacy: `app_rubric == null && app_rating <= 10` → old 0–10 scale (do not auto-split into categories)

## Display vs charts

| Context | Behavior |
|---------|----------|
| **Display** | `formatAppRating()` → `72/100` or `8/10 (legacy)` |
| **Charts** | `effectiveRatingForCompare()` → rubric total, or legacy ×10 for axis only |
| **Storage** | Never multiply legacy scores into fake category breakdowns |

## Publish / API

**POST** `/hackathon/api/v1/runs/` (paste create) accepts:

```json
{
  "author": "paul",
  "paste": { … },
  "app_rubric": { … },
  "app_rating": 72,
  "app_comment": "",
  "run_comment": ""
}
```

- Fully rubric-scored runs may send **`app_rating` up to 100** + populated `app_rubric`
- Legacy publishes (`app_rating ≤ 10`, `app_rubric: null`) remain valid

**PATCH** `/hackathon/api/v1/runs/:id/` — send updated `data` with `human` + top-level mirrors; server normalizes via `normalize_stored_data_human()`.

## Migration policy

~90 existing runs have `app_rating` 0–10 and no `app_rubric`. Leave as-is; UI prompts re-score. Do not bulk `×10` into categories.

## Spec reference

`docs/v2/spec/Agent_Cofounder_V2_COMPLETE_SPEC.md` §4 (harness repo).

## Status

| System | Status |
|--------|--------|
| Control-app overlay + publish | Done |
| Django API (`webeditor/hackathon`) | Done (this repo) |
| Production frontend (`agentcofounder-hackathon`) | Done (this repo) |
