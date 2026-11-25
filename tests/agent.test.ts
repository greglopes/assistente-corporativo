import { describe, expect, it } from 'vitest'
import type { AgentEvent, AgentInput, AgentResult } from '#shared/types'
import { runAgent, runChecks } from '../server/utils/agent'
import type { Llm, LlmCall } from '../server/utils/llm'

const input: AgentInput = {
  objective: 'Avisar sobre novo processo de reembolso',
  audience: 'Toda a empresa',
  channel: 'chat',
  tone: 'Próximo e amigável',
  content: 'Reembolso só pelo app Despesas+. Dúvidas: financeiro@novarota.com.br',
}

const classification = {
  tipo: 'Aviso', intencao: 'Usar o app', urgencia: 'media',
  pontosChave: ['app Despesas+'], informacoesFaltantes: [], alertas: [],
}

function review(nota: number, inventadas: string[] = []) {
  return JSON.stringify({ nota, tomAdequado: true, estruturaAdequada: true, informacoesInventadas: inventadas, problemas: [], sugestoes: [] })
}

/** Modelo falso que registra as chamadas e responde por roteiro. */
function scripted(reviews: string[], drafts: string[]) {
  const calls: LlmCall[] = []
  const llm: Llm = {
    name: 'teste',
    async call(c) {
      calls.push(c)
      if (c.kind === 'classify') return JSON.stringify(classification)
      if (c.kind === 'review') return reviews.shift()!
      return drafts.shift()!
    },
  }
  return { llm, calls }
}

async function collect(gen: AsyncGenerator<AgentEvent>) {
  const events: AgentEvent[] = []
  for await (const e of gen) events.push(e)
  const result = (events.find(e => e.type === 'result') as { result: AgentResult }).result
  return { events, result }
}

describe('agente', () => {
  it('nunca envia dados pessoais ao modelo e os restaura no resultado', async () => {
    const { llm, calls } = scripted([review(9)], ['Use o app Despesas+. Dúvidas: [EMAIL_1]'])
    const { result } = await collect(runAgent(input, llm))

    for (const c of calls) expect(c.prompt).not.toContain('financeiro@novarota.com.br')
    expect(result.draft).toBe('Use o app Despesas+. Dúvidas: financeiro@novarota.com.br')
    expect(result.privacy).toEqual([{ type: 'e-mail', count: 1 }])
    expect(result.maskedInput).toBe('Reembolso só pelo app Despesas+. Dúvidas: [EMAIL_1]')
  })

  it('aprova sem reescrever quando a revisão é boa', async () => {
    const { llm, calls } = scripted([review(9)], ['Texto curto e bom.'])
    const { result, events } = await collect(runAgent(input, llm))

    expect(result.attempts).toBe(1)
    expect(result.approvedByAgent).toBe(true)
    expect(calls.map(c => c.kind)).toEqual(['classify', 'generate', 'review'])
    expect(events).toContainEqual(expect.objectContaining({ step: 'rewrite', status: 'skipped' }))
  })

  it('reescreve automaticamente quando o revisor encontra invenção', async () => {
    const { llm, calls } = scripted(
      [review(6, ['bônus de R$ 500']), review(9)],
      ['Use o app e ganhe bônus de R$ 500!', 'Use o app Despesas+.'],
    )
    const { result } = await collect(runAgent(input, llm))

    expect(result.attempts).toBe(2)
    expect(result.draft).toBe('Use o app Despesas+.')
    expect(calls.map(c => c.kind)).toEqual(['classify', 'generate', 'review', 'generate', 'review'])
    expect(calls[3]!.prompt).toContain('bônus de R$ 500')
  })

  it('para após uma reescrita e entrega ao humano mesmo se continuar ruim', async () => {
    const { llm } = scripted([review(4), review(5)], ['ruim', 'ainda ruim'])
    const { result } = await collect(runAgent(input, llm))

    expect(result.attempts).toBe(2)
    expect(result.approvedByAgent).toBe(false)
  })

  it('no ajuste pedido pelo humano reaproveita a triagem', async () => {
    const { llm, calls } = scripted([review(9)], ['Versão mais curta.'])
    await collect(runAgent({ ...input, classification: classification as never, refine: { draft: 'Versão longa', instruction: 'Mais curto' } }, llm))

    expect(calls.map(c => c.kind)).toEqual(['generate', 'review'])
    expect(calls[0]!.prompt).toContain('Mais curto')
  })
})

describe('verificações determinísticas', () => {
  it('conta palavras e lista marcadores pendentes, ignorando dados mascarados', () => {
    const c = runChecks('Reunião em [DEFINIR DATA] com [EMAIL_1] no [INSERIR LOCAL].', 5)
    expect(c.pendencias).toEqual(['[DEFINIR DATA]', '[INSERIR LOCAL]'])
    expect(c.dentroDoLimite).toBe(false)
  })
})
