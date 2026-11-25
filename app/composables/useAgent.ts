import type { AgentEvent, AgentRequest, AgentResult, Classification, StepId, StepStatus } from '#shared/types'

export interface StepState {
  id: StepId
  label: string
  description: string
  status: StepStatus
  detail?: string
  ms?: number
  data?: unknown
}

const STEP_DEFS: Omit<StepState, 'status'>[] = [
  { id: 'privacy', label: 'Proteção de dados', description: 'Mascara CPF, e-mail, telefone e afins antes de enviar à IA' },
  { id: 'classify', label: 'Triagem', description: 'Classifica a solicitação e identifica o que falta' },
  { id: 'generate', label: 'Redação', description: 'Escreve seguindo o manual de estilo e o formato do canal' },
  { id: 'review', label: 'Autoavaliação', description: 'Um revisor de IA confere tom, formato e invenções' },
  { id: 'rewrite', label: 'Correção automática', description: 'Reescreve se a revisão reprovar' },
  { id: 'final', label: 'Revisão humana', description: 'Você aprova, edita ou pede ajustes' },
]

function freshSteps(): StepState[] {
  return STEP_DEFS.map(s => ({ ...s, status: 'pending' }))
}

export function useAgent() {
  const steps = ref<StepState[]>(freshSteps())
  const result = ref<AgentResult | null>(null)
  const error = ref<string | null>(null)
  const running = ref(false)

  async function run(request: AgentRequest, refine?: { draft: string, instruction: string, classification: Classification }) {
    running.value = true
    error.value = null
    steps.value = freshSteps()
    if (!refine) result.value = null

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(refine
          ? { ...request, refine: { draft: refine.draft, instruction: refine.instruction }, classification: refine.classification }
          : request),
      })
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null) as { statusMessage?: string, message?: string } | null
        throw new Error(body?.statusMessage || body?.message || `Erro ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let nl
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim()
          buffer = buffer.slice(nl + 1)
          if (line) handle(JSON.parse(line) as AgentEvent)
        }
      }
    }
    catch (e) {
      error.value = (e as Error).message
    }
    finally {
      running.value = false
      for (const s of steps.value) if (s.status === 'running') s.status = 'error'
    }
  }

  function handle(ev: AgentEvent) {
    if (ev.type === 'error') {
      error.value = ev.message
      return
    }
    if (ev.type === 'result') {
      result.value = ev.result
      return
    }
    const step = steps.value.find(s => s.id === ev.step)
    if (!step) return
    step.status = ev.status
    if (ev.detail !== undefined) step.detail = ev.detail
    if (ev.ms !== undefined) step.ms = ev.ms
    if (ev.data !== undefined) step.data = ev.data
  }

  return { steps, result, error, running, run }
}
