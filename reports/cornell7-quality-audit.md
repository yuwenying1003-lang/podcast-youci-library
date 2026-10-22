# Cornell 7 quality and continuation audit

Updated 2026-10-22. Reviews identify Codex as reviewer; completed contextual editorial review is not independent human sign-off or audio verification.

## Recovered source

The local Cornell PDF has 51 pages. All pages were extracted into reports/cornell7-transcript-recovered.json with raw page text, paragraph text, page coordinates and SHA-256 provenance. The 850 historical IDs align page by page: one title plus 849 spoken-text paragraphs. Paragraph count/order alignment is not a claim of audio accuracy. Original disfluencies and possible transcription errors remain unchanged; no timestamps or clips were invented.

## Current counts

- Library: 321 Words / 545 Phrases / 120 Chunks.
- Word cards carrying reviewed_complete: 321; remaining: 0.
- Machine translations awaiting context review: 0.
- Generated memory aids awaiting refinement: 0.
- External definitions awaiting review: 0; external IPA: 0.
- Cards with fewer than two populated collocations: 0. This measures completeness, not independent human approval.
- Transcript statuses: 586 covered / 177 no identified barrier / 87 requires review.
- This PDF review has individual decisions for 801 paragraphs; 87 still have explicitly documented barriers. Historical automatic covered statuses outside this scope are not certified as contextual review.
- Phrases without reviewed_complete: 1; Chunks: 0.
- The 85 expressions added between 416866a and 8458263 received a separate 2026-10-23 second reading: 82 retained, three corrected. Per-entry rationale is in reports/cornell7-added85-quality-20261023-review.json. This is a Phrase-content audit, not certification of Word-card IPA or independent human approval.
- Missing IPA, definition, translation and original generic Spelling anchor fields: zero.

## Exact continuation

- All 321 Word cards now carry completed editorial review; no pending Word remains. Preserve completed cards; independent human sign-off is not implied.
- The continuous individual PDF review covers segments 50–850 (Units 2–11); no unread paragraph remains in that range. Unit 1's previous work is preserved.
- Earliest remaining transcript barrier: page 5, segment 76. Follow each review_reason, including barriers reopened after checking a formerly covered paragraph.
- The initial Unit 2–11 paragraph pass is complete; the next coverage work is resolving documented barriers, not rereading or auto-approving all matches. Source paragraphs are available locally in the recovered JSON, so no upload or missing-source blocker remains.
- Next in-scope barrier after preserved Unit 1: page 5, segment 76: As well as continues 75; wording resulting in the case of two individual bans is awkward and must not be silently reconstructed from assumed audio.
- No pending Chunk remains after Unit 1.
- Next pending Phrase after preserved Unit 1: Unit 4, who pays them out.
- The explicitly requested Unit 1 bizarre collocation repair is complete: bizarre behavior / a bizarre situation. The original excerpt and prior review remain unchanged.
- Follow the remaining Phrase/Chunk counts above, not historical queues. All previously completed cards are preserved; this follow-up also reviewed the previously pending Unit 1 entries, without repeating its completed reviews. A segment-level comprehension decision does not certify unrelated source claims.
- The source-ambiguous Phrase who pays them out remains explicitly deferred; its existing Chinese gloss is provisional. See reports/cornell7-unit4-deferred-phrase-review.json before editing or approving it.
- Follow-up continuation and baseline-preservation checks are recorded in reports/cornell7-followup-continuation.md. Do not reapply completed batches simply to clear a queue.
- For the current listening follow-up after 8458263, use reports/cornell7-listening-continuation-20261023.md; its batch boundaries distinguish newly read/revisited paragraphs from the earlier full pass.
- Known transcript uncertainties include essayed, a best dose contractors, incomplete PSA text, AFK/not AFK, chapter nine, room-name variants, charged academically and false starts. Preserve exact quotations; any intended reading must be labeled an inference unless audio verifies it.
- Batch evidence is stored in reports/cornell7-unit*-review*.json. Word, transcript and Chunk reviews are separately named where a Unit has several batches; each records explicit decisions rather than generated keyword approvals.
- Refresh reports with node scripts/refresh_cornell7_review_reports.mjs, validate both course files and run npm.cmd test before each commit. Do not rerun the original import/enrichment over edited cards.

## Validation and boundaries

Validated PDF/editorial batches: 20 tests passed, 8 pre-existing skips, 0 failed; both courses pass python scripts/validate_courses.py. Added regression checks cover page/segment alignment, raw-source preservation, learning-item references, and report/queue consistency. Later batches must rerun these checks.

Only course content, editorial scripts, tests and reports are in scope. UI, CSS, player/audio controls, AI/login configuration, sentence checking and collections remain untouched. PR #16 only; no merge or deployment.

Original Chunk reconciliation remains 127 candidates - 11 within-Unit duplicates + 2 Unit 1 additions = 118; any later additions are counted separately in batch records.
