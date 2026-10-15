export const PROTOCOL = 'podcast-youci';
export const VERSION = 1;
export const APP_ORIGIN = 'https://yuwenying1003-lang.github.io';
export const PODCAST_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
export const ACTIONS = new Set([
  'AUDIO_PLAY', 'AUDIO_PAUSE', 'AUDIO_SEEK', 'AUDIO_PLAY_RANGE',
  'AUDIO_PLAY_UNIT', 'AUDIO_GET_STATE', 'AUDIO_SET_RATE',
  'AUDIO_CLEAR_RANGE', 'PANEL_COLLAPSE', 'PROGRESS_GET', 'PROGRESS_SET'
]);

export function validPodcastId(value) {
  return typeof value === 'string' && PODCAST_ID_RE.test(value);
}

export function request(action, podcastId, payload = {}) {
  if (!ACTIONS.has(action) || !validPodcastId(podcastId)) throw new Error('Invalid protocol request');
  return {
    protocol: PROTOCOL,
    version: VERSION,
    requestId: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    action,
    podcastId,
    payload
  };
}

export function validResponse(value, requestId) {
  return value && value.protocol === PROTOCOL && value.version === VERSION &&
    value.type === 'RESPONSE' && value.requestId === requestId && typeof value.success === 'boolean';
}
