import { readFile, writeFile } from 'node:fs/promises';

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node scripts/review_cornell7_coverage_links.mjs <cornell7-source-library.json>');

const courseUrl = new URL('../courses/8b77ac948ba43d5d084d03e194ce7ecb.json', import.meta.url);
const coverageUrl = new URL('../reports/cornell7-coverage-index.json', import.meta.url);
const unresolvedUrl = new URL('../reports/cornell7-unresolved.json', import.meta.url);
const expansionUrl = new URL('../reports/cornell7-expansion-report.json', import.meta.url);
const [course, coverage, unresolved, expansion, source] = await Promise.all([...([courseUrl, coverageUrl, unresolvedUrl, expansionUrl].map(url => readFile(url, 'utf8').then(JSON.parse))), readFile(sourcePath, 'utf8').then(JSON.parse)]);
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9']+/g, ' ').trim();
const pageUnit = page => course.units.findIndex(unit => page >= unit.transcript_pages[0] && page <= unit.transcript_pages[1]);
const items = [
  ...course.vocab.map(item => ({ id: `word:${item.unit}:${normalize(item.word)}`, unit: item.unit, kind: 'word', text: normalize(item.word) })),
  ...course.expressions.map(item => ({ id: `phrase:${item.unit}:${normalize(item.text)}`, unit: item.unit, kind: 'phrase', text: normalize(item.text) })),
  ...course.patterns.flatMap((group, unit) => group.map(item => ({ id: `chunk:${unit}:${normalize(item.text)}`, unit, kind: 'chunk', text: normalize(item.text).replace(/\b(someone|something)\b/g, '').replace(/\s+/g, ' ').trim() }))),
];
let newlyCovered = 0;
for (const segment of coverage.segments) {
  if (segment.status !== 'requires_review') continue;
  const text = normalize(source.transcript.segments[segment.segment - 1]?.text || '');
  const unit = pageUnit(segment.page);
  const matches = items.filter(item => item.unit === unit && item.text && item.text.split(' ').length <= text.split(' ').length && (` ${text} `).includes(` ${item.text} `));
  const substantial = matches.filter(item => item.kind !== 'word' && item.text.split(' ').length >= 2);
  const words = matches.filter(item => item.kind === 'word');
  segment.candidate_learning_item_ids = matches.map(item => item.id);
  if (substantial.length || words.length >= 2) {
    segment.status = 'covered';
    segment.learning_item_ids = [...substantial, ...words].map(item => item.id);
    segment.review_status = 'systematic_link_review';
    segment.review_reason = substantial.length
      ? `Covered by complete reusable phrase/chunk match: ${substantial.map(item => item.text).join('; ')}.`
      : `Covered by ${words.length} distinct context-linked Word items; no single-word-only approval was used.`;
    newlyCovered += 1;
  } else {
    segment.review_status = 'systematic_review_needs_editorial_decision';
    segment.review_reason = matches.length
      ? 'Only one Word item matched; retained for contextual phrase and common-word-combination review.'
      : 'No sufficiently strong existing learning-item match; retained for manual spoken-English review.';
  }
}
coverage.report.coverage_status = Object.fromEntries(['covered', 'no_identified_barrier', 'requires_review'].map(status => [status, coverage.segments.filter(item => item.status === status).length]));
expansion.coverage_status = coverage.report.coverage_status;
unresolved.transcript_segments_requiring_review = coverage.segments.filter(item => item.status === 'requires_review').map(item => ({ page: item.page, segment: item.segment, reason: item.review_reason, candidate_learning_item_ids: item.candidate_learning_item_ids }));
expansion.unresolved_counts.transcript_segments_requiring_review = unresolved.transcript_segments_requiring_review.length;
await Promise.all([
  writeFile(coverageUrl, `${JSON.stringify(coverage, null, 2)}\n`),
  writeFile(unresolvedUrl, `${JSON.stringify(unresolved, null, 2)}\n`),
  writeFile(expansionUrl, `${JSON.stringify(expansion, null, 2)}\n`),
]);
console.log(JSON.stringify({ newly_covered: newlyCovered, coverage_status: coverage.report.coverage_status }, null, 2));
