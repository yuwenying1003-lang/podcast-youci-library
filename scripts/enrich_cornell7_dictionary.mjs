import { readFile, writeFile } from 'node:fs/promises';

const coursePath = new URL('../courses/8b77ac948ba43d5d084d03e194ce7ecb.json', import.meta.url);
const reportPath = new URL('../reports/cornell7-dictionary-enrichment.json', import.meta.url);
const unresolvedPath = new URL('../reports/cornell7-unresolved.json', import.meta.url);
const expansionPath = new URL('../reports/cornell7-expansion-report.json', import.meta.url);
const course = JSON.parse(await readFile(coursePath, 'utf8'));
const unresolvedReport = JSON.parse(await readFile(unresolvedPath, 'utf8'));
const expansionReport = JSON.parse(await readFile(expansionPath, 'utf8'));
const prior = await readFile(reportPath, 'utf8').then(JSON.parse).catch(() => ({ lookups: {} }));
const lookups = prior.lookups || {};
const definitions = prior.definitions || {};
const CMU_URL = 'https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict';
const WIKTIONARY_API = 'https://freedictionaryapi.com/api/v1/entries/en/';
const ARPA = {
  AA: 'ɑ', AE: 'æ', AH: 'ʌ', AO: 'ɔ', AW: 'aʊ', AY: 'aɪ', EH: 'ɛ', ER: 'ɝ', EY: 'eɪ', IH: 'ɪ', IY: 'i', OW: 'oʊ', OY: 'ɔɪ', UH: 'ʊ', UW: 'u',
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', F: 'f', G: 'ɡ', HH: 'h', JH: 'dʒ', K: 'k', L: 'l', M: 'm', N: 'n', NG: 'ŋ', P: 'p', R: 'r', S: 's', SH: 'ʃ', T: 't', TH: 'θ', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
};

const cleanIpa = value => {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.startsWith('/') || text.startsWith('[') ? text : `/${text}/`;
};

async function lookup(word) {
  if (Object.hasOwn(lookups, word)) return lookups[word];
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  try {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!response.ok) return (lookups[word] = { status: response.status, ipa: '' });
    const entries = await response.json();
    const candidates = entries.flatMap(entry => [entry.phonetic, ...(entry.phonetics || []).map(item => item.text)]).map(cleanIpa).filter(Boolean);
    return (lookups[word] = { status: 200, ipa: candidates[0] || '' });
  } catch (error) {
    return (lookups[word] = { status: 'network_error', ipa: '', error: String(error?.message || error) });
  }
}

const pending = course.vocab.filter(item => !item.ipa);
for (let index = 0; index < pending.length; index += 8) {
  await Promise.all(pending.slice(index, index + 8).map(item => lookup(item.word)));
}

const cmuText = await fetch(CMU_URL).then(response => {
  if (!response.ok) throw new Error(`CMUdict request failed (${response.status})`);
  return response.text();
});
const cmu = new Map();
for (const line of cmuText.split(/\r?\n/)) {
  const [headword, ...phones] = line.trim().split(/\s+/);
  const key = headword?.replace(/\(\d+\)$/, '').toLowerCase();
  if (key && phones.length && !cmu.has(key)) cmu.set(key, phones);
}
const phoneToIpa = phone => {
  const base = phone.replace(/[012]$/, '');
  if (base === 'AH' && phone.endsWith('0')) return 'ə';
  if (base === 'ER' && phone.endsWith('0')) return 'ɚ';
  return ARPA[base] || '';
};
function cmuIpa(value) {
  const words = String(value).toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];
  if (!words.length) return '';
  const pronunciations = words.map(word => cmu.get(word));
  if (pronunciations.some(value => !value)) return '';
  return `/${pronunciations.map(phones => phones.map(phoneToIpa).join('')).join(' ')}/`;
}

let filled = 0;
for (const item of course.vocab) {
  const result = lookups[item.word];
  if (!item.ipa && result?.ipa) {
    item.ipa = result.ipa;
    item.ipa_source = 'dictionaryapi.dev';
    item.ipa_status = 'external_dictionary_unreviewed';
    filled += 1;
  } else if (!item.ipa) {
    const ipa = cmuIpa(item.word);
    if (ipa) {
      item.ipa = ipa;
      item.ipa_source = 'CMU Pronouncing Dictionary (ARPABET converted to broad IPA)';
      item.ipa_status = 'external_dictionary_conversion_unreviewed';
      filled += 1;
    }
  }
}

for (const item of course.vocab.filter(item => !item.ipa)) {
  try {
    const response = await fetch(`${WIKTIONARY_API}${encodeURIComponent(item.word)}`);
    if (!response.ok) continue;
    const payload = await response.json();
    const ipa = payload.entries?.flatMap(entry => entry.pronunciations || []).find(pronunciation => pronunciation.type === 'ipa')?.text || '';
    if (ipa) {
      item.ipa = cleanIpa(ipa);
      item.ipa_source = 'freedictionaryapi.com (Wiktionary-derived)';
      item.ipa_status = 'external_dictionary_unreviewed';
      filled += 1;
    }
  } catch {
    // A failed optional fallback remains visible in the unresolved report.
  }
}

const transparentPronunciationRules = {
  doxxed: cmuIpa('docks'),
  blindfolds: cmu.get('blindfold') ? `/${cmu.get('blindfold').map(phoneToIpa).join('')}z/` : '',
  workarounds: cmu.get('workaround') ? `/${cmu.get('workaround').map(phoneToIpa).join('')}z/` : '',
  POV: '/pi oʊ vi/',
  'Title IX': cmuIpa('title nine'),
};
for (const item of course.vocab.filter(item => !item.ipa)) {
  const ipa = transparentPronunciationRules[item.word];
  if (!ipa) continue;
  item.ipa = ipa;
  item.ipa_source = 'CMU Pronouncing Dictionary + transparent inflection/abbreviation rule';
  item.ipa_status = 'rule_derived_unreviewed';
  filled += 1;
}

async function wiktionaryDefinition(word) {
  if (definitions[word]?.status === 200 || definitions[word]?.status === 404) return definitions[word];
  try {
    const response = await fetch(`${WIKTIONARY_API}${encodeURIComponent(word)}`);
    if (!response.ok) return (definitions[word] = { status: response.status, definition: '' });
    const payload = await response.json();
    const senses = (payload.entries || []).flatMap(entry => (entry.senses || []).map(sense => ({
      definition: String(sense.definition || '').trim(),
      tags: sense.tags || [],
    }))).filter(sense => sense.definition && !sense.tags.some(tag => /archaic|obsolete|dated/i.test(tag)));
    const preferred = senses.find(sense => !/^(alternative|simple past|past participle|plural|present participle|third-person)/i.test(sense.definition)) || senses[0];
    return (definitions[word] = { status: 200, definition: preferred?.definition || '' });
  } catch (error) {
    return (definitions[word] = { status: 'network_error', definition: '', error: String(error?.message || error) });
  }
}

const definitionPending = course.vocab.filter(item => item.definition.startsWith('Podcast-context meaning:'));
for (let index = 0; index < definitionPending.length; index += 2) {
  await Promise.all(definitionPending.slice(index, index + 2).map(item => wiktionaryDefinition(item.word)));
  await new Promise(resolve => setTimeout(resolve, 120));
}
let definitionsFilled = 0;
for (const item of definitionPending) {
  const value = definitions[item.word]?.definition;
  if (!value) continue;
  item.definition = value;
  item.definition_source = 'freedictionaryapi.com (Wiktionary-derived)';
  item.definition_status = 'external_dictionary_unreviewed';
  definitionsFilled += 1;
}
const contextualDefinitions = {
  'hazardous waste': 'Waste material that can harm people or the environment.',
  "homeowner's": 'Belonging to or associated with the owner of a home.',
  'emotional damage': 'Psychological or emotional harm caused by an experience.',
  'hazing lawsuits': 'Legal cases concerning harmful or abusive initiation practices.',
  'active chapters': 'Local branches of an organization that are currently operating.',
  'physically exhausted': 'Extremely tired in the body after physical effort or stress.',
  'hired professional': 'A skilled person paid to perform a particular job.',
  'house director': 'A staff member responsible for managing a shared residential house.',
  'legal drinking age': 'The minimum age at which the law permits a person to buy or drink alcohol.',
  'operational manager': 'A person responsible for an organization’s day-to-day operations.',
  'fraternity brother': 'A male member of the same college fraternity.',
  'under 21': 'Younger than twenty-one years old.',
  'alumni room': 'A room designated for graduates or former members of an institution or organization.',
  'high proof': 'Containing a high percentage of alcohol.',
  'group message': 'A message sent to several people in the same conversation.',
  'Title IX': 'A United States federal civil-rights law prohibiting sex discrimination in education programs receiving federal funding.',
  'alleged assault': 'An attack reported or claimed to have happened but not yet established as fact.',
  'news outlet': 'An organization that reports and publishes news.',
};
for (const item of course.vocab.filter(item => item.definition.startsWith('Podcast-context meaning:'))) {
  const value = contextualDefinitions[item.word];
  if (!value) continue;
  item.definition = value;
  item.definition_source = 'Podlingora contextual editorial pass';
  item.definition_status = 'context_matched_requires_final_proofreading';
  definitionsFilled += 1;
}

const unresolved = course.vocab.filter(item => !item.ipa).map(item => ({ unit: item.unit + 1, page: item.source_page, word: item.word, lookup_status: lookups[item.word]?.status ?? 'not_requested' }));
const report = {
  generated_at: new Date().toISOString(),
  sources: ['https://dictionaryapi.dev/', CMU_URL, WIKTIONARY_API],
  source_note: 'Keyless Free Dictionary API is preferred. Missing entries fall back to CMUdict US pronunciations converted from ARPABET to broad IPA, then Wiktionary-derived IPA. Imported phonetics remain externally sourced and require editorial review.',
  requested: pending.length,
  filled,
  remaining: unresolved.length,
  definition_requested: definitionPending.length,
  definition_filled: definitionsFilled,
  definition_remaining: course.vocab.filter(item => item.definition.startsWith('Podcast-context meaning:')).length,
  unresolved,
  lookups,
  definitions,
};
unresolvedReport.missing_ipa = unresolved;
unresolvedReport.externally_sourced_ipa_requiring_review = course.vocab
  .filter(item => item.ipa_status?.includes('unreviewed'))
  .map(item => ({ unit: item.unit + 1, page: item.source_page, word: item.word, ipa: item.ipa, source: item.ipa_source, status: item.ipa_status }));
expansionReport.unresolved_counts.missing_ipa = unresolved.length;
expansionReport.unresolved_counts.externally_sourced_ipa_requiring_review = unresolvedReport.externally_sourced_ipa_requiring_review.length;
unresolvedReport.missing_english_definition = course.vocab
  .filter(item => item.definition.startsWith('Podcast-context meaning:'))
  .map(item => ({ unit: item.unit + 1, page: item.source_page, word: item.word }));
unresolvedReport.externally_sourced_definition_requiring_review = course.vocab
  .filter(item => item.definition_status === 'external_dictionary_unreviewed')
  .map(item => ({ unit: item.unit + 1, page: item.source_page, word: item.word, definition: item.definition, source: item.definition_source }));
expansionReport.unresolved_counts.missing_english_definition = unresolvedReport.missing_english_definition.length;
expansionReport.unresolved_counts.externally_sourced_definition_requiring_review = unresolvedReport.externally_sourced_definition_requiring_review.length;
expansionReport.note = 'Source excerpts are transcript-grounded. No sentence-level clip objects were generated because verified timestamps are absent. IPA and English-definition gaps are filled with attributed external/editorial data but remain flagged where final contextual review is required.';

await Promise.all([
  writeFile(coursePath, `${JSON.stringify(course, null, 2)}\n`),
  writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`),
  writeFile(unresolvedPath, `${JSON.stringify(unresolvedReport, null, 2)}\n`),
  writeFile(expansionPath, `${JSON.stringify(expansionReport, null, 2)}\n`),
]);
console.log(JSON.stringify({ requested: pending.length, filled, remaining: unresolved.length }, null, 2));
