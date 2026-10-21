# Design

## Context

- Aplicação React 19 + TypeScript 6 + Vite 8. Estilos em CSS Modules. Sem biblioteca de UI, sem gerenciador de estado global, sem suíte de testes.
- O chat (`src/components/ai-chat/AiChat.tsx`) é autocontido: estado `isOpen`, `messages`, `draft`, `isPending`; o `App` só passa a prop `context` (`GeminiContext`).
- O cliente do Gemini (`src/services/geminiClient.ts`) é a fronteira com a API: monta o `systemInstruction` a partir do contexto, converte `ChatTurn` → `contents` (`role: 'assistant'` → `'model'`), e converte falhas em mensagens de usuário.
- O `buildSystemInstruction` atual define a identidade do assistente e as regras de estilo, mas **não** restringe assunto. É essa lacuna que a change fecha.
- O padrão de serviço do projeto: cliente assíncrono em `src/services/`, `AbortController` com timeout de 10s e escuta do `AbortSignal` do caller, `TypeError` para falha de conectividade, erros de API representados como mensagem pronta para o usuário.
- Não há testes automatizados no repositório (`package.json` não tem script de teste, e `npm run lint` referencia um `eslint` que não está instalado). A verificação disponível é `npm run build` (`tsc -b && vite build`) e o teste manual via `npm run dev`.

### Fatos da API do Gemini relevantes (verificados nas tipagens de `@google/genai@2.30.0`)

| Fato | Impacto no design |
|---|---|
| `config.systemInstruction?: ContentUnion` | O escopo é declarado no `systemInstruction` — não há campo separado de "guardrails". |
| `response.text` é `get text(): string \| undefined` | A resposta do modelo precisa de guarda antes de ser traduzida. |
| `ContentRole = 'user' \| 'model'` | O papel `'assistant'` não existe na API; o mapeamento continua no cliente. |
| `config.abortSignal?: AbortSignal` | Cancelamento é client-side only. A guarda local acontece antes de criar o controller, então uma recusa não chega a instanciar `GoogleGenAI`. |

## Goals / Non-Goals

**Goals:**
- O assistente responde apenas sobre clima e meteorologia.
- Fora de escopo, a resposta é **exatamente** `Posso apenas informar sobre o clima de um determinado lugar`.
- A recusa não custa uma chamada à API nem cota.
- A garantia da frase exata não depende de o modelo obedecer a uma instrução.
- A mudança é pequena e isolada: não toca em `App.tsx`, em estilos, nem no fluxo de clima/geolocalização.

**Non-Goals:**
- Modo "só dados do app" (sem meteorologia geral). O escopo escolhido inclui meteorologia em geral.
- Detecção de idioma ou de intent com modelo dedicado (classificador via LLM). Avaliada e descartada — dobra custo e latência por mensagem.
- Filtro por lista negra de assuntos (bloquear "poesia", "filme", …). A abordagem é por vocabulário positivo, não por exclusão.
- Streaming, persistência do histórico, backend intermediário — fora do escopo desde a change anterior.
- Permitir perguntas sobre como o app funciona. O usuário **não** escolheu essa opção; a mensagem de abertura é ajustada para não prometer isso.

## Decisions

### 1. Duas camadas de restrição: guarda local + instrução de sistema

**Escolha:** um classificador local decide o escopo **antes** de qualquer chamada; o `systemInstruction` reinforce o escopo para o que passar pela guarda.

**Racional:** a exigência central é que a resposta fora de escopo seja uma frase específica e exata. Uma instrução ao modelo não garante isso: o modelo pode parafrasear, acrescentar uma explicação, ou simplesmente responder a pergunta. A guarda local transformaria a restrição em propriedade do app — não há caminho em que a API seja chamada com uma mensagem fora de escopo e a resposta visível seja outra coisa.

A instrução de sistema não é redundante: ela cobre a janela em que a guarda local deixa passar algo fora de escopo (ver decisão 3). Duas camadas com responsabilidades distintas: a guarda decide, o prompt assegura.

**Alternativas:**
- *Só via prompt* — mais simples, sem custo extra, mas a frase exata fica a cargo do modelo. Rejeitada: não atende ao requisito de garantia.
- *Classificador via Gemini (structured output)* — não depende de heurística local. Rejeitada: dobra o custo e a latência de cada mensagem (inclusive das claramente fora de escopo, que são justamente as que mais se beneficiariam de uma resposta imediata), e ainda depende do modelo decidir. A complexidade não se paga para um widget de um app de previsão do tempo.

### 2. A guarda fica em um módulo novo: `src/services/chatScope.ts`

**Escolha:** um módulo novo e sem dependências, no mesmo diretório `src/services/` dos demais clientes, exportando a política de escopo.

**Racional:** o projeto separa "regras de domínio" em `src/services/`. A política de escopo é regra de domínio, não UI. Mantê-la fora do componente `AiChat.tsx` deixa o componente responsável apenas por UI e estado (como está hoje), deixa a lógica testável isoladamente caso uma suíte de testes seja adicionada depois, e evita inflar o `geminiClient.ts` (que hoje é exclusivamente sobre transporte,-system-instruction e tratamento de erro).

**Interface:**
```ts
/** Resposta fixa para mensagens fora de escopo. */
export const OUT_OF_SCOPE_REPLY =
  'Posso apenas informar sobre o clima de um determinado lugar'

/** Marcador que o modelo emite para recusar; traduzido para OUT_OF_SCOPE_REPLY. */
export const OUT_OF_SCOPE_MARKER = '[fora-de-escopo]'

export function isWeatherRelated(text: string, priorTurns: ChatTurn[]): boolean
export function toVisibleReply(text: string): string
```

### 3. Classificação por vocabulário positivo, com default-deny e memória de conversa

**Escolha:** a mensagem é considerada dentro de escopo se (a) contiver termo de clima/meteorologia, **ou** (b) a conversa anterior já tratou de clima e a mensagem for uma continuação. A ausência de ambos ⇒ fora de escopo.

**Racional:** o default-deny é deliberado. Um default-permissive (recusar só quando claramente fora de escopo) deixaria passar justamente o que o requisito proíbe: o pedido de recusa é para "qualquer coisa diferente". A escolha do default define o comportamento de todos os casos ambíguos, e o default que protege o requisito é o que nega.

O vocabulário é uma lista de termos em português e inglês (temperatura, chuva, vento, tempestade, furacão, previsão, umidade, geada, calor, frio, snow, rain, storm, temperature, forecast, humidity, wind…). A presença de um termo é sinal forte de escopo; a ausência é sinal fraco — e é por isso que a continuação de conversa (b) existe: "e amanhã?", "nessa hora?" não repetem vocabulário de clima, mas continuam uma pergunta sobre clima e recusá-las seria absurdo do ponto de vista do usuário.

**Limitação aceita:** a guarda é léxica, não semântica. Uma pergunta fora de escopo que por acaso cite clima ("como ficou o tempo na queda do Império Romano?") passa pela guarda — e é aí que a instrução de sistema assume. Uma pergunta sobre clima redigida sem nenhum termo de clima e sem contexto prévio ("está bom pra sair?") é recusada indevidamente. Os dois casos são erros de fronteira, não de núcleo: o requisito "qualquer coisa diferente" é coberto, e a pergunta de follow-up mais comum é coberta pela regra (b).

**Alternativas:**
- *Lista negra de assuntos* — rejeitada: é aberta (qualquer assunto fora da lista passa) e a lista seria arbitrária e incompleta.
- *Heurística por palavra-chave com LLM de classificação* — rejeitada pela decisão 1.

### 4. O marcador interno é traduzido para a frase fixa

**Escolha:** a instrução de sistema diz ao modelo: para assunto fora de escopo, responda **exatamente** `[fora-de-escopo]`. O cliente verifica a resposta: se o marcador estiver presente — sozinho, com maiúsculas diferentes ou cercado de texto — `toVisibleReply` o substitui por `OUT_OF_SCOPE_REPLY`.

**Racional:** sem essa normalização, um modelo que recusa com "Posso apenas informar sobre o clima de um determinado lugar, mas…" violaria o requisito de texto exato. Com ela, o texto visível ao usuário é sempre o esperado, independentemente do que o modelo escrever em volta do marcador. A checagem é tolerante (o marcador pode vir cercado de texto, com maiúsculas, ou sozinho) para não depender de obediência literal.

**Alternativa:** o modelo responde direto com a frase em português e o cliente compara com `OUT_OF_SCOPE_REPLY` por igualdade. Rejeitada: frágil demais — qualquer variação de pontuação ou caixinha do modelo passa pelo crivo, e a frase acabaria vazando para a tela.

### 5. A guarda roda no `sendDraft`, antes de criar o `AbortController`

**Escolha:** em `AiChat.sendDraft`, o texto é classificado logo após a validação de vazio. Se fora de escopo, a mensagem do usuário é adicionada ao histórico, a resposta fixa é adicionada, e a função retorna — sem `setIsPending(true)`, sem `new AbortController()`, sem `sendChatMessage`.

**Racional:** o ponto de decisão fica no componente porque é onde o histórico e a UI vivem. O `AbortController` é criado depois da guarda, então uma recusa não instancia `GoogleGenAI` nem dispara requisição alguma. O `isPending` nunca chega a ficar `true`, então o indicador de "Digitando…" não aparece — a resposta é síncrona e instantânea.

**Estado e reentrância:** o caminho de recusa não toca em `isPending` nem em `abortRef`, então os guards `isPending`/`isSubmittingRef` (que protegem contra envio duplicado) não são afetados. A recusa adiciona duas mensagens ao histórico (usuário + assistente) na mesma atualização de estado, o que é coerente com o resto do componente, que já adiciona mensagens em lote.

### 6. A instrução de sistema declara o escopo e o marcador

**Escolha:** `buildSystemInstruction` ganha um parágrafo de escopo: o assistente responde apenas sobre clima e meteorologia, usa os dados atuais do app, e para qualquer outro assunto responde exatamente `[fora-de-escopo]`.

**Racional:** o `systemInstruction` é o único lugar onde o escopo pode ser declarado ao modelo. O texto já é em português e já instrui sobre brevidade, então o escopo entra como mais uma linha do mesmo bloco — coerente com a convenção existente e com o `config.yaml` (nenhuma regra adicional definida).

O marcador é interno e não deve vazar para a tela — daí a tradução na decisão 4.

### 7. A mensagem de abertura é ajustada, sem novo estilo

**Escolha:** a `WELCOME_MESSAGE` deixa de dizer "Pergunte sobre o clima na sua região ou sobre como o app funciona" e passa a declarar que o assistente responde sobre o clima. O placeholder do campo ("Escreva sua pergunta…") é mantido, ou ajustado para sugerir uma pergunta de clima.

**Racional:** a mensagem de abertura atual promete um escopo que deixa de existir. Deixá-la seria uma inconsistência visível: o chat diz que ajuda com o app e depois recusa perguntas sobre o app. A mudança é só de texto — a recusa reaproveita a mesma bolha `.message.assistant` já existente, e **nenhuma** alteração de CSS é necessária. O `AiChat.module.css` fica intocado.

### 8. A resposta da recusa não passa pelo tratamento de erros do Gemini

**Escolha:** a recusa é uma resposta normal no histórico, não um erro. Ela não usa `role="alert"` nem o caminho de `catch` do `sendDraft`.

**Racional:** a recusa é o comportamento esperado do produto para mensagens fora de escopo, não uma falha. Tratá-la como erro faria o chat anunciar "erro" via leitor de tela (`role="alert"`) para algo que é uma resposta normal, e poluiria o caminho de tratamento de erros do cliente. A recusa entra na thread como `role: 'assistant'`, como qualquer outra resposta.

## Risks / Trade-offs

- **[Risco] Falso negativo da guarda (recusa indevida).** "Está bom pra sair?" é recusado, mesmo sendo claramente sobre clima. → [Mitigação] a lista de termos é ampla e включа termos coloquiais (tempo, dia, sol, calor, frio, chuva, vento, "tá chovendo"); a regra de continuação de conversa cobre o follow-up; e a falha é-graceful — o usuário recebe a recusa, não um erro. Ampliar a lista é ajuste de um arquivo, sem mudança de arquitetura.
- **[Risco] Falso positivo da guarda (aceita fora de escopo).** "Como era o tempo na Roma Antiga?" passa pela guarda. → [Mitigação] a instrução de sistema cobre exatamente esse caso: o modelo recusa, e o marcador é traduzido para a frase fixa. É a razão de a segunda camada existir.
- **[Risco] O modelo não emite o marcador e responde textualmente.** A instrução diz "exatamente", mas modelos desviam. → [Mitigação] a checagem do marcador é tolerante (case-insensitive, aceita o marcador contido no texto); se o modelo recusar sem o marcador, o texto do modelo é renderizado — a garantia da frase exata fica para o caminho principal (guarda local), que não depende do modelo. Registrado como limitação conhecida, não como bug.
- **[Trade-off] Manutenção de uma lista de palavras.** Uma lista léxica precisa de manutenção conforme o vocabulário do usuário cresce. → Aceito: é uma política deliberadamente simples e legível, e a lista é um array plano em um único arquivo, fácil de estender. Uma abordagem semântica exigiria infraestrutura que o projeto não tem.
- **[Risco] Regressão na spec `ai-chat` consolidada.** O delta adiciona requisitos a uma capability já arquivada. → [Mitigação] o arquivamento (`/opsx:archive`) aplica o delta sobre `openspec/specs/ai-chat/spec.md`, que já existe e serve de baseline.

## Migration Plan

Sem migração de dados — o histórico do chat vive em memória, por sessão, e é descartado com a aba.

1. Criar `src/services/chatScope.ts` com a frase fixa, o marcador, o vocabulário e o classificador.
2. Alterar `src/services/geminiClient.ts`: `buildSystemInstruction` declara o escopo e o marcador; `sendChatMessage` traduz a resposta do modelo que contém o marcador.
3. Alterar `src/components/ai-chat/AiChat.tsx`: guarda antes do envio, mensagem de abertura ajustada, placeholder do campo.
4. Validar com `npm run build` e o teste manual via `npm run dev`.

**Nota de verificação:** `npm run lint` referencia `eslint`, que não está instalado no projeto (nem há config ESLint). O script falha hoje, antes e depois desta change — a validação é `npm run build`.

## Open Questions

- **(baixo impacto) Amplitude do vocabulário de clima.** A lista inicial cobre português e inglês coloquiais. Perguntas em outros idiomas (espanhol, francês) caem no default-deny e são recusadas. → Se o uso real mostrar demanda por outros idiomas, ampliar a lista é alteração de um array.
- **(baixo impacto) treatments de perguntas meta sobre o app.** "Você é um robô?" cai na regra (b) se a conversa já era sobre clima — resposta do modelo, não a frase fixa. Aceito: a exigência é sobre assuntos, não sobre meta-perguntas.
- **(futuro) Classificação semântica.** Se a guarda léxica se mostrar insuficiente, o classificador via LLM (decisão 1) é o ponto de troca natural, e a assinatura de `isWeatherRelated` já é o ponto de encaixe.
