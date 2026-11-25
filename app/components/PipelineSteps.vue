<script setup lang="ts">
import type { Classification } from '#shared/types'
import type { StepState } from '~/composables/useAgent'

defineProps<{ steps: StepState[] }>()

const ICON: Record<string, string> = { pending: '○', running: '◐', done: '●', skipped: '–', error: '✕' }

function classification(s: StepState) {
  return s.id === 'classify' && s.data ? s.data as Classification : null
}
</script>

<template>
  <section class="card">
    <h2>2. Fluxo do agente</h2>
    <ol class="steps">
      <li v-for="s in steps" :key="s.id" :class="['step', s.status]">
        <span class="icon" aria-hidden="true">{{ ICON[s.status] }}</span>
        <div class="step-body">
          <div class="step-title">
            <strong>{{ s.label }}</strong>
            <small v-if="s.ms" class="muted">{{ (s.ms / 1000).toFixed(1) }}s</small>
          </div>
          <p class="muted">{{ s.detail || s.description }}</p>

          <div v-if="classification(s)" class="diag">
            <p><b>Intenção:</b> {{ classification(s)!.intencao }}</p>
            <p v-if="classification(s)!.pontosChave.length">
              <b>Pontos-chave:</b> {{ classification(s)!.pontosChave.join(' · ') }}
            </p>
            <p v-if="classification(s)!.informacoesFaltantes.length" class="warn">
              <b>Faltando:</b> {{ classification(s)!.informacoesFaltantes.join(' · ') }}
            </p>
            <p v-if="classification(s)!.alertas.length" class="danger">
              <b>Alertas:</b> {{ classification(s)!.alertas.join(' · ') }}
            </p>
          </div>
        </div>
      </li>
    </ol>
  </section>
</template>
