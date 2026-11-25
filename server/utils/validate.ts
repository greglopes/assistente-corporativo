import type { AgentInput, Classification } from '#shared/types'
import { AUDIENCES, LIMITS, TONES, findChannel } from '#shared/options'

export class ValidationError extends Error {}

function str(v: unknown, field: string, max: number, required = true): string {
  if (v === undefined || v === null || v === '') {
    if (required) throw new ValidationError(`Preencha o campo "${field}".`)
    return ''
  }
  if (typeof v !== 'string') throw new ValidationError(`Campo "${field}" inválido.`)
  const s = v.trim()
  if (required && !s) throw new ValidationError(`Preencha o campo "${field}".`)
  if (s.length > max) throw new ValidationError(`O campo "${field}" passou do limite de ${max} caracteres.`)
  return s
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 20).map(x => x.slice(0, 300)) : []
}

function classification(v: unknown): Classification | undefined {
  if (!v || typeof v !== 'object') return undefined
  const c = v as Record<string, unknown>
  const urg = ['baixa', 'media', 'alta'].includes(c.urgencia as string) ? c.urgencia as Classification['urgencia'] : 'media'
  return {
    tipo: String(c.tipo ?? '').slice(0, 120),
    intencao: String(c.intencao ?? '').slice(0, 300),
    urgencia: urg,
    pontosChave: strList(c.pontosChave),
    informacoesFaltantes: strList(c.informacoesFaltantes),
    alertas: strList(c.alertas),
  }
}

/** Valida a entrada estruturada vinda do navegador (fronteira do sistema). */
export function validateInput(body: unknown): AgentInput {
  if (!body || typeof body !== 'object') throw new ValidationError('Requisição inválida.')
  const b = body as Record<string, unknown>

  const channel = str(b.channel, 'Canal', 40)
  if (!findChannel(channel)) throw new ValidationError('Canal inválido.')
  const audience = str(b.audience, 'Público', 80)
  if (!AUDIENCES.includes(audience)) throw new ValidationError('Público inválido.')
  const tone = str(b.tone, 'Tom', 80)
  if (!TONES.includes(tone)) throw new ValidationError('Tom inválido.')

  const input: AgentInput = {
    objective: str(b.objective, 'Objetivo', LIMITS.objective),
    audience,
    channel,
    tone,
    content: str(b.content, 'Informações principais', LIMITS.content),
    sender: str(b.sender, 'Remetente', LIMITS.sender, false),
  }

  if (b.refine && typeof b.refine === 'object') {
    const r = b.refine as Record<string, unknown>
    input.refine = {
      draft: str(r.draft, 'Rascunho', LIMITS.draft),
      instruction: str(r.instruction, 'Ajuste', LIMITS.instruction),
    }
    input.classification = classification(b.classification)
  }
  return input
}
