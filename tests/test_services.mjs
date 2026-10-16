import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { ACTIONS, PROTOCOL, VERSION, request, validPodcastId, validResponse } from '../app/services/protocol.js';
import { loadCourse } from '../app/services/course-loader.js';
import { TtsService } from '../app/services/tts.js';
import { auditCourse, normalizeWord } from '../scripts/audit_vocab.mjs';
import { buildPrompt, feedbackSchema, validateFeedbackInput, validateGeminiFeedback } from '../worker/src/core.js';
import { callGemini } from '../worker/src/index.js';

test('podcast IDs accept the ListenLeap ID and reject URL injection', () => {
  assert.equal(validPodcastId('8b77ac948ba43d5d084d03e194ce7ecb'), true);
  assert.equal(validPodcastId('../course'), false);
  assert.equal(validPodcastId(''), false);
});

test('protocol requests are versioned and action allowlisted', () => {
  const value = request('AUDIO_GET_STATE', 'abc_123');
  assert.equal(value.protocol, PROTOCOL); assert.equal(value.version, VERSION);
  assert.equal(ACTIONS.has(value.action), true);
  assert.throws(() => request('EVAL', 'abc_123'));
});

test('responses must match request ID and protocol version', () => {
  const value = { protocol: PROTOCOL, version: VERSION, type: 'RESPONSE', requestId: '1', success: true };
  assert.equal(validResponse(value, '1'), true);
  assert.equal(validResponse({ ...value, version: 2 }, '1'), false);
  assert.equal(validResponse(value, '2'), false);
});

test('unknown course is an explicit null and never a Cornell fallback', async () => {
  globalThis.fetch = async url => {
    assert.match(url.pathname, /\/courses\/unknown-podcast\.json$/);
    return { status: 404, ok: false };
  };
  assert.equal(await loadCourse('unknown-podcast'), null);
});

test('course loader rejects a mismatched podcast ID', async () => {
  globalThis.fetch = async () => ({ status: 200, ok: true, json: async () => ({ meta: { episodeId: 'wrong' }, units: [], vocab: [], expressions: [], patterns: [] }) });
  await assert.rejects(loadCourse('expected'));
});

test('extension bridge enforces origins, verified ranges, and event-driven stopping', async () => {
  const source = await readFile(new URL('../extensions/shared/content.js', import.meta.url), 'utf8');
  assert.match(source, /event\.origin !== APP_ORIGIN/);
  assert.match(source, /event\.source !== frame\.contentWindow/);
  assert.match(source, /payload\.verified !== true/);
  assert.match(source, /addEventListener\('timeupdate'/);
  assert.doesNotMatch(source, /postMessage\([^\n]+,\s*['"]\*['"]/);
  assert.match(source, /\.drag\{[^}]*width:44px/);
  assert.match(source, /onpointercancel = finishDrag/);
  assert.match(source, /pointer !== undefined/);
});

test('vocabulary normalization catches case, spacing, quote, and dash variants', () => {
  assert.equal(normalizeWord('  Follow‑Up   Questions '), 'follow-up questions');
  assert.equal(normalizeWord('Student’s'), "student's");
});

test('all course vocabulary is unique within each unit and complete', async () => {
  const courseNames = ['742756737294be4c3bb4d89828b45d9f', '8b77ac948ba43d5d084d03e194ce7ecb'];
  for (const name of courseNames) {
    const course = JSON.parse(await readFile(new URL(`../courses/${name}.json`, import.meta.url), 'utf8'));
    const audit = auditCourse(course);
    assert.equal(audit.duplicateRows, 0, `${name} has duplicate vocabulary`);
    for (const field of ['cn', 'definition', 'example', 'tip']) assert.equal(audit.missing[field], 0, `${name} has missing ${field}`);
  }
});

test('Cornell 7 has eleven units, IPA for every word, no exact clips, and no technical tips', async () => {
  const course = JSON.parse(await readFile(new URL('../courses/8b77ac948ba43d5d084d03e194ce7ecb.json', import.meta.url), 'utf8'));
  const audit = auditCourse(course);
  assert.equal(course.units.length, 11);
  assert.equal(audit.missing.ipa, 0);
  assert.equal(audit.missing.example_cn, 0);
  assert.equal(audit.technicalTips, 0);
  assert.equal(course.vocab.some(item => item.clip), false);
});

test('compact vocabulary UI hides optional details and keeps exact audio verified', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('../app/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app/app.js', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(html + app, /Practice example \(adapted\)|Adapted practice example|Approximate item times/);
  assert.doesNotMatch(html, /class="answer-label">Example|Teaching examples may be adapted/);
  assert.match(html, /id="vOriginal" class="hidden"/);
  assert.match(app, /Original'\)\.classList\.toggle\('hidden', !clip\)/);
  assert.match(html, /id="vMeaningPanel" class="meaning-panel hidden"/);
  assert.match(html, /id="vMemory" class="memory memory-panel hidden"/);
  assert.match(html, /class="study-actions"[\s\S]*id="vPrev"[\s\S]*id="vKnown"[\s\S]*id="vReveal"[\s\S]*id="vAgain"[\s\S]*id="vNext"/);
  assert.match(app, /revealV = revealMemory = false/);
});

test('compact speaking practice shows only situation, sentence, and essential actions', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('../app/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app/app.js', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(html + app, /Expressions used around this part|Learn the pattern|Expression goal:|Use starter:|Pattern example:|参考答案（不是唯一答案）|使用前请登录/);
  assert.match(app, /daily: 'Daily life', social: 'Friends', work: 'Work'/);
  assert.match(app, /createElement\('input'\); input\.type = 'text'/);
  assert.match(app, /className = 'input speaking-input'/);
  assert.doesNotMatch(app, /createElement\('textarea'\).*speaking/i);
});

test('speaking pattern summaries keep wrapped titles and chevrons on one row', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('../app/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app/app.js', import.meta.url), 'utf8'),
  ]);
  assert.match(html, /\.pattern-summary\s*{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*space-between/s);
  assert.match(html, /\.pattern-summary h3\s*{[^}]*flex:\s*1 1 auto;[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(html, /\.pattern-chevron\s*{[^}]*flex:\s*0 0 28px/s);
  assert.match(html, /details\.patternbox\[open\][^{]*\.pattern-chevron \.icon/);
  assert.match(app, /summary\.className = 'pattern-summary'/);
  assert.match(app, /chevron\.className = 'pattern-chevron'/);
  assert.match(app, /summary\.append\(heading, chevron\)/);
});

test('speaking scenario controls stay compact without visible helper headings', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('../app/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app/app.js', import.meta.url), 'utf8'),
  ]);
  assert.match(html, /\.scenario-controls\s*{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(0, 3fr\) minmax\(104px, 2fr\)/s);
  assert.match(app, /scenarioControls\.append\(scenarioSelect, exampleToggle\)/);
  assert.match(app, /exampleToggle\.textContent = expanded \? 'Hide example' : 'Show example'/);
  assert.match(app, /referenceText\.className = 'reference-sentence hidden'/);
  assert.match(app, /input\.placeholder = 'Your English sentence…'/);
  assert.doesNotMatch(app, /scenarioLabel|referenceTitle|label\.textContent = 'Your English sentence'/);
  assert.match(app, /content\.append\(cn, scenarioControls, scene, referenceText, input, actions, result\)/);
});

test('vocabulary and expression previews share one non-wrapping five-action bar', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('../app/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app/app.js', import.meta.url), 'utf8'),
  ]);
  assert.match(html, /\.study-actions\s*{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\);[^}]*width:\s*100%/s);
  assert.match(html, /class="study-actions" aria-label="Expression controls"[\s\S]*id="ePrev"[^>]*><\/button[\s\S]*id="eKnown"[^>]*><\/button[\s\S]*id="eReveal"[^>]*>Meaning<\/[\s\S]*id="eAgain"[^>]*><\/button[\s\S]*id="eNext"[^>]*><\//);
  assert.doesNotMatch(html, />← Previous<|>Next →<|>Need review<|>✓ I know this</);
  for (const id of ['ePrev', 'eKnown', 'eAgain', 'eNext']) {
    assert.match(html, new RegExp(`id="${id}"[^>]*aria-label="[^"]+"[^>]*title="[^"]+"`));
  }
  assert.match(app, /vAgain: 'star'.*eAgain: 'star'/s);
  assert.doesNotMatch(app, /Again'\)\.textContent/);
});

test('controls use reusable rounded inline SVG icons without external assets', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('../app/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app/app.js', import.meta.url), 'utf8'),
  ]);
  assert.match(html, /\.icon\s*{[^}]*stroke-width:\s*2;[^}]*stroke-linecap:\s*round;[^}]*stroke-linejoin:\s*round/s);
  assert.match(app, /const ICONS = \{/);
  assert.match(app, /document\.createElementNS\(SVG_NS, 'svg'\)/);
  for (const name of ['chevronLeft', 'chevronRight', 'chevronDown', 'check', 'star', 'volume2', 'play', 'pause', 'refreshCw']) assert.match(app, new RegExp(`${name}:`));
  assert.match(html, /\.rating-selected\.review \.icon-star\s*{\s*fill:\s*currentColor/);
  assert.doesNotMatch(html + app, /unpkg|jsdelivr|lucide\.min|icon-font/);
});

test('TTS cancels prior speech and uses the selected English voice and rate', async () => {
  const selected = { name: 'English UK', lang: 'en-GB' };
  let canceled = 0;
  let spoken;
  globalThis.window = {
    SpeechSynthesisUtterance: class {},
    speechSynthesis: {
      getVoices: () => [selected, { name: '中文', lang: 'zh-CN' }],
      cancel: () => canceled++,
      speak: utterance => { spoken = utterance; queueMicrotask(() => utterance.onend()); },
    },
  };
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  const service = new TtsService();
  await service.speak('Natural English example.', selected.name, .8);
  assert.equal(canceled, 1);
  assert.equal(spoken.text, 'Natural English example.');
  assert.equal(spoken.voice, selected);
  assert.equal(spoken.lang, 'en-GB');
  assert.equal(spoken.rate, .8);
  delete globalThis.window;
  delete globalThis.SpeechSynthesisUtterance;
});

test('every speaking pattern has complete daily, social, and work guided scenarios', async () => {
  const courseNames = ['742756737294be4c3bb4d89828b45d9f', '8b77ac948ba43d5d084d03e194ce7ecb'];
  for (const name of courseNames) {
    const course = JSON.parse(await readFile(new URL(`../courses/${name}.json`, import.meta.url), 'utf8'));
    for (const patterns of course.patterns) for (const pattern of patterns) {
      assert.deepEqual(pattern.scenarios.map(item => item.type), ['daily', 'social', 'work']);
      for (const scenario of pattern.scenarios) {
        assert.ok(scenario.scene_zh.length >= 15);
        assert.ok(scenario.goal_en.length >= 5);
        assert.ok(scenario.keywords.length >= 2 && scenario.keywords.length <= 4);
        assert.ok(scenario.starter.length >= 2);
        assert.ok(scenario.reference_answer.length >= 10);
      }
    }
  }
});

test('AI feedback input has strict length limits and prompt does not treat reference as unique', () => {
  const input = validateFeedbackInput({ sentence: 'I could be wrong about the timing.', target_pattern: 'I could be wrong about …', scenario_zh: '和朋友讨论时间安排。', reference_answer: 'I could be wrong about the date.' });
  assert.match(buildPrompt(input), /不是唯一答案/);
  assert.throws(() => validateFeedbackInput({ ...input, sentence: 'x'.repeat(501) }), /500/);
  assert.throws(() => validateFeedbackInput({ ...input, sentence: '' }), /填写/);
});

test('Gemini feedback must match the required structured JSON contract', () => {
  const valid = {
    status: 'correct', grammar_feedback_zh: '语法正确。', pattern_usage_feedback_zh: '句式使用自然。',
    corrected_sentence: 'I could be wrong about the timing.', natural_alternative: 'I may be mistaken about the timing.', brief_explanation_zh: '表达自然，无需修改。',
  };
  assert.deepEqual(validateGeminiFeedback(valid), valid);
  assert.throws(() => validateGeminiFeedback({ ...valid, status: 'maybe' }), /状态/);
  assert.deepEqual(feedbackSchema().required, Object.keys(valid));
});

test('AI frontend never contains a Gemini key and keeps feedback history local', async () => {
  const [app, client, worker] = await Promise.all([
    readFile(new URL('../app/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../app/services/speaking-feedback.js', import.meta.url), 'utf8'),
    readFile(new URL('../worker/src/index.js', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(app + client, /GEMINI_API_KEY|generativelanguage\.googleapis\.com/);
  assert.match(app, /speakingHistory/);
  assert.match(worker, /env\.GEMINI_API_KEY/);
  assert.match(worker, /verifySession/);
});

test('Gemini 503 responses retry three times without changing models', async () => {
  const input = { sentence: 'It is not worth the risk.', target_pattern: 'It is not worth the risk', scenario_zh: '解释风险。', reference_answer: 'It is not worth the risk.' };
  let calls = 0; const waits = [];
  const fetcher = async url => {
    calls += 1; assert.match(url, /gemini-3\.8-flash:generateContent$/);
    return { ok: false, status: 503, text: async () => 'UNAVAILABLE', body: { cancel: async () => {} } };
  };
  await assert.rejects(callGemini(input, { GEMINI_API_KEY: 'test-only', GEMINI_MODEL: 'gemini-3.8-flash' }, fetcher, async ms => waits.push(ms)), /重试 3 次/);
  assert.equal(calls, 3);
  assert.equal(waits.length, 2);
});

test('Podlingora editorial UI keeps accessible responsive learning controls', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('../app/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app/app.js', import.meta.url), 'utf8'),
  ]);
  assert.match(html, /PODLINGORA · GUIDED PODCAST ENGLISH/);
  assert.match(html, /--ivory:\s*#f7f9f6/);
  assert.match(html, /--clay:\s*#1c6444/);
  assert.match(html, /h1, h2, h3\s*{[^}]*font-family:\s*var\(--sans\)/s);
  assert.match(html, /\.target\s*{[^}]*font-family:\s*var\(--sans\)[^}]*font-weight:\s*800/s);
  assert.doesNotMatch(html, /var\(--serif\)/);
  assert.match(html, /@media \(pointer: coarse\)/);
  assert.match(html, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(html, /role="progressbar"/);
  assert.match(app, /aria-valuenow/);
  assert.match(html, /id="retryCourse"/);
  assert.match(html, /role="status"/);
  assert.match(app, /aria-expanded/);
  assert.match(app, /aria-current/);
  assert.match(app, /aria-busy/);
  assert.match(app, /scaleX/);
});
