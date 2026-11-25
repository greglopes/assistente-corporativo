export interface AgentRequest {
  objective: string
  audience: string
  channel: string
  tone: string
  content: string
  sender?: string
}

/** Pedido de ajuste feito pelo humano sobre um rascunho já gerado. */
export interface RefineRequest {
  draft: string
  instruction: string
}

export interface AgentInput extends AgentRequest {
  refine?: RefineRequest
  classification?: Classification
}

export interface Classification {
  tipo: string
  intencao: string
  urgencia: 'baixa' | 'media' | 'alta'
  pontosChave: string[]
  informacoesFaltantes: string[]
  alertas: string[]
}

export interface Review {
  nota: number
  tomAdequado: boolean
  estruturaAdequada: boolean
  informacoesInventadas: string[]
  problemas: string[]
  sugestoes: string[]
}

export interface Checks {
  palavras: number
  limitePalavras: number
  dentroDoLimite: boolean
  /** Marcadores como [DEFINIR DATA] que o humano precisa completar. */
  pendencias: string[]
}

export interface PiiFinding {
  type: string
  count: number
}

export type StepId = 'privacy' | 'classify' | 'generate' | 'review' | 'rewrite' | 'final'

export type StepStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error'

export interface AgentResult {
  draft: string
  classification: Classification
  review: Review
  checks: Checks
  approvedByAgent: boolean
  attempts: number
  privacy: PiiFinding[]
  provider: string
  totalMs: number
}

export type AgentEvent =
  | { type: 'step', step: StepId, status: StepStatus, detail?: string, data?: unknown, ms?: number }
  | { type: 'result', result: AgentResult }
  | { type: 'error', message: string }
