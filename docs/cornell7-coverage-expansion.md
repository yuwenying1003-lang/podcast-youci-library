# Cornell 7 coverage expansion

The imported source library contains 51 transcript pages and 850 transcript segments. The approved eleven-unit course structure and its existing audio ranges remain unchanged. Transcript pages are assigned to those units as continuous ranges (`1–3`, `4–7`, `8–10`, `11–15`, `16–20`, `21–23`, `24–26`, `27–33`, `34–40`, `41–44`, `45–51`) based on overlap with the existing course vocabulary and topic sequence.

## Generated artifacts

- `cornell7-expansion-report.json`: totals and per-unit distribution.
- `cornell7-coverage-index.json`: one audit row for every source transcript segment.
- `cornell7-duplicates.json`: normalized duplicates removed inside a unit.
- `cornell7-unresolved.json`: fields requiring editorial or pronunciation review.

The source provides no verified sentence-level audio start/end times. The import therefore creates no `clip` object and never substitutes a unit boundary for an exact sentence timestamp. Source excerpts are short transcript-grounded provenance shown alongside teaching examples where useful.

## Editorial boundary

Automated import is not equivalent to human proofreading. Missing IPA, English definitions that could not be recovered from the existing course, generated spelling/context memory aids, and transcript segments without an identified learning item remain explicitly counted in the unresolved report. These entries must not be described as human-verified until reviewed.

Re-run the deterministic import with:

```powershell
node scripts/import_cornell7_source_library.mjs <path-to-cornell7-source-library.json>
```
