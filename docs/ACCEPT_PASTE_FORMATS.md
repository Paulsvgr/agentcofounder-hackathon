# Accept two paste formats; store one canonical shape

## Goal

API/DB always stores `agentcofounder.run_export.v1` (+ human fields on the same row).

UI accepts:

1. **Preferred:** `run_export.v1` (`schema`, `meta`, `harness`, `efficiency`)
2. **Legacy:** raw harness `result.json` (`status`, tokens, `tests_run`, often `call_log`)

Never store raw `result.json` as-is. Detect → normalize → save.

## Detection

- `run_export_v1` if `schema === "agentcofounder.run_export.v1"` and `meta`/`harness`/`efficiency` objects
- `result_json` if `status` (string) + `tests_run` (array) + `input_tokens` (number)
- else reject

## Normalize (server authoritative)

`weighted_total = input_tokens + output_tokens * 3 + cache_read_tokens * 0.1`

From `result.json`: map harness fields; drop `call_log`, `port_reclamation`, `app_url`, `start_command`, `telemetry_source` (may use `call_log[0].model` as model hint only).

Efficiency gaps for result-only paste: `wall_seconds` / phase / timing fields null or 0 / `phase_heuristic: []`.

## Frontend flow

1. Author (required)
2. Paste → detect
3. If `result_json` (or v1 missing approach): **Complete run info** (approach, provider, model, run_id; optional git)
4. App rating / comments
5. `POST /hackathon/api/v1/runs/` with `{ author, paste, overrides, app_rating, … }` + `X-Hackathon-Key`

## POST body

```json
{
  "author": "paul",
  "paste": {},
  "overrides": {
    "approach": "base",
    "provider": "zai",
    "model": "glm-5.2",
    "run_id": "2026-08-21T17-12-43-573Z",
    "git_branch": "main",
    "git_commit": "d0f0b49"
  },
  "app_rating": 8,
  "app_comment": "",
  "run_comment": ""
}
```

Server upserts by `meta.run_id`. List/compare only read canonical v1 + human.
