# Cornell 7 quality and regression audit

Generated from source schema `2.4-expanded-fourth-pass` on 2026-10-22.

## Coverage and learning content

- Processed source scope: 51/51 pages and 850/850 transcript segments indexed.
- Imported after within-unit normalization: 321 Words, 280 Phrases, 116 Chunks.
- Removed as normalized overlaps: 12 (1 Phrase and 11 Chunks); details are in `cornell7-duplicates.json`.
- Transcript index: 368 segments linked to an exact source excerpt, 73 short/filler segments with no identified barrier, and 409 requiring editorial review.
- Provenance: every imported Word, Phrase, and Chunk has a source page and exact source excerpt.
- Exact audio: no sentence-level `clip` was created because the source has no verified start/end timestamps.

## Unresolved editorial work

- 234 Words have no checked IPA.
- 234 Words have no independently supplied English definition; the current visible fallback is explicitly contextual and is not marked as human-verified.
- 207 Word examples have no complete Chinese sentence translation.
- 206 Words use generated spelling/context memory anchors and require editorial improvement.
- All 321 source Word cards retain the source library's human-review status.
- 409 transcript segments remain in `requires_review`; this import is therefore not described as 100% comprehension coverage.

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
