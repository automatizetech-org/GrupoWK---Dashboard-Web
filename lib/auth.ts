const COOKIE_NAME = 'dashboard_session'

const PBKDF2_ITERATIONS = Number(process.env.AUTH_PBKDF2_ITERATIONS || 120000)

function b64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString('base64')
}

function b64url(bytes: Uint8Array) {
  return b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromB64(str: string) {
  return new Uint8Array(Buffer.from(str, 'base64'))
}

function fromB64url(str: string) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4))
  const s = (str + pad).replace(/-/g, '+').replace(/_/g, '/')
  return fromB64(s)
}

async function hmacSha256(secret: string, data: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return new Uint8Array(sig)
}

export type SessionRole = 'user' | 'admin'

export type SessionPayload = {
  sub: string // username
  role: SessionRole
  exp: number // epoch seconds
}

export function getSessionCookieName() {
  return COOKIE_NAME
}

function getSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET
  if (secret) return secret

  // Em desenvolvimento local, permite rodar sem configurar SESSION_SECRET.
  // (Em produção, SEMPRE configure.)
  if (process.env.NODE_ENV !== 'production') return 'dev-session-secret'

  return null
}

export async function signSession(payload: Omit<SessionPayload, 'exp'>, maxAgeSeconds: number) {
  const secret = getSessionSecret()
  if (!secret) throw new Error('SESSION_SECRET não configurado')

  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds
  const fullPayload: SessionPayload = { ...payload, exp }
  const body = b64url(new TextEncoder().encode(JSON.stringify(fullPayload)))
  const sig = b64url(await hmacSha256(secret, body))
  return `${body}.${sig}`
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  const secret = getSessionSecret()
  if (!secret) return null

  const [body, sig] = token.split('.')
  if (!body || !sig) return null

  const expected = b64url(await hmacSha256(secret, body))
  if (sig !== expected) return null

  const payloadRaw = new TextDecoder().decode(fromB64url(body))
  const payload = JSON.parse(payloadRaw) as SessionPayload
  if (!payload?.sub || !payload?.role || !payload?.exp) return null

  if (payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}

export type PasswordHash = string

export async function hashPassword(password: string): Promise<PasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    256
  )
  const hash = new Uint8Array(bits)
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(hash)}`
}

export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4) return false
  const [algo, iterStr, saltB64, hashB64] = parts
  if (algo !== 'pbkdf2_sha256') return false

  const iterations = Number(iterStr)
  if (!Number.isFinite(iterations) || iterations < 10000) return false

  const salt = fromB64(saltB64)
  const expected = fromB64(hashB64)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    expected.length * 8
  )
  const actual = new Uint8Array(bits)

  // comparação em tempo constante
  if (actual.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i]
  return diff === 0
}

