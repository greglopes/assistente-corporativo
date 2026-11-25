// Camada de modelo: o agente só conhece a interface `Llm`. Assim é possível
// trocar Gemini por Workers AI (ou um simulador) sem mexer no fluxo.

export type CallKind = 'classify' | 'generate' | 'review'

export interface LlmCall {
  kind: CallKind
  system: string
  prompt: string
  /** Quando presente, o modelo deve responder JSON nesse formato. */
  schema?: JsonSchema
  temperature?: number
}

export interface JsonSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean'
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  enum?: string[]
  required?: string[]
}

export interface Llm {
  name: string
  call: (c: LlmCall) => Promise<string>
}

export class LlmError extends Error {
  constructor(message: string, public readonly quota = false) {
    super(message)
  }
}

// ---------- Google Gemini (REST) ----------

function toGeminiSchema(s: JsonSchema): Record<string, unknown> {
  const out: Record<string, unknown> = { type: s.type.toUpperCase() }
  if (s.enum) out.enum = s.enum
  if (s.required) out.required = s.required
  if (s.items) out.items = toGeminiSchema(s.items)
  if (s.properties) {
    out.properties = Object.fromEntries(
      Object.entries(s.properties).map(([k, v]) => [k, toGeminiSchema(v)]),
    )
  }
  return out
}

export function createGemini(apiKey: string, model: string): Llm {
  return {
    name: `Google Gemini (${model})`,
    async call(c) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: c.system }] },
            contents: [{ role: 'user', parts: [{ text: c.prompt }] }],
            generationConfig: {
              temperature: c.temperature ?? 0.4,
              ...(c.schema
                ? { responseMimeType: 'application/json', responseSchema: toGeminiSchema(c.schema) }
                : {}),
            },
          }),
        },
      )
      if (res.status === 429) throw new LlmError('Cota gratuita do Gemini esgotada no momento.', true)
      if (!res.ok) throw new LlmError(`Gemini respondeu ${res.status}.`)
      const data = await res.json() as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      const text = data.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? ''
      if (!text.trim()) throw new LlmError('O modelo retornou uma resposta vazia (possível bloqueio de segurança).')
      return text
    },
  }
}

// ---------- Cloudflare Workers AI (binding "AI") ----------

interface WorkersAiBinding {
  run: (model: string, input: Record<string, unknown>) => Promise<{ response?: unknown }>
}

export function createWorkersAi(ai: WorkersAiBinding, model: string): Llm {
  return {
    name: `Cloudflare Workers AI (${model.split('/').pop()})`,
    async call(c) {
      try {
        const out = await ai.run(model, {
          messages: [
            { role: 'system', content: c.system },
            { role: 'user', content: c.prompt },
          ],
          temperature: c.temperature ?? 0.4,
          max_tokens: 1500,
          ...(c.schema ? { response_format: { type: 'json_schema', json_schema: c.schema } } : {}),
        })
        const r = out.response
        return typeof r === 'string' ? r : JSON.stringify(r ?? '')
      }
      catch (e) {
        throw new LlmError(`Workers AI falhou: ${(e as Error).message}`)
      }
    },
  }
}

// ---------- Simulador (sem custo, sem rede) ----------
// Útil para testar a interface localmente sem chave e para os testes automatizados.

export function createMockLlm(): Llm {
  return {
    name: 'Simulador local (mock)',
    async call(c) {
      await new Promise(r => setTimeout(r, 300))
      if (c.kind === 'classify') {
        return JSON.stringify({
          tipo: 'Comunicação informativa',
          intencao: 'Informar o público sobre o assunto descrito',
          urgencia: 'media',
          pontosChave: ['Ponto principal extraído das informações'],
          informacoesFaltantes: ['Data exata não informada'],
          alertas: [],
        })
      }
      if (c.kind === 'review') {
        return JSON.stringify({
          nota: 9,
          tomAdequado: true,
          estruturaAdequada: true,
          informacoesInventadas: [],
          problemas: [],
          sugestoes: ['Conferir a data antes de enviar.'],
        })
      }
      const info = /<informacoes>\n?([\s\S]*?)\n?<\/informacoes>/.exec(c.prompt)?.[1] ?? ''
      return `Assunto: Atualização importante\n\nOlá, equipe!\n\n${info.trim()}\n\nA mudança vale a partir de [DEFINIR DATA].\n\nObrigado,\n[Seu nome]`
    },
  }
}
