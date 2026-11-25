<script setup lang="ts">
import type { AgentResult } from '#shared/types'

const props = defineProps<{ result: AgentResult, running: boolean }>()
const emit = defineEmits<{ refine: [draft: string, instruction: string] }>()

const draft = ref(props.result.draft)
watch(() => props.result, (r) => {
  draft.value = r.draft
  confirmed.value = false
})

const confirmed = ref(false)
const copied = ref(false)
const instruction = ref('')
const QUICK = ['Mais curto', 'Mais formal', 'Mais amigável', 'Use tópicos', 'Destaque o prazo']

const edited = computed(() => draft.value !== props.result.draft)

async function copy() {
  await navigator.clipboard.writeText(draft.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

function refine(text: string) {
  if (!text.trim()) return
  emit('refine', draft.value, text.trim())
  instruction.value = ''
}

function scoreClass(n: number) {
  return n >= 8 ? 'good' : n >= 6 ? 'mid' : 'bad'
}
</script>

<template>
  <section class="card result">
    <div class="card-head">
      <h2>3. Rascunho para sua revisão</h2>
      <span :class="['badge', result.approvedByAgent ? 'good' : 'mid']">
        {{ result.approvedByAgent ? 'Aprovado pelo agente' : 'Revise com atenção' }}
      </span>
    </div>

    <textarea v-model="draft" class="draft" rows="14" aria-label="Rascunho gerado (editável)" />
    <p class="muted small">
      {{ result.checks.palavras }}/{{ result.checks.limitePalavras }} palavras ·
      {{ result.attempts }} versão(ões) · {{ (result.totalMs / 1000).toFixed(1) }}s · {{ result.provider }}
      <span v-if="edited"> · editado por você</span>
    </p>

    <div class="review-grid">
      <div :class="['score', scoreClass(result.review.nota)]">
        <strong>{{ result.review.nota }}</strong><small>/10</small>
        <span>nota do revisor</span>
      </div>
      <ul class="checks">
        <li :class="result.review.tomAdequado ? 'ok' : 'nok'">Tom adequado ao público</li>
        <li :class="result.review.estruturaAdequada ? 'ok' : 'nok'">Formato do canal</li>
        <li :class="result.checks.dentroDoLimite ? 'ok' : 'nok'">Dentro do limite de palavras</li>
        <li :class="result.review.informacoesInventadas.length ? 'nok' : 'ok'">Sem informações inventadas</li>
      </ul>
    </div>

    <div v-if="result.checks.pendencias.length" class="callout warn">
      <b>Complete antes de enviar:</b> {{ result.checks.pendencias.join(', ') }}
    </div>
    <div v-if="result.review.informacoesInventadas.length" class="callout danger">
      <b>Possíveis invenções do modelo:</b>
      <ul><li v-for="x in result.review.informacoesInventadas" :key="x">{{ x }}</li></ul>
    </div>
    <div v-if="result.classification.alertas.length" class="callout danger">
      <b>Alertas da triagem:</b> {{ result.classification.alertas.join(' · ') }}
    </div>
    <div v-if="result.review.sugestoes.length" class="callout">
      <b>Sugestões do revisor:</b>
      <ul><li v-for="x in result.review.sugestoes" :key="x">{{ x }}</li></ul>
    </div>
    <div v-if="result.privacy.length" class="callout info">
      🔒 Mascarados antes da IA e restaurados aqui:
      {{ result.privacy.map(p => `${p.count} ${p.type}`).join(', ') }}
    </div>

    <div class="refine">
      <span class="muted">Pedir ajuste ao agente:</span>
      <div class="examples">
        <button v-for="q in QUICK" :key="q" type="button" class="chip" :disabled="running" @click="refine(q)">{{ q }}</button>
      </div>
      <form class="refine-row" @submit.prevent="refine(instruction)">
        <input v-model="instruction" maxlength="300" placeholder="Ex.: mencione que o estacionamento continua liberado">
        <button type="submit" :disabled="running || !instruction.trim()">Ajustar</button>
      </form>
    </div>

    <div class="approve">
      <label class="check">
        <input v-model="confirmed" type="checkbox">
        Revisei o texto, conferi os fatos e assumo a responsabilidade pelo envio.
      </label>
      <button class="primary" :disabled="!confirmed" @click="copy">
        {{ copied ? 'Copiado ✓' : 'Aprovar e copiar' }}
      </button>
    </div>
  </section>
</template>
