<script setup lang="ts">
import type { AgentRequest } from '#shared/types'
import { AUDIENCES, CHANNELS, LIMITS, TONES } from '#shared/options'

const model = defineModel<AgentRequest>({ required: true })
defineProps<{ running: boolean }>()
const emit = defineEmits<{ submit: [] }>()

function loadExample(i: number) {
  model.value = { ...EXAMPLES[i]!.request }
}

const channelGuide = computed(() => CHANNELS.find(c => c.value === model.value.channel))
</script>

<template>
  <form class="card form" @submit.prevent="emit('submit')">
    <div class="card-head">
      <h2>1. Solicitação</h2>
      <div class="examples">
        <span class="muted">Exemplos:</span>
        <button v-for="(ex, i) in EXAMPLES" :key="ex.name" type="button" class="chip" @click="loadExample(i)">
          {{ ex.name }}
        </button>
      </div>
    </div>

    <label>
      <span>Objetivo da comunicação</span>
      <input v-model="model.objective" required :maxlength="LIMITS.objective" placeholder="Ex.: Avisar a equipe sobre o novo horário de expediente">
    </label>

    <div class="row">
      <label>
        <span>Canal</span>
        <select v-model="model.channel" required>
          <option v-for="c in CHANNELS" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
      </label>
      <label>
        <span>Público</span>
        <select v-model="model.audience" required>
          <option v-for="a in AUDIENCES" :key="a" :value="a">{{ a }}</option>
        </select>
      </label>
      <label>
        <span>Tom</span>
        <select v-model="model.tone" required>
          <option v-for="t in TONES" :key="t" :value="t">{{ t }}</option>
        </select>
      </label>
    </div>
    <p v-if="channelGuide" class="hint">
      Formato: {{ channelGuide.guide }} (até {{ channelGuide.maxWords }} palavras)
    </p>

    <label>
      <span>Informações principais <small class="muted">— pode colar anotações soltas</small></span>
      <textarea v-model="model.content" required rows="8" :maxlength="LIMITS.content" placeholder="Fatos, datas, responsáveis, links… O assistente não inventa o que não estiver aqui." />
    </label>

    <label>
      <span>Remetente <small class="muted">(opcional)</small></span>
      <input v-model="model.sender" :maxlength="LIMITS.sender" placeholder="Ex.: Equipe de RH">
    </label>

    <p class="privacy-note">
      🔒 CPF, CNPJ, e-mails, telefones e cartões são mascarados antes de chegar ao modelo de IA. Mesmo assim, evite colar dados sigilosos.
    </p>

    <button class="primary" type="submit" :disabled="running">
      {{ running ? 'Agente trabalhando…' : 'Gerar comunicação' }}
    </button>
  </form>
</template>
