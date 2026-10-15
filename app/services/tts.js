export class TtsService {
  voices() { return 'speechSynthesis' in window ? speechSynthesis.getVoices().filter(v => /^en([_-]|$)/i.test(v.lang)) : []; }
  speak(text, voiceName, rate = .95) {
    if (!('speechSynthesis' in window)) throw new Error('Speech synthesis is unavailable');
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; utterance.rate = rate;
    const voice = this.voices().find(v => v.name === voiceName); if (voice) utterance.voice = voice;
    speechSynthesis.speak(utterance);
  }
}
