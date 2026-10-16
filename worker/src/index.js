import { buildPrompt, corsHeaders, feedbackSchema, validateFeedbackInput, validateGeminiFeedback } from './core.js';
import { issueSession, subjectHash, verifyAccess, verifySession } from './auth.js';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
});

function sessionPage(token, allowedOrigin) {
  const safeToken = JSON.stringify(token).replace(/</g, '\\u003c');
  const safeOrigin = JSON.stringify(allowedOrigin).replace(/</g, '\\u003c');
  return new Response(`<!doctype html><meta charset="utf-8"><title>Podcast Youci AI Login</title>
<style>body{font:16px system-ui;padding:2rem;color:#183326}p{max-width:35rem}</style>
<h1>AI Feedback 登录成功</h1><p>正在把安全会话交给学习页面，此窗口可以自动关闭。</p>
<script>if(window.opener){window.opener.postMessage({type:'PODCAST_YOUCI_AI_SESSION',token:${safeToken}},${safeOrigin});setTimeout(()=>window.close(),400)}<\/script>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}

async function useDailyQuota(db, hash, limit) {
  const date = new Date().toISOString().slice(0, 10);
  const result = await db.prepare(`INSERT INTO daily_usage (subject_hash, usage_date, request_count)
    VALUES (?, ?, 1)
    ON CONFLICT(subject_hash, usage_date) DO UPDATE SET request_count = request_count + 1
    WHERE request_count < ? RETURNING request_count`).bind(hash, date, limit).first();
  return result ? { allowed: true, remaining: Math.max(0, limit - result.request_count) } : { allowed: false, remaining: 0 };
}

export async function callGemini(input, env, fetcher = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  if (!env.GEMINI_API_KEY) throw new Error('Gemini API Key 尚未配置。');
  const model = env.GEMINI_MODEL || 'gemini-3.8-flash';
  const request = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 900, responseMimeType: 'application/json', responseJsonSchema: feedbackSchema() },
    }),
  };
  let response;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, request); }
    catch (error) {
      if (attempt === 2) throw new Error('Gemini 暂时无法连接，请稍后重试。');
      await sleep(500 * (2 ** attempt) + Math.floor(Math.random() * 250));
      continue;
    }
    if (response.status !== 503 && response.status !== 408 && response.status < 500) break;
    if (attempt === 2) break;
    await response.body?.cancel().catch(() => {});
    await sleep(500 * (2 ** attempt) + Math.floor(Math.random() * 250));
  }
  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 429) throw new Error('Gemini 免费额度暂时用完，请稍后或明天再试。');
    if (response.status === 503) throw new Error('Gemini 当前繁忙，已自动重试 3 次，请稍后再试。');
    throw new Error(`Gemini 请求失败 (${response.status}${detail.includes('API_KEY') ? ', key configuration' : ''})。`);
  }
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('');
  if (!text) throw new Error('Gemini 没有返回可用评价。');
  return validateGeminiFeedback(JSON.parse(text));
}

async function refundDailyQuota(db, hash) {
  const date = new Date().toISOString().slice(0, 10);
  await db.prepare('UPDATE daily_usage SET request_count = MAX(0, request_count - 1) WHERE subject_hash = ? AND usage_date = ?').bind(hash, date).run();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);
    if (request.method === 'OPTIONS') return origin === env.ALLOWED_ORIGIN ? new Response(null, { status: 204, headers: cors }) : json({ error: 'Origin not allowed.' }, 403);
    if (url.pathname === '/health' && request.method === 'GET') return json({ ok: true, model: env.GEMINI_MODEL, auth: 'cloudflare-access-session' });
    if (url.pathname === '/session' && request.method === 'GET') {
      try {
        const identity = await verifyAccess(request, env);
        const token = await issueSession(String(identity.email || identity.sub), env);
        return sessionPage(token, env.ALLOWED_ORIGIN);
      } catch { return json({ error: 'Cloudflare Access authentication required.' }, 401); }
    }
    if (url.pathname !== '/v1/feedback' || request.method !== 'POST') return json({ error: 'Not found.' }, 404, cors);
    if (origin !== env.ALLOWED_ORIGIN) return json({ error: 'Origin not allowed.' }, 403);
    try {
      const identity = await verifySession(request, env);
      const hash = await subjectHash(identity.sub);
      const rate = await env.AI_RATE_LIMITER.limit({ key: hash });
      if (!rate.success) return json({ error: '请求过于频繁，请一分钟后再试。' }, 429, cors);
      const contentLength = Number(request.headers.get('Content-Length') || 0);
      if (contentLength > 5000) return json({ error: '请求内容过长。' }, 413, cors);
      const input = validateFeedbackInput(await request.json());
      const limit = Math.max(1, Math.min(100, Number(env.DAILY_LIMIT) || 20));
      const quota = await useDailyQuota(env.DB, hash, limit);
      if (!quota.allowed) return json({ error: `今日免费额度 ${limit} 次已用完，请明天再试。`, remaining: 0 }, 429, cors);
      let feedback;
      try { feedback = await callGemini(input, env); }
      catch (error) { await refundDailyQuota(env.DB, hash); throw error; }
      return json({ ...feedback, remaining: quota.remaining }, 200, cors);
    } catch (error) {
      const authError = /登录|会话|JWT|JWS|signature|token/i.test(error.message);
      return json({ error: error.message || 'AI Feedback 暂时不可用。' }, authError ? 401 : 400, cors);
    }
  },
};
