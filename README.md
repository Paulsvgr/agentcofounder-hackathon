# AgentCofounder · Hackathon Runs

Small UI for the team to **paste harness exports**, add human ratings/comments, and compare runs.

## Setup

```bash
cd react/agentcofounder-hackathon
cp .env.example .env
npm install
npm run dev
```

`.env`:

```
VITE_HACKATHON_API_BASE=https://admin.coretechs.se/hackathon
# local webeditor:
# VITE_HACKATHON_API_BASE=http://127.0.0.1:8000/hackathon
```

Never put `HACKATHON_ACCESS_CODE` in Vite env — friends type it when saving a run.

## Deploy on Vercel

1. Import the `react/agentcofounder-hackathon` folder (or repo root with **Root Directory** set to that path).
2. Framework: Vite (picked up from `vercel.json`).
3. Set env var **Production**:
   - `VITE_HACKATHON_API_BASE` = `https://admin.coretechs.se/hackathon`
4. Deploy. SPA routes (`/add`, `/runs/:id`) are rewritten via `vercel.json`.

Do **not** add `HACKATHON_ACCESS_CODE` to Vercel — that stays on webeditor only.

## Backend (webeditor)

- App: `webeditor/hackathon/`
- Env: `HACKATHON_ACCESS_CODE=...`
- Migrate: `python manage.py migrate hackathon`

| Method | Path | Key |
|--------|------|-----|
| GET | `/hackathon/api/v1/people/` | no |
| GET | `/hackathon/api/v1/runs/` | no |
| POST / PATCH / DELETE | `/hackathon/api/v1/runs/…` | `X-Hackathon-Key` |

## Paste contract

Accepts:

1. Preferred `agentcofounder.run_export.v2` — includes `efficiency.action_flow[]` for run-detail charts
2. Legacy `agentcofounder.run_export.v1` (`schema` / `meta` / `harness` / `efficiency`)
3. Legacy harness `result.json` — UI asks for approach / provider / model / run id; server normalizes to v1

Never stores raw `result.json`. See [`docs/ACCEPT_PASTE_FORMATS.md`](./docs/ACCEPT_PASTE_FORMATS.md).

Sample v2 fixtures: [`public/fixtures/`](./public/fixtures/)

Human fields (`app_rating`, `app_comment`, `run_comment`) are UI/DB only — not in the export file.

Harness export (on `setup/measure`) should set structured `--approach` labels (e.g. `A-baseline-1`, `rtl-control-3`) and emit `meta.classification`. See [`scripts/harness-export-run.patch.md`](./scripts/harness-export-run.patch.md).

In the app: **How to export** (`/how-to`), **Cohort** (`/cohort?preset=exp1-rtl`), **Steps plan** (`/steps.html`).

### Bulk publish (WSL harness → prod DB)

```bash
export HACKATHON_ACCESS_CODE='…'
export HACKATHON_AUTHOR=paul
npm run publish:runs -- --exp1-rtl   # harness repo
```

Or from this repo after exports exist on WSL:

```bash
npm run seed:exp1-rtl
npm run backfill:classification
npm run links:runs -- 2026-08-22T11-17-34-089Z   # lookup /runs/<uuid> without re-seeding
```

## Authors

`paul` · `mohammed` · `ali sina` · `shivam`
