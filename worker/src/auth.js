import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';

const encoder = new TextEncoder();
const jwksByDomain = new Map();

function secret(env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET is not configured.');
  return encoder.encode(env.SESSION_SECRET);
}

export async function verifyAccess(request, env) {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) throw new Error('Cloudflare Access token is missing.');
  const teamDomain = String(env.TEAM_DOMAIN || '').replace(/\/$/, '');
  if (!teamDomain.startsWith('https://') || !env.ACCESS_AUD) throw new Error('Cloudflare Access is not configured.');
  let jwks = jwksByDomain.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    jwksByDomain.set(teamDomain, jwks);
  }
  const { payload } = await jwtVerify(token, jwks, { issuer: teamDomain, audience: env.ACCESS_AUD });
  return payload;
}

export async function issueSession(subject, env) {
  return new SignJWT({ scope: 'speaking:feedback' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime('8h')
    .setIssuer('podcast-youci-speaking-ai')
    .setAudience('podcast-youci-web')
    .sign(secret(env));
}

export async function verifySession(request, env) {
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') || '');
  if (!match) throw new Error('请先登录 AI Feedback。');
  const { payload } = await jwtVerify(match[1], secret(env), {
    issuer: 'podcast-youci-speaking-ai',
    audience: 'podcast-youci-web',
  });
  if (payload.scope !== 'speaking:feedback' || !payload.sub) throw new Error('登录会话无效。');
  return payload;
}

export async function subjectHash(subject) {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(subject));
  return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('');
}
