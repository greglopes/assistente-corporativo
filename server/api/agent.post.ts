import { runAgent } from '../utils/agent'
import { LlmError } from '../utils/llm'
import { resolveLlm, serverSettings } from '../utils/provider'
import { checkRateLimit } from '../utils/rateLimit'
import { ValidationError, validateInput } from '../utils/validate'

// POST /api/agent — executa o agente e transmite cada etapa como uma linha JSON
// (NDJSON), para a interface mostrar o progresso em tempo real.
export default defineEventHandler(async (event) => {
  const settings = serverSettings(event)
  const ip = getRequestHeader(event, 'cf-connecting-ip') || getRequestIP(event, { xForwardedFor: true }) || 'local'
  const limit = checkRateLimit(ip, settings.rateMax, settings.rateWindowMin * 60_000)
  if (!limit.ok) {
    const min = Math.ceil(limit.retryAfterMs / 60_000)
    throw createError({ statusCode: 429, statusMessage: `Limite de uso atingido. Tente novamente em ${min} min.` })
  }

  let input
  try {
    input = validateInput(await readBody(event))
  }
  catch (e) {
    if (e instanceof ValidationError) throw createError({ statusCode: 400, statusMessage: e.message })
    throw e
  }

  let llm
  try {
    llm = resolveLlm(event)
  }
  catch (e) {
    throw createError({ statusCode: 503, statusMessage: (e as Error).message })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
      try {
        for await (const ev of runAgent(input, llm)) send(ev)
      }
      catch (e) {
        // Não registramos o conteúdo da solicitação em logs (privacidade).
        console.error('[agent] falha:', (e as Error).message)
        const message = e instanceof LlmError
          ? e.message
          : e instanceof SyntaxError
            ? 'O modelo devolveu uma resposta fora do formato esperado. Tente novamente.'
            : 'Erro inesperado ao executar o agente.'
        send({ type: 'error', message })
      }
      finally {
        controller.close()
      }
    },
  })

  setResponseHeaders(event, {
    'content-type': 'application/x-ndjson; charset=utf-8',
    'cache-control': 'no-store',
  })
  return sendStream(event, stream)
})
