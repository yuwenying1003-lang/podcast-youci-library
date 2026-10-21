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
