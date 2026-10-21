# Cornell 7 quality and regression audit

Generated from source schema `2.4-expanded-fourth-pass` on 2026-10-22.

## Coverage and learning content

- Processed source scope: 51/51 pages and 850/850 transcript segments indexed.
- Current library (not all reviewed): 321 Words, 281 Phrases, 118 Chunks.
- Chunk count reconciliation: the supplied source contains 127 Chunk candidates. Eleven are normalized duplicates within the same mapped Unit, leaving 116 unique imported Chunks; Unit 1 review added two genuinely new reusable patterns, producing 118. The exact eleven removals and source pages are recorded in `cornell7-duplicates.json`.
- Removed as normalized overlaps: 12 (1 Phrase and 11 Chunks); details are in `cornell7-duplicates.json`.
- Transcript index: 399 segments covered, 76 segments with no identified barrier, and 375 requiring editorial review. The systematic linkage pass only approved complete multiword phrase/Chunk matches or at least two distinct Word matches; a single Word match was retained for manual review.
- Provenance: every imported Word, Phrase, and Chunk has a source page and exact source excerpt.
- Exact audio: no sentence-level `clip` was created because the source has no verified start/end timestamps.

## Unresolved editorial work

- Unit 1 is now fully reviewed: 26/26 Word cards have context-checked definitions, reviewed American IPA, two natural collocations, form-led memory material, natural teaching examples, and complete Chinese translations.
- Unit 1 transcript review is complete: all eleven formerly unresolved segments on pages 1–3 now have a documented disposition. This added `back up`, `Is that what it is?`, and `prevent ... from ...` as practical spoken-English items.
- All 234 former IPA gaps now have externally sourced pronunciations: 12 direct dictionary IPA, 217 CMUdict ARPABET-to-broad-IPA conversions, and 5 transparent inflection/abbreviation rules. They remain flagged for editorial review.
- All 234 former English-definition gaps are filled: 216 use Wiktionary-derived definitions and 18 multiword terms use a context-matched Podlingora editorial definition. Externally sourced definitions remain flagged for final contextual review.
- All Word examples have a Chinese translation. Of the 193 machine-assisted translations originally queued, 181 remain; this batch context-reviewed/replaced 12.
- No original generic `Spelling anchor:` tips remain. Of the 192 generated replacements originally queued, 180 remain; this batch refined 12 alongside the other Unit 2 memory aids.
- 56 Word cards carry `reviewed_complete`; 265 remain in the legacy `requires_human_review` queue. Unit 2 now has 30/30 cards reviewed, including the five completed previously. This batch individually reviewed the remaining 25, starting with `atrium`.
- New review records explicitly identify Codex as reviewer. `reviewed_complete` records completed contextual editorial review, not independent human approval or audio verification. The prior 31 statuses are preserved; their historical human-review claim cannot be independently established from Git.
- External IPA review queue: 202; external definition review queue: 184. Cards with fewer than two populated collocations: 218 (previously 239). This field-completeness count is not a count of independent human approvals.
- This batch corrected missing IPA stress and the ending of `doxxed`, aligned `illuminated` with lights being on, distinguished temporary suspension from expulsion, and retained allegation attribution. All 25 teaching examples are explicitly `adapted`; exact source excerpts are unchanged.
- Phrase/Chunk status audit: 280/281 Phrases and 116/118 Chunks still lack `reviewed_complete`. Unit 2's 12 Phrases and 13 Chunks remain pending; Word completion does not imply Unit completion.
- 375 transcript segments remain in `requires_review`; this work is therefore not described as 100% comprehension coverage.

The complete machine-readable queues are in `cornell7-unresolved.json` and `cornell7-coverage-index.json`.

## Automated regression results

- `python scripts/validate_courses.py`: PASS for both course files.
- `npm test`: PASS (18 passed, 8 pre-existing legacy UI contracts skipped, 0 failed).
- JavaScript syntax check: PASS.
- Edge headless at 650 × 1000: PASS for course loading, eleven-unit navigation, bounded Word list, source rendering, Lucide-style TTS controls, and no horizontal page overflow in the captured initial view.
- Existing automated TTS contract: PASS; prior speech is cancelled and the selected English voice/rate is used.
- Existing automated persistence paths: PASS for progress and collection wiring.
- Existing automated AI client/security contracts: PASS, including strict input limits, structured feedback, no frontend Gemini key, and retry behavior for HTTP 503.

## Environment-dependent checks not claimed

- Authenticated live AI feedback was not called because no authenticated Cloudflare Access browser session was supplied to the headless test.
- ListenLeap original-audio playback was not exercised in standalone preview because it requires the installed extension and host-player bridge.
- Android Yandex was not available in this environment; its responsive behavior is covered only by the existing coarse-pointer CSS and the narrow Chromium render.
- Speech output cannot be heard or acoustically verified in headless Edge; the production TTS call path is covered by automated tests.

No extension source, permissions, communication protocol, audio bridge, AI endpoint, or storage key was changed.

## Exact continuation checklist

1. Unit 2 Word batch is complete. Do not rerun Unit 1 or the import/enrichment scripts: these can overwrite completed editorial work. Next Word: Unit 3 `coercion` (265 Words remain across Units 3–11).
2. Finish Unit 2's 12 Phrases and 13 Chunks, starting with `a handful of` and `I guess`, respectively. Their existing matching statuses do not mean full pedagogical review.
3. Locate the original source-library JSON containing all 850 transcript texts. It is not tracked in this repository and was not found in the accessible local filename searches. The coverage index contains IDs, not the transcript itself. Request its path before approving pending segments.
4. First pending transcript: Unit 2, page 4, segment 52. Unit 2 (pages 4–7) contains 25 pending segments; all 375 global pending segments remain unchanged this batch. Map units using `transcript_pages`, not the source library's `source_unit`. Review adjoining segments and all comprehension barriers, not merely matched words. Existing auto-covered segments also require contextual scrutiny; 399 covered does not mean 399 manually reviewed.
5. Review the remaining 181 machine translations and 180 generated memory aids in context; no fields are currently missing. Context-check 184 external definitions and 202 external IPA entries. Supply at least two natural collocations on the remaining 218 cards.
6. Run `node scripts/refresh_cornell7_review_reports.mjs`, `python scripts/validate_courses.py`, and `npm test`; commit and push only to PR #16. The refresh script updates counts without approving any coverage rows.

## Unit 2 batch 2 handoff

- Reproducible edits: `scripts/editorial_cornell7_unit2_batch2.mjs`.
- Per-card context decisions and dictionary references: `reports/cornell7-unit2-editorial-review.json`.
- No new Phrases/Chunks, timestamps, clips, or transcript excerpts were invented. Unit 1 and the five previously completed Unit 2 cards were preserved.
- Coverage report's embedded summary and stale per-unit counts were synchronized with current data; segment dispositions were not changed.
- Browser/UI checks above are inherited historical results, not rerun for this content-only batch.
- Current batch: `python scripts/validate_courses.py` PASS for both courses; `npm.cmd test` PASS (18 passed, 8 existing skips, 0 failures); both new scripts pass `node --check`; `git diff --check` PASS. The `.cmd` launcher avoids this machine's PowerShell script execution-policy restriction without changing system policy.
- Semantic comparison against the parent commit: exactly 25 Unit 2 Word cards changed; Unit 1, the five previously completed Unit 2 cards, all non-vocabulary course data, all source excerpts/pages, and all 850 segment dispositions are unchanged.
