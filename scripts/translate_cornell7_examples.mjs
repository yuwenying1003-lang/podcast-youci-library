import { readFile, writeFile } from 'node:fs/promises';

const courseUrl = new URL('../courses/8b77ac948ba43d5d084d03e194ce7ecb.json', import.meta.url);
const cacheUrl = new URL('../reports/cornell7-example-translation-review.json', import.meta.url);
const unresolvedUrl = new URL('../reports/cornell7-unresolved.json', import.meta.url);
const expansionUrl = new URL('../reports/cornell7-expansion-report.json', import.meta.url);
const course = JSON.parse(await readFile(courseUrl, 'utf8'));
const cache = await readFile(cacheUrl, 'utf8').then(JSON.parse).catch(() => ({ translations: {} }));

async function translate(text) {
  if (cache.translations[text]?.translation) return cache.translations[text];
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return { status: response.status, translation: '' };
    const payload = await response.json();
    return { status: 200, translation: (payload[0] || []).map(part => part[0]).join('').trim() };
  } catch (error) {
    return { status: 'network_error', translation: '', error: String(error?.message || error) };
  }
}

const pending = course.vocab.filter(item => !item.example_cn);
for (let index = 0; index < pending.length; index += 5) {
  await Promise.all(pending.slice(index, index + 5).map(async item => {
    cache.translations[item.example] = await translate(item.example);
  }));
  await new Promise(resolve => setTimeout(resolve, 100));
}

let filled = 0;
for (const item of pending) {
  const translation = cache.translations[item.example]?.translation;
  if (!translation) continue;
  item.example_cn = translation;
  item.example_translation_source = 'Google Translate web endpoint';
  item.example_translation_status = 'machine_translated_requires_editorial_review';
  filled += 1;
}
const unresolved = JSON.parse(await readFile(unresolvedUrl, 'utf8'));
const expansion = JSON.parse(await readFile(expansionUrl, 'utf8'));
unresolved.missing_example_translation = course.vocab.filter(item => !item.example_cn).map(item => ({ unit: item.unit + 1, page: item.source_page, word: item.word }));
unresolved.machine_translations_requiring_review = course.vocab.filter(item => item.example_translation_status === 'machine_translated_requires_editorial_review').map(item => ({ unit: item.unit + 1, page: item.source_page, word: item.word, example: item.example, translation: item.example_cn }));
expansion.unresolved_counts.missing_example_translation = unresolved.missing_example_translation.length;
expansion.unresolved_counts.machine_translations_requiring_review = unresolved.machine_translations_requiring_review.length;
expansion.translated_word_examples = course.vocab.filter(item => item.example_cn).length;
cache.generated_at = new Date().toISOString();
cache.source = 'Google Translate web endpoint';
cache.note = 'Machine translations are candidates only and remain in the editorial review queue.';
cache.requested = pending.length;
cache.filled = filled;
cache.remaining = unresolved.missing_example_translation.length;
await Promise.all([
  writeFile(courseUrl, `${JSON.stringify(course, null, 2)}\n`),
  writeFile(cacheUrl, `${JSON.stringify(cache, null, 2)}\n`),
  writeFile(unresolvedUrl, `${JSON.stringify(unresolved, null, 2)}\n`),
  writeFile(expansionUrl, `${JSON.stringify(expansion, null, 2)}\n`),
]);
console.log(JSON.stringify({ requested: pending.length, filled, remaining: unresolved.missing_example_translation.length }, null, 2));
