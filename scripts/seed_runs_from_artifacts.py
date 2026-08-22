#!/usr/bin/env python3
"""Seed hackathon runs API from exports + pilot.jsonl judgments."""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

API_BASE = os.environ.get(
    "HACKATHON_API_BASE", "https://admin.coretechs.se/hackathon"
).rstrip("/")
ACCESS_CODE = os.environ.get("HACKATHON_ACCESS_CODE", "")
AUTHOR = os.environ.get("HACKATHON_AUTHOR", "paul")

RUN_EXPORT_SCHEMAS = (
    "agentcofounder.run_export.v1",
    "agentcofounder.run_export.v2",
)

# User enrichment table (overrides approach / rating / comment when set).
ENRICH: dict[str, dict] = {
    "2026-08-21T17-12-43-573Z": {
        "approach": "A-baseline-1",
        "rating": 9,
        "comment": "A baseline, zai glm-5.2, unchanged d0f0b49",
    },
    "2026-08-21T17-16-01-144Z": {
        "approach": "A-baseline-2",
        "rating": 9,
        "comment": "A baseline, zai glm-5.2, unchanged d0f0b49",
    },
    "2026-08-21T17-19-47-720Z": {
        "approach": "A-baseline-3",
        "rating": 9,
        "comment": "A baseline, zai glm-5.2, unchanged d0f0b49",
    },
    "2026-08-21T17-25-01-445Z": {
        "approach": "A-prompt-1",
        "rating": 9,
        "comment": "do-not-start-servers prompt (cost went up)",
    },
    "2026-08-21T17-29-18-522Z": {
        "approach": "A-prompt-2",
        "rating": 9,
        "comment": "do-not-start-servers prompt (cost went up)",
    },
    "2026-08-21T17-33-44-063Z": {
        "approach": "A-prompt-3",
        "rating": 9,
        "comment": "do-not-start-servers prompt (heaviest ~187k)",
    },
    "2026-08-21T17-41-28-455Z": {
        "approach": "A-autotest-1",
        "rating": 9,
        "comment": "auto-test hook; lucky low ~54k",
    },
    "2026-08-21T17-44-12-352Z": {
        "approach": "A-autotest-2",
        "rating": 9,
        "comment": "auto-test",
    },
    "2026-08-21T17-49-43-616Z": {
        "approach": "A-autotest-3",
        "rating": 9,
        "comment": "auto-test; snapshotted in saved-apps",
    },
    "2026-08-21T23-45-52-404Z": {
        "approach": "A-autoverify-owned-1",
        "rating": 9,
        "comment": "harness-owned soft; SUCCESS ~119k, 32 calls; model still self-tested (~10 turns); harness finalize only",
    },
    "2026-08-21T23-58-29-140Z": {
        "approach": "A-autoverify-owned-2",
        "rating": 9,
        "comment": "harness-owned soft; SUCCESS ~133k, 38 calls; stacked self-test + harness verify",
    },
    "2026-08-22T00-05-30-093Z": {
        "approach": "A-autoverify-owned-3",
        "rating": 9,
        "comment": "harness-owned soft; SUCCESS ~108k, 38 calls; cheapest owned arm but still above A baseline",
    },
    "2026-08-22T00-16-51-819Z": {
        "approach": "A-autoverify-supplement-1",
        "rating": 9,
        "comment": "supplement arm; SUCCESS ~182k, 48 calls; worst cost — model self-tested heavily + harness settle",
    },
    "2026-08-22T00-27-06-457Z": {
        "approach": "A-autoverify-supplement-2",
        "rating": 9,
        "comment": "supplement arm; SUCCESS ~157k, 44 calls; stopped cohort at 2 — same stacking pattern",
    },
    "2026-08-22T00-48-30-278Z": {
        "approach": "A-autoverify-owned-gated-1",
        "rating": 6,
        "comment": "harness-owned-gated; PARTIAL ~133k, 38 calls; 0 self-test bash but 3 harness repair injects → max_rounds abort",
    },
    "2026-08-22T01-09-13-552Z": {
        "approach": "A-raw-1",
        "rating": 9,
        "comment": "back to stock A on main d0f0b49; SUCCESS ~119k, 32 calls; snapshotted in saved-apps",
    },
    "2026-08-20T21-51-00-219Z": {
        "approach": "A-prime-zai",
        "rating": 9,
        "comment": "Best A′: SUCCESS ~85k, 16/16 tests, clean UI",
    },
    "2026-08-20T21-54-53-923Z": {
        "approach": "B-prime-zai",
        "rating": 9,
        "comment": "SUCCESS ~139k, 20/20, inline lend",
    },
    "2026-08-20T22-00-59-263Z": {
        "approach": "C-prime-zai-clean",
        "rating": 9,
        "comment": "SUCCESS ~255k; port kept free",
    },
    "2026-08-20T19-28-31-545Z": {
        "approach": "B-prime",
        "rating": 9,
        "comment": "Berget SUCCESS ~63k; product great",
    },
    "2026-08-20T19-13-05-181Z": {
        "approach": "A-prime",
        "rating": 6,
        "comment": "timed out in RTL loop; no report.partial",
    },
    "2026-08-19T23-33-32-518Z": {
        "approach": "run-d / D",
        "rating": 9,
        "comment": "harness timeout, product great (snapshotted)",
    },
    "2026-08-19T23-05-29-779Z": {
        "approach": "C-original",
        "rating": 6,
        "comment": "SUCCESS; localStorage issue noted",
    },
    "2026-08-19T21-36-13-008Z": {
        "approach": "A-original",
        "rating": 9,
        "comment": "early SUCCESS ~10 min",
    },
    "2026-08-20T20-54-36-625Z": {
        "approach": "C-prime-gpt41",
        "rating": 6,
        "comment": "works but bare UI; ~262k",
    },
    "2026-08-20T20-09-54-516Z": {
        "approach": "C-prime-openai",
        "rating": 9,
        "comment": "gpt-5.2 too strong vs GLM — don’t rank",
    },
    "2026-08-20T21-41-20-112Z": {
        "approach": "C-prime-zai",
        "rating": 9,
        "comment": "failed only because :3000 opened mid-verify — don’t rank",
    },
    "2026-08-20T19-53-20-342Z": {
        "approach": "C-prime abort",
        "rating": 2,
        "comment": "Pi API abort, 0 tokens — not a real attempt",
    },
    "2026-08-20T19-53-59-239Z": {
        "approach": "C-prime abort",
        "rating": 2,
        "comment": "Pi API abort, 0 tokens — not a real attempt",
    },
    "2026-08-20T20-50-03-927Z": {
        "approach": "C-prime-gpt41-attempt",
        "rating": 2,
        "comment": "aborted TPM / RTL thrash",
    },
    # Experiment 1 — RTL cleanup (Phase F)
    "2026-08-22T11-17-34-089Z": {
        "approach": "rtl-control-1",
        "rating": 9,
        "comment": "Experiment 1 · rtl-control · rep 1 · snowball · ~69k",
    },
    "2026-08-22T11-20-53-365Z": {
        "approach": "rtl-control-2",
        "rating": 9,
        "comment": "Experiment 1 · rtl-control · rep 2 · snowball · ~76k",
    },
    "2026-08-22T11-24-02-704Z": {
        "approach": "rtl-control-3",
        "rating": 9,
        "comment": "Experiment 1 · rtl-control · rep 3 · snowball · ~96k",
    },
    "2026-08-22T11-28-00-137Z": {
        "approach": "rtl-control-4",
        "rating": 9,
        "comment": "Experiment 1 · rtl-control · rep 4 · snowball · ~157k",
    },
    "2026-08-22T11-33-28-491Z": {
        "approach": "rtl-control-5",
        "rating": 9,
        "comment": "Experiment 1 · rtl-control · rep 5 · snowball · ~144k",
    },
    "2026-08-22T11-39-27-224Z": {
        "approach": "rtl-cleanup-1",
        "rating": 9,
        "comment": "Experiment 1 · rtl-cleanup · rep 1 · snowball · ~101k",
    },
    "2026-08-22T11-43-19-823Z": {
        "approach": "rtl-cleanup-2",
        "rating": 9,
        "comment": "Experiment 1 · rtl-cleanup · rep 2 · snowball · ~181k",
    },
    "2026-08-22T11-49-46-658Z": {
        "approach": "rtl-cleanup-3",
        "rating": 9,
        "comment": "Experiment 1 · rtl-cleanup · rep 3 · snowball · ~179k",
    },
    "2026-08-22T11-56-19-753Z": {
        "approach": "rtl-cleanup-4",
        "rating": 9,
        "comment": "Experiment 1 · rtl-cleanup · rep 4 · snowball · ~96k",
    },
    "2026-08-22T12-00-02-941Z": {
        "approach": "rtl-cleanup-5",
        "rating": 9,
        "comment": "Experiment 1 · rtl-cleanup · rep 5 · snowball · ~183k",
    },
}

EXP1_RTL_RUN_IDS = [
    "2026-08-22T11-17-34-089Z",
    "2026-08-22T11-20-53-365Z",
    "2026-08-22T11-24-02-704Z",
    "2026-08-22T11-28-00-137Z",
    "2026-08-22T11-33-28-491Z",
    "2026-08-22T11-39-27-224Z",
    "2026-08-22T11-43-19-823Z",
    "2026-08-22T11-49-46-658Z",
    "2026-08-22T11-56-19-753Z",
    "2026-08-22T12-00-02-941Z",
]

RATING_MAP = {"great": 9, "ok": 7, "broken": 2}


def load_judgments(path: Path) -> dict[str, dict]:
    out: dict[str, dict] = {}
    if not path.exists():
        return out
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        rid = row.get("run_id")
        if rid:
            out[rid] = row
    return out


def collect_pastes(exports_dir: Path, runs_dir: Path | None = None) -> dict[str, dict]:
    pastes: dict[str, dict] = {}
    for folder in (exports_dir, exports_dir / "batch"):
        if not folder.is_dir():
            continue
        for fp in sorted(folder.glob("*.json")):
            if fp.name in ("manifest.json",):
                continue
            try:
                data = json.loads(fp.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            if not isinstance(data, dict):
                continue
            rid = None
            if data.get("schema") in RUN_EXPORT_SCHEMAS:
                rid = (data.get("meta") or {}).get("run_id")
            elif isinstance(data.get("status"), str):
                rid = fp.stem
            if not rid:
                rid = fp.stem
            pastes[rid] = data

    if runs_dir and runs_dir.is_dir():
        for run_folder in sorted(runs_dir.iterdir()):
            if not run_folder.is_dir():
                continue
            run_id = run_folder.name
            # Prefer v1 export JSON in run folder if present.
            for name in ("run_export.json", "export.json"):
                export_fp = run_folder / name
                if export_fp.is_file():
                    try:
                        data = json.loads(export_fp.read_text(encoding="utf-8"))
                    except (OSError, json.JSONDecodeError):
                        continue
                    if isinstance(data, dict):
                        pastes[run_id] = data
                        break
            if run_id in pastes and pastes[run_id].get("schema") in RUN_EXPORT_SCHEMAS:
                continue
            result_fp = run_folder / "result.json"
            if not result_fp.is_file():
                continue
            try:
                data = json.loads(result_fp.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            if isinstance(data, dict):
                pastes[run_id] = data

    return pastes


def post_run(payload: dict) -> tuple[int, dict | str]:
    req = urllib.request.Request(
        f"{API_BASE}/api/v1/runs/",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Hackathon-Key": ACCESS_CODE,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            return exc.code, json.loads(raw)
        except json.JSONDecodeError:
            return exc.code, raw


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed hackathon runs API from export JSON files.")
    parser.add_argument(
        "--only",
        help="Comma-separated run_ids to seed (default: all collected exports)",
    )
    parser.add_argument(
        "--exp1-rtl",
        action="store_true",
        help="Seed only Experiment 1 rtl-control + rtl-cleanup runs (10 ids)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print payloads without POSTing",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not args.dry_run and not ACCESS_CODE:
        print("Set HACKATHON_ACCESS_CODE", file=sys.stderr)
        return 1

    only_ids: set[str] | None = None
    if args.exp1_rtl:
        only_ids = set(EXP1_RTL_RUN_IDS)
    elif args.only:
        only_ids = {part.strip() for part in args.only.split(",") if part.strip()}

    root = Path(
        os.environ.get(
            "AGENTCOFOUNDER_ROOT",
            str(Path.home() / "hackathon/agentcofounder"),
        )
    )
    # Allow Windows path via env; default tries WSL home when run inside WSL.
    exports = root / "artifacts" / "exports"
    runs_dir = root / "artifacts" / "runs"
    judgments_path = root / "artifacts" / "judgments" / "pilot.jsonl"

    judgments = load_judgments(judgments_path)
    pastes = collect_pastes(exports, runs_dir)
    if only_ids is not None:
        missing = sorted(only_ids - set(pastes))
        if missing:
            print(f"warning: missing exports for {len(missing)} run_id(s): {', '.join(missing)}", file=sys.stderr)
        pastes = {run_id: paste for run_id, paste in pastes.items() if run_id in only_ids}

    print(f"pastes={len(pastes)} judgments={len(judgments)} api={API_BASE} dry_run={args.dry_run}")

    ok = 0
    fail = 0
    for run_id, paste in sorted(pastes.items()):
        j = judgments.get(run_id, {})
        enrich = ENRICH.get(run_id, {})

        approach = enrich.get("approach")
        if not approach and isinstance(paste.get("meta"), dict):
            approach = paste["meta"].get("approach")
        if not approach:
            approach = j.get("label")
        if not approach or approach in ("unknown", None, ""):
            # Early smoke heuristic from weighted if present
            weighted = None
            if isinstance(paste.get("efficiency"), dict):
                weighted = paste["efficiency"].get("weighted_total")
            if isinstance(weighted, (int, float)) and weighted < 20000:
                approach = "early-smoke"
            else:
                approach = approach or "unknown"

        rating = enrich.get("rating")
        if rating is None:
            pr = j.get("product_rating")
            if isinstance(pr, str):
                rating = RATING_MAP.get(pr.lower())
            elif isinstance(pr, (int, float)):
                rating = int(pr)

        comment = enrich.get("comment") or j.get("note") or ""
        run_comment = enrich.get("comment") or f"seeded from exports ({approach})"

        overrides = {
            "run_id": run_id,
            "approach": approach,
            "git_branch": j.get("git_branch")
            or (paste.get("meta") or {}).get("git_branch"),
            "git_commit": j.get("git_commit")
            or (paste.get("meta") or {}).get("git_commit"),
        }
        # Prefer meta provider/model from export when present
        meta = paste.get("meta") if isinstance(paste.get("meta"), dict) else {}
        if meta.get("provider"):
            overrides["provider"] = meta["provider"]
        if meta.get("model"):
            overrides["model"] = meta["model"]
        # If result.json path without provider, leave for server / skip require —
        # our exports are v1 so ok.

        # Ensure provider/model for any result_json leftovers
        if paste.get("schema") not in RUN_EXPORT_SCHEMAS:
            overrides.setdefault("provider", "unknown")
            overrides.setdefault("model", "unknown")

        payload = {
            "author": AUTHOR,
            "paste": paste,
            "overrides": {k: v for k, v in overrides.items() if v is not None},
            "app_rating": rating,
            "app_comment": comment,
            "run_comment": run_comment,
        }

        if args.dry_run:
            print(f"DRY {run_id} -> {approach} rating={rating}")
            ok += 1
            continue

        status, body = post_run(payload)
        if status in (200, 201):
            ok += 1
            rid = body.get("data", {}).get("run_id") if isinstance(body, dict) else ""
            print(f"OK {status} {run_id} -> {approach} rating={rating}")
        else:
            fail += 1
            print(f"FAIL {status} {run_id}: {body}", file=sys.stderr)

    print(f"done ok={ok} fail={fail}")
    return 0 if fail == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
