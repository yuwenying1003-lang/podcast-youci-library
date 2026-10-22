# Cornell 7 quality and continuation audit

Updated 2026-10-22. Reviews identify Codex as reviewer; completed contextual editorial review is not independent human sign-off or audio verification.

## Recovered source

The local Cornell PDF has 51 pages. All pages were extracted into reports/cornell7-transcript-recovered.json with raw page text, paragraph text, page coordinates and SHA-256 provenance. The 850 historical IDs align page by page: one title plus 849 spoken-text paragraphs. Paragraph count/order alignment is not a claim of audio accuracy. Original disfluencies and possible transcription errors remain unchanged; no timestamps or clips were invented.

## Current counts

- Library: 321 Words / 339 Phrases / 118 Chunks.
- Word cards carrying reviewed_complete: 285; remaining: 36.
- Machine translations awaiting context review: 26.
- Generated memory aids awaiting refinement: 26.
- External definitions awaiting review: 25; external IPA: 28.
- Cards with fewer than two populated collocations: 32. This measures completeness, not independent human approval.
- Transcript statuses: 428 covered / 149 no identified barrier / 273 requires review.
- This PDF review has individual decisions for 616 paragraphs; 161 still have explicitly documented barriers. Historical automatic covered statuses outside this scope are not certified as contextual review.
- Phrases without reviewed_complete: 271; Chunks: 101.
- Missing IPA, definition, translation and original generic Spelling anchor fields: zero.

## Exact continuation

- Next unreviewed Word: Unit 10, certainty. Preserve all completed cards in earlier Units.
- Next paragraph not yet individually read in this PDF pass: page 41, segment 666. The continuous reviewed range is segments 50–665; Unit 1's previous work is preserved.
- Earliest remaining transcript barrier: page 4, segment 51. Follow each review_reason, including barriers reopened after checking a formerly covered paragraph.
- Continue detailed PDF review beyond the latest recorded batch; do not auto-approve matches. Source paragraphs are available locally in the recovered JSON, so no upload or missing-source blocker remains.
- Finish pending Phrase/Chunk pedagogical review, including realistic examples/scenarios. A segment-level comprehension decision does not certify every linked card as fully polished.
- Known transcript uncertainties include essayed, a best dose contractors, incomplete PSA text and false starts. Preserve exact quotations; any intended reading must be labeled an inference unless audio verifies it.
- Batch evidence is stored in reports/cornell7-unit*-review*.json. Word, transcript and Chunk reviews are separately named where a Unit has several batches; each records explicit decisions rather than generated keyword approvals.
- Refresh reports with node scripts/refresh_cornell7_review_reports.mjs, validate both course files and run npm.cmd test before each commit. Do not rerun the original import/enrichment over edited cards.

## Validation and boundaries

Validated PDF/editorial batches: 20 tests passed, 8 pre-existing skips, 0 failed; both courses pass python scripts/validate_courses.py. Added regression checks cover page/segment alignment, raw-source preservation, learning-item references, and report/queue consistency. Later batches must rerun these checks.

Only course content, editorial scripts, tests and reports are in scope. UI, CSS, player/audio controls, AI/login configuration, sentence checking and collections remain untouched. PR #16 only; no merge or deployment.

Original Chunk reconciliation remains 127 candidates - 11 within-Unit duplicates + 2 Unit 1 additions = 118; any later additions are counted separately in batch records.
