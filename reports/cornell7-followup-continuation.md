# Cornell 7 follow-up checkpoint

For work after 8458263, continue from [the 2026-10-23 listening checkpoint](cornell7-listening-continuation-20261023.md). The counts below are the earlier checkpoint, not current totals.

Baseline: `416866a`, existing PR #16, branch `feature/cornell7-coverage-expansion`.

## Completed in this follow-up

- Reviewed 262 of the 263 previously pending Phrases; one source-ambiguous entry remains deliberately unapproved.
- Added 85 source-anchored learning entries for actual listening gaps. Current library: 321 Words, 435 Phrases, 118 Chunks.
- Reviewed all 64 previously pending Chunks, with 192 individually written daily/social/work scenarios, functions, Chinese meanings, replacement slots and contextual cautions. The 54 previously completed Chunks remain unchanged.
- Repaired only the missing collocations on the Unit 1 bizarre Word: bizarre behavior / a bizarre situation. All other baseline Word fields remain unchanged.
- Recorded 70 targeted paragraph decisions in the follow-up batches. Sixty-four previous requires_review paragraphs now have explicit teaching support and a contextual comprehension decision; six updated decisions remain pending. Overall: 494 covered / 179 no identified barrier / 177 requires review.
- Reused the existing 51-page/850-record source index. No PDF re-extraction, sentence timestamps or inferred clips.

These are Codex contextual editorial reviews, not independent human sign-off, audio verification, legal findings or automated keyword approvals. Tests check structure, provenance and consistency; they do not certify pedagogical accuracy. New single-word receptive targets are stored in the existing expressions collection alongside phrases, without changing UI or data-loading behavior.

## Exact next work

1. Phrase: Unit 4, page 15, paragraph 231, **who pays them out**. Read its `context_review_note` and `reports/cornell7-unit4-deferred-phrase-review.json`. The payment recipient/type is unresolved; the old Chinese gloss is provisional. Do not assume that members, insurers, plaintiffs and defense lawyers have interchangeable payment roles. Audio/context confirmation is needed before full approval.
2. Earliest outstanding paragraph: **76, page 5**, whose awkward quoted wording must remain uncorrected pending source/audio clarification. Unit 2 also retains 84, 99 and 108; Unit 3 retains the incomplete PSA fragment 117.
3. Next substantive lexical-barrier batch: **Unit 4, paragraph 215 (page 14)** and subsequent pending items. Paragraphs 194/195/203/206 on page 13 now have explicit support and contextual decisions; 208 has a new pinnacle entry but remains unresolved with 207. Earlier 163/165/166 contain suspect asbestos wording and must not be silently reconstructed.
4. Continue the remaining 177 paragraph barriers in `reports/cornell7-unresolved.json`; use `review_reason` and adjacent recovered paragraphs. Many still need lexical or structural teaching, so this checkpoint is **not** a claim that all remaining items are audio-blocked or that the subtitle task is finished.
5. No pending Chunk remains. Do not repeat completed Word/Phrase/Chunk review. New gaps may require new targeted entries, followed by a fresh contextual paragraph decision.

## Validation and preservation

Every batch was followed by `npm.cmd test` and `python scripts/validate_courses.py`: 20 passed, 8 existing skips, no failures after corrections; both courses valid. `git diff --check` passed.

Compared course JSON against `416866a`: all baseline-complete Phrases and Chunks are unchanged; all Words are unchanged except the requested bizarre collocation fields. An accidentally rewritten pre-completed screamed bloody murder entry was restored and removed from the follow-up batch. Existing Chunk source excerpts are unchanged. The recovered source index and application/UI files are untouched.

PR #16 only. No new PR, merge, deployment or changes to HTML/CSS, audio/player controls, AI/login/checking, collections or progress behavior. The original untracked local materials remain untracked and untouched apart from previously installed PDF tooling from the earlier turn.

Use the generated quality audit for current totals after subsequent batches; this file records this checkpoint rather than overriding later evidence.
