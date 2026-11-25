# Redige — Parte Teórica

> Fundamentos de IA com foco em IA Generativa · UniFECAF · Greg Lopes
>
> **Tecnologia:** Nuxt 4 (Vue + servidor Nitro) · hospedagem no Cloudflare Pages
> **Apoio:** Claude Code (Anthropic), assistente de programação com IA
>
> 📄 Versão em PDF: [parte-teorica.pdf](parte-teorica.pdf) (gerada a partir de [print/parte-teorica.html](print/parte-teorica.html))

**Resumindo:** o Redige é um agente de IA que recebe um formulário simples e roda um *pipeline* de etapas: mascara os dados pessoais, entende o pedido, escreve, avalia o próprio texto (e reescreve se precisar) e entrega tudo para uma pessoa aprovar. Custo de infraestrutura: zero.

## 1. O problema e a solução

A Nova Rota Logística (empresa fictícia do desafio) tem um problema bem comum: muita gente escrevendo e-mails, comunicados e resumos de reunião, cada uma do seu jeito. O resultado são textos longos, tom inconsistente e um monte de retrabalho de revisão antes de qualquer coisa ser publicada.

### Por que não é só "usar o ChatGPT"?

Abrir um chatbot e pedir um texto resolve parte do problema, mas cria outros:

- **Todo mundo precisaria saber escrever um bom prompt**, toda vez. Cada pessoa escreveria um prompt diferente, e a inconsistência voltaria pela porta dos fundos.
- **Ninguém garante que o modelo não inventou nada**: uma data, um valor, uma promessa ao cliente.
- **Dados pessoais iriam direto para um fornecedor externo**, sem nenhum filtro. Na prática, as pessoas colam CPF, e-mail e telefone sem pensar duas vezes.

### A ideia do Redige

Em vez de deixar o "como escrever bem" na cabeça de cada colaborador, eu coloquei esse conhecimento **dentro do fluxo**. A pessoa só preenche um formulário estruturado (objetivo, canal, público, tom e as informações, que podem ser anotações soltas) e o agente cuida do resto: prompts especializados, manual de estilo da empresa, regras contra invenção, autoavaliação e proteção de dados. No fim, um humano sempre aprova.

### Tecnologias e ferramentas

- **Nuxt 4** (Vue no front-end e servidor Nitro no back-end): interface e API no mesmo projeto, com a chave do modelo protegida no servidor.
- **Cloudflare Pages**: hospedagem gratuita com URL pública e HTTPS, e deploy automático a cada push no GitHub.
- **Claude Code** (Anthropic): assistente de programação com IA, usado como apoio no desenvolvimento do código e da documentação.

## 2. Modelos de IA escolhidos (e por quê)

| Modelo | Papel | Por que escolhi |
|---|---|---|
| **Google Gemini Flash-Lite** (API, plano gratuito) | Principal: triagem, redação e revisão | Escreve bem em português; suporta **saída em JSON com schema**, o que permite que o código leia e tome decisões com base nas respostas; é rápido (cada pedido faz de 3 a 5 chamadas); e tem plano gratuito. |
| **Llama 3.3 70B** (Cloudflare Workers AI) | Reserva automática (*fallback*) | Roda na mesma infraestrutura onde o site está hospedado, também tem cota gratuita e não precisa de chave. Se o Gemini responder que a cota acabou (HTTP 429), a mesma chamada é refeita aqui, sem o usuário perceber. |

### Por que um modelo "leve" e não o mais potente?

A tarefa aqui é **reorganizar e reescrever fatos que já foram fornecidos**, e não resolver um problema complexo de raciocínio. Um modelo leve dá conta com qualidade, responde mais rápido (importante, já que são várias chamadas em sequência) e cabe no plano gratuito. É usar a ferramenta certa para o trabalho.

### Camada de modelo plugável

O agente não sabe qual modelo está usando: ele só conhece uma interface. Trocar o Gemini por GPT, Claude ou outro modelo é questão de configuração, sem mexer no fluxo:

```ts
interface Llm {
  name: string
  call(c: LlmCall): Promise<string>   // system prompt + prompt + schema JSON opcional
}
```

> **Ponto de atenção:** no plano gratuito do Gemini, o Google pode usar os dados enviados para melhorar seus produtos. Isso pesou bastante na decisão de **mascarar dados pessoais antes de qualquer chamada** (seção 6). Numa versão de produção, o certo seria usar um plano pago com cláusula de não treinamento.

## 3. Estratégia de prompts

Essas foram as técnicas de engenharia de prompt aplicadas, todas em [`server/utils/prompts.ts`](../server/utils/prompts.ts):

1. **Prompt chaining (dividir para conquistar):** em vez de um prompt gigante, são três prompts especializados (**triagem**, **redação** e **revisão**), cada um com papel, objetivo e formato de saída bem definidos.
2. **Role prompting:** cada etapa tem uma persona: "módulo de triagem", "redator oficial da Nova Rota", "revisor de qualidade".
3. **Contexto fixo da empresa:** um manual de estilo com 7 regras (clareza, informação principal primeiro, linguagem inclusiva, sempre dizer o que se espera do leitor…) entra em todas as etapas. É ele que resolve a padronização.
4. **Regras anti-alucinação:** "use somente os fatos informados" e "se faltar algo, escreva um marcador como `[DEFINIR DATA]`". Assim, o que o modelo não sabe vira uma **pendência visível** para o humano, e não uma invenção.
5. **Saída estruturada (JSON schema):** triagem e revisão respondem em JSON validado. É isso que permite ao código decidir sozinho se o texto precisa ser reescrito.
6. **Instruções por canal:** cada canal tem guia de formato e limite de palavras (e-mail com assunto e até 250 palavras; chat sem despedida e até 120; resumo de reunião com decisões e próximos passos etc.).
7. **Self-refine (autocrítica):** o rascunho passa por um prompt de revisor, e o feedback volta para o redator numa reescrita.
8. **Separar instrução de dado:** o texto do usuário vai entre tags `<informacoes>`, e o modelo é instruído a nunca seguir ordens que apareçam ali. É a defesa contra *prompt injection*.
9. **Temperatura por etapa:** 0,1 na triagem e 0 na revisão, para respostas consistentes; 0,6 na redação, para o texto soar natural.

Um trecho das regras da etapa de redação:

```text
REGRAS OBRIGATÓRIAS
- Use SOMENTE os fatos informados. Nunca invente datas, números, nomes,
  valores, links ou compromissos.
- Se uma informação necessária estiver faltando, escreva um marcador entre
  colchetes, por exemplo [DEFINIR DATA]. Um humano vai completar.
- Marcadores como [EMAIL_1] ou [CPF_1] substituem dados protegidos:
  copie-os exatamente como estão.
```

## 4. Como o fluxo funciona

`Privacidade → Triagem → Redação → Revisão → (Correção) → Humano`

1. **Entrada estruturada:** o formulário é validado no servidor (campos obrigatórios, tamanho máximo, valores permitidos). Há também um limite de requisições por IP, para ninguém esgotar a cota gratuita.
2. **Privacidade:** um filtro troca dados pessoais por marcadores (`[CPF_1]`, `[EMAIL_1]`…). O mapeamento fica só no servidor.
3. **Triagem (LLM):** o modelo entende o pedido antes de escrever e lista o que está faltando.
4. **Redação (LLM):** gera o texto com o manual de estilo, o formato do canal e o diagnóstico da triagem.
5. **Autoavaliação (LLM + código):** o revisor dá nota e lista invenções; o código conta palavras e encontra pendências.
6. **Decisão do agente:** ele decide sozinho se o texto está bom o suficiente:
   ```text
   aprovado = nota >= 8 && semInvencoes && tomAdequado && dentroDoLimite
   se (!aprovado && aindaNaoReescreveu) → reescreve com o feedback do revisor
   senão → entrega para o humano (com os alertas visíveis)
   ```
7. **Restauração:** os dados pessoais voltam para o texto, no servidor.
8. **Revisão humana:** a pessoa vê o rascunho, a nota, os alertas, as pendências e pode abrir **"Ver o que a IA recebeu"**, que compara lado a lado o texto original com o que de fato foi enviado ao modelo. Pode editar, pedir ajustes ("mais curto", "mais formal") e, só depois de confirmar que revisou, copiar o texto.

A interface recebe cada etapa em tempo real via *streaming* (NDJSON), então dá para ver o agente "pensando". O projeto tem **17 testes automatizados** cobrindo o mascaramento de dados, as decisões do agente (aprovar, reescrever, parar) e a validação de entrada.

## 5. Benefícios, limitações e supervisão humana

**Benefícios**
- Redigir uma comunicação rotineira cai de minutos para segundos.
- Todo texto sai no mesmo tom de voz, seguindo o mesmo manual.
- Anotações soltas (de uma reunião, por exemplo) viram documentos organizados.
- O agente aponta o que está faltando, o que melhora a informação na origem.
- O revisor automático reduz retrabalho e o risco de publicar algo inventado.

**Limitações**
- O revisor também é uma IA e pode deixar passar erros.
- O filtro de privacidade usa padrões (regex): pega CPF, e-mail etc., mas **não** nomes, endereços ou informações estratégicas.
- O plano gratuito tem cota baixa e instável: serve para protótipo, não para produção.
- O agente não envia nada nem acessa outros sistemas. É intencional, para o humano continuar no controle.
- Entrada ruim gera texto com muitas pendências.

**Quando a supervisão humana é obrigatória**
- **Sempre, antes de enviar:** a interface só libera a cópia depois da confirmação de revisão.
- Comunicações para **clientes e público externo**, por risco de imagem e de compromissos indevidos.
- Assuntos **jurídicos, de RH, demissões, saúde, valores financeiros** ou crises.
- Quando a triagem levanta **alertas**, o revisor aponta **invenções** ou sobram **marcadores pendentes**.

## 6. Análise de riscos

| Risco | Como aparece | O que fiz para mitigar | O que ainda resta |
|---|---|---|---|
| **Privacidade / LGPD** | Alguém cola dados pessoais de clientes ou colegas, e eles vão para um provedor externo. | Mascaramento de CPF, CNPJ, e-mail, telefone e cartão antes da chamada; nada é armazenado; o conteúdo não vai para os logs; aviso na interface; tela que mostra o que a IA recebeu. Segue o princípio da **necessidade/minimização** (art. 6º, III) e as medidas de segurança do art. 46 da LGPD. | Nomes e dados fora do padrão passam. Em produção: plano pago sem treinamento, contrato de operador (art. 39) e treinamento dos usuários. |
| **Alucinações** | O modelo inventa datas, valores ou promessas. | Regra "somente fatos informados"; marcadores para o que falta; revisor que lista invenções; reescrita automática; alertas visíveis; aprovação humana obrigatória. | O revisor também erra, então a responsabilidade final é sempre humana. |
| **Vieses** | Linguagem excludente, estereótipos, tom diferente conforme o público. | Regra de linguagem inclusiva no manual de estilo; o revisor avalia o tom; o público vem de uma lista fechada. | O modelo herda vieses do treinamento; vale auditar amostras periodicamente. |
| **Prompt injection** | O texto colado contém "ignore as instruções e…". | Dados do usuário entre tags e marcados como não executáveis; o agente não tem nenhuma ferramenta com efeito externo (não envia e-mail, não acessa sistemas). | Baixo: no pior caso sai um texto ruim, que ainda passa pela revisão humana. |
| **Chave e custo** | Vazamento da chave da API ou abuso da URL pública. | Chave só no servidor (secret do Cloudflare, fora do Git); limite por IP; limite de tamanho da entrada; validação de todos os campos. | O limite por IP é de "melhor esforço"; em produção, exigir login corporativo. |
| **Dependência de fornecedor** | Mudança de preço, de cota ou descontinuação do modelo. | Camada de modelo plugável e fallback automático para o Workers AI. | — |

## 7. Conclusão

O projeto mostrou na prática que IA Generativa vai muito além de conversar com um chatbot. Juntando **entrada estruturada, prompts especializados, saída em JSON, autoavaliação, decisões automáticas e supervisão humana**, saiu um agente que resolve uma tarefa real de trabalho, de forma padronizada e com os riscos tratados de forma explícita. As principais decisões (modelo leve e gratuito, mascaramento de dados, revisor automático e aprovação humana obrigatória) buscaram equilibrar **qualidade, custo e uso responsável**.

### Se fosse para uma v2

- Login corporativo (SSO) no lugar do limite por IP.
- Detecção de nomes e endereços com um modelo de NER, além das regex.
- Plano pago do modelo, com cláusula de não uso dos dados para treinamento.
- Histórico, fluxo de aprovação em equipe e métricas de qualidade (quantos textos foram aprovados sem edição, por exemplo).

## 8. Referências

- Material da disciplina Fundamentos de IA com Foco em IA Generativa — UniFECAF.
- Google AI for Developers. *Gemini API: structured output; rate limits.* https://ai.google.dev
- Cloudflare. *Workers AI* e *Cloudflare Pages*. https://developers.cloudflare.com
- OpenAI. *Prompt engineering guide.* https://platform.openai.com/docs
- Anthropic. *Prompt engineering overview.* https://docs.anthropic.com
- Make. *Documentação de automação e AI Agents.* https://help.make.com
- Brasil. Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais (LGPD).
