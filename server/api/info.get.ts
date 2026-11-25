import { serverSettings } from '../utils/provider'

// Informa à interface qual provedor está ativo (sem expor chaves).
export default defineEventHandler((event) => {
  const s = serverSettings(event)
  const hasWorkersAi = Boolean((event.context as { cloudflare?: { env?: { AI?: unknown } } }).cloudflare?.env?.AI)
  // Sem chave do Gemini, o agente usa o Workers AI (quando disponível).
  const useWorkers = s.provider === 'workers-ai' || (s.provider === 'gemini' && !s.geminiKey && hasWorkersAi)
  return {
    provider: useWorkers ? 'workers-ai' : s.provider,
    model: s.provider === 'mock' ? 'mock' : useWorkers ? s.workersAiModel.split('/').pop() : s.geminiModel,
    configured: s.provider === 'mock' || useWorkers ? (s.provider !== 'workers-ai' || hasWorkersAi) : Boolean(s.geminiKey),
  }
})
