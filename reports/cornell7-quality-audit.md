# Cornell 7 quality and regression audit

Generated from source schema `2.4-expanded-fourth-pass` on 2026-10-22.

## Coverage and learning content

- Processed source scope: 51/51 pages and 850/850 transcript segments indexed.
- Current reviewed library: 321 Words, 281 Phrases, 118 Chunks.
- Removed as normalized overlaps: 12 (1 Phrase and 11 Chunks); details are in `cornell7-duplicates.json`.
- Transcript index: 376 segments covered, 76 segments with no identified barrier, and 398 requiring editorial review.
- Provenance: every imported Word, Phrase, and Chunk has a source page and exact source excerpt.
- Exact audio: no sentence-level `clip` was created because the source has no verified start/end timestamps.

## Unresolved editorial work

- Unit 1 is now fully reviewed: 26/26 Word cards have context-checked definitions, reviewed American IPA, two natural collocations, form-led memory material, natural teaching examples, and complete Chinese translations.
- Unit 1 transcript review is complete: all eleven formerly unresolved segments on pages 1–3 now have a documented disposition. This added `back up`, `Is that what it is?`, and `prevent ... from ...` as practical spoken-English items.
- All 234 former IPA gaps now have externally sourced pronunciations: 12 direct dictionary IPA, 217 CMUdict ARPABET-to-broad-IPA conversions, and 5 transparent inflection/abbreviation rules. They remain flagged for editorial review.
- All 234 former English-definition gaps are filled: 216 use Wiktionary-derived definitions and 18 multiword terms use a context-matched Podlingora editorial definition. Externally sourced definitions remain flagged for final contextual review.
- 198 Word examples still have no complete Chinese sentence translation.
- 197 Words still use generated spelling/context memory anchors and require editorial improvement.
- 26 Word cards are fully reviewed; 295 remain in the human-review queue.
- 398 transcript segments remain in `requires_review`; this work is therefore not described as 100% comprehension coverage.

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

1. Review Word cards Unit 2 through Unit 11 using `scripts/editorial_cornell7_unit1.mjs` as the quality/template standard.
2. Complete the remaining example translations, replacing only the missing values and recording review status.
3. Replace remaining `Spelling anchor:` fallbacks with word-specific form-led mnemonics.
4. Context-check remaining `external_dictionary_unreviewed` definitions and externally sourced IPA.
5. Review remaining transcript segments page by page, attaching a reason and learning-item IDs to every disposition.
6. Recompute reports, run both validators, and update PR #16 after every completed Unit batch.
