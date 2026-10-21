import { AudioClient } from './services/audio-client.js';
import { loadCourse } from './services/course-loader.js';
import { ProgressStore } from './services/progress.js';
import { TtsService } from './services/tts.js';
import { SpeakingFeedbackClient } from './services/speaking-feedback.js';
import { validPodcastId } from './services/protocol.js';
import { AI_API_URL } from './config.js';

const $ = id => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';
const COLLECTION_KEY = 'podlingora-learning-collection-v1';
const ICONS = {
  volume2: [['path', { d: 'M11 5 6 9H2v6h4l5 4V5Z' }], ['path', { d: 'M15.5 8.5a5 5 0 0 1 0 7' }], ['path', { d: 'M18 6a8.5 8.5 0 0 1 0 12' }]],
  audioLines: [['path', { d: 'M2 10v3' }], ['path', { d: 'M6 6v11' }], ['path', { d: 'M10 3v18' }], ['path', { d: 'M14 8v7' }], ['path', { d: 'M18 5v13' }], ['path', { d: 'M22 10v3' }]],
  lightbulb: [['path', { d: 'M9 18h6' }], ['path', { d: 'M10 22h4' }], ['path', { d: 'M8.5 14.5A6 6 0 1 1 15.5 14.5C14.5 15.3 14.2 16 14 17h-4c-.2-1-.5-1.7-1.5-2.5Z' }]],
  star: [['path', { d: 'm12 2.7 2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.97 6.3 20.96l1.09-6.35-4.62-4.5 6.38-.93L12 2.7Z' }]],
  headphones: [['path', { d: 'M4 14v-2a8 8 0 0 1 16 0v2' }], ['path', { d: 'M18 19h-1a2 2 0 0 1-2-2v-3h5v3a2 2 0 0 1-2 2Z' }], ['path', { d: 'M6 19H5a2 2 0 0 1-2-2v-3h5v3a2 2 0 0 1-2 2Z' }]],
};

const params = new URLSearchParams(location.search);
const podcastId = params.get('podcastId') || params.get('episode') || '';
const audio = validPodcastId(podcastId) ? new AudioClient(podcastId) : null;
const progressStore = validPodcastId(podcastId) ? new ProgressStore(podcastId) : null;
const tts = new TtsService();
const feedbackClient = new SpeakingFeedbackClient(AI_API_URL);
let course;
let unit = 0;
let tab = 'words';
let difficulty = 'All';
let query = '';
let selectedChunk = 0;
let words = [];
let phrases = [];
let chunks = [];
let controller;
let progress = progressStore?.load() || {};
let collection = loadCollection();
const openMemory = new Set();
const scrollPositions = {};

function node(tag, className = '', text = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== '') element.textContent = text;
  return element;
}

function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('icon', `icon-${name}`);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const [tag, attributes] of ICONS[name]) {
    const child = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes)) child.setAttribute(key, value);
    svg.append(child);
  }
  return svg;
}

function button(label, className, handler) {
  const element = node('button', className, label);
  element.type = 'button';
  if (handler) element.addEventListener('click', handler);
  return element;
}

function iconButton(name, label, handler, className = 'icon-btn') {
  const element = button('', className, handler);
  element.append(icon(name));
  element.title = label;
  element.setAttribute('aria-label', label);
  return element;
}

function toast(message) {
  const element = $('toast');
  element.textContent = message;
  element.style.display = 'block';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { element.style.display = 'none'; }, 3000);
}

const seconds = value => String(value).split(':').reduce((total, part) => total * 60 + Number(part), 0);
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
const itemText = (kind, item) => kind === 'words' ? item.word : kind === 'phrases' ? item.text : item.text;
const itemMeaning = item => item.cn || item.definition || '';
const lesson = () => (progress.lessons ??= {}, progress.lessons[unit] ??= {});
const save = () => { progress.unit = unit; progress.ui = { tab, difficulty }; progressStore?.save(progress); };

function loadCollection() {
  try {
    const parsed = JSON.parse(localStorage.getItem(COLLECTION_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveCollection() {
  try { localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection)); }
  catch { toast('Collection could not be saved in this browser.'); }
}

function stableId(kind, item) { return `${podcastId}:${kind}:${normalize(itemText(kind, item))}`; }
function isSaved(kind, item) { return collection.some(entry => entry.id === stableId(kind, item)); }

function toggleSaved(kind, item, trigger) {
  const id = stableId(kind, item);
  const existing = collection.findIndex(entry => entry.id === id);
  if (existing >= 0) collection.splice(existing, 1);
  else collection.unshift({ id, podcastId, episodeTitle: course.meta.title, unit, unitTitle: course.units[unit].title, kind, text: itemText(kind, item), meaning: itemMeaning(item), savedAt: new Date().toISOString() });
  saveCollection();
  const saved = existing < 0;
  trigger?.setAttribute('aria-pressed', String(saved));
  trigger?.setAttribute('aria-label', saved ? 'Remove from My Learning Collection' : 'Save to My Learning Collection');
  trigger?.setAttribute('title', saved ? 'Remove from My Learning Collection' : 'Save to My Learning Collection');
  renderCollection();
  toast(saved ? 'Saved to My Learning Collection.' : 'Removed from My Learning Collection.');
}

function bookmarkButton(kind, item) {
  const saved = isSaved(kind, item);
  const result = iconButton('star', saved ? 'Remove from My Learning Collection' : 'Save to My Learning Collection', event => toggleSaved(kind, item, event.currentTarget), 'icon-btn star');
  result.setAttribute('aria-pressed', String(saved));
  return result;
}

async function speak(text, trigger) {
  trigger?.classList.add('is-speaking');
  trigger?.setAttribute('aria-busy', 'true');
  try {
    $('voiceStatus').textContent = `Speaking: ${text}`;
    await tts.speak(text, $('voiceSelect').value, Number($('ttsRate').value));
    $('voiceStatus').textContent = 'Ready.';
  } catch (error) {
    if (error.message !== 'Speech was stopped.') { $('voiceStatus').textContent = error.message; toast(error.message); }
  } finally {
    trigger?.classList.remove('is-speaking');
    trigger?.removeAttribute('aria-busy');
  }
}

function speechButton(text, sentence = false, label) {
  return iconButton(sentence ? 'audioLines' : 'volume2', label || `Pronounce ${text}`, event => speak(text, event.currentTarget), 'icon-btn speech-btn');
}

function verifiedClip(item) {
  const clip = item?.clip;
  if (!clip || clip.verified !== true || typeof clip.quote !== 'string' || !clip.quote.trim()) return null;
  const start = seconds(clip.start), end = seconds(clip.end);
  return Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start && end - start <= 90 ? { start, end, verified: true } : null;
}

async function command(action, payload = {}) {
  if (!audio) { $('audioStatus').textContent = 'Open this page from a supported ListenLeap episode.'; return null; }
  try {
    const state = await audio.send(action, payload);
    $('audioStatus').textContent = state.message || 'Audio command completed.';
    return state;
  } catch (error) { $('audioStatus').textContent = error.message; toast(error.message); return null; }
}

function originalButton(item) {
  const clip = verifiedClip(item);
  if (!clip) return null;
  return iconButton('headphones', 'Play verified original podcast segment', () => command('AUDIO_PLAY_RANGE', clip));
}

function selectItems() {
  const current = course.units[unit];
  const start = seconds(current.start), end = seconds(current.end);
  words = course.vocab.filter(item => item.unit === unit || (item.unit === undefined && seconds(item.time) >= start && seconds(item.time) < end));
  phrases = course.expressions.filter(item => item.unit === unit || (seconds(item.time) >= start && seconds(item.time) < end));
  chunks = course.patterns[unit] || [];
}

function wordLevel(item) { return item.difficulty || item.level || 'Useful'; }

function collocations(item) {
  if (Array.isArray(item.collocations) && item.collocations.length) return item.collocations.slice(0, 3).map(value => Array.isArray(value) ? value : [value, '教学搭配']);
  const fromTip = String(item.tip || '').match(/(?:collocations?|combinations?|partners?|objects?|patterns?):\s*([^.!]+)/i)?.[1];
  if (fromTip) return fromTip.split(/,|\band\b/i).map(value => value.trim()).filter(Boolean).slice(0, 3).map(value => [value, '教学搭配']);
  const example = String(item.example || '');
  const match = example.match(new RegExp(`(?:\\b\\w+\\b\\s+){0,2}\\b${String(item.word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(?:\\s+\\b\\w+\\b){0,2}`, 'i'));
  return match ? [[match[0], '来自教学例句']] : [];
}

function memoryType(item) {
  if (item.mnemonic_type) return item.mnemonic_type;
  return /prefix|suffix|root|comes? from|word family|\b[a-z]+\s*[→↔+]\s*[a-z]+/i.test(item.tip || '') ? 'word-family / morphology' : 'context + collocation';
}

function buildWord(item, index) {
  const wrap = node('article', 'entry');
  const row = node('div', 'entry-row');
  const main = node('div', 'entry-main');
  main.append(node('div', 'entry-title', item.word), node('div', 'entry-desc', `${item.cn || ''}${item.ipa ? ` · ${item.ipa}` : ''}`));
  const actions = node('div', 'entry-actions');
  actions.append(speechButton(item.word, false, `Pronounce ${item.word}`));
  const memoryId = `${unit}:word:${index}`;
  const expanded = openMemory.has(memoryId);
  const tipButton = iconButton('lightbulb', expanded ? `Hide memory coach for ${item.word}` : `Show memory coach for ${item.word}`, null, `small-btn${expanded ? ' active' : ''}`);
  tipButton.setAttribute('aria-expanded', String(expanded));
  const panel = node('div', 'memory-coach');
  panel.hidden = !expanded;
  tipButton.onclick = () => {
    const top = $('list').scrollTop;
    const willOpen = panel.hidden;
    panel.hidden = !willOpen;
    tipButton.classList.toggle('active', willOpen);
    tipButton.setAttribute('aria-expanded', String(willOpen));
    tipButton.setAttribute('aria-label', willOpen ? `Hide memory coach for ${item.word}` : `Show memory coach for ${item.word}`);
    openMemory[willOpen ? 'add' : 'delete'](memoryId);
    $('list').scrollTop = top;
  };
  actions.append(tipButton, bookmarkButton('words', item));
  row.append(main, actions);
  wrap.append(row);

  panel.append(node('div', 'section-label', 'NATURAL COLLOCATIONS'));
  const itemCollocations = collocations(item);
  if (itemCollocations.length) for (const [phrase, gloss] of itemCollocations) { const line = node('div', 'collocation'); const strong = node('b', '', phrase); line.append(strong, node('span', 'muted', ` — ${gloss || '教学搭配'}`)); panel.append(line); }
  else panel.append(node('p', 'muted', 'No verified collocation has been added yet.'));
  panel.append(node('div', 'rule'), node('div', 'section-label', 'MEMORY TRICK'));
  panel.append(node('p', '', item.memory_trick || item.tip || `Focus on the spelling and sound of “${item.word}”.`));
  const anchor = itemCollocations[0]?.[0] || item.example || item.word;
  panel.append(node('div', 'section-label', 'MEMORY HOOK'), node('p', '', `${item.word}: ${String(anchor).split(/\s+/).slice(0, 10).join(' ')}`));
  panel.append(node('div', 'section-label', 'MENTAL IMAGE'), node('p', '', item.mental_image || `想象“${anchor}”的具体画面，并把 ${item.word} 写在画面中央。`));
  panel.append(node('div', 'section-label', 'MNEMONIC TYPE'), node('p', 'origin', memoryType(item)));
  panel.append(node('div', 'rule'), node('div', 'section-label', item.example_source === 'verified_transcript' ? 'EXAMPLE · PODCAST ORIGINAL' : 'EXAMPLE · TEACHING SENTENCE'));
  const example = node('div', 'example-row');
  const text = node('p', '', item.example || '');
  if (item.example_cn) text.append(node('span', 'muted', ` · ${item.example_cn}`));
  example.append(text, speechButton(item.example || item.word, true, `Read example sentence for ${item.word}`));
  const original = originalButton(item); if (original) example.append(original);
  panel.append(example);
  wrap.append(panel);
  const tail = node('div', 'entry-row');
  const rating = progress.ratings?.[item.word];
  const learned = button(rating === true ? '✓ Learned' : 'Mark as learned', 'learn', () => {
    const next = progress.ratings?.[item.word] === true ? undefined : true;
    (progress.ratings ??= {})[item.word] = next;
    learned.textContent = next ? '✓ Learned' : 'Mark as learned';
    learned.setAttribute('aria-pressed', String(next === true));
    save(); toast(next ? 'Marked as learned.' : 'Learned mark removed.');
  });
  learned.setAttribute('aria-pressed', String(rating === true));
  tail.append(learned, node('span', 'level', wordLevel(item)));
  wrap.append(tail);
  return wrap;
}

function buildPhrase(item) {
  const wrap = node('article', 'entry');
  const row = node('div', 'entry-row');
  const main = node('div', 'entry-main');
  main.append(node('div', 'entry-title', item.text), node('div', 'entry-desc', item.cn || item.definition || ''));
  const actions = node('div', 'entry-actions');
  actions.append(speechButton(item.text, false, `Pronounce expression: ${item.text}`), bookmarkButton('phrases', item));
  row.append(main, actions); wrap.append(row);
  if (item.example) {
    const example = node('div', 'example-row');
    example.append(node('p', '', item.example), speechButton(item.example, true, `Read expression example: ${item.example}`));
    const original = originalButton(item); if (original) example.append(original);
    wrap.append(example, node('div', 'origin', item.example_source === 'verified_transcript' ? 'Podcast original' : 'Teaching example'));
  }
  return wrap;
}

function renderCollection() {
  const destination = $('collectionList');
  const top = destination.scrollTop;
  destination.replaceChildren();
  $('collectionCount').textContent = `${collection.length} saved`;
  if (!collection.length) destination.append(node('p', 'muted', '点击 ☆ 收藏单词、短语或语块。'));
  for (const entry of collection) {
    const row = node('div', 'collection-item');
    const text = node('div', 'entry-main');
    text.append(node('div', 'entry-title', entry.text), node('div', 'entry-desc', `${entry.meaning || ''} · ${entry.episodeTitle || entry.podcastId} · Unit ${Number(entry.unit) + 1}`));
    row.append(text, speechButton(entry.text, false, `Pronounce saved item: ${entry.text}`));
    destination.append(row);
  }
  destination.scrollTop = top;
}

function showFeedback(destination, feedback) {
  destination.replaceChildren();
  destination.className = 'ai-feedback';
  const title = node('strong', '', ({ correct:'✓ 表达自然正确', needs_improvement:'△ 可以改进', incorrect:'× 需要修改' })[feedback.status] || 'AI Feedback');
  destination.append(title);
  for (const [label, value] of [['原因', feedback.brief_explanation_zh], ['修正', feedback.corrected_sentence], ['更自然的表达', feedback.natural_alternative]]) {
    if (!value) continue;
    const row = node('p'); const strong = node('b', '', `${label}：`); row.append(strong, document.createTextNode(value)); destination.append(row);
  }
  const audioTools = node('div', 'buttons');
  if (feedback.corrected_sentence) audioTools.append(speechButton(feedback.corrected_sentence, true, 'Read corrected sentence'));
  if (feedback.natural_alternative) audioTools.append(speechButton(feedback.natural_alternative, true, 'Read natural alternative'));
  destination.append(audioTools);
}

function renderChunks() {
  const area = $('chunkArea');
  const oldScroll = area.querySelector('.chunk-scroll')?.scrollTop || 0;
  area.replaceChildren();
  const list = node('div', 'chunk-scroll');
  chunks.forEach((item, index) => {
    const option = button('', `chunk-option${selectedChunk === index ? ' selected' : ''}`, () => { selectedChunk = index; renderChunks(); });
    option.append(node('div', 'entry-title', item.text), node('div', 'entry-desc', item.cn || ''));
    option.setAttribute('aria-pressed', String(selectedChunk === index));
    list.append(option);
  });
  area.append(list); list.scrollTop = oldScroll;
  const item = chunks[selectedChunk];
  if (!item) { area.append(node('p', 'muted', 'No speaking chunks in this unit.')); return; }
  const detail = node('div', 'detail');
  const head = node('div', 'entry-row');
  const name = node('div', 'entry-main'); name.append(node('div', 'entry-title', item.text), node('div', 'entry-desc', item.cn || ''));
  const actions = node('div', 'entry-actions'); actions.append(speechButton(item.text, false, `Pronounce chunk: ${item.text}`), bookmarkButton('chunks', item));
  head.append(name, actions); detail.append(head);
  if (item.example) {
    detail.append(node('div', 'section-label', 'MODEL EXAMPLE'));
    const example = node('div', 'example-row'); example.append(node('p', '', item.example), speechButton(item.example, true, 'Read model example')); detail.append(example);
  }
  const scenarios = item.scenarios || [{ type:'daily', label:'Daily life', scene_zh:item.prompt || '', reference_answer:item.example }];
  const stored = (lesson().patterns || {})[selectedChunk];
  const state = typeof stored === 'string' ? { sentence:stored, scenario:0 } : (stored || { sentence:'', scenario:0 });
  const scenarioRow = node('div', 'scenario-row');
  const scenarioSelect = document.createElement('select'); scenarioSelect.setAttribute('aria-label', 'Choose a speaking situation');
  scenarios.forEach((scenario, index) => { const option = node('option', '', ({ daily:'Daily life', social:'Friends', work:'Work' })[scenario.type] || scenario.label || `Scenario ${index + 1}`); option.value = index; scenarioSelect.append(option); });
  scenarioSelect.value = String(Math.min(state.scenario || 0, scenarios.length - 1));
  const exampleToggle = button('Show example', 'outline'); exampleToggle.setAttribute('aria-expanded', 'false');
  scenarioRow.append(scenarioSelect, exampleToggle); detail.append(scenarioRow);
  const scene = node('p', 'muted'); const reference = node('div', 'example-row'); reference.hidden = true;
  const refreshScenario = () => { const selected = scenarios[Number(scenarioSelect.value)] || scenarios[0]; scene.textContent = selected.scene_zh || ''; reference.replaceChildren(node('p', '', selected.reference_answer || item.example || ''), speechButton(selected.reference_answer || item.example || item.text, true, 'Read reference example')); state.scenario = Number(scenarioSelect.value); (lesson().patterns ??= {})[selectedChunk] = state; save(); };
  scenarioSelect.onchange = refreshScenario;
  exampleToggle.onclick = () => { const expanded = reference.hidden; reference.hidden = !expanded; exampleToggle.textContent = expanded ? 'Hide example' : 'Show example'; exampleToggle.setAttribute('aria-expanded', String(expanded)); };
  refreshScenario(); detail.append(scene, reference, node('div', 'section-label', 'MAKE IT YOURS'));
  const input = document.createElement('input'); input.type = 'text'; input.maxLength = 500; input.placeholder = 'Write your own English sentence…'; input.setAttribute('aria-label', 'Your English sentence'); input.value = state.sentence || '';
  input.oninput = () => { state.sentence = input.value; (lesson().patterns ??= {})[selectedChunk] = state; save(); };
  detail.append(input);
  const result = node('div', 'ai-feedback'); result.hidden = true; result.setAttribute('role', 'status'); result.setAttribute('aria-live', 'polite');
  const controls = node('div', 'buttons');
  const saveSentence = button('Save Sentence', 'outline', () => { state.sentence = input.value.trim(); (lesson().patterns ??= {})[selectedChunk] = state; save(); toast(state.sentence ? 'Sentence saved.' : 'Empty sentence saved.'); });
  const check = button('✦ AI Check', 'primary', async () => {
    if (!input.value.trim()) { result.hidden = false; result.className = 'ai-feedback error'; result.textContent = '请先填写英文句子。'; input.focus(); return; }
    const selected = scenarios[Number(scenarioSelect.value)] || scenarios[0];
    check.disabled = true; check.textContent = 'Checking…'; result.hidden = false; result.className = 'ai-feedback'; result.textContent = '正在调用真实 AI 检查…'; result.setAttribute('aria-busy', 'true');
    try {
      const feedback = await feedbackClient.check({ sentence:input.value, target_pattern:item.text, scenario_zh:selected.scene_zh, reference_answer:selected.reference_answer });
      showFeedback(result, feedback);
      const history = (lesson().speakingHistory ??= []); history.unshift({ pattern:item.text, scenario:selected.type, sentence:input.value.trim(), feedback, checkedAt:new Date().toISOString() }); if (history.length > 50) history.length = 50; save();
      $('aiAuthStatus').textContent = `已登录 · 今日还可检查 ${feedback.remaining} 次`;
    } catch (error) { result.className = 'ai-feedback error'; result.textContent = error.message; if (!feedbackClient.signedIn()) $('aiAuthStatus').textContent = '尚未登录'; }
    finally { result.removeAttribute('aria-busy'); check.disabled = false; check.textContent = '✦ AI Check'; }
  });
  controls.append(saveSentence, check); detail.append(controls, result); area.append(detail);
}

function renderBody() {
  const groups = { words, phrases, chunks };
  const labels = { words:'Vocabulary Preview', phrases:'Expressions & Collocations', chunks:'Reusable Speaking Patterns' };
  const help = { words:'词汇、上下文释义、自然搭配与可逆向助记。', phrases:'听懂整块表达，并区分教学例句与已验证原文。', chunks:'选择可迁移语块，保存造句并使用真实 AI Check。' };
  $('sectionHeading').textContent = labels[tab]; $('itemCount').textContent = `${groups[tab].length} items`; $('sectionHelp').textContent = help[tab];
  $('searchRow').hidden = tab === 'chunks'; $('difficulty').hidden = tab !== 'words'; $('list').hidden = tab === 'chunks'; $('chunkArea').hidden = tab !== 'chunks';
  document.querySelectorAll('#sectionTabs button').forEach(item => { item.classList.toggle('active', item.dataset.tab === tab); item.setAttribute('aria-selected', String(item.dataset.tab === tab)); });
  if (tab === 'chunks') { renderChunks(); return; }
  const filters = $('difficulty'); filters.replaceChildren();
  if (tab === 'words') for (const label of ['All','Essential','Useful','Advanced']) filters.append(button(label, label === difficulty ? 'active' : '', () => { difficulty = label; save(); renderBody(); }));
  $('search').value = query;
  const key = `${unit}:${tab}`; const destination = $('list'); const oldTop = scrollPositions[key] || destination.scrollTop || 0; destination.replaceChildren();
  const items = tab === 'words' ? words : phrases;
  items.forEach((item, index) => {
    const searchable = `${itemText(tab, item)} ${item.cn || ''} ${item.definition || ''}`.toLowerCase();
    if (query && !searchable.includes(query.toLowerCase())) return;
    if (tab === 'words' && difficulty !== 'All' && wordLevel(item) !== difficulty) return;
    destination.append(tab === 'words' ? buildWord(item, index) : buildPhrase(item));
  });
  if (!destination.childElementCount) destination.append(node('p', 'muted', 'No matching entries.'));
  destination.scrollTop = oldTop;
}

function renderHeader() {
  selectItems();
  const current = course.units[unit];
  $('podcastTitle').textContent = course.meta.title || 'Podlingora';
  $('unitNav').replaceChildren(...course.units.map((item, index) => {
    const control = button(`Unit ${index + 1}`, `${index === unit ? 'active ' : ''}${progress.lessons?.[index]?.done ? 'complete' : ''}`.trim(), () => { scrollPositions[`${unit}:${tab}`] = $('list').scrollTop; unit = index; selectedChunk = 0; query = ''; save(); render(); });
    control.title = item.title; control.setAttribute('aria-current', index === unit ? 'step' : 'false'); return control;
  }));
  requestAnimationFrame(() => $('unitNav').querySelector('[aria-current="step"]')?.scrollIntoView({ block:'nearest', inline:'center' }));
  $('unitRange').textContent = `Original audio · ${current.start}–${current.end}`; $('unitTitle').textContent = current.title; $('counts').textContent = `${words.length} / ${phrases.length} / ${chunks.length}`;
  const zh = current.recap_zh || ''; $('storyZh').textContent = zh; $('storyZh').hidden = !zh; $('storyEn').textContent = current.preview;
  $('clues').textContent = [...phrases.slice(0, 4).map(item => item.text), ...words.slice(0, 2).map(item => item.word)].join(' · ');
  const state = lesson(); $('ready').checked = Boolean(state.listened); $('notes').value = state.notes || '';
  const complete = Object.values(progress.lessons || {}).filter(value => value.done).length; const percent = course.units.length ? Math.round(complete / course.units.length * 100) : 0;
  $('progressSummary').textContent = `${complete} of ${course.units.length} units completed.`; $('progressFill').style.transform = `scaleX(${percent / 100})`; $('progressFill').parentElement.setAttribute('aria-valuenow', String(percent));
}

function render() { renderHeader(); renderBody(); renderCollection(); }

function syncAiAuth(message = '') {
  const signedIn = feedbackClient.signedIn(); $('aiLogin').hidden = signedIn; $('aiLogout').hidden = !signedIn; $('aiAuthStatus').textContent = message || (signedIn ? 'AI Feedback ready.' : '尚未登录');
}

function loadVoices() {
  const voices = tts.voices(), selected = localStorage.getItem('youci-voice-name') || '';
  $('voiceSelect').replaceChildren(...voices.map(voice => { const option = node('option', '', `${voice.name} · ${voice.lang}`); option.value = voice.name; return option; }));
  const preferred = voices.find(voice => voice.name === selected) || voices.find(voice => /^en-US$/i.test(voice.lang)) || voices.find(voice => /^en-GB$/i.test(voice.lang)) || voices[0];
  if (preferred) $('voiceSelect').value = preferred.name;
  $('voiceSelect').disabled = !voices.length;
  $('voiceStatus').textContent = !tts.supported() ? 'English speech is unavailable in this browser.' : voices.length ? `${voices.length} English voices available.` : 'No English voice is available. Enable an English system voice, then refresh.';
}

function setupControls() {
  document.querySelectorAll('#sectionTabs button').forEach(control => { control.onclick = () => { scrollPositions[`${unit}:${tab}`] = $('list').scrollTop; tab = control.dataset.tab; query = ''; selectedChunk = 0; save(); renderBody(); }; });
  $('search').oninput = event => { query = event.target.value; scrollPositions[`${unit}:${tab}`] = 0; renderBody(); $('search').focus(); };
  $('list').addEventListener('scroll', () => { scrollPositions[`${unit}:${tab}`] = $('list').scrollTop; }, { passive:true });
  const playUnit = () => { const current = course.units[unit]; command('AUDIO_PLAY_UNIT', { start:seconds(current.start), end:seconds(current.end) }); };
  $('listenButton').onclick = playUnit; $('replayButton').onclick = playUnit;
  $('pauseButton').onclick = async () => { const state = await command('AUDIO_GET_STATE'); if (state) command(state.paused ? 'AUDIO_PLAY' : 'AUDIO_PAUSE'); };
  $('rate').onchange = event => command('AUDIO_SET_RATE', { rate:Number(event.target.value) });
  $('ready').onchange = event => { lesson().listened = event.target.checked; save(); toast(event.target.checked ? 'Listening marked complete.' : 'Listening mark removed.'); };
  $('saveUnit').onclick = () => { Object.assign(lesson(), { listened:true, done:true, notes:$('notes').value }); save(); render(); toast('Unit progress saved.'); };
  $('export').onclick = () => { const blob = new Blob([JSON.stringify({ format:'podcast-youci-progress-v3', podcastId, progress, collection }, null, 2)], { type:'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `podlingora-${podcastId}-progress.json`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); };
  $('ttsRate').oninput = event => { $('ttsRateLabel').textContent = `${Number(event.target.value).toFixed(2)}×`; localStorage.setItem('youci-tts-rate', event.target.value); };
  $('voiceSelect').onchange = event => localStorage.setItem('youci-voice-name', event.target.value);
  $('refreshVoices').onclick = () => { loadVoices(); toast('English voice list refreshed.'); };
  $('testVoice').onclick = event => speak('Podlingora voice test.', event.currentTarget);
  $('aiLogin').onclick = async () => { syncAiAuth('正在登录…'); try { await feedbackClient.signIn(); syncAiAuth('AI Feedback ready.'); } catch (error) { syncAiAuth(error.message); } };
  $('aiLogout').onclick = () => { feedbackClient.signOut(); syncAiAuth('已退出 AI Feedback。'); };
  $('retryCourse').onclick = () => start(true);
}

function courseStatus(message, state = 'ready', retry = false) { $('courseNotice').dataset.state = state; $('courseNoticeText').textContent = message; $('retryCourse').classList.toggle('hidden', !retry); }

async function start(refresh = false) {
  $('app').hidden = false;
  controller?.abort(); controller = new AbortController();
  if (!validPodcastId(podcastId)) { courseStatus('No valid podcast ID supplied. Open this app from a ListenLeap episode.', 'error'); return; }
  courseStatus('Loading course…', 'loading');
  try {
    course = await loadCourse(podcastId, controller.signal, refresh);
    if (!course) { courseStatus('No course exists for this podcast yet.', 'empty', true); return; }
    unit = Math.min(Number.isInteger(progress.unit) ? progress.unit : 0, Math.max(0, course.units.length - 1));
    tab = ['words','phrases','chunks'].includes(progress.ui?.tab) ? progress.ui.tab : 'words'; difficulty = progress.ui?.difficulty || 'All';
    courseStatus(`✓ ${course.units.length} semantic units loaded`);
    $('courseRevision').textContent = course.meta.revision || course.meta.verified || 'not specified'; $('sourceLink').href = course.meta.sourceUrl || `https://app.listenleap.com/read?id=${encodeURIComponent(podcastId)}`;
    render();
  } catch (error) { if (error.name !== 'AbortError') courseStatus(`Course load failed: ${error.message}`, 'error', true); }
}

setupControls();
const savedRate = Number(localStorage.getItem('youci-tts-rate')); if (savedRate >= .7 && savedRate <= 1.15) $('ttsRate').value = String(savedRate); $('ttsRateLabel').textContent = `${Number($('ttsRate').value).toFixed(2)}×`;
loadVoices(); if ('speechSynthesis' in window) speechSynthesis.addEventListener?.('voiceschanged', loadVoices); syncAiAuth(); start();
