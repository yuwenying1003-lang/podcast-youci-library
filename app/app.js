import { AudioClient } from './services/audio-client.js';
import { loadCourse } from './services/course-loader.js';
import { ProgressStore } from './services/progress.js';
import { TtsService } from './services/tts.js';
import { SpeakingFeedbackClient } from './services/speaking-feedback.js';
import { validPodcastId } from './services/protocol.js';
import { AI_API_URL } from './config.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const podcastId = params.get('podcastId') || params.get('episode') || '';
const audio = validPodcastId(podcastId) ? new AudioClient(podcastId) : null;
const progressStore = validPodcastId(podcastId) ? new ProgressStore(podcastId) : null;
const tts = new TtsService();
const feedbackClient = new SpeakingFeedbackClient(AI_API_URL);
let course, unit = 0, vocab = [], expressions = [], vi = 0, ei = 0, revealV = false, revealE = false, revealMemory = false;
let progress = progressStore?.load() || {};
let controller;

const seconds = value => String(value).split(':').reduce((total, part) => total * 60 + Number(part), 0);
const save = () => { progress.unit = unit; progressStore?.save(progress); };
const lesson = () => (progress.lessons ??= {}, progress.lessons[unit] ??= {});
const status = message => { $('audioStatus').textContent = message; };
const syncAiAuth = (message = '') => {
  const signedIn = feedbackClient.signedIn();
  $('aiLogin').hidden = signedIn;
  $('aiLogout').hidden = !signedIn;
  $('aiAuthStatus').textContent = message;
};
const courseStatus = (message, state = 'ready', retry = false) => {
  $('courseNotice').dataset.state = state;
  $('courseNoticeText').textContent = message;
  $('courseNotice').querySelector('.course-state-spinner').classList.toggle('hidden', state !== 'loading');
  $('retryCourse').classList.toggle('hidden', !retry);
};

const speak = async text => {
  try {
    $('voiceStatus').textContent = 'Speaking…';
    await tts.speak(text, $('voiceSelect').value, Number($('ttsRate').value));
    $('voiceStatus').textContent = 'Ready.';
  } catch (error) {
    if (error.message !== 'Speech was stopped.') $('voiceStatus').textContent = error.message;
  }
};

function verifiedClip(item) {
  const clip = item?.clip;
  if (!clip || clip.verified !== true || typeof clip.quote !== 'string' || !clip.quote.trim()) return null;
  const start = seconds(clip.start), end = seconds(clip.end);
  return Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start && end - start <= 90 ? { start, end, verified: true } : null;
}

async function command(action, payload = {}) {
  try { const state = await audio.send(action, payload); status(state.message || 'Audio command completed.'); }
  catch (error) { status(error.message); }
}

function selectItems() {
  const current = course.units[unit], start = seconds(current.start), end = seconds(current.end);
  vocab = course.vocab.filter(item => item.unit === unit || (item.unit === undefined && seconds(item.time) >= start && seconds(item.time) < end));
  expressions = course.expressions.filter(item => seconds(item.time) >= start && seconds(item.time) < end);
}

function renderCard(kind) {
  const isVocab = kind === 'v', items = isVocab ? vocab : expressions, index = isVocab ? vi : ei;
  const revealed = isVocab ? revealV : revealE, prefix = isVocab ? 'v' : 'e', item = items[index];
  $(prefix + 'Pos').textContent = `${item ? index + 1 : 0} / ${items.length}`;
  $(prefix + (isVocab ? 'Word' : 'Text')).textContent = item ? (isVocab ? item.word : item.text) : `No ${isVocab ? 'vocabulary' : 'phrases'} in this unit`;
  for (const suffix of ['Say', 'Sentence', 'Reveal', 'Prev', 'Next', 'Again', 'Known']) $(prefix + suffix).disabled = !item;
  if (isVocab) $('vMemoryToggle').disabled = !item;
  $(prefix + 'Reveal').setAttribute('aria-expanded', String(Boolean(item && revealed)));
  $(prefix + 'Card')?.classList.toggle('empty', !item);
  if (!item) { $(prefix + 'Original').classList.add('hidden'); $(prefix + 'Answer').classList.add('hidden'); return; }
  const clip = verifiedClip(item);
  $(prefix + 'Original').classList.toggle('hidden', !clip);
  $(prefix + 'Original').disabled = false;
  $(prefix + 'Original').title = clip ? 'Play verified sentence range' : '';
  $(prefix + 'Answer').classList.toggle('hidden', !isVocab && !revealed);
  $(prefix + 'Reveal').textContent = revealed ? 'Hide' : 'Meaning';
  $(prefix + 'Reveal').setAttribute('aria-label', revealed ? 'Hide Chinese meaning' : 'Show Chinese meaning');
  $(prefix + 'Reveal').title = revealed ? 'Hide Chinese meaning' : 'Show Chinese meaning';
  $(prefix + 'Chinese').textContent = item.cn || '';
  $(prefix + 'Meaning').textContent = item.definition || '';
  $(prefix + 'Example').textContent = item.example || '';
  if (isVocab) {
    $('vIpa').textContent = item.ipa || '';
    $('vExampleCn').textContent = item.example_cn || '';
    $('vMeaningPanel').classList.toggle('hidden', !revealed);
    $('vExampleCn').classList.toggle('hidden', !revealed || !item.example_cn);
    $('vTip').textContent = item.tip || '';
    $('vMemory').classList.toggle('hidden', !revealMemory);
    $('vMemoryToggle').textContent = revealMemory ? 'Hide Memory Tip' : 'Memory Tip';
    $('vMemoryToggle').setAttribute('aria-expanded', String(revealMemory));
  }
  const ratingKey = isVocab ? item.word : item.text;
  const rating = progress.ratings?.[ratingKey];
  $(prefix + 'Known').classList.toggle('rating-selected', rating === true);
  $(prefix + 'Again').classList.toggle('rating-selected', rating === false);
  $(prefix + 'Again').classList.toggle('review', rating === false);
  $(prefix + 'Again').textContent = rating === false ? '★' : '☆';
  $(prefix + 'Again').title = rating === false ? `Marked ${isVocab ? 'word' : 'expression'} for review` : `Review this ${isVocab ? 'word' : 'expression'}`;
  $(prefix + 'Known').setAttribute('aria-pressed', String(rating === true));
  $(prefix + 'Again').setAttribute('aria-pressed', String(rating === false));
}

function renderPatterns() {
  $('patternList').replaceChildren(...(course.patterns[unit] || []).map((pattern, index) => {
    const box = document.createElement('details'); box.className = 'patternbox'; box.open = index === 0;
    box.addEventListener('toggle', () => {
      if (!box.open) return;
      for (const other of document.querySelectorAll('#patternList > details.patternbox')) if (other !== box) other.open = false;
    });
    const summary = document.createElement('summary'); summary.className = 'pattern-summary';
    const heading = document.createElement('h3'); heading.textContent = `${index + 1}. ${pattern.text}`;
    const chevron = document.createElement('span'); chevron.className = 'pattern-chevron'; chevron.setAttribute('aria-hidden', 'true');
    summary.append(heading, chevron);
    const content = document.createElement('div'); content.className = 'pattern-content';
    const cn = document.createElement('div'); cn.className = 'recognition'; cn.textContent = pattern.cn;
    const scenarios = pattern.scenarios || [
      { type: 'daily', label: 'Daily life', scene_zh: `谈谈最近的一次日常经历，并自然使用“${pattern.cn}”。`, reference_answer: pattern.example },
      { type: 'social', label: 'Friends', scene_zh: `向朋友讲述一个相关见闻，并自然使用“${pattern.cn}”。`, reference_answer: pattern.example },
      { type: 'work', label: 'Work', scene_zh: `向同事说明一个项目情况，并自然使用“${pattern.cn}”。`, reference_answer: pattern.example },
    ];
    const stored = (lesson().patterns || {})[index];
    const state = typeof stored === 'string' ? { sentence: stored, scenario: 0 } : (stored || { sentence: '', scenario: 0 });
    const scenarioSelect = document.createElement('select'); scenarioSelect.className = 'input'; scenarioSelect.setAttribute('aria-label', 'Choose a situation');
    scenarioSelect.replaceChildren(...scenarios.map((item, scenarioIndex) => {
      const option = document.createElement('option'); option.value = scenarioIndex; option.textContent = ({ daily: 'Daily life', social: 'Friends', work: 'Work' })[item.type] || ['Daily life', 'Friends', 'Work'][scenarioIndex] || item.type; return option;
    }));
    scenarioSelect.value = String(Math.min(state.scenario || 0, scenarios.length - 1));
    const scenarioControls = document.createElement('div'); scenarioControls.className = 'scenario-controls';
    const exampleToggle = document.createElement('button'); exampleToggle.type = 'button'; exampleToggle.className = 'example-toggle'; exampleToggle.textContent = 'Show example'; exampleToggle.setAttribute('aria-expanded', 'false');
    const scene = document.createElement('div'); scene.className = 'scenario';
    const referenceText = document.createElement('p'); referenceText.className = 'reference-sentence hidden';
    exampleToggle.onclick = () => {
      const expanded = exampleToggle.getAttribute('aria-expanded') !== 'true';
      exampleToggle.setAttribute('aria-expanded', String(expanded));
      exampleToggle.textContent = expanded ? 'Hide example' : 'Show example';
      referenceText.classList.toggle('hidden', !expanded);
    };
    scenarioControls.append(scenarioSelect, exampleToggle);
    const updateScenario = () => {
      const selected = scenarios[Number(scenarioSelect.value)] || scenarios[0];
      scene.textContent = String(selected.scene_zh || '').replace(/[：:]\s*请用[\s\S]*$/, '').replace(/，并自然使用[\s\S]*$/, '。');
      referenceText.textContent = selected.reference_answer;
      state.scenario = Number(scenarioSelect.value);
      (lesson().patterns ??= {})[index] = state; save();
    };
    scenarioSelect.addEventListener('change', updateScenario); updateScenario();
    const input = document.createElement('input'); input.type = 'text'; input.className = 'input speaking-input'; input.maxLength = 500; input.placeholder = 'Your English sentence…'; input.setAttribute('aria-label', 'Your English sentence'); input.value = state.sentence || '';
    input.addEventListener('input', () => { state.sentence = input.value; (lesson().patterns ??= {})[index] = state; save(); });
    const actions = document.createElement('div'); actions.className = 'tools';
    const another = document.createElement('button'); another.type = 'button'; another.textContent = 'Another Scenario';
    another.onclick = () => { scenarioSelect.value = String((Number(scenarioSelect.value) + 1) % scenarios.length); updateScenario(); };
    const check = document.createElement('button'); check.className = 'primary'; check.textContent = 'Check My Sentence';
    const result = document.createElement('div'); result.className = 'ai-result hidden'; result.setAttribute('role', 'status'); result.setAttribute('aria-live', 'polite');
    const showFeedback = feedback => {
      result.replaceChildren(); result.className = 'ai-result'; result.removeAttribute('aria-busy');
      const title = document.createElement('strong'); title.textContent = ({ correct: '✓ 表达自然正确', needs_improvement: '△ 可以改进', incorrect: '× 需要修改' })[feedback.status] || 'AI Feedback';
      result.dataset.status = feedback.status;
      for (const [name, value] of [
        ['原因', feedback.brief_explanation_zh], ['修正后的自然英文', feedback.corrected_sentence], ['更口语化的表达', feedback.natural_alternative],
      ]) {
        const row = document.createElement('p'); const bold = document.createElement('b'); bold.textContent = `${name}：`; row.append(bold, document.createTextNode(value)); result.append(row);
      }
      const tips = document.createElement('ul'); tips.className = 'feedback-tips';
      for (const value of [feedback.grammar_feedback_zh, feedback.pattern_usage_feedback_zh].filter(Boolean).slice(0, 2)) { const item = document.createElement('li'); item.textContent = value; tips.append(item); }
      if (tips.childElementCount) { const tipTitle = document.createElement('b'); tipTitle.textContent = '重点建议（最多两条）：'; result.append(tipTitle, tips); }
      const audioTools = document.createElement('div'); audioTools.className = 'tools';
      for (const [text, value] of [['🔊 修改后句子', feedback.corrected_sentence], ['🔊 自然表达', feedback.natural_alternative]]) {
        const button = document.createElement('button'); button.textContent = text; button.onclick = () => speak(value); audioTools.append(button);
      }
      result.prepend(title); result.append(audioTools);
    };
    check.onclick = async () => {
      const selected = scenarios[Number(scenarioSelect.value)] || scenarios[0];
      if (!input.value.trim()) { result.textContent = '请先填写英文句子。'; result.className = 'ai-result error'; input.focus(); return; }
      check.disabled = true; check.textContent = 'Checking…'; result.textContent = '正在进行真实 AI 评价…'; result.className = 'ai-result pending'; result.setAttribute('aria-busy', 'true');
      try {
        const feedback = await feedbackClient.check({ sentence: input.value, target_pattern: pattern.text, scenario_zh: selected.scene_zh, reference_answer: selected.reference_answer });
        showFeedback(feedback);
        const history = (lesson().speakingHistory ??= []);
        history.unshift({ pattern: pattern.text, scenario: selected.type, sentence: input.value.trim(), feedback, checkedAt: new Date().toISOString() });
        if (history.length > 50) history.length = 50; save();
        $('aiAuthStatus').textContent = `已登录 · 今日还可检查 ${feedback.remaining} 次`;
      } catch (error) { result.textContent = error.message; result.className = 'ai-result error'; result.removeAttribute('aria-busy'); if (!feedbackClient.signedIn()) $('aiAuthStatus').textContent = '尚未登录'; }
      finally { check.disabled = false; check.textContent = 'Check My Sentence'; }
    };
    actions.append(check, another);
    const previous = (lesson().speakingHistory || []).find(item => item.pattern === pattern.text);
    content.append(cn, scenarioControls, scene, referenceText, input, actions, result);
    if (previous?.feedback) { const historyNote = document.createElement('details'); const historySummary = document.createElement('summary'); historySummary.textContent = '最近一次 AI Feedback'; const body = document.createElement('p'); body.textContent = `${previous.sentence} — ${previous.feedback.brief_explanation_zh}`; historyNote.append(historySummary, body); content.append(historyNote); }
    box.append(summary, content);
    return box;
  }));
}

function render() {
  selectItems(); vi = ei = 0; revealV = revealE = revealMemory = false;
  $('tabs').replaceChildren(...course.units.map((item, index) => {
    const button = document.createElement('button'); button.textContent = String(index + 1).padStart(2, '0'); button.title = item.title;
    button.classList.toggle('selected', index === unit); button.classList.toggle('completed', Boolean(progress.lessons?.[index]?.done));
    if (index === unit) button.setAttribute('aria-current', 'step');
    button.setAttribute('aria-label', `Unit ${index + 1}: ${item.title}${progress.lessons?.[index]?.done ? ', completed' : ''}`);
    button.onclick = () => { unit = index; save(); render(); scrollTo(0, 0); }; return button;
  }));
  requestAnimationFrame(() => $('tabs').querySelector('[aria-current="step"]')?.scrollIntoView({ block: 'nearest', inline: 'center' }));
  const current = course.units[unit];
  $('unitTitle').textContent = current.title; $('preview').textContent = current.preview;
  $('activeLabel').textContent = `UNIT ${String(unit + 1).padStart(2, '0')} / ${course.units.length}`;
  $('unitTime').textContent = `${current.start} – ${current.end}`; $('wordCount').textContent = `${vocab.length} vocabulary words`; $('exprCount').textContent = `${expressions.length} expressions`;
  renderCard('v'); renderCard('e'); renderPatterns(); $('question').textContent = current.question;
  const state = lesson(); $('ready').checked = !!state.listened; $('postlisten').classList.toggle('hidden', !state.listened);
  $('notes').value = state.notes || ''; $('sentence').value = state.sentence || '';
  $('speakingPrompt').textContent = expressions.length ? `Try using “${expressions[0].text}” in your own context.` : 'Describe this unit in English.';
  const completed = Object.values(progress.lessons || {}).filter(item => item.done).length;
  $('progressSummary').textContent = `${completed} of ${course.units.length} units completed. Saved for this podcast in this browser.`;
  const percent = course.units.length ? Math.round(completed / course.units.length * 100) : 0;
  $('progressFill').style.transform = `scaleX(${percent / 100})`;
  $('progressFill').parentElement.setAttribute('aria-valuenow', String(percent));
}

function setupControls() {
  for (const kind of ['v', 'e']) {
    $(kind + 'Prev').onclick = () => { if (kind === 'v' && vocab.length) { vi = (vi - 1 + vocab.length) % vocab.length; revealV = revealMemory = false; } if (kind === 'e' && expressions.length) { ei = (ei - 1 + expressions.length) % expressions.length; revealE = false; } renderCard(kind); };
    $(kind + 'Next').onclick = () => { if (kind === 'v' && vocab.length) { vi = (vi + 1) % vocab.length; revealV = revealMemory = false; } if (kind === 'e' && expressions.length) { ei = (ei + 1) % expressions.length; revealE = false; } renderCard(kind); };
    $(kind + 'Reveal').onclick = () => { if (kind === 'v') revealV = !revealV; else revealE = !revealE; renderCard(kind); };
    $(kind + 'Say').onclick = () => { const item = kind === 'v' ? vocab[vi] : expressions[ei]; if (item) speak(kind === 'v' ? item.word : item.text); };
    $(kind + 'Sentence').onclick = () => { const item = kind === 'v' ? vocab[vi] : expressions[ei]; if (item) speak(item.example || (kind === 'v' ? item.word : item.text)); };
    $(kind + 'Original').onclick = () => { const item = kind === 'v' ? vocab[vi] : expressions[ei], clip = verifiedClip(item); if (!clip) return status('Exact original audio not yet available.'); command('AUDIO_PLAY_RANGE', clip); };
    $(kind + 'Again').onclick = () => { const item = kind === 'v' ? vocab[vi] : expressions[ei]; if (item) { (progress.ratings ??= {})[kind === 'v' ? item.word : item.text] = false; save(); renderCard(kind); } };
    $(kind + 'Known').onclick = () => { const item = kind === 'v' ? vocab[vi] : expressions[ei]; if (item) { (progress.ratings ??= {})[kind === 'v' ? item.word : item.text] = true; save(); renderCard(kind); } };
  }
  $('vMemoryToggle').onclick = () => { revealMemory = !revealMemory; renderCard('v'); };
  $('listenButton').onclick = () => { const current = course.units[unit]; command('AUDIO_PLAY_UNIT', { start: seconds(current.start), end: seconds(current.end) }); };
  $('pauseButton').onclick = async () => {
    try { const current = await audio.send('AUDIO_GET_STATE'); await command(current.paused ? 'AUDIO_PLAY' : 'AUDIO_PAUSE'); }
    catch (error) { status(error.message); }
  };
  $('loopButton').onclick = () => command('AUDIO_CLEAR_RANGE');
  $('rate').onchange = event => command('AUDIO_SET_RATE', { rate: Number(event.target.value) });
  $('ready').onchange = event => { lesson().listened = event.target.checked; save(); $('postlisten').classList.toggle('hidden', !event.target.checked); };
  $('saveUnit').onclick = () => { Object.assign(lesson(), { listened: true, done: true, notes: $('notes').value, sentence: $('sentence').value }); save(); render(); };
  $('nextUnit').onclick = () => { unit = (unit + 1) % course.units.length; save(); render(); scrollTo(0, 0); };
  $('export').onclick = () => { const blob = new Blob([JSON.stringify({ format: 'podcast-youci-progress-v3', podcastId, progress }, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `podcast-youci-${podcastId}-progress.json`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); };
  $('ttsRate').oninput = event => { $('ttsRateLabel').textContent = `${Number(event.target.value).toFixed(2)}×`; localStorage.setItem('youci-tts-rate', event.target.value); };
  $('aiLogin').onclick = async () => {
    $('aiAuthStatus').textContent = '正在登录…';
    try { await feedbackClient.signIn(); syncAiAuth('AI Feedback ready.'); }
    catch (error) { syncAiAuth(error.message); }
  };
  $('aiLogout').onclick = () => { feedbackClient.signOut(); syncAiAuth(); };
  syncAiAuth();
}

function loadVoices() {
  const voices = tts.voices(), select = $('voiceSelect'), selected = localStorage.getItem('youci-voice-name') || '';
  select.replaceChildren(...voices.map(voice => { const option = document.createElement('option'); option.value = voice.name; option.textContent = `${voice.name} · ${voice.lang}`; return option; }));
  const preferred = voices.find(voice => voice.name === selected) || voices.find(voice => /^en-US$/i.test(voice.lang)) || voices.find(voice => /^en-GB$/i.test(voice.lang)) || voices[0];
  if (preferred) select.value = preferred.name;
  select.disabled = !voices.length;
  $('voiceStatus').textContent = !tts.supported() ? 'English speech is unavailable in this browser.' : voices.length ? `${voices.length} English voices available. US and UK voices are supported.` : 'No English voice is available. Install or enable an English system voice, then tap Refresh voices.';
}

async function start(refresh = false) {
  controller?.abort(); controller = new AbortController(); $('episodeId').textContent = podcastId || 'not found';
  if (!validPodcastId(podcastId)) { courseStatus('No valid podcast ID supplied. Open this app from a ListenLeap episode.', 'error'); document.querySelector('main').hidden = true; return; }
  courseStatus('Loading course…', 'loading');
  try {
    course = await loadCourse(podcastId, controller.signal, refresh);
    if (!course) { courseStatus('No course exists for this podcast yet.', 'empty', true); document.querySelector('main').hidden = true; return; }
    document.querySelector('main').hidden = false; unit = Math.min(Number.isInteger(progress.unit) ? progress.unit : 0, course.units.length - 1);
    courseStatus(`✓ ${course.meta.title} · ${course.units.length} units`);
    $('courseRevision').textContent = course.meta.revision || course.meta.verified || 'not specified';
    $('sourceLink').href = course.meta.sourceUrl || `https://app.listenleap.com/read?id=${encodeURIComponent(podcastId)}`;
    render();
  } catch (error) { if (error.name !== 'AbortError') { courseStatus(`Course load failed: ${error.message}`, 'error', true); document.querySelector('main').hidden = true; } }
}

setupControls();
const savedRate = Number(localStorage.getItem('youci-tts-rate'));
if (savedRate >= .7 && savedRate <= 1.15) $('ttsRate').value = String(savedRate);
$('ttsRateLabel').textContent = `${Number($('ttsRate').value).toFixed(2)}×`;
loadVoices(); if ('speechSynthesis' in window) speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
$('voiceSelect').onchange = event => localStorage.setItem('youci-voice-name', event.target.value);
$('refreshVoices').onclick = loadVoices; $('testVoice').onclick = async () => {
  try { await tts.speak('Podcast Youci voice test.', $('voiceSelect').value, Number($('ttsRate').value)); $('voiceStatus').textContent = 'Voice test complete.'; }
  catch (error) { if (error.message !== 'Speech was stopped.') $('voiceStatus').textContent = error.message; }
};
$('reloadCourse').onclick = () => start(true);
$('retryCourse').onclick = () => start(true);
start();
