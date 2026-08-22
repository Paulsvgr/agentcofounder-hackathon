#!/usr/bin/env python3
"""POST runs-classification.json to hackathon backfill endpoint."""
from __future__ import annotations

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


def main() -> int:
    if not ACCESS_CODE:
        print("Set HACKATHON_ACCESS_CODE", file=sys.stderr)
        return 1

    manifest_path = Path(
        os.environ.get(
            "CLASSIFICATION_MANIFEST",
            str(
                Path(__file__).resolve().parent.parent
                / "public"
                / "runs-classification.json"
            ),
        )
    )
    if not manifest_path.is_file():
        print(f"Missing manifest: {manifest_path}", file=sys.stderr)
        return 1

    body = json.loads(manifest_path.read_text(encoding="utf-8"))
    req = urllib.request.Request(
        f"{API_BASE}/api/v1/runs/classification-backfill/",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Hackathon-Key": ACCESS_CODE,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            print(json.dumps(result, indent=2))
            return 0
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        print(f"HTTP {exc.code}: {raw}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
