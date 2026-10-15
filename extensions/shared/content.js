(() => {
  'use strict';
  if (window.__podcastYouciV3) return;
  window.__podcastYouciV3 = true;

  const APP_ORIGIN = 'https://yuwenying1003-lang.github.io';
  const APP_URL = `${APP_ORIGIN}/podcast-youci-library/app/`;
  const PROTOCOL = 'podcast-youci';
  const VERSION = 1;
  const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
  const AUDIO_ACTIONS = new Set(['AUDIO_PLAY', 'AUDIO_PAUSE', 'AUDIO_SEEK', 'AUDIO_PLAY_RANGE', 'AUDIO_PLAY_UNIT', 'AUDIO_GET_STATE', 'AUDIO_SET_RATE', 'AUDIO_CLEAR_RANGE']);
  let frame, pane, range, podcastId = currentPodcastId(), lastHref = location.href;

  function currentPodcastId() {
    const value = location.pathname === '/read' ? new URL(location.href).searchParams.get('id') : '';
    return ID_RE.test(value || '') ? value : '';
  }

  function audioElement() {
    return [...document.querySelectorAll('audio')].find(item => Number.isFinite(item.duration) && item.duration > 60) || document.querySelector('audio');
  }

  function state(audio, message = '') {
    return { currentTime: audio?.currentTime || 0, duration: Number.isFinite(audio?.duration) ? audio.duration : null, paused: audio?.paused ?? true, playbackRate: audio?.playbackRate || 1, message };
  }

  function response(requestId, success, payload = {}, error) {
    frame?.contentWindow?.postMessage({ protocol: PROTOCOL, version: VERSION, type: 'RESPONSE', requestId, success, payload, ...(error ? { error } : {}) }, APP_ORIGIN);
  }

  function validNumber(value, min = 0) { return typeof value === 'number' && Number.isFinite(value) && value >= min; }

  async function handleAudio(message) {
    const audio = audioElement();
    if (!audio) throw Object.assign(new Error('Start the ListenLeap episode once so its HTML5 audio element is available.'), { code: 'AUDIO_NOT_FOUND' });
    const payload = message.payload || {};
    switch (message.action) {
      case 'AUDIO_PLAY': range = null; await audio.play(); break;
      case 'AUDIO_PAUSE': range = null; audio.pause(); break;
      case 'AUDIO_SEEK':
        if (!validNumber(payload.time)) throw new Error('Invalid seek time');
        range = null; audio.currentTime = payload.time; break;
      case 'AUDIO_PLAY_RANGE':
      case 'AUDIO_PLAY_UNIT': {
        if (!validNumber(payload.start) || !validNumber(payload.end) || payload.end <= payload.start) throw new Error('A valid start/end range is required');
        if (message.action === 'AUDIO_PLAY_RANGE' && payload.verified !== true) throw new Error('Exact-sentence timing must be explicitly verified');
        if (message.action === 'AUDIO_PLAY_RANGE' && payload.end - payload.start > 90) throw new Error('Exact-sentence range exceeds 90 seconds');
        range = { end: payload.end, action: message.action };
        audio.currentTime = payload.start; await audio.play(); break;
      }
      case 'AUDIO_SET_RATE':
        if (!validNumber(payload.rate, .25) || payload.rate > 4) throw new Error('Invalid playback rate');
        audio.playbackRate = payload.rate; break;
      case 'AUDIO_CLEAR_RANGE': range = null; break;
      case 'AUDIO_GET_STATE': break;
      default: throw new Error('Unsupported audio action');
    }
    return state(audio, 'ListenLeap audio updated.');
  }

  async function onMessage(event) {
    if (!frame || event.origin !== APP_ORIGIN || event.source !== frame.contentWindow) return;
    const message = event.data;
    if (!message || message.protocol !== PROTOCOL || message.version !== VERSION || typeof message.requestId !== 'string') return;
    if (!ID_RE.test(message.podcastId || '') || message.podcastId !== podcastId) return response(message.requestId, false, {}, { code: 'PODCAST_MISMATCH', message: 'Podcast ID does not match the active ListenLeap page.' });
    try {
      if (AUDIO_ACTIONS.has(message.action)) return response(message.requestId, true, await handleAudio(message));
      if (message.action === 'PANEL_COLLAPSE') { setOpen(false); return response(message.requestId, true, { collapsed: true }); }
      if (message.action === 'PROGRESS_GET') { const key = `progress-v3-${podcastId}`; const result = await chrome.storage.local.get(key); return response(message.requestId, true, { value: result[key] || {} }); }
      if (message.action === 'PROGRESS_SET') { const key = `progress-v3-${podcastId}`; await chrome.storage.local.set({ [key]: message.payload?.value || {} }); return response(message.requestId, true, {}); }
      response(message.requestId, false, {}, { code: 'ACTION_REJECTED', message: 'Action is not allowlisted.' });
    } catch (error) { response(message.requestId, false, state(audioElement()), { code: error.code || 'COMMAND_FAILED', message: error.message }); }
  }

  document.addEventListener('timeupdate', event => {
    if (event.target.tagName !== 'AUDIO' || !range || event.target.currentTime < range.end - .04) return;
    event.target.pause(); event.target.currentTime = range.end; range = null;
  }, true);

  function createPanel() {
    const host = document.createElement('div'); host.id = 'podcast-youci-v3-root';
    Object.assign(host.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '2147483647' });
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style'); style.textContent = `
      *{box-sizing:border-box}.pane{position:fixed;top:0;left:0;height:100dvh;background:white;border-right:1px solid #8fb9ae;box-shadow:6px 0 28px #0003;pointer-events:auto;display:none}.frame{width:100%;height:100%;border:0}.drag{position:absolute;top:0;right:-13px;width:26px;height:100%;cursor:col-resize;touch-action:none}.drag:after{content:'';position:absolute;top:44%;right:10px;width:6px;height:75px;border-radius:8px;background:#147b68}.controls{position:fixed;top:12px;left:12px;display:flex;gap:6px;pointer-events:auto}.controls button{height:44px;padding:0 13px;border:1px solid white;border-radius:22px;background:#116b5b;color:white;font:600 13px system-ui;box-shadow:0 3px 12px #0003;cursor:pointer}`;
    pane = document.createElement('div'); pane.className = 'pane';
    frame = document.createElement('iframe'); frame.className = 'frame'; frame.title = 'Podcast Youci learning panel'; frame.allow = 'autoplay';
    const drag = document.createElement('div'); drag.className = 'drag';
    const controls = document.createElement('div'); controls.className = 'controls';
    const toggle = document.createElement('button'); toggle.textContent = '🎧 Study';
    const side = document.createElement('button'); side.textContent = '⇄ Side'; side.hidden = true;
    controls.append(toggle, side); pane.append(frame, drag); shadow.append(style, pane, controls); document.documentElement.append(host);
    const widthKey = 'podcast-youci-panel-width-v3', sideKey = 'podcast-youci-panel-side-v3', openKey = 'podcast-youci-panel-open-v3';
    let position = localStorage.getItem(sideKey) || 'left';
    const clamp = value => Math.max(300, Math.min(innerWidth - 16, Math.round(value)));
    let width = clamp(Number(localStorage.getItem(widthKey)) || innerWidth * (innerWidth <= 1024 ? .4 : .35));
    function layout() { const right = position === 'right'; pane.style.width = `${clamp(width)}px`; pane.style.left = right ? 'auto' : '0'; pane.style.right = right ? '0' : 'auto'; drag.style.left = right ? '-13px' : 'auto'; drag.style.right = right ? 'auto' : '-13px'; controls.style.left = right ? 'auto' : '12px'; controls.style.right = right ? '12px' : 'auto'; }
    setOpen = open => { pane.style.display = open ? 'block' : 'none'; toggle.textContent = open ? '✕ Close' : '🎧 Study'; side.hidden = !open; localStorage.setItem(openKey, String(open)); };
    toggle.onclick = () => setOpen(pane.style.display === 'none');
    side.onclick = () => { position = position === 'left' ? 'right' : 'left'; localStorage.setItem(sideKey, position); layout(); };
    let pointer;
    drag.onpointerdown = event => { pointer = event.pointerId; drag.setPointerCapture(pointer); event.preventDefault(); };
    drag.onpointermove = event => { if (event.pointerId !== pointer) return; width = clamp(position === 'left' ? event.clientX : innerWidth - event.clientX); layout(); };
    drag.onpointerup = event => { if (event.pointerId !== pointer) return; pointer = null; localStorage.setItem(widthKey, String(width)); };
    addEventListener('resize', layout); layout(); setOpen(localStorage.getItem(openKey) === 'true'); updateFrame();
  }

  let setOpen = () => {};
  function updateFrame() { if (frame) frame.src = `${APP_URL}?podcastId=${encodeURIComponent(podcastId)}`; }
  function detectNavigation() { if (location.href === lastHref) return; lastHref = location.href; const next = currentPodcastId(); if (next !== podcastId) { podcastId = next; range = null; updateFrame(); } }
  addEventListener('popstate', detectNavigation); addEventListener('hashchange', detectNavigation);
  new MutationObserver(detectNavigation).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(detectNavigation, 1000);
  addEventListener('message', onMessage);
  createPanel();
})();
