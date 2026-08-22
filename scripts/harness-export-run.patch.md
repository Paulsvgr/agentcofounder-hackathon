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

The runs app prefers `meta.classification` on paste; manifest still overrides historical runs and carries human fields.
