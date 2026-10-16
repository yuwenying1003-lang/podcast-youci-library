const SESSION_KEY = 'podcast-youci-ai-session';

export class SpeakingFeedbackClient {
  constructor(baseUrl, browser = window) {
    this.baseUrl = String(baseUrl || '').replace(/\/$/, '');
    this.browser = browser;
  }

  token() { return this.browser.sessionStorage.getItem(SESSION_KEY) || ''; }
  signedIn() { return Boolean(this.token()); }
  signOut() { this.browser.sessionStorage.removeItem(SESSION_KEY); }

  signIn() {
    if (!this.baseUrl) return Promise.reject(new Error('AI Feedback 服务地址尚未配置。'));
    return new Promise((resolve, reject) => {
      const popup = this.browser.open(`${this.baseUrl}/session`, 'youci-ai-login', 'width=560,height=680');
      if (!popup) return reject(new Error('登录窗口被浏览器阻止，请允许弹出窗口后重试。'));
      const expectedOrigin = new URL(this.baseUrl).origin;
      const timer = this.browser.setTimeout(() => finish(new Error('登录超时，请重试。')), 120000);
      const onMessage = event => {
        if (event.origin !== expectedOrigin || event.source !== popup || event.data?.type !== 'PODCAST_YOUCI_AI_SESSION') return;
        if (typeof event.data.token !== 'string' || event.data.token.split('.').length !== 3) return finish(new Error('登录会话无效。'));
        this.browser.sessionStorage.setItem(SESSION_KEY, event.data.token);
        finish(null, true);
      };
      const finish = (error, value) => {
        this.browser.clearTimeout(timer);
        this.browser.removeEventListener('message', onMessage);
        if (error) reject(error); else resolve(value);
      };
      this.browser.addEventListener('message', onMessage);
    });
  }

  async check(input) {
    if (!this.signedIn()) throw new Error('请先登录 AI Feedback。');
    let response;
    try {
      response = await this.browser.fetch(`${this.baseUrl}/v1/feedback`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
    } catch { throw new Error('无法连接 AI Feedback 服务，请检查网络后重试。'); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) this.signOut();
      throw new Error(data.error || `AI Feedback 请求失败 (${response.status})。`);
    }
    return data;
  }
}
