import { serverSettings } from '../utils/provider'

// Informa à interface qual provedor está ativo (sem expor chaves).
export default defineEventHandler((event) => {
  const s = serverSettings(event)
  return {
    provider: s.provider,
    model: s.provider === 'gemini' ? s.geminiModel : s.provider === 'workers-ai' ? s.workersAiModel : 'mock',
    configured: s.provider !== 'gemini' || Boolean(s.geminiKey),
  }
})
