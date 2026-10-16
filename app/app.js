import { AudioClient } from './services/audio-client.js';
import { loadCourse } from './services/course-loader.js';
import { ProgressStore } from './services/progress.js';
import { TtsService } from './services/tts.js';
import { validPodcastId } from './services/protocol.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const podcastId = params.get('podcastId') || params.get('episode') || '';
const audio = validPodcastId(podcastId) ? new AudioClient(podcastId) : null;
const progressStore = validPodcastId(podcastId) ? new ProgressStore(podcastId) : null;
const tts = new TtsService();
let course, unit = 0, vocab = [], expressions = [], vi = 0, ei = 0, revealV = false, revealE = false;
let progress = progressStore?.load() || {};
let controller;

const seconds = value => String(value).split(':').reduce((total, part) => total * 60 + Number(part), 0);
const save = () => { progress.unit = unit; progressStore?.save(progress); };
const lesson = () => (progress.lessons ??= {}, progress.lessons[unit] ??= {});
const status = message => { $('audioStatus').textContent = message; };

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
  for (const suffix of ['Say', 'Sentence', 'Reveal']) $(prefix + suffix).disabled = !item;
  if (!item) { $(prefix + 'Original').classList.add('hidden'); return; }
  const clip = verifiedClip(item);
  $(prefix + 'Original').classList.toggle('hidden', !clip);
  $(prefix + 'Original').disabled = false;
  $(prefix + 'Original').title = clip ? 'Play verified sentence range' : '';
  $(prefix + 'Answer').classList.toggle('hidden', !revealed);
  $(prefix + 'Reveal').textContent = revealed ? 'Hide meaning' : 'Reveal meaning';
  $(prefix + 'Chinese').textContent = item.cn || '';
  $(prefix + 'Meaning').textContent = item.definition || '';
  $(prefix + 'Example').textContent = item.example || '';
  if (isVocab) {
    $('vIpa').textContent = item.ipa || '';
    $('vExampleCn').textContent = item.example_cn || '';
    $('vExampleCn').classList.toggle('hidden', !item.example_cn);
    $('vTip').textContent = item.tip || '';
  }
}

function renderPatterns() {
  $('patternList').replaceChildren(...(course.patterns[unit] || []).map((pattern, index) => {
    const box = document.createElement('div'); box.className = 'patternbox';
    const heading = document.createElement('h3'); heading.textContent = `${index + 1}. ${pattern.text}`;
    const cn = document.createElement('div'); cn.className = 'recognition'; cn.textContent = pattern.cn;
    const example = document.createElement('div'); example.className = 'example'; example.textContent = `Adapted model: ${pattern.example}`;
    const label = document.createElement('label'); label.textContent = `Transfer task: ${pattern.prompt}`;
    const input = document.createElement('textarea'); input.placeholder = 'Write your own English sentence here…'; input.value = (lesson().patterns || {})[index] || '';
    input.addEventListener('input', () => { const state = lesson(); (state.patterns ??= {})[index] = input.value; save(); });
    box.append(heading, cn, example, label, input); return box;
  }));
}

function render() {
  selectItems(); vi = ei = 0; revealV = revealE = false;
  $('tabs').replaceChildren(...course.units.map((item, index) => {
    const button = document.createElement('button'); button.textContent = String(index + 1).padStart(2, '0'); button.title = item.title;
    button.className = index === unit ? 'selected' : ''; button.onclick = () => { unit = index; save(); render(); scrollTo(0, 0); }; return button;
  }));
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
}

function setupControls() {
  const speak = async text => {
    try {
      $('voiceStatus').textContent = 'Speaking…';
      await tts.speak(text, $('voiceSelect').value, Number($('ttsRate').value));
      $('voiceStatus').textContent = 'Ready.';
    } catch (error) {
      if (error.message !== 'Speech was stopped.') $('voiceStatus').textContent = error.message;
    }
  };
  for (const kind of ['v', 'e']) {
    $(kind + 'Prev').onclick = () => { if (kind === 'v' && vocab.length) vi = (vi - 1 + vocab.length) % vocab.length; if (kind === 'e' && expressions.length) ei = (ei - 1 + expressions.length) % expressions.length; renderCard(kind); };
    $(kind + 'Next').onclick = () => { if (kind === 'v' && vocab.length) vi = (vi + 1) % vocab.length; if (kind === 'e' && expressions.length) ei = (ei + 1) % expressions.length; renderCard(kind); };
    $(kind + 'Reveal').onclick = () => { if (kind === 'v') revealV = !revealV; else revealE = !revealE; renderCard(kind); };
    $(kind + 'Say').onclick = () => { const item = kind === 'v' ? vocab[vi] : expressions[ei]; if (item) speak(kind === 'v' ? item.word : item.text); };
    $(kind + 'Sentence').onclick = () => { const item = kind === 'v' ? vocab[vi] : expressions[ei]; if (item) speak(item.example || (kind === 'v' ? item.word : item.text)); };
    $(kind + 'Original').onclick = () => { const item = kind === 'v' ? vocab[vi] : expressions[ei], clip = verifiedClip(item); if (!clip) return status('Exact original audio not yet available.'); command('AUDIO_PLAY_RANGE', clip); };
    $(kind + 'Again').onclick = () => { const item = kind === 'v' ? vocab[vi] : expressions[ei]; if (item) { (progress.ratings ??= {})[kind === 'v' ? item.word : item.text] = false; save(); } };
    $(kind + 'Known').onclick = () => { const item = kind === 'v' ? vocab[vi] : expressions[ei]; if (item) { (progress.ratings ??= {})[kind === 'v' ? item.word : item.text] = true; save(); } };
  }
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
  if (!validPodcastId(podcastId)) { $('courseNotice').textContent = 'No valid podcast ID supplied. Open this app from a ListenLeap episode.'; document.querySelector('main').hidden = true; return; }
  $('courseNotice').textContent = 'Loading course…';
  try {
    course = await loadCourse(podcastId, controller.signal, refresh);
    if (!course) { $('courseNotice').textContent = 'No course exists for this podcast yet.'; document.querySelector('main').hidden = true; return; }
    document.querySelector('main').hidden = false; unit = Math.min(Number.isInteger(progress.unit) ? progress.unit : 0, course.units.length - 1);
    $('courseNotice').textContent = `✓ ${course.meta.title} · ${course.units.length} units`;
    $('courseRevision').textContent = course.meta.revision || course.meta.verified || 'not specified';
    $('sourceLink').href = course.meta.sourceUrl || `https://app.listenleap.com/read?id=${encodeURIComponent(podcastId)}`;
    render();
  } catch (error) { if (error.name !== 'AbortError') { $('courseNotice').textContent = `Course load failed: ${error.message}`; document.querySelector('main').hidden = true; } }
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
start();
