import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node scripts/import_cornell7_source_library.mjs <cornell7-source-library.json>');

const coursePath = path.resolve('courses/8b77ac948ba43d5d084d03e194ce7ecb.json');
const reportDir = path.resolve('reports');
const [source, existing] = await Promise.all([
  readFile(sourcePath, 'utf8').then(JSON.parse),
  readFile(coursePath, 'utf8').then(JSON.parse),
]);

const pageRanges = [[1, 3], [4, 7], [8, 10], [11, 15], [16, 20], [21, 23], [24, 26], [27, 33], [34, 40], [41, 44], [45, 51]];
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9']+/g, ' ').trim();
const unitForPage = page => Math.max(0, pageRanges.findIndex(([first, last]) => page >= first && page <= last));
const truncateWords = (value, limit = 15) => String(value || '').trim().split(/\s+/).slice(0, limit).join(' ');
const currentWord = new Map(existing.vocab.map(item => [normalize(item.word), item]));
const currentPhrase = new Map(existing.expressions.map(item => [normalize(item.text), item]));
const currentPatterns = new Map(existing.patterns.flat().map(item => [normalize(item.text), item]));

function sourceCollocations(item) {
  return (item.collocations || []).slice(0, 3).map(value => typeof value === 'string'
    ? { text: value, meaning_zh: '', source_kind: 'teaching' }
    : { text: value.text, meaning_zh: value.meaning_zh || '', source_kind: value.source_type?.startsWith('verified') ? 'original' : 'teaching' });
}

function excerptAnchor(item) {
  const words = String(item.source_excerpt || '').split(/\s+/);
  const target = normalize(item.word || item.text).split(' ')[0];
  const index = words.findIndex(word => normalize(word) === target);
  return index >= 0 ? words.slice(Math.max(0, index - 2), index + 4).join(' ').replace(/[.,;:!?]+$/, '') : truncateWords(item.source_excerpt, 8);
}

function safeMemory(item, old) {
  if (item.memory_trick?.trim()) return item.memory_trick.trim();
  if (old?.tip?.trim() && !/^\s*(means?\b|synonym\b|similar to\b|spelling anchor:)/i.test(old.tip)) return old.tip.trim();
  const target = item.word || item.text;
  const anchor = sourceCollocations(item)[0]?.text || excerptAnchor(item);
  return `Spelling anchor: keep “${target}” visible, then recall it through the podcast phrase “${anchor}”.`;
}

function safeHook(item) {
  if (item.memory_hook?.trim()) return item.memory_hook.trim();
  const target = item.word || item.text;
  return truncateWords(`${target}: ${sourceCollocations(item)[0]?.text || excerptAnchor(item)}`, 15);
}

function existingExampleTranslation(old) {
  const value = old?.example_cn?.trim() || '';
  return /原文语境，完整译文待复核/.test(value) ? '' : value;
}

const duplicates = [];
const dedupeByUnit = (items, kind) => {
  const seen = new Set();
  return items.filter(item => {
    const key = `${item.unit}:${normalize(item.word || item.text)}`;
    if (seen.has(key)) {
      duplicates.push({ kind, unit: item.unit + 1, normalized: normalize(item.word || item.text), text: item.word || item.text, source_page: item.source_page, source_excerpt: item.source_excerpt });
      return false;
    }
    seen.add(key); return true;
  });
};

const sourceWords = source.units.flatMap(sourceUnit => sourceUnit.words).map(item => {
  const old = currentWord.get(normalize(item.word || item.text));
  const unit = unitForPage(item.source_page);
  const example = item.example_en || old?.example || item.source_excerpt;
  return {
    word: item.word || item.text,
    definition: old?.definition || `Podcast-context meaning: ${item.meaning_zh}`,
    cn: item.meaning_zh || old?.cn || '',
    ipa: item.ipa || old?.ipa || '',
    difficulty: item.difficulty || old?.difficulty || 'Useful',
    unit,
    source_page: item.source_page,
    source_segment: `page-${item.source_page}`,
    source_excerpt: item.source_excerpt,
    source_kind: 'original',
    source_verification: item.source_type || 'verified_transcript_match',
    extraction_confidence: item.match_mode?.includes('exact') ? 'high' : 'medium',
    collocations: sourceCollocations(item),
    tip: safeMemory(item, old),
    memory_hook: safeHook(item),
    mental_image_zh: item.mental_image_zh || `想象原文场景，并把 “${item.word || item.text}” 写在画面中央。`,
    mnemonic_type: item.memory_type || 'spelling-and-context',
    mnemonic_status: item.mnemonic_status || 'requires_review',
    editorial_status: item.card_review_status || 'requires_human_review',
    example,
    example_cn: item.example_zh || existingExampleTranslation(old),
    example_source: item.example_type === 'teaching_example' ? 'adapted' : 'transcript',
    source: `verified transcript page ${item.source_page}`,
  };
});

const sourcePhrases = source.units.flatMap(sourceUnit => sourceUnit.phrases).map(item => {
  const text = item.phrase || item.text;
  const old = currentPhrase.get(normalize(text));
  return {
    text,
    definition: old?.definition || item.usage_note || `Podcast-context expression: ${item.meaning_zh}`,
    cn: item.meaning_zh || old?.cn || '',
    difficulty: item.difficulty || 'Useful',
    unit: unitForPage(item.source_page),
    source_page: item.source_page,
    source_segment: `page-${item.source_page}`,
    source_excerpt: item.source_excerpt,
    source_kind: 'original',
    source_verification: item.source_type || 'verified_transcript_match',
    extraction_confidence: item.match_mode?.includes('exact') ? 'high' : 'medium',
    grammatical_pattern: item.usage_note || '',
    connected_speech_note: item.connected_speech_note || '',
    daily_usefulness: item.usefulness || 'Useful',
    example: item.example_en || old?.example || item.source_excerpt,
    example_cn: item.example_zh || existingExampleTranslation(old),
    example_source: item.example_type === 'teaching_example' ? 'adapted' : 'transcript',
    editorial_status: item.review_status || 'requires_human_review',
  };
});

function genericScenarios(item, reference) {
  return [
    { type: 'daily', label: 'Daily life', scene_zh: `在日常生活中自然使用“${item.meaning_zh}”这一表达。`, goal_en: item.pattern || item.text, keywords: ['today', 'plan'], starter: item.pattern || item.text, reference_answer: reference },
    { type: 'social', label: 'Friends', scene_zh: `和朋友聊天时自然使用“${item.meaning_zh}”这一表达。`, goal_en: item.pattern || item.text, keywords: ['friend', 'situation'], starter: item.pattern || item.text, reference_answer: reference },
    { type: 'work', label: 'Work', scene_zh: `在工作沟通中自然使用“${item.meaning_zh}”这一表达。`, goal_en: item.pattern || item.text, keywords: ['project', 'team'], starter: item.pattern || item.text, reference_answer: reference },
  ];
}

const patternsByUnit = Array.from({ length: existing.units.length }, () => []);
for (const item of source.units.flatMap(sourceUnit => sourceUnit.chunks)) {
  const text = item.pattern || item.text;
  const old = currentPatterns.get(normalize(text));
  const example = item.adapted_en || old?.example || item.original_en || item.source_excerpt;
  patternsByUnit[unitForPage(item.source_page)].push({
    text,
    cn: item.meaning_zh || old?.cn || '',
    example,
    prompt: old?.prompt || `Use “${text}” in a complete sentence.`,
    source_page: item.source_page,
    source_segment: `page-${item.source_page}`,
    source_excerpt: item.source_excerpt,
    source_kind: 'original',
    source_verification: item.source_type || 'verified_transcript_match',
    extraction_confidence: item.match_mode?.includes('exact') ? 'high' : 'medium',
    communicative_function: item.meaning_zh || '',
    original_en: item.original_en || item.source_excerpt,
    everyday_example: item.adapted_en || '',
    everyday_example_zh: item.adapted_zh || '',
    workplace_example: item.workplace_example || '',
    replaceable_parts: item.replaceable_parts || '',
    editorial_status: item.review_status || 'requires_human_review',
    scenarios: old?.scenarios || genericScenarios(item, example),
  });
}

for (let index = 0; index < patternsByUnit.length; index += 1) {
  const seen = new Set();
  patternsByUnit[index] = patternsByUnit[index].filter(item => {
    const key = normalize(item.text);
    if (seen.has(key)) {
      duplicates.push({ kind: 'chunk', unit: index + 1, normalized: key, text: item.text, source_page: item.source_page, source_excerpt: item.source_excerpt });
      return false;
    }
    seen.add(key);
    return true;
  });
}

const units = existing.units.map((item, index) => ({ ...item, transcript_pages: pageRanges[index] }));
const course = {
  ...existing,
  units,
  vocab: dedupeByUnit(sourceWords, 'word'),
  expressions: dedupeByUnit(sourcePhrases, 'phrase'),
  patterns: patternsByUnit,
  meta: {
    ...existing.meta,
    revision: '2026-10-22-coverage-first-729-source-import',
    transcriptSource: 'provided PDF, 51 pages / 850 segments',
    sourceLibrarySchema: source.schema_version,
    sourceLibraryImportantNote: source.important_note,
  },
};

const learningItems = [
  ...course.vocab.map(item => ({ id: `word:${item.unit}:${normalize(item.word)}`, page: item.source_page, excerpt: item.source_excerpt })),
  ...course.expressions.map(item => ({ id: `phrase:${item.unit}:${normalize(item.text)}`, page: item.source_page, excerpt: item.source_excerpt })),
  ...course.patterns.flatMap((items, unit) => items.map(item => ({ id: `chunk:${unit}:${normalize(item.text)}`, page: item.source_page, excerpt: item.source_excerpt }))),
];
const exactExcerptMap = new Map();
for (const item of learningItems) {
  const key = `${item.page}:${normalize(item.excerpt)}`;
  if (!exactExcerptMap.has(key)) exactExcerptMap.set(key, []);
  exactExcerptMap.get(key).push(item.id);
}
const coverage = source.transcript.segments.map((segment, index) => {
  const exact = exactExcerptMap.get(`${segment.page}:${normalize(segment.text)}`) || [];
  const shortOrFiller = normalize(segment.text).split(' ').filter(Boolean).length <= 3;
  return { page: segment.page, segment: index + 1, source_unit: segment.unit, status: exact.length ? 'covered' : shortOrFiller ? 'no_identified_barrier' : 'requires_review', learning_item_ids: exact };
});

const unitStats = units.map((item, index) => ({ unit: index + 1, pages: item.transcript_pages.join('-'), words: course.vocab.filter(value => value.unit === index).length, phrases: course.expressions.filter(value => value.unit === index).length, chunks: course.patterns[index].length }));
const unresolved = {
  missing_ipa: course.vocab.filter(item => !item.ipa).map(item => ({ unit: item.unit + 1, page: item.source_page, word: item.word })),
  missing_english_definition: course.vocab.filter(item => item.definition.startsWith('Podcast-context meaning:')).map(item => ({ unit: item.unit + 1, page: item.source_page, word: item.word })),
  missing_example_translation: course.vocab.filter(item => !item.example_cn).map(item => ({ unit: item.unit + 1, page: item.source_page, word: item.word })),
  generated_spelling_context_memory: course.vocab.filter(item => item.tip.startsWith('Spelling anchor:')).map(item => ({ unit: item.unit + 1, page: item.source_page, word: item.word })),
  requires_human_review: course.vocab.filter(item => /requires|needs_human/i.test(item.editorial_status || item.mnemonic_status)).map(item => ({ unit: item.unit + 1, page: item.source_page, word: item.word })),
  transcript_segments_requiring_review: coverage.filter(item => item.status === 'requires_review').map(item => ({ page: item.page, segment: item.segment })),
};
const report = {
  generated_at: new Date().toISOString(),
  source_schema: source.schema_version,
  source_pages: source.source_pdf_pages,
  transcript_segments: source.transcript.segments.length,
  totals: { words: course.vocab.length, phrases: course.expressions.length, chunks: course.patterns.flat().length },
  source_candidate_totals: { words: sourceWords.length, phrases: sourcePhrases.length, chunks: source.units.flatMap(unit => unit.chunks).length },
  duplicates_removed: duplicates.length,
  unit_stats: unitStats,
  coverage_status: Object.fromEntries(['covered', 'no_identified_barrier', 'requires_review'].map(status => [status, coverage.filter(item => item.status === status).length])),
  unresolved_counts: Object.fromEntries(Object.entries(unresolved).map(([key, values]) => [key, values.length])),
  note: 'Source excerpts are transcript-grounded. Sentence-level audio timestamps are absent and no clip objects were generated. Missing IPA and generated fallback memory aids remain explicitly unresolved.',
};

await mkdir(reportDir, { recursive: true });
await Promise.all([
  writeFile(coursePath, `${JSON.stringify(course, null, 2)}\n`),
  writeFile(path.join(reportDir, 'cornell7-coverage-index.json'), `${JSON.stringify({ report, segments: coverage }, null, 2)}\n`),
  writeFile(path.join(reportDir, 'cornell7-unresolved.json'), `${JSON.stringify(unresolved, null, 2)}\n`),
  writeFile(path.join(reportDir, 'cornell7-duplicates.json'), `${JSON.stringify({ count: duplicates.length, items: duplicates }, null, 2)}\n`),
  writeFile(path.join(reportDir, 'cornell7-expansion-report.json'), `${JSON.stringify(report, null, 2)}\n`),
]);

console.log(JSON.stringify(report, null, 2));
