import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { ACTIONS, PROTOCOL, VERSION, request, validPodcastId, validResponse } from '../app/services/protocol.js';
import { loadCourse } from '../app/services/course-loader.js';

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
});
