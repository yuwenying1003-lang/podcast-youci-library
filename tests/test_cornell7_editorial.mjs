import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8').then(JSON.parse);
const normalized = s => s.normalize('NFKC').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9']+/g, ' ').trim();
test('recovered PDF aligns all historical segment IDs and retains title and raw provenance', async () => {
  const s = await read('reports/cornell7-transcript-recovered.json');
  const c = await read('reports/cornell7-coverage-index.json');
  assert.equal(s.page_count, 51);
  assert.equal(s.pages.length, 51);
  assert.equal(s.transcript.segments.length, 850);
  assert.equal(s.transcript.segments.filter(x => x.kind === 'transcript').length, 849);
  assert.equal(s.transcript.segments[0].kind, 'title');
  assert.match(s.source_sha256, /^[a-f0-9]{64}$/);
  for (const [i, row] of s.transcript.segments.entries()) {
    assert.equal(row.segment, i + 1);
    assert.equal(row.page, c.segments[i].page);
    assert.equal(row.text, row.raw_text.trim().split(/\s+/).join(' '));
    assert.equal(row.bbox.length, 4);
    assert.ok(s.pages[row.page - 1].raw_text.includes(row.raw_text));
    if (c.segments[i].reviewed_text) assert.equal(c.segments[i].reviewed_text, row.text);
    assert.equal(row.clip, undefined);
  }
});
test('contextual coverage references real items and review summaries agree with queues', async () => {
  const course = await read('courses/8b77ac948ba43d5d084d03e194ce7ecb.json');
  const coverage = await read('reports/cornell7-coverage-index.json');
  const report = await read('reports/cornell7-expansion-report.json');
  const unresolved = await read('reports/cornell7-unresolved.json');
  const source = await read('reports/cornell7-transcript-recovered.json');
  const recheck = await read('reports/cornell7-added85-quality-20261023-review.json');
  assert.equal(recheck.entries.length, 85);
  assert.equal(new Set(recheck.entries.map(([u, text]) => `${u}:${text}`)).size, 85);
  assert.equal(recheck.independent_human_signoff, false);
  for (const [unit, text, decision, rationale] of recheck.entries) {
    const item = course.expressions.find(x => x.unit === unit - 1 && x.text === text);
    assert.ok(item, text);
    assert.ok(['retain', 'corrected'].includes(decision));
    assert.ok(rationale.length > 50, text);
    assert.equal(item.example_source, 'adapted');
    assert.ok(item.definition && item.cn && item.example_cn && item.context_review_note);
    assert.ok(normalized(item.source_excerpt).includes(normalized(text)), text);
  }
  for (const correction of recheck.corrections) {
    const item = course.expressions.find(x => x.unit === correction.unit - 1 && x.text === correction.text);
    for (const [field, value] of Object.entries(correction.fields)) assert.equal(item[field], value);
  }
  for (const p of course.expressions.filter(x => x.review_status === 'context_reviewed_source_ambiguous')) {
    assert.notEqual(p.editorial_status, 'reviewed_complete');
    assert.equal(p.independent_human_signoff, false);
    assert.ok(p.context_review_note.length > 30);
  }
  for (const p of course.expressions.filter(x => x.review_method === 'individual_pdf_contextual_review')) {
    assert.equal(p.reviewer, 'Codex');
    assert.equal(p.independent_human_signoff, false);
    assert.equal(p.example_source, 'adapted');
    assert.ok(p.example_cn && p.context_review_note);
    const src = source.transcript.segments.find(s => `segment-${s.segment}` === p.source_segment);
    assert.ok(src, p.text);
    assert.equal(p.source_excerpt, src.text);
    assert.equal(p.source_page, src.page);
    assert.ok(src.page >= course.units[p.unit].transcript_pages[0] && src.page <= course.units[p.unit].transcript_pages[1]);
  }
  const ids = new Set([
    // Newly added Chunks use exact paragraph IDs, not inferred clips or times.
    ...course.vocab.map(x => `word:${x.unit}:${normalized(x.word)}`),
    ...course.expressions.map(x => `phrase:${x.unit}:${normalized(x.text)}`),
    ...course.patterns.flatMap((g, u) => g.map(x => `chunk:${u}:${normalized(x.text)}`)),
  ]);
  const newChunkBatch = await read('reports/cornell7-unit8-listening-20261023-review.json');
  for (const [text, segment] of newChunkBatch.new_chunk_sources) {
    const item = course.patterns[newChunkBatch.unit - 1].find(x => x.text === text);
    assert.equal(item.source_segment, `segment-${segment}`);
    const row = source.transcript.segments.find(x => `segment-${x.segment}` === item.source_segment);
    assert.equal(item.source_excerpt, row.text);
    assert.equal(item.source_page, row.page);
    assert.equal(item.independent_human_signoff, false);
    assert.equal(item.example_source, 'adapted');
    assert.equal(item.clip, undefined);
    assert.equal(item.scenarios.length, 3);
  }
  for (const row of coverage.segments.filter(x => x.reviewer === 'Codex')) {
    assert.ok(row.review_reason.length > 30);
    for (const id of row.learning_item_ids) assert.ok(ids.has(id), id);
    if (row.status === 'covered') assert.ok(row.learning_item_ids.length > 0);
  }
  assert.deepEqual(coverage.report, report);
  for (const [key, value] of Object.entries(unresolved)) if (Array.isArray(value)) assert.equal(report.unresolved_counts[key], value.length, key);
  for (const status of ['covered', 'requires_review', 'no_identified_barrier']) assert.equal(report.coverage_status[status], coverage.segments.filter(x => x.status === status).length);
  for (const v of course.vocab.filter(x => x.review_method === 'individual_pdf_contextual_review')) {
    assert.equal(v.example_source, 'adapted');
    assert.equal(v.example_translation_status, 'context_reviewed');
    assert.ok(v.collocations.length >= 2);
    assert.ok(v.context_review_note);
    assert.equal(v.reviewer, 'Codex');
  }
});
