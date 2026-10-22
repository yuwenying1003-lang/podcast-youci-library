import { readFile, writeFile } from 'node:fs/promises';

// Recompute queues only. Never imports source data or auto-approves coverage.
const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8').then(JSON.parse);
const [course, unresolved, expansion, coverage] = await Promise.all([
  'courses/8b77ac948ba43d5d084d03e194ce7ecb.json',
  'reports/cornell7-unresolved.json', 'reports/cornell7-expansion-report.json',
  'reports/cornell7-coverage-index.json',
].map(read));
const ref = item => ({ unit: item.unit + 1, page: item.source_page, word: item.word });
const queue = predicate => course.vocab.filter(predicate).map(ref);
unresolved.missing_ipa = queue(item => !item.ipa);
unresolved.missing_english_definition = queue(item => !item.definition);
unresolved.missing_example_translation = queue(item => !item.example_cn);
unresolved.generated_spelling_context_memory = queue(item => item.tip?.startsWith('Spelling anchor:'));
unresolved.requires_human_review = queue(item => item.editorial_status !== 'reviewed_complete');
unresolved.externally_sourced_ipa_requiring_review = course.vocab.filter(item => item.ipa_status?.includes('unreviewed')).map(item => ({ ...ref(item), ipa: item.ipa, source: item.ipa_source, status: item.ipa_status }));
unresolved.externally_sourced_definition_requiring_review = course.vocab.filter(item => item.definition_status === 'external_dictionary_unreviewed').map(item => ({ ...ref(item), definition: item.definition, source: item.definition_source }));
unresolved.machine_translations_requiring_review = course.vocab.filter(item => item.example_translation_status === 'machine_translated_requires_editorial_review').map(item => ({ ...ref(item), example: item.example, translation: item.example_cn }));
unresolved.form_generated_memory_requiring_review = queue(item => item.mnemonic_status === 'form_specific_generated_requires_editorial_review');
unresolved.transcript_segments_requiring_review = coverage.segments.filter(item => item.status === 'requires_review').map(item => ({ page: item.page, segment: item.segment, reason: item.review_reason, candidate_learning_item_ids: item.candidate_learning_item_ids }));
// Retain the established two-collocation completeness metric; explicit human
// sign-off is separate from both populated fields and Codex editorial review.
unresolved.fewer_than_two_collocations = queue(item => (item.collocations || []).filter(c => c.text && c.meaning_zh).length < 2);
expansion.totals = { words: course.vocab.length, phrases: course.expressions.length, chunks: course.patterns.flat().length };
expansion.unit_stats = course.units.map((unit, i) => ({ unit: i + 1, pages: unit.transcript_pages.join('-'), words: course.vocab.filter(v => v.unit === i).length, phrases: course.expressions.filter(v => v.unit === i).length, chunks: course.patterns[i].length }));
expansion.coverage_status = Object.fromEntries(['covered', 'no_identified_barrier', 'requires_review'].map(status => [status, coverage.segments.filter(item => item.status === status).length]));
expansion.unresolved_counts = Object.fromEntries(Object.entries(unresolved).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.length]));
expansion.reviewed_word_cards = course.vocab.filter(item => item.editorial_status === 'reviewed_complete').length;
expansion.translated_word_examples = course.vocab.filter(item => item.example_cn).length;
expansion.upgraded_memory_tips = course.vocab.filter(item => item.mnemonic_status === 'editorially_curated_complete_card').length;
expansion.review_updated_on = '2026-10-22';
coverage.report = { ...expansion };
for (const [path, value] of [
  ['reports/cornell7-unresolved.json', unresolved],
  ['reports/cornell7-expansion-report.json', expansion],
  ['reports/cornell7-coverage-index.json', coverage],
]) await writeFile(new URL(path, root), `${JSON.stringify(value, null, 2)}\n`);
console.log(JSON.stringify({ reviewed: expansion.reviewed_word_cards, remaining: expansion.unresolved_counts, coverage: expansion.coverage_status }, null, 2));
const pending = course.vocab.find(v => v.editorial_status !== 'reviewed_complete');
const contextual = coverage.segments.filter(s => s.reviewer === 'Codex');
const nextParagraph = coverage.segments.find(s => s.page > 3 && s.reviewer !== 'Codex');
const nextChunk = course.patterns.flatMap((group, unit) => group.map(item => ({ ...item, unit }))).find(item => item.unit > 0 && item.editorial_status !== 'reviewed_complete');
const nextPhrase = course.expressions.find(item => item.unit > 0 && item.editorial_status !== 'reviewed_complete');
const nextBarrier = coverage.segments.find(item => item.page > 3 && item.status === 'requires_review');
const audit = `# Cornell 7 quality and continuation audit

Updated 2026-10-22. Reviews identify Codex as reviewer; completed contextual editorial review is not independent human sign-off or audio verification.

## Recovered source

The local Cornell PDF has 51 pages. All pages were extracted into reports/cornell7-transcript-recovered.json with raw page text, paragraph text, page coordinates and SHA-256 provenance. The 850 historical IDs align page by page: one title plus 849 spoken-text paragraphs. Paragraph count/order alignment is not a claim of audio accuracy. Original disfluencies and possible transcription errors remain unchanged; no timestamps or clips were invented.

## Current counts

- Library: ${expansion.totals.words} Words / ${expansion.totals.phrases} Phrases / ${expansion.totals.chunks} Chunks.
- Word cards carrying reviewed_complete: ${expansion.reviewed_word_cards}; remaining: ${unresolved.requires_human_review.length}.
- Machine translations awaiting context review: ${unresolved.machine_translations_requiring_review.length}.
- Generated memory aids awaiting refinement: ${unresolved.form_generated_memory_requiring_review.length}.
- External definitions awaiting review: ${unresolved.externally_sourced_definition_requiring_review.length}; external IPA: ${unresolved.externally_sourced_ipa_requiring_review.length}.
- Cards with fewer than two populated collocations: ${unresolved.fewer_than_two_collocations.length}. This measures completeness, not independent human approval.
- Transcript statuses: ${expansion.coverage_status.covered} covered / ${expansion.coverage_status.no_identified_barrier} no identified barrier / ${expansion.coverage_status.requires_review} requires review.
- This PDF review has individual decisions for ${contextual.length} paragraphs; ${contextual.filter(s => s.status === 'requires_review').length} still have explicitly documented barriers. Historical automatic covered statuses outside this scope are not certified as contextual review.
- Phrases without reviewed_complete: ${course.expressions.filter(x => x.editorial_status !== 'reviewed_complete').length}; Chunks: ${course.patterns.flat().filter(x => x.editorial_status !== 'reviewed_complete').length}.
- Missing IPA, definition, translation and original generic Spelling anchor fields: zero.

## Exact continuation

- ${pending ? `Next unreviewed Word: Unit ${pending.unit + 1}, ${pending.word}.` : 'All 321 Word cards now carry completed editorial review; no pending Word remains.'} Preserve completed cards; independent human sign-off is not implied.
- ${nextParagraph ? `Next paragraph not yet individually read in this PDF pass: page ${nextParagraph.page}, segment ${nextParagraph.segment}. The continuous reviewed range is segments 50–${nextParagraph.segment - 1}.` : 'The continuous individual PDF review covers segments 50–850 (Units 2–11); no unread paragraph remains in that range.'} Unit 1's previous work is preserved.
- ${unresolved.transcript_segments_requiring_review.length ? `Earliest remaining transcript barrier: page ${unresolved.transcript_segments_requiring_review[0].page}, segment ${unresolved.transcript_segments_requiring_review[0].segment}.` : 'No transcript barrier is currently queued.'} Follow each review_reason, including barriers reopened after checking a formerly covered paragraph.
- ${nextParagraph ? 'Continue detailed PDF review beyond the latest recorded batch.' : 'The initial Unit 2–11 paragraph pass is complete; the next coverage work is resolving documented barriers, not rereading or auto-approving all matches.'} Source paragraphs are available locally in the recovered JSON, so no upload or missing-source blocker remains.
- ${nextBarrier ? `Next in-scope barrier after preserved Unit 1: page ${nextBarrier.page}, segment ${nextBarrier.segment}: ${nextBarrier.review_reason}` : 'No in-scope barrier remains after Unit 1.'}
- ${nextChunk ? `Next pending Chunk after preserved Unit 1: Unit ${nextChunk.unit + 1}, ${nextChunk.text}.` : 'No pending Chunk remains after Unit 1.'}
- ${nextPhrase ? `Next pending Phrase after preserved Unit 1: Unit ${nextPhrase.unit + 1}, ${nextPhrase.text}.` : 'No pending Phrase remains after Unit 1.'}
- ${course.vocab.find(v => v.unit === 0 && v.word === 'bizarre').collocations.length >= 2 ? 'The explicitly requested Unit 1 bizarre collocation repair is complete: bizarre behavior / a bizarre situation. The original excerpt and prior review remain unchanged.' : 'The historical Unit 1 bizarre card still lacks two populated collocations and remains queued.'}
- Follow the remaining Phrase/Chunk counts above, not historical queues. All previously completed cards are preserved; this follow-up also reviewed the previously pending Unit 1 entries, without repeating its completed reviews. A segment-level comprehension decision does not certify unrelated source claims.
- The source-ambiguous Phrase who pays them out remains explicitly deferred; its existing Chinese gloss is provisional. See reports/cornell7-unit4-deferred-phrase-review.json before editing or approving it.
- Follow-up continuation and baseline-preservation checks are recorded in reports/cornell7-followup-continuation.md. Do not reapply completed batches simply to clear a queue.
- Known transcript uncertainties include essayed, a best dose contractors, incomplete PSA text, AFK/not AFK, chapter nine, room-name variants, charged academically and false starts. Preserve exact quotations; any intended reading must be labeled an inference unless audio verifies it.
- Batch evidence is stored in reports/cornell7-unit*-review*.json. Word, transcript and Chunk reviews are separately named where a Unit has several batches; each records explicit decisions rather than generated keyword approvals.
- Refresh reports with node scripts/refresh_cornell7_review_reports.mjs, validate both course files and run npm.cmd test before each commit. Do not rerun the original import/enrichment over edited cards.

## Validation and boundaries

Validated PDF/editorial batches: 20 tests passed, 8 pre-existing skips, 0 failed; both courses pass python scripts/validate_courses.py. Added regression checks cover page/segment alignment, raw-source preservation, learning-item references, and report/queue consistency. Later batches must rerun these checks.

Only course content, editorial scripts, tests and reports are in scope. UI, CSS, player/audio controls, AI/login configuration, sentence checking and collections remain untouched. PR #16 only; no merge or deployment.

Original Chunk reconciliation remains 127 candidates - 11 within-Unit duplicates + 2 Unit 1 additions = 118; any later additions are counted separately in batch records.
`;
await writeFile(new URL('reports/cornell7-quality-audit.md', root), audit);
