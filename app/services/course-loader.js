import { validPodcastId } from './protocol.js';

const COURSE_BASE = new URL('../../courses/', import.meta.url);

export async function loadCourse(podcastId, signal, refresh = false) {
  if (!validPodcastId(podcastId)) throw new Error('Invalid or missing podcast ID');
  const url = new URL(`${encodeURIComponent(podcastId)}.json`, COURSE_BASE);
  if (refresh) url.searchParams.set('refresh', Date.now().toString());
  const response = await fetch(url, { cache: 'no-store', signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Course request failed (HTTP ${response.status})`);
  const course = await response.json();
  if (course?.meta?.episodeId !== podcastId || !Array.isArray(course.units) || !Array.isArray(course.vocab) || !Array.isArray(course.expressions) || !Array.isArray(course.patterns)) {
    throw new Error('Course schema or podcast ID mismatch');
  }
  return course;
}
