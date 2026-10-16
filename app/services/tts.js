export class TtsService {
  supported() {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  voices() {
    return this.supported() ? window.speechSynthesis.getVoices().filter(voice => /^en(?:[-_]|$)/i.test(voice.lang)) : [];
  }

  speak(text, voiceName, rate = .95) {
    if (!this.supported()) return Promise.reject(new Error('English speech is unavailable in this browser.'));
    if (!String(text || '').trim()) return Promise.reject(new Error('There is no English text to read.'));
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text).trim());
    const voice = this.voices().find(candidate => candidate.name === voiceName);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-US';
    utterance.rate = Math.min(1.5, Math.max(.5, Number(rate) || .95));
    return new Promise((resolve, reject) => {
      utterance.onend = resolve;
      utterance.onerror = event => reject(new Error(event.error === 'canceled' ? 'Speech was stopped.' : `English speech failed (${event.error || 'unknown error'}).`));
      // A short post-cancel delay avoids dropped utterances in Chromium-based Android browsers.
      setTimeout(() => window.speechSynthesis.speak(utterance), 60);
    });
  }
}
