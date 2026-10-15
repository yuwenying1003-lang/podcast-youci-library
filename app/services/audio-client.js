import { APP_ORIGIN, request, validResponse } from './protocol.js';

export class AudioClient {
  constructor(podcastId, timeout = 5000) {
    this.podcastId = podcastId;
    this.timeout = timeout;
  }

  send(action, payload = {}) {
    if (window.parent === window) return Promise.reject(new Error('Audio controls require the Podcast Youci extension panel.'));
    const message = request(action, this.podcastId, payload);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { cleanup(); reject(new Error('Extension response timed out')); }, this.timeout);
      const onMessage = event => {
        if (event.source !== window.parent || event.origin !== 'https://app.listenleap.com') return;
        if (!validResponse(event.data, message.requestId)) return;
        cleanup();
        event.data.success ? resolve(event.data.payload || {}) : reject(new Error(event.data.error?.message || 'Audio request failed'));
      };
      const cleanup = () => { clearTimeout(timer); window.removeEventListener('message', onMessage); };
      window.addEventListener('message', onMessage);
      window.parent.postMessage(message, 'https://app.listenleap.com');
    });
  }
}
