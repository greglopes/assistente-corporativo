import type { H3Event } from 'h3'
import { type Llm, LlmError, createGemini, createMockLlm, createWorkersAi } from './llm'

interface CfEnv {
  AI?: Parameters<typeof createWorkersAi>[0]
  [k: string]: unknown
}

function cfEnv(event: H3Event): CfEnv {
  return (event.context as { cloudflare?: { env?: CfEnv } }).cloudflare?.env ?? {}
}

/** Lê uma configuração do runtimeConfig, com fallback para as variáveis do Cloudflare. */
function setting(event: H3Event, key: string, envName: string): string {
  const cfg = useRuntimeConfig(event) as Record<string, unknown>
  const env = cfEnv(event)
  const v = cfg[key] || env[envName]
  return v === undefined || v === null ? '' : String(v)
}

export function serverSettings(event: H3Event) {
  return {
    provider: setting(event, 'aiProvider', 'NUXT_AI_PROVIDER') || 'gemini',
    geminiKey: setting(event, 'geminiApiKey', 'NUXT_GEMINI_API_KEY'),
    geminiModel: setting(event, 'geminiModel', 'NUXT_GEMINI_MODEL') || 'gemini-flash-lite-latest',
    workersAiModel: setting(event, 'workersAiModel', 'NUXT_WORKERS_AI_MODEL') || '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    rateMax: Number(setting(event, 'rateLimitPerWindow', 'NUXT_RATE_LIMIT_PER_WINDOW')) || 8,
    rateWindowMin: Number(setting(event, 'rateLimitWindowMinutes', 'NUXT_RATE_LIMIT_WINDOW_MINUTES')) || 10,
  }
}

/**
 * Escolhe o modelo. Com Gemini configurado e o binding de Workers AI
 * disponível, cria um "plano B": se a cota gratuita do Gemini acabar,
 * a chamada é refeita no Workers AI automaticamente.
 */
export function resolveLlm(event: H3Event): Llm {
  const s = serverSettings(event)
  const ai = cfEnv(event).AI
  const workers = ai ? createWorkersAi(ai, s.workersAiModel) : undefined

  if (s.provider === 'mock') return createMockLlm()
  if (s.provider === 'workers-ai') {
    if (!workers) throw new LlmError('Workers AI só está disponível no Cloudflare (binding "AI" não encontrado).')
    return workers
  }
  if (!s.geminiKey) {
    if (workers) return workers
    throw new LlmError('Nenhum modelo configurado. Defina NUXT_GEMINI_API_KEY ou use NUXT_AI_PROVIDER=mock.')
  }

  const gemini = createGemini(s.geminiKey, s.geminiModel)
  if (!workers) return gemini

  let current: Llm = gemini
  return {
    get name() { return current.name },
    async call(c) {
      try {
        return await current.call(c)
      }
      catch (e) {
        if (current === gemini && e instanceof LlmError && e.quota) {
          current = workers
          return current.call(c)
        }
        throw e
      }
    },
  }
}
