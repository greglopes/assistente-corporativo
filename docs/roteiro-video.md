# Roteiro do Vídeo Pitch (até 4 minutos)

> A demonstração inteira usa um único exemplo: **🔒 Dados sensíveis (demo LGPD)**, um e-mail do RH dando boas-vindas a uma nova colaboradora. Todos os dados são fictícios.
>
> Grave a tela com a câmera no canto (o Loom facilita). Publique como **não listado** e teste o link numa janela anônima.

## Antes de gravar

- Abra https://assistente-corporativo.pages.dev e faça **uma** geração de teste, para confirmar que a cota do Gemini está ok.
- Recarregue a página para começar o vídeo com o formulário vazio.
- Deixe uma segunda aba aberta no README do GitHub, na seção **Fluxo da solução**.
- Ative o "Não perturbe" do Mac e aumente o zoom do navegador (Cmd +).

## Roteiro

| Tempo | O que mostrar | O que falar (sugestão) |
|---|---|---|
| **0:00–0:30** · Problema | Você na câmera | "Na Nova Rota Logística, cada colaborador escreve de um jeito. Os textos saem longos e sem padrão, e muita coisa precisa ser revisada. Tem ainda um risco maior: no dia a dia, as pessoas colam CPF, e-mail e telefone em qualquer ferramenta de IA. Meu desafio foi criar um assistente que resolvesse a padronização **sem** expor dados pessoais." |
| **0:30–0:50** · Solução | Tela inicial do Redige | "Este é o Redige, um agente de IA Generativa. O colaborador não precisa saber escrever prompts: informa objetivo, canal, público, tom e as informações, mesmo que sejam anotações soltas." |
| **0:50–1:15** · Entrada | Clique em **🔒 Dados sensíveis (demo LGPD)** e passe o mouse pelo campo de informações | "Vou usar um caso real do RH: dar boas-vindas a uma nova colaboradora. Repare que as anotações têm o CPF dela, dois e-mails, o CNPJ de um parceiro, um cartão corporativo e um telefone. Esses dados são fictícios, mas é exatamente o que alguém colaria." |
| **1:15–2:00** · Agente trabalhando | Clique em **Gerar comunicação** e acompanhe as etapas acendendo à direita | "Primeiro, o agente protege os dados: são seis dados pessoais trocados por marcadores **antes** de qualquer coisa ir para a IA. Depois vem a triagem: ele entende que é uma comunicação de boas-vindas e aponta o que está faltando. Em seguida escreve seguindo o manual de estilo da empresa. E então avalia o próprio texto: um segundo prompt, de revisor, dá uma nota e procura informações inventadas. Se reprovar, o agente reescreve sozinho." |
| **2:00–2:40** · O momento LGPD | No resultado, abra **Ver o que a IA recebeu** | "Esta é a parte que mais importa. À esquerda está o que o colaborador escreveu; à direita, o que de fato chegou ao modelo de IA. O CPF virou `[CPF_1]`, os e-mails viraram `[EMAIL_1]` e `[EMAIL_2]`, e o mesmo vale para o cartão, o CNPJ e o telefone. O modelo nunca viu esses dados. Eles só voltam no rascunho final, restaurados no servidor da aplicação." |
| **2:40–3:10** · Supervisão humana | Mostre a nota, as pendências (`[DEFINIR…]`) e os alertas. Clique em **Mais curto**. Depois marque a caixa de revisão e clique em **Aprovar e copiar** | "O que faltou não foi inventado: virou uma pendência visível. Posso pedir ajustes, como 'mais curto', e o agente refaz. Mas nada sai sem uma pessoa confirmar que revisou: o botão só libera depois disso." |
| **3:10–3:40** · Ferramentas | Aba do README no GitHub, no diagrama do fluxo | "Usei o Gemini Flash-Lite pela qualidade em português, pela saída em JSON e pelo plano gratuito, com o Workers AI da Cloudflare como reserva automática. A aplicação é em Nuxt, hospedada no Cloudflare Pages a custo zero. São três prompts especializados, com regras para não inventar fatos e proteção contra prompt injection." |
| **3:40–4:00** · Ganho e fechamento | Você na câmera, com a URL na tela | "O ganho: comunicações padronizadas, no tom da empresa, em segundos, sem expor dados pessoais a um fornecedor externo e sempre com revisão humana. O link está na descrição. Obrigado!" |

## Dicas

- **Fale das decisões, não de "o que é IA"**: por que mascarar os dados, por que o agente se autoavalia, por que o humano aprova. É isso que o enunciado avalia.
- **Se a triagem ou o revisor levantar um alerta** (por exemplo, sobre mandar CPF por e-mail), aproveite: "o próprio agente sinalizou o risco, e a decisão fica com o humano."
- **Se a cota do Gemini acabar**, o site troca sozinho para o Workers AI. O nome do modelo aparece no rodapé do resultado. Se acontecer, comente: é a reserva automática funcionando.
- **Ensaie uma vez cronometrando.** O trecho do agente trabalhando (1:15–2:00) costuma estourar o tempo.
