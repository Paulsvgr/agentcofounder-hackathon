# Wire classification into harness `export-run.ts` (setup/measure)

Copy `harness-export-classification.mjs` into the agentcofounder harness repo, then in `export-run.ts` (or wherever `meta` is assembled):

```ts
import { attachClassificationToMeta } from "./harness-export-classification.mjs";

// After meta.approach is set from --approach / RUN_APPROACH:
attachClassificationToMeta(meta, efficiency);
// meta.classification = { line, experiment, run_index, display_label, legacy_approach }
```

Use a **structured approach label**, not generic `base`:

```bash
npm run export:run -- 2026-08-21T23-45-52-404Z --approach A-autoverify-owned-1
# or
RUN_APPROACH=A-baseline-2 npm run export:run -- <run-id>
```

The runs app prefers `meta.classification` on paste; classification overlay still overrides historical runs and carries human fields.

## Run manifest (7a)

In `export-run.ts`, attach `artifacts/runs/<id>/run-manifest.json` as top-level `manifest` on the export payload (not inside `meta` or `efficiency`). Legacy runs without the file → `manifest: null`. Django splits on ingest into `data.manifest` sibling.
