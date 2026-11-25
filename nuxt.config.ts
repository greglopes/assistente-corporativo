// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Redige — Assistente Corporativo de Comunicação',
      meta: [
        { name: 'description', content: 'Agente de IA Generativa que transforma solicitações simples em comunicações corporativas padronizadas.' },
      ],
    },
  },

  // Valores sobrescritos por variáveis de ambiente NUXT_* (ver .env.example).
  // Tudo aqui fica só no servidor — a chave nunca chega ao navegador.
  runtimeConfig: {
    aiProvider: 'gemini', // gemini | workers-ai | mock
    geminiApiKey: '',
    geminiModel: 'gemini-flash-lite-latest',
    workersAiModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    rateLimitPerWindow: 8,
    rateLimitWindowMinutes: 10,
  },

  nitro: {
    preset: 'cloudflare_pages',
  },
})
