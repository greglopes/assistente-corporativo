<script setup lang="ts">
import type { AgentRequest } from '#shared/types'

const form = ref<AgentRequest>({
  objective: '',
  audience: 'Equipe interna',
  channel: 'email',
  tone: 'Profissional e neutro',
  content: '',
  sender: '',
})

// Guarda a solicitação usada na última geração, para os ajustes seguirem o mesmo contexto.
const lastRequest = ref<AgentRequest | null>(null)
const { steps, result, error, running, run } = useAgent()
const { data: info } = await useFetch('/api/info')

async function generate() {
  lastRequest.value = { ...form.value }
  await run(lastRequest.value)
}

async function refine(draft: string, instruction: string) {
  if (!lastRequest.value || !result.value) return
  await run(lastRequest.value, { draft, instruction, classification: result.value.classification })
}
</script>

<template>
  <div class="page">
    <header class="hero">
      <div>
        <p class="eyebrow">Nova Rota Logística · protótipo acadêmico</p>
        <h1>Redige</h1>
        <p class="lead">
          Agente de IA Generativa que transforma uma solicitação simples em uma comunicação corporativa
          padronizada — com proteção de dados, autoavaliação e aprovação humana.
        </p>
      </div>
      <p v-if="info" class="provider muted small">
        Modelo: {{ info.model }}
        <span v-if="!info.configured" class="danger"> · chave não configurada</span>
      </p>
    </header>

    <main class="grid">
      <RequestForm v-model="form" :running="running" @submit="generate" />
      <div class="stack">
        <PipelineSteps :steps="steps" />
        <div v-if="error" class="callout danger" role="alert">{{ error }}</div>
        <ResultPanel v-if="result" :result="result" :running="running" :original="lastRequest?.content ?? ''" @refine="refine" />
      </div>
    </main>

    <footer class="muted small">
      Textos gerados por IA podem conter erros. Sempre revise antes de enviar.
      Nenhuma solicitação é armazenada por esta aplicação.
    </footer>
  </div>
</template>
