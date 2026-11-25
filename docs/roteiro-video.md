# Roteiro do Vídeo Pitch (até 4 minutos)

> Grave a tela com o app aberto e a câmera no canto (Loom facilita). Publique como **não listado** e teste o link numa aba anônima.

| Tempo | O que mostrar | O que falar (sugestão) |
|---|---|---|
| **0:00–0:30** · Problema | Você na câmera ou um slide simples | "Na Nova Rota Logística, cada colaborador escreve de um jeito. E-mails longos, comunicados sem padrão, atas que ninguém lê, e muito tempo gasto revisando. Fui chamado para resolver isso com IA Generativa." |
| **0:30–1:00** · Solução | Tela inicial do Redige | "Este é o Redige, um agente de IA. A pessoa não precisa saber escrever prompts: informa objetivo, canal, público, tom e as informações, mesmo que sejam anotações soltas. O agente faz o resto." |
| **1:00–2:30** · Demo real | Clique no exemplo **Anotações → resumo de reunião** e em **Gerar**. Aponte cada etapa acendendo | "Primeiro, ele protege os dados pessoais: CPF, e-mail e telefone nunca chegam ao modelo, por causa da LGPD. Depois faz a triagem: entende que é um resumo de reunião e aponta o que está faltando. Em seguida escreve, seguindo o manual de estilo da empresa. E então avalia o próprio texto: um segundo prompt, de revisor, dá nota e procura informações inventadas. Se reprovar, o agente reescreve sozinho." Mostre o resultado, a nota e os marcadores `[DEFINIR…]`. Clique em **Mais curto** e mostre o ajuste. Marque a caixa de revisão e clique em **Aprovar e copiar**: "A decisão final é sempre humana." |
| **2:30–3:15** · Ferramentas | README com o diagrama do fluxo | "Usei o Gemini Flash-Lite pela qualidade em português, pela saída em JSON e pelo plano gratuito, com o Workers AI da Cloudflare como reserva. A aplicação é em Nuxt, hospedada no Cloudflare Pages a custo zero. Os prompts são separados por etapa, com regras para não inventar fatos e proteção contra prompt injection." |
| **3:15–3:50** · Ganho | Você na câmera | "O principal ganho: uma comunicação padronizada, no tom da empresa, em segundos em vez de minutos, com os riscos à vista: o que falta fica marcado, invenções são apontadas e nada sai sem revisão humana." |
| **3:50–4:00** · Fechamento | URL do app na tela | "O link está na descrição. Obrigado!" |

**Dicas**
- Teste a demo antes de gravar: a cota gratuita pode acabar. Se acontecer, o app troca sozinho para o Workers AI.
- Para mostrar a proteção de dados, use o exemplo **E-mail a cliente**, que tem um telefone: o painel mostra "1 telefone mascarado".
- Fale do problema da empresa, não de "o que é IA". O enunciado avalia as **decisões** tomadas.
