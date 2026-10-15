export class ProgressStore {
  constructor(podcastId) { this.key = `podcast-youci-progress-v3-${podcastId}`; }
  load() { try { return JSON.parse(localStorage.getItem(this.key) || '{}'); } catch { return {}; } }
  save(value) { localStorage.setItem(this.key, JSON.stringify(value)); }
}
