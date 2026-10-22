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

For a fresh import only (these commands overwrite subsequent editorial work; do not run them to refresh review reports):

```powershell
node scripts/import_cornell7_source_library.mjs <path-to-cornell7-source-library.json>
node scripts/enrich_cornell7_dictionary.mjs
```

The second command adds sourced IPA and English definitions. It should always run after the source-library import because the import is intentionally deterministic and does not depend on a network service.

For ongoing editorial batches, use `node scripts/refresh_cornell7_review_reports.mjs` instead. It recomputes queues and counts without approving transcript coverage or replacing course content. The exact continuation point is maintained in `reports/cornell7-quality-audit.md`; individual Unit 2 decisions are in `reports/cornell7-unit2-editorial-review.json`.

## Recovered PDF and current review workflow

The 51-page PDF in `source-materials` is now readable. `reports/cornell7-transcript-recovered.json` records its filename and SHA-256, every raw page, and all 850 historical paragraph IDs with page coordinates. Segment 1 is the title; the other 849 entries are transcript paragraphs. Page-level counts and ordering match the old index on all 51 pages. No exact audio timings can be recovered from this PDF.

To reproduce extraction, install PyMuPDF into `.tools/pdf-extract` and run `python scripts/extract_cornell7_pdf.py`. The PDF itself remains local and is not added to Git. Preserve speech errors and uncertain ASR wording in quoted text; record any inferred reading separately.

The explicit review batches in `reports/cornell7-unit*-review*.json` contain individual Word edits, Phrase additions, Chunk scenarios and paragraph decisions. Apply a new batch with `node scripts/apply_cornell7_editorial_batch.mjs <relative-batch-path>` and then refresh reports. Completed Word batches intentionally refuse to reapply, protecting previous review. Review status identifies Codex and must not be described as independent human approval.

Completed Word Units and the continuous paragraph-review range advance with each batch. Consult the generated quality audit for the exact next Word and paragraph. Individual context decisions include unresolved barriers and demotions of previously automatic coverage. Unit 3–4 Chunks have new daily/social/work teaching scenarios; the original excerpts remain separate. Earlier unresolved paragraph barriers remain in the queue and must also be resolved.

Pronunciation enrichment acknowledges the [CMU Pronouncing Dictionary](https://github.com/cmusphinx/cmudict), maintained by Carnegie Mellon University's Speech Group. Dictionary definitions and some direct IPA values are obtained through Free Dictionary APIs from Wiktionary-derived data; each enriched card records its source and unreviewed status.
