# Cornell 7 quality and continuation audit

Updated 2026-10-22. Reviews identify Codex as reviewer; completed contextual editorial review is not independent human sign-off or audio verification.

## Recovered source

The local Cornell PDF has 51 pages. All pages were extracted into reports/cornell7-transcript-recovered.json with raw page text, paragraph text, page coordinates and SHA-256 provenance. The 850 historical IDs align page by page: one title plus 849 spoken-text paragraphs. Paragraph count/order alignment is not a claim of audio accuracy. Original disfluencies and possible transcription errors remain unchanged; no timestamps or clips were invented.

## Current counts

- Library: 321 Words / 306 Phrases / 118 Chunks.
- Word cards carrying reviewed_complete: 119; remaining: 202.
- Machine translations awaiting context review: 139.
- Generated memory aids awaiting refinement: 138.
- External definitions awaiting review: 135; external IPA: 151.
- Cards with fewer than two populated collocations: 170. This measures completeness, not independent human approval.
- Transcript statuses: 400 covered / 101 no identified barrier / 349 requires review.
- This PDF review has individual decisions for 191 paragraphs; 51 still have explicitly documented barriers. Historical automatic covered statuses outside this scope are not certified as contextual review.
- Phrases without reviewed_complete: 278; Chunks: 116.
- Missing IPA, definition, translation and original generic Spelling anchor fields: zero.

## Exact continuation

- Next unreviewed Word: Unit 5, absorb. Preserve all completed cards in earlier Units.
- Earliest remaining transcript barrier: page 4, segment 51. Follow each review_reason, including barriers reopened after checking a formerly covered paragraph.
- Continue detailed PDF review beyond the latest recorded batch; do not auto-approve matches. Source paragraphs are available locally in the recovered JSON, so no upload or missing-source blocker remains.
- Finish pending Phrase/Chunk pedagogical review, including realistic examples/scenarios. A segment-level comprehension decision does not certify every linked card as fully polished.
- Known transcript uncertainties include essayed, a best dose contractors, incomplete PSA text and false starts. Preserve exact quotations; any intended reading must be labeled an inference unless audio verifies it.
- Batch evidence: reports/cornell7-unit2-transcript-review.json, reports/cornell7-unit3-review-batch.json and reports/cornell7-unit4-review-batch.json; additional batches use the same explicit review format.
- Refresh reports with node scripts/refresh_cornell7_review_reports.mjs, validate both course files and run npm.cmd test before each commit. Do not rerun the original import/enrichment over edited cards.

## Validation and boundaries

PDF/Unit 2–4 batches: 20 tests passed, 8 pre-existing skips, 0 failed; both courses pass python scripts/validate_courses.py. Added regression checks cover page/segment alignment, raw-source preservation, learning-item references, and report/queue consistency. Later batches must rerun these checks.

Only course content, editorial scripts, tests and reports are in scope. UI, CSS, player/audio controls, AI/login configuration, sentence checking and collections remain untouched. PR #16 only; no merge or deployment.

Original Chunk reconciliation remains 127 candidates - 11 within-Unit duplicates + 2 Unit 1 additions = 118; any later additions are counted separately in batch records.
