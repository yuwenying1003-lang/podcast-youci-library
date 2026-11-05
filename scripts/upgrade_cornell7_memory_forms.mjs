import { readFile, writeFile } from 'node:fs/promises';

const courseUrl = new URL('../courses/8b77ac948ba43d5d084d03e194ce7ecb.json', import.meta.url);
const unresolvedUrl = new URL('../reports/cornell7-unresolved.json', import.meta.url);
const expansionUrl = new URL('../reports/cornell7-expansion-report.json', import.meta.url);
const course = JSON.parse(await readFile(courseUrl, 'utf8'));

const rules = [
  [/ically$/, word => `${word} ends in -ically: adjective + -ly forms an adverb describing how something happens.`],
  [/tion$/, word => `${word} ends in -tion, a frequent noun ending for an action, process, or result.`],
  [/sion$/, word => `${word} ends in -sion, which often turns a verb into an action/result noun.`],
  [/ment$/, word => `${word} ends in -ment, a noun-forming suffix for a result, state, or process.`],
  [/ness$/, word => `${word} ends in -ness: adjective + -ness names a quality or state.`],
  [/ity$/, word => `${word} ends in -ity, a noun ending that names a state or quality.`],
  [/ously$/, word => `${word} uses adjective -ous + adverb -ly; keep both parts visible when spelling it.`],
  [/ly$/, word => `${word} ends in -ly, marking the adverb form that tells how or with what degree.`],
  [/ous$/, word => `${word} ends in -ous, an adjective suffix meaning “having” or “full of” a quality.`],
  [/ive$/, word => `${word} ends in -ive, a common adjective ending for a quality or tendency.`],
  [/able$/, word => `${word} ends in -able, meaning “able or suitable to be” in this word family.`],
  [/less$/, word => `${word} ends in -less, meaning “without” the base idea.`],
  [/ful$/, word => `${word} ends in -ful, meaning “full of” the base quality.`],
  [/ing$/, word => `${word} is the -ing form; identify the base verb, then add -ing to show an ongoing action.`],
  [/ied$/, word => `${word} is a past form: a base ending in y changes y to i before -ed.`],
  [/ed$/, word => `${word} is an -ed form; connect it back to the base verb to remember both spelling and meaning.`],
  [/ers?$/, word => `${word} uses the person/thing ending -er; connect the ending to whoever or whatever performs the action.`],
  [/ists?$/, word => `${word} uses -ist for a person associated with an activity, belief, or field.`],
];
function formTip(item) {
  const word = item.word;
  if (/\s/.test(word)) return `Build the expression from its visible parts: ${word.split(/\s+/).join(' + ')}. Recall the whole form through “${item.source_excerpt.split(/\s+/).slice(0, 10).join(' ')}”.`;
  const matched = rules.find(([pattern]) => pattern.test(word.toLowerCase()));
  if (matched) return `${matched[1](word)} Anchor it in the podcast wording “${item.source_excerpt.split(/\s+/).slice(0, 9).join(' ')}”.`;
  const middle = Math.max(2, Math.ceil(word.length / 2));
  return `See ${word} in two spelling blocks: ${word.slice(0, middle)} + ${word.slice(middle)}. Rejoin them while saying the podcast phrase “${item.source_excerpt.split(/\s+/).slice(0, 8).join(' ')}”.`;
}

let upgraded = 0;
for (const item of course.vocab) {
  if (!item.tip?.startsWith('Spelling anchor:')) continue;
  item.tip = formTip(item);
  item.mnemonic_type = 'word-form-and-context';
  item.mnemonic_status = 'form_specific_generated_requires_editorial_review';
  item.memory_hook = `${item.word}: ${item.collocations?.[0]?.text || item.source_excerpt.split(/\s+/).slice(0, 7).join(' ')}`;
  item.mental_image_zh = `把 ${item.word} 的拼写分块写在原文场景上，再把各部分合成完整单词。`;
  upgraded += 1;
}
const unresolved = JSON.parse(await readFile(unresolvedUrl, 'utf8'));
const expansion = JSON.parse(await readFile(expansionUrl, 'utf8'));
unresolved.generated_spelling_context_memory = course.vocab.filter(item => item.tip?.startsWith('Spelling anchor:')).map(item => ({ unit: item.unit + 1, page: item.source_page, word: item.word }));
unresolved.form_generated_memory_requiring_review = course.vocab.filter(item => item.mnemonic_status === 'form_specific_generated_requires_editorial_review').map(item => ({ unit: item.unit + 1, page: item.source_page, word: item.word, tip: item.tip }));
expansion.unresolved_counts.generated_spelling_context_memory = unresolved.generated_spelling_context_memory.length;
expansion.unresolved_counts.form_generated_memory_requiring_review = unresolved.form_generated_memory_requiring_review.length;
await Promise.all([
  writeFile(courseUrl, `${JSON.stringify(course, null, 2)}\n`),
  writeFile(unresolvedUrl, `${JSON.stringify(unresolved, null, 2)}\n`),
  writeFile(expansionUrl, `${JSON.stringify(expansion, null, 2)}\n`),
]);
console.log(JSON.stringify({ upgraded, generic_remaining: unresolved.generated_spelling_context_memory.length }, null, 2));
