import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8').then(JSON.parse);
const batch = await read(process.argv[2]);
const course = await read('courses/8b77ac948ba43d5d084d03e194ce7ecb.json');
const source = await read('reports/cornell7-transcript-recovered.json');
const coverage = await read('reports/cornell7-coverage-index.json');
const normalize = s => s.normalize('NFKC').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9']+/g, ' ').trim();
const compact = s => normalize(s).replaceAll(' ', '');
const unit = batch.unit - 1;
for (const [word, ipa, definition, cn, pairs, tip, example, example_cn, note] of batch.words || []) {
  const item = course.vocab.find(v => v.unit === unit && v.word === word);
  if (!item || item.editorial_status === 'reviewed_complete') throw new Error(`Missing/already reviewed: ${word}`);
  if (!compact(source.pages[item.source_page - 1].raw_text).includes(compact(item.source_excerpt))) throw new Error(`Source mismatch: ${word}`);
  Object.assign(item, { ipa, definition, cn, tip, memory_hook: pairs[0], mental_image_zh: pairs[1],
    collocations: [0, 2].map(i => ({ text: pairs[i], meaning_zh: pairs[i + 1], source_kind: 'teaching' })),
    example, example_cn, example_source: 'adapted', example_translation_source: 'Codex contextual editorial review',
    example_translation_status: 'context_reviewed', definition_status: 'context_reviewed', ipa_status: 'american_ipa_reviewed',
    mnemonic_status: 'editorially_curated_complete_card', mnemonic_type: 'word-form-and-context',
    editorial_status: 'reviewed_complete', reviewer: 'Codex', review_method: 'individual_pdf_contextual_review',
    review_date: '2026-10-22', context_review_note: note });
}
for (const [text, segment, definition, cn, example, example_cn, note] of batch.phrases || []) {
  const src = source.transcript.segments.find(s => s.segment === segment);
  if (!src || !compact(src.text).includes(compact(text))) throw new Error(`Phrase not literal: ${text}`);
  let item = course.expressions.find(v => v.unit === unit && v.text === text);
  if (!item) { item = { text, unit, difficulty: 'Useful' }; course.expressions.push(item); }
  Object.assign(item, { definition, cn, example, example_cn, example_source: 'adapted', source_page: src.page,
    source_segment: `segment-${segment}`, source_excerpt: src.text, source_kind: 'original',
    source_verification: 'verified_transcript_match', extraction_confidence: 'high',
    editorial_status: 'reviewed_complete', reviewer: 'Codex', review_date: '2026-10-22', context_review_note: note });
}
const allIds = new Set([
  ...course.vocab.map(v => `word:${v.unit}:${normalize(v.word)}`),
  ...course.expressions.map(v => `phrase:${v.unit}:${normalize(v.text)}`),
  ...course.patterns.flatMap((group, i) => group.map(v => `chunk:${i}:${normalize(v.text)}`)),
]);
for (const [segment, status, ids, reason] of batch.segments || []) {
  const row = coverage.segments.find(s => s.segment === segment);
  const src = source.transcript.segments.find(s => s.segment === segment);
  if (!row || !src || row.page !== src.page) throw new Error(`Bad segment ${segment}`);
  if (src.page < course.units[unit].transcript_pages[0] || src.page > course.units[unit].transcript_pages[1]) throw new Error(`Wrong unit ${segment}`);
  for (const id of ids) if (!allIds.has(id)) throw new Error(`Unknown learning item: ${id}`);
  Object.assign(row, { status, learning_item_ids: ids, review_reason: reason,
    review_status: status === 'requires_review' ? 'context_reviewed_remaining_barriers' : 'contextually_reviewed',
    reviewer: 'Codex', review_date: '2026-10-22', reviewed_text: src.text });
}
await writeFile(new URL('courses/8b77ac948ba43d5d084d03e194ce7ecb.json', root), JSON.stringify(course, null, 2) + '\n');
await writeFile(new URL('reports/cornell7-coverage-index.json', root), JSON.stringify(coverage, null, 2) + '\n');
console.log(JSON.stringify({ unit: batch.unit, words: batch.words?.length || 0, phrases: batch.phrases?.length || 0, segments: batch.segments?.length || 0 }));
