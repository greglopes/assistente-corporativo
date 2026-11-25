import type { AgentEvent, AgentInput, Checks, Classification, Review } from '#shared/types'
import { findChannel } from '#shared/options'
import type { Llm } from './llm'
import { createMasker, unmask } from './pii'
import {
  CLASSIFY_SCHEMA, CLASSIFY_SYSTEM, GENERATE_SYSTEM, REVIEW_SCHEMA, REVIEW_SYSTEM,
  classifyPrompt, feedbackFromReview, generatePrompt, refinePrompt, reviewPrompt, rewritePrompt,
} from './prompts'

/** Nota mínima para o agente aprovar o próprio rascunho sem reescrever. */
export const MIN_SCORE = 8
/** Quantas reescritas automáticas o agente pode fazer antes de entregar ao humano. */
export const MAX_REWRITES = 1

export function parseJson<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim()
  return JSON.parse(cleaned) as T
}

export function cleanDraft(raw: string): string {
  return raw.trim().replace(/^```\w*\n?/, '').replace(/\n?```$/, '').trim()
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length
}

const PII_TOKEN = /^\[(EMAIL|CPF|CNPJ|CARTAO|TELEFONE)_\d+\]$/

export function runChecks(draft: string, maxWords: number): Checks {
  const palavras = countWords(draft)
  const pendencias = [...new Set(draft.match(/\[[^\]\n]{2,60}\]/g) ?? [])]
    .filter(p => !PII_TOKEN.test(p))
  return { palavras, limitePalavras: maxWords, dentroDoLimite: palavras <= maxWords, pendencias }
}

function approved(review: Review, checks: Checks) {
  return review.nota >= MIN_SCORE
    && review.informacoesInventadas.length === 0
    && review.tomAdequado
    && checks.dentroDoLimite
}

/**
 * O agente: percorre as etapas e emite um evento a cada passo, para que a
 * interface mostre o raciocínio acontecendo. Decide sozinho se o rascunho
 * precisa ser reescrito (laço de autoavaliação) antes de entregar ao humano.
 */
export async function* runAgent(input: AgentInput, llm: Llm): AsyncGenerator<AgentEvent> {
  const started = Date.now()
  const channel = findChannel(input.channel)
  if (!channel) throw new Error('Canal inválido.')

  // 1. Privacidade — mascara dados pessoais antes de qualquer chamada ao modelo.
  let t = Date.now()
  yield { type: 'step', step: 'privacy', status: 'running' }
  const masker = createMasker()
  const req = {
    ...input,
    objective: masker.mask(input.objective),
    content: masker.mask(input.content),
    sender: input.sender ? masker.mask(input.sender) : input.sender,
  }
  const refine = input.refine
    ? { draft: masker.mask(input.refine.draft), instruction: masker.mask(input.refine.instruction) }
    : undefined
  const privacy = masker.findings()
  yield {
    type: 'step', step: 'privacy', status: 'done', ms: Date.now() - t, data: privacy,
    detail: privacy.length
      ? `${privacy.reduce((s, f) => s + f.count, 0)} dado(s) pessoal(is) mascarado(s) antes de ir para a IA`
      : 'Nenhum dado pessoal identificado',
  }

  // 2. Classificação — entende a tarefa antes de escrever.
  let classification: Classification
  if (input.classification) {
    classification = input.classification
    yield { type: 'step', step: 'classify', status: 'skipped', detail: 'Reaproveitada da geração anterior', data: classification }
  }
  else {
    t = Date.now()
    yield { type: 'step', step: 'classify', status: 'running' }
    classification = parseJson<Classification>(await llm.call({
      kind: 'classify', system: CLASSIFY_SYSTEM, prompt: classifyPrompt(req, channel), schema: CLASSIFY_SCHEMA, temperature: 0.1,
    }))
    yield { type: 'step', step: 'classify', status: 'done', ms: Date.now() - t, data: classification, detail: `${classification.tipo} · urgência ${classification.urgencia}` }
  }

  // 3. Geração (ou ajuste pedido pelo humano).
  t = Date.now()
  yield { type: 'step', step: 'generate', status: 'running', detail: refine ? `Aplicando ajuste: "${refine.instruction}"` : undefined }
  let draft = cleanDraft(await llm.call({
    kind: 'generate',
    system: GENERATE_SYSTEM,
    prompt: refine
      ? refinePrompt(req, channel, classification, refine.draft, refine.instruction)
      : generatePrompt(req, channel, classification),
    temperature: 0.6,
  }))
  yield { type: 'step', step: 'generate', status: 'done', ms: Date.now() - t, detail: `${countWords(draft)} palavras` }

  // 4. Revisão + reescrita automática se necessário.
  let review!: Review
  let checks!: Checks
  let attempts = 1
  for (;;) {
    t = Date.now()
    yield { type: 'step', step: 'review', status: 'running' }
    review = parseJson<Review>(await llm.call({
      kind: 'review', system: REVIEW_SYSTEM, prompt: reviewPrompt(req, channel, draft), schema: REVIEW_SCHEMA, temperature: 0,
    }))
    review.nota = Math.max(0, Math.min(10, Number(review.nota) || 0))
    checks = runChecks(draft, channel.maxWords)
    const ok = approved(review, checks)
    yield {
      type: 'step', step: 'review', status: 'done', ms: Date.now() - t, data: { review, checks },
      detail: `Nota ${review.nota}/10 · ${ok ? 'aprovado pelo agente' : 'precisa de ajustes'}`,
    }

    if (ok || attempts > MAX_REWRITES) break

    t = Date.now()
    const feedback = feedbackFromReview(review, !checks.dentroDoLimite, channel.maxWords)
    yield { type: 'step', step: 'rewrite', status: 'running', detail: `Corrigindo ${feedback.length} ponto(s)` }
    draft = cleanDraft(await llm.call({
      kind: 'generate', system: GENERATE_SYSTEM, prompt: rewritePrompt(req, channel, classification, draft, feedback), temperature: 0.4,
    }))
    attempts++
    yield { type: 'step', step: 'rewrite', status: 'done', ms: Date.now() - t, detail: `Nova versão com ${countWords(draft)} palavras` }
  }
  if (attempts === 1) yield { type: 'step', step: 'rewrite', status: 'skipped', detail: 'Não foi necessária' }

  // 5. Entrega ao humano — dados pessoais restaurados só agora, no servidor.
  yield { type: 'step', step: 'final', status: 'done', detail: 'Aguardando revisão humana' }
  yield {
    type: 'result',
    result: {
      draft: unmask(draft, masker.map),
      classification,
      review,
      checks,
      approvedByAgent: approved(review, checks),
      attempts,
      privacy,
      provider: llm.name,
      totalMs: Date.now() - started,
    },
  }
}
