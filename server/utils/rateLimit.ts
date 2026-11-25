// Limite simples por IP, em memória. No Cloudflare cada instância tem sua
// própria memória, então é um limite "melhor esforço" — suficiente para
// evitar que uma pessoa esgote sozinha a cota gratuita do modelo.

const hits = new Map<string, number[]>()

export function checkRateLimit(key: string, max: number, windowMs: number, now = Date.now()) {
  const recent = (hits.get(key) ?? []).filter(ts => now - ts < windowMs)
  if (recent.length >= max) {
    hits.set(key, recent)
    const retryAfterMs = windowMs - (now - recent[0]!)
    return { ok: false as const, retryAfterMs }
  }
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) hits.clear() // evita crescimento sem limite
  return { ok: true as const, remaining: max - recent.length }
}
