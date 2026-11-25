# Parte Teórica — Análise e Discussão

> **Rascunho para revisão.** Ajuste com suas palavras, com o que foi visto em aula e com os resultados reais dos seus testes antes de entregar.

## 1. Contextualização do problema e da solução

Numa empresa em crescimento, a comunicação escrita consome tempo e sai sem padrão. Cada colaborador redige e-mails, comunicados e resumos de reunião do seu jeito: os textos ficam longos demais, o tom muda de pessoa para pessoa e muita coisa precisa ser revisada antes de ser publicada.

A solução proposta, o **Redige**, é um agente de IA Generativa que recebe uma **solicitação estruturada** (objetivo, canal, público, tom e informações principais) e devolve uma comunicação pronta para revisão, padronizada pelo manual de estilo da empresa. A diferença em relação a usar um chatbot é que o colaborador não precisa saber escrever um bom prompt. O conhecimento de "como escrever bem para cada canal" fica embutido no fluxo, e o agente confere o próprio trabalho antes de entregar.

## 2. Modelos de IA utilizados e justificativa

| Modelo | Papel | Justificativa |
|---|---|---|
| **Google Gemini Flash-Lite** | Modelo principal (triagem, redação e revisão) | Bom desempenho em português; suporte a **saída JSON com esquema**, essencial para a triagem e a revisão serem lidas por código; baixa latência (o fluxo faz 3 a 5 chamadas por pedido); plano gratuito, que atende à meta de custo zero do protótipo |
| **Llama 3.3 70B (Cloudflare Workers AI)** | Reserva automática | Roda na mesma infraestrutura da hospedagem e também tem cota gratuita. Entra sozinho quando a cota do Gemini acaba, garantindo disponibilidade |

**Por que não um modelo maior?** A tarefa é reescrever e organizar fatos já fornecidos, e não raciocinar sobre problemas complexos. Um modelo leve resolve com qualidade, responde mais rápido e cabe no plano gratuito. A arquitetura isola o modelo atrás de uma interface única (`Llm`), então trocar para GPT, Claude ou outro Gemini exige mudar apenas uma configuração.

**Ressalva importante:** no plano gratuito, o Google pode usar os dados enviados para melhorar seus produtos. Isso reforçou a decisão de mascarar dados pessoais antes de qualquer chamada (seção 6). Em produção, a empresa deveria usar um plano pago com cláusula de não treinamento.

## 3. Estratégia de prompt e instruções

As técnicas de engenharia de prompt aplicadas foram:

1. **Decomposição da tarefa em etapas (prompt chaining):** em vez de um prompt gigante, há três prompts especializados: triagem, redação e revisão. Cada um tem um papel, um objetivo e uma saída bem definidos.
2. **Definição de papel (role prompting):** "módulo de triagem", "redator oficial da Nova Rota Logística", "revisor de qualidade".
3. **Contexto fixo da empresa:** um manual de estilo com 7 regras, incluído em todas as etapas. É ele que resolve o problema de padronização.
4. **Restrições explícitas e anti-alucinação:** "use somente os fatos informados", "nunca invente datas, números ou nomes", "se faltar, use um marcador como [DEFINIR DATA]". Assim, o que o modelo não sabe vira uma pendência visível para o humano, e não uma invenção.
5. **Saída estruturada:** triagem e revisão respondem em JSON validado por esquema. Isso permite ao código tomar decisões (reescrever ou não) com base na resposta.
6. **Instruções por canal:** cada canal tem um guia de formato e um limite de palavras (por exemplo, e-mail com linha de assunto e até 250 palavras; chat sem despedida e até 120 palavras).
7. **Autocrítica (self-refine):** o rascunho é avaliado por um segundo prompt de revisor, e o feedback volta ao redator numa reescrita.
8. **Separação entre instrução e dado:** o texto do usuário vai entre tags `<informacoes>`, e o modelo é instruído a nunca seguir instruções que apareçam ali (defesa contra *prompt injection*).
9. **Temperatura por etapa:** 0,1 na triagem e 0 na revisão, para respostas consistentes; 0,6 na redação, para um texto mais natural.

## 4. Fluxo de funcionamento do assistente

1. **Entrada estruturada:** formulário com objetivo, canal, público, tom, informações e remetente. Os campos são validados no servidor (tamanho e valores permitidos).
2. **Proteção de dados:** CPF, CNPJ, e-mail, telefone e cartão são trocados por marcadores (`[EMAIL_1]`).
3. **Triagem (LLM):** identifica o tipo de comunicação, a intenção, a urgência, os pontos-chave, as informações faltantes e os alertas.
4. **Redação (LLM):** gera o texto com o manual de estilo, o formato do canal e o diagnóstico da triagem.
5. **Autoavaliação (LLM + código):** o revisor dá nota, avalia tom e formato e lista invenções. O código conta as palavras e encontra as pendências.
6. **Decisão do agente:** se a nota for menor que 8, houver invenção, o tom estiver errado ou o texto passar do limite, o agente **reescreve sozinho** com o feedback (no máximo uma vez).
7. **Restauração** dos dados pessoais, feita só no servidor.
8. **Revisão humana:** o usuário vê o rascunho, a nota, os alertas e as pendências. Pode editar, pedir ajustes (que reiniciam o fluxo a partir da redação) e, por fim, confirmar que revisou e copiar o texto.

A interface mostra cada etapa em tempo real, o que deixa o processo transparente para quem usa.

## 5. Benefícios, limitações e supervisão humana

**Benefícios**
- Reduz o tempo de redação de comunicações rotineiras de minutos para segundos.
- Padroniza o tom de voz da empresa, já que todos os textos seguem o mesmo manual.
- Transforma anotações soltas (como as de uma reunião) em documentos organizados.
- Aponta o que está faltando (datas, responsáveis), o que melhora a qualidade da informação.
- O revisor automático reduz retrabalho e o risco de publicar algo inventado.

**Limitações**
- O modelo pode errar mesmo com o revisor, que também é uma IA e pode deixar passar problemas.
- O filtro de dados pessoais usa padrões (regex): reconhece CPF, e-mail etc., mas **não** nomes próprios, endereços ou informações estratégicas.
- O plano gratuito tem cota baixa e instável, o que serve para um protótipo, mas não para uso em produção.
- O agente não tem acesso a sistemas da empresa (agenda, CRM) nem envia mensagens. Isso é intencional, para manter o humano no controle.
- A qualidade depende das informações fornecidas: entrada ruim gera texto com muitas pendências.

**Quando a supervisão humana é indispensável**
- **Sempre antes de enviar:** a interface só libera a cópia depois da confirmação de revisão.
- Comunicações para **clientes e público externo** (risco de imagem e de compromissos indevidos).
- Assuntos **jurídicos, de RH, demissões, saúde, valores financeiros** ou crises.
- Quando a triagem levanta **alertas** ou o revisor aponta **informações inventadas**.
- Quando há **marcadores pendentes** como `[DEFINIR DATA]`.

## 6. Análise de riscos

| Risco | Como se manifesta | Mitigação adotada | Risco residual |
|---|---|---|---|
| **Privacidade / LGPD** | Colaborador cola dados pessoais de clientes ou colegas, e esses dados vão para um provedor externo | Mascaramento de CPF, CNPJ, e-mail, telefone e cartão antes da chamada; nenhum armazenamento; conteúdo fora dos logs; aviso na interface; princípio da **minimização** (art. 6º, III, da LGPD) | Nomes e dados não padronizados passam. Em produção: plano pago sem treinamento, contrato de operador (art. 39), registro das operações e treinamento dos usuários |
| **Alucinações** | O modelo inventa datas, valores ou promessas | Regra "somente fatos informados"; marcadores para o que falta; revisor que lista invenções; reescrita automática; destaque visual; aprovação humana obrigatória | O revisor também pode errar, por isso a responsabilidade final é sempre humana |
| **Vieses** | Linguagem excludente, estereótipos, tom diferente conforme o público | Regra de linguagem inclusiva no manual de estilo; o revisor avalia a adequação do tom; o público é escolhido de uma lista fechada | O modelo herda vieses do treinamento. Recomenda-se auditar amostras periodicamente |
| **Segurança: prompt injection** | Texto colado contém "ignore as instruções e…" | Dados do usuário delimitados por tags e marcados como não executáveis; o agente não tem ferramentas com efeito externo (não envia e-mails nem acessa sistemas) | Baixo: o pior caso é um texto ruim, que passa pela revisão humana |
| **Segurança: chave e custo** | Vazamento da chave da API ou abuso da URL pública | A chave fica só no servidor, como segredo do Cloudflare; limite de requisições por IP; limite de tamanho da entrada; validação de todos os campos | O limite por IP é de melhor esforço. Em produção, exigir login corporativo |
| **Dependência de fornecedor** | Mudança de preço, cota ou descontinuação do modelo | Camada de modelo intercambiável e reserva automática no Workers AI | — |

## 7. Conclusão

O projeto mostra que IA Generativa vai além de conversar com um chatbot. Ao combinar **entrada estruturada, prompts especializados, saída em JSON, autoavaliação, decisões automáticas e supervisão humana**, o resultado é um agente que executa uma tarefa real de trabalho de forma padronizada e com riscos tratados explicitamente. As principais decisões (modelo leve e gratuito, mascaramento de dados, revisor automático e aprovação humana obrigatória) foram tomadas para equilibrar **qualidade, custo e uso responsável**.

## Referências

- Disciplina Fundamentos de IA com Foco em IA Generativa.
- Google AI for Developers. *Gemini API — Structured output; Rate limits.* https://ai.google.dev
- Cloudflare. *Workers AI* e *Pages* — documentação. https://developers.cloudflare.com
- OpenAI. *Prompt engineering guide.* https://platform.openai.com/docs
- Anthropic. *Prompt engineering overview.* https://docs.anthropic.com
- Brasil. Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais (LGPD).
