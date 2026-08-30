# Run export frontend spec (v2 action-flow)

Canonical product spec for the hackathon runs UI. Implementation lives in this repo; keep in sync with the harness doc at `docs/run-export-frontend-prompt.md` on `setup/measure`.

## Paste

- **Primary:** `agentcofounder.run_export.v2` — includes `efficiency.action_flow[]`
- **Legacy:** `agentcofounder.run_export.v1` — phase heuristic only, no action-flow chart
- **Reject** other schemas; top-level keys: `schema`, `meta`, `harness`, `efficiency`, optional `manifest`
- **Transport:** `manifest` (`agentcofounder.run_manifest.v1`) may appear top-level on paste — stored as `HackathonRun.data.manifest` sibling, stripped from `data.export`

Human fields (`author`, ratings, comments) are UI/DB only — never in paste JSON.

## Headline UI

Run detail: **action-flow stacked bar** with rulers Time | Raw tokens | Weighted.

v1 runs show **legacy v1** badge and collapsed phase heuristic.

## Compare

`/compare` — preset switcher for curated run sets:

- `study` (default) — 7-run baseline / autoverify / snowball set
- `exp1-rtl` — Experiment 1 rtl-control vs rtl-cleanup (10 runs)

Legacy `/cohort` redirects to `/compare`.

## Manifest experiment id

V2 manifests use `experiment.id` (not `cohort`). UI reads `id ?? cohort` for old runs.

Env on harness: `RUN_EXPERIMENT`, `RUN_ARM`, `RUN_REP`, `RUN_INTERVENTION`.

## Publish to prod

Harness (WSL): `npm run publish:runs -- --exp1-rtl` — re-export, sync manifest, seed, backfill.

This repo: `npm run seed:exp1-rtl` + `npm run backfill:classification` (requires `AGENTCOFOUNDER_ROOT` + `HACKATHON_ACCESS_CODE`).

## Dev fixtures

`public/fixtures/`:

- `2026-08-21T17-41-28-455Z.json` — clean floor (no repair_loop)
- `2026-08-21T17-33-44-063Z.json` — snowball (repair + extra_verify)
- `2026-08-20T19-13-05-181Z.json` — timeout + mega-call note

Load from **Add run → Load v2 sample JSON**.

## v1 → v2 field aliases (display)

| v1 | v2 |
|----|-----|
| `time_to_first_failing_test_s` | `first_test_failure_s` |
| `time_to_final_green_s` | `last_green_s` |
| `npm_test_command_count` | `manual_test_calls` |
| `auto_test_trigger_hits` | `auto_test_candidate_events` |

## Code map

| Area | Path |
|------|------|
| Types | `src/types/runExport.ts` |
| Parse / validate | `src/lib/parseExport.ts` |
| Action flow helpers | `src/lib/actionFlow.ts` |
| Timing aliases | `src/lib/efficiencyFields.ts` |
| Chart | `src/components/ActionFlowChart.tsx` |
| Cohort compare | `src/pages/ExperimentComparePage.tsx` |
| Backend ingest | `webeditor/hackathon/normalize.py` |
