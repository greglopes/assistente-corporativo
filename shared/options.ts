// Opções da entrada estruturada. Cada canal carrega seu próprio "guia de formato"
// e limite de palavras, que entram no prompt e na verificação automática.

export interface ChannelOption {
  value: string
  label: string
  guide: string
  maxWords: number
}

export const CHANNELS: ChannelOption[] = [
  {
    value: 'email',
    label: 'E-mail',
    guide: 'Primeira linha no formato "Assunto: ...". Depois saudação, corpo em parágrafos curtos, uma chamada para ação clara e despedida com assinatura.',
    maxWords: 250,
  },
  {
    value: 'chat',
    label: 'Mensagem de chat (Teams/Slack)',
    guide: 'Direto ao ponto. No máximo 3 parágrafos curtos ou tópicos. Sem linha de assunto e sem despedida formal.',
    maxWords: 120,
  },
  {
    value: 'comunicado',
    label: 'Comunicado interno',
    guide: 'Título em uma linha. Depois: contexto, o que muda / o que cada pessoa deve fazer, a partir de quando, e a quem procurar em caso de dúvidas.',
    maxWords: 300,
  },
  {
    value: 'ata',
    label: 'Resumo de reunião',
    guide: 'Seções com títulos: Pauta, Decisões, Próximos passos (com responsável e prazo) e Pendências. Use tópicos. Inclua Participantes apenas se forem informados.',
    maxWords: 350,
  },
  {
    value: 'linkedin',
    label: 'Post institucional (LinkedIn)',
    guide: 'Primeira linha que prenda a atenção, 3 a 5 parágrafos curtos, tom humano, encerramento convidando à interação e no máximo 3 hashtags.',
    maxWords: 220,
  },
]

export const AUDIENCES = [
  'Equipe interna',
  'Liderança / diretoria',
  'Toda a empresa',
  'Clientes',
  'Fornecedores e parceiros',
  'Público externo',
]

export const TONES = [
  'Formal',
  'Profissional e neutro',
  'Próximo e amigável',
  'Urgente',
  'Inspirador',
]

export const LIMITS = {
  objective: 300,
  content: 6000,
  sender: 120,
  instruction: 300,
  draft: 8000,
}

export function findChannel(value: string): ChannelOption | undefined {
  return CHANNELS.find(c => c.value === value)
}
