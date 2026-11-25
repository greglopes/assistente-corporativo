import type { AgentRequest } from '#shared/types'

// Exemplos prontos para demonstração (e para o vídeo pitch).
export const EXAMPLES: { name: string, request: AgentRequest }[] = [
  {
    name: 'Anotações → resumo de reunião',
    request: {
      objective: 'Registrar as decisões da reunião de planejamento da frota',
      audience: 'Equipe interna',
      channel: 'ata',
      tone: 'Profissional e neutro',
      sender: 'Coordenação de Operações',
      content: `reuniao seg manha, ana (ops), bruno (frota), carla (financeiro)
- 3 caminhoes parados p manutencao, atraso nas entregas regiao sul
- decidido alugar 2 veiculos temporarios ate fim do mes, carla aprova orcamento
- bruno vai ligar p oficina pra prazo dos reparos
- ana avisa clientes afetados ate quarta
- pendente: definir se terceiriza rota de campinas
proxima reuniao: segunda que vem`,
    },
  },
  {
    name: 'Comunicado de mudança',
    request: {
      objective: 'Avisar sobre a mudança no processo de reembolso de despesas',
      audience: 'Toda a empresa',
      channel: 'comunicado',
      tone: 'Próximo e amigável',
      sender: 'Equipe Financeira',
      content: `a partir de 1º de dezembro reembolso so pelo app novo (Despesas+), nao aceitamos mais planilha por email
prazo para enviar: ate dia 5 do mes seguinte
nota fiscal tem que ser foto legivel
duvidas: financeiro@novarota.com.br ou ramal 2040`,
    },
  },
  {
    name: 'E-mail a cliente sobre atraso',
    request: {
      objective: 'Informar o cliente sobre atraso na entrega e oferecer alternativa',
      audience: 'Clientes',
      channel: 'email',
      tone: 'Formal',
      sender: 'Ana Souza — Atendimento',
      content: `pedido 48213 da Mercado Bom Preço atrasou por causa de manutencao na frota
nova previsao: quinta-feira
podemos oferecer entrega parcial amanha com o que temos em estoque
contato direto da Ana: (11) 98765-4321`,
    },
  },
]
