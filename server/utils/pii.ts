import type { PiiFinding } from '#shared/types'

// Filtro de privacidade (LGPD): dados pessoais são trocados por marcadores
// ANTES de qualquer texto ser enviado ao modelo de IA e restaurados depois,
// apenas no servidor. O modelo nunca vê CPF, e-mail, telefone etc.

interface Pattern {
  type: string
  label: string
  regex: RegExp
}

// A ordem importa: padrões mais longos/específicos primeiro.
const PATTERNS: Pattern[] = [
  { type: 'EMAIL', label: 'e-mail', regex: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g },
  { type: 'CNPJ', label: 'CNPJ', regex: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g },
  { type: 'CARTAO', label: 'cartão', regex: /\b(?:\d{4}[ .-]?){3}\d{4}\b/g },
  { type: 'CPF', label: 'CPF', regex: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g },
  { type: 'TELEFONE', label: 'telefone', regex: /(?:\+?55[\s-]?)?\(?\b\d{2}\)?[\s-]?9?\d{4}[\s-]?\d{4}\b/g },
]

export interface MaskResult {
  text: string
  map: Map<string, string>
}

/**
 * Mascara um conjunto de textos compartilhando o mesmo mapa, para que o mesmo
 * dado receba o mesmo marcador em todos eles.
 */
export function createMasker() {
  const map = new Map<string, string>() // marcador -> valor original
  const reverse = new Map<string, string>() // valor original -> marcador
  const counters = new Map<string, number>()

  function mask(text: string): string {
    let out = text
    for (const p of PATTERNS) {
      out = out.replace(p.regex, (match) => {
        const existing = reverse.get(match)
        if (existing) return existing
        const n = (counters.get(p.type) ?? 0) + 1
        counters.set(p.type, n)
        const token = `[${p.type}_${n}]`
        map.set(token, match)
        reverse.set(match, token)
        return token
      })
    }
    return out
  }

  function findings(): PiiFinding[] {
    return PATTERNS
      .filter(p => counters.has(p.type))
      .map(p => ({ type: p.label, count: counters.get(p.type)! }))
  }

  return { mask, map, findings }
}

export function unmask(text: string, map: Map<string, string>): string {
  let out = text
  for (const [token, original] of map) {
    out = out.split(token).join(original)
  }
  return out
}
