#!/usr/bin/env python3
"""Merge Experiment 1 rtl run entries into runs-classification.json (frontend + backend)."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HARNESS_ROOT = Path(
    os.environ.get("AGENTCOFOUNDER_ROOT", str(Path.home() / "hackathon/agentcofounder"))
)
EXPORTS = HARNESS_ROOT / "artifacts" / "exports"

FRONTEND_MANIFEST = ROOT / "public" / "runs-classification.json"
BACKEND_MANIFEST = Path(
    os.environ.get(
        "HACKATHON_BACKEND_MANIFEST",
        "/mnt/c/Users/gronb/Desktop/GreenCastle/FullStack/CoreTechs Fullstack/webeditor/hackathon/data/runs-classification.json",
    )
)

EXP1_SPECS = [
    ("2026-08-22T11-17-34-089Z", "rtl-control-1", "exp1-rtl-control", 1),
    ("2026-08-22T11-20-53-365Z", "rtl-control-2", "exp1-rtl-control", 2),
    ("2026-08-22T11-24-02-704Z", "rtl-control-3", "exp1-rtl-control", 3),
    ("2026-08-22T11-28-00-137Z", "rtl-control-4", "exp1-rtl-control", 4),
    ("2026-08-22T11-33-28-491Z", "rtl-control-5", "exp1-rtl-control", 5),
    ("2026-08-22T11-39-27-224Z", "rtl-cleanup-1", "exp1-rtl-cleanup", 1),
    ("2026-08-22T11-43-19-823Z", "rtl-cleanup-2", "exp1-rtl-cleanup", 2),
    ("2026-08-22T11-49-46-658Z", "rtl-cleanup-3", "exp1-rtl-cleanup", 3),
    ("2026-08-22T11-56-19-753Z", "rtl-cleanup-4", "exp1-rtl-cleanup", 4),
    ("2026-08-22T12-00-02-941Z", "rtl-cleanup-5", "exp1-rtl-cleanup", 5),
]

ENRICH_COMMENTS = {
    "2026-08-22T11-17-34-089Z": "Experiment 1 · rtl-control · rep 1 · snowball · ~69k",
    "2026-08-22T11-20-53-365Z": "Experiment 1 · rtl-control · rep 2 · snowball · ~76k",
    "2026-08-22T11-24-02-704Z": "Experiment 1 · rtl-control · rep 3 · snowball · ~96k",
    "2026-08-22T11-28-00-137Z": "Experiment 1 · rtl-control · rep 4 · snowball · ~157k",
    "2026-08-22T11-33-28-491Z": "Experiment 1 · rtl-control · rep 5 · snowball · ~144k",
    "2026-08-22T11-39-27-224Z": "Experiment 1 · rtl-cleanup · rep 1 · snowball · ~101k",
    "2026-08-22T11-43-19-823Z": "Experiment 1 · rtl-cleanup · rep 2 · snowball · ~181k",
    "2026-08-22T11-49-46-658Z": "Experiment 1 · rtl-cleanup · rep 3 · snowball · ~179k",
    "2026-08-22T11-56-19-753Z": "Experiment 1 · rtl-cleanup · rep 4 · snowball · ~96k",
    "2026-08-22T12-00-02-941Z": "Experiment 1 · rtl-cleanup · rep 5 · snowball · ~183k",
}


def experiment_label(experiment: str) -> str:
    return experiment.replace("-", " ")


def load_export(run_id: str) -> dict | None:
    path = EXPORTS / f"{run_id}.json"
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def build_entry(run_id: str, approach: str, experiment: str, run_index: int) -> dict:
    export = load_export(run_id) or {}
    meta = export.get("meta") or {}
    harness = export.get("harness") or {}
    efficiency = export.get("efficiency") or {}
    weighted = efficiency.get("weighted_total")
    exp_label = experiment_label(experiment)

    return {
        "classification": {
            "line": "F",
            "experiment": experiment,
            "run_index": run_index,
            "display_label": f"F · {exp_label} · run {run_index}",
            "legacy_approach": approach,
        },
        "human": {
            "app_rating": 9,
            "run_comment": ENRICH_COMMENTS.get(run_id),
        },
        "flags": {
            "exclude_from_ranking": False,
            "hide_early_smoke": False,
            "include_in_efficiency_compare": True,
        },
        "source": {
            "git_branch": meta.get("git_branch"),
            "git_commit": meta.get("git_commit"),
            "provider": meta.get("provider"),
            "model": meta.get("model"),
            "harness_status": harness.get("status", "unknown"),
            "weighted_total": round(weighted) if isinstance(weighted, (int, float)) else None,
            "model_calls": harness.get("model_calls"),
        },
    }


def patch_manifest(path: Path) -> int:
    manifest = json.loads(path.read_text(encoding="utf-8"))
    taxonomy = manifest.setdefault("taxonomy", {})
    lines = taxonomy.setdefault("line", [])
    experiments = taxonomy.setdefault("experiment", [])

    if "F" not in lines:
        lines.append("F")
    for value in ("exp1-rtl-control", "exp1-rtl-cleanup"):
        if value not in experiments:
            experiments.append(value)

    runs = manifest.setdefault("runs", {})
    for run_id, approach, experiment, run_index in EXP1_SPECS:
        runs[run_id] = build_entry(run_id, approach, experiment, run_index)

    manifest["generated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return len(EXP1_SPECS)


def main() -> int:
    targets = [FRONTEND_MANIFEST]
    if BACKEND_MANIFEST.is_file() or BACKEND_MANIFEST.parent.is_dir():
        targets.append(BACKEND_MANIFEST)

    for path in targets:
        if not path.is_file():
            print(f"skip missing manifest: {path}")
            continue
        count = patch_manifest(path)
        print(f"patched {path} (+{count} exp1 entries)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
