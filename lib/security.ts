import type { NextRequest } from 'next/server'

type Bucket = { count: number; resetAt: number }

// In-memory rate limiter (best-effort). In serverless this may reset between invocations.
const buckets = new Map<string, Bucket>()

export function getClientIp(req: NextRequest) {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || 'unknown'
  const rip = req.headers.get('x-real-ip')
  if (rip) return rip.trim()
  return 'unknown'
}

export function rateLimit(req: NextRequest, key: string, max: number, windowMs: number) {
  const ip = getClientIp(req)
  const now = Date.now()
  const bucketKey = `${key}:${ip}`
  const b = buckets.get(bucketKey)
  if (!b || b.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: max - 1 }
  }
  if (b.count >= max) return { ok: false, remaining: 0 }
  b.count += 1
  buckets.set(bucketKey, b)
  return { ok: true, remaining: Math.max(0, max - b.count) }
}

export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  if (!origin || !host) return false
  try {
    const o = new URL(origin)
    return o.host === host
  } catch {
    return false
  }
}

export async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
}

