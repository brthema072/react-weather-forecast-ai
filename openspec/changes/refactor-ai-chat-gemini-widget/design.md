# Design

## Context

- Aplicação React 19 + TypeScript 6 + Vite 8. Estilos em CSS Modules (`App.module.css`, `AiChat.module.css`). Sem biblioteca de UI; `fetch` nativo para HTTP; sem gerenciador de estado global.
- O chat atual (`src/components/ai-chat/AiChat.tsx`) é autocontido: estado `isOpen` interno, FAB + overlay + dialog centralizado, mensagens mockadas em `mockMessages`.
- O `App.tsx` já detém `placeName`, `weather.condition`, `weather.temperature` e `weather.windSpeed` — os dados que o assistente precisa.
- Convenções de serviço já estabelecidas em `src/services/`: cliente assíncrono, `AbortController` com timeout de 10s e escuta do `AbortSignal` do caller, erros de conectividade como `TypeError`, erros de API representados no retorno.
- `tsconfig.json` tem `"types": ["vite/client"]` e `"include": ["src"]`, sem `vite-env.d.ts` — `import.meta.env` é tipado como `any` hoje.

### Fatores da API do Gemini (verificados nas tipagens de `@google/genai@2.30.0`)

| Fato | Impacto no design |
|---|---|
| `ContentRole = 'user' \| 'model'` | O papel `'assistant'` **não existe**. O histórico usa `'model'` para as respostas. |
| `response.text` é `get text(): string \| undefined` | Precisa de guarda para `undefined` — resposta vazia não pode virar `undefined` renderizado. |
| `config.systemInstruction?: ContentUnion` | System instruction vai em `config`, não no topo. |
| `config.abortSignal?: AbortSignal` | Cancelamento é **client-side only** (o serviço não cancela) — ainda é a melhor forma de abortar no browser. |
| `ApiError extends Error { status: number }` | Permite distinguir 429 (cota) de 400/403 genéricos. `name` não é garantido como `'ApiError'`. |
| Browser build: `dist/web/index.mjs`, único import é `p-retry` | Sem dependências Node-only; funciona com Vite sem configuração de alias. |
| `apiKey` é "Required on browser runtimes" | A chave precisa existir no bundle → nunca chamar sem chave. |
| `@google/generative-ai` descontinuado em 30/11/2025 | Não usar a lib do pedido original. |
| `gemini-1.5-flash` fora da API; `gemini-2.0-flash` desligado em 01/06/2026 | O modelo do pedido original não funciona. Free tier atual: `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.6-flash`, `gemini-3.8-flash`, `gemini-2.5-flash` (acesso restrito), `gemini-2.5-pro`, `gemini-2.5-flash-lite`. |

## Goals / Non-Goals

**Goals:**
- Widget de atendimento ancorado no FAB, sem overlay, sem bloquear rolagem, com previsão visível durante a conversa.
- Envio de mensagem por Enter e por botão, com estado de digitação durante a espera.
- Integração real com o Gemini no free tier, com tratamento de erro por status HTTP.
- O assistente responde sobre o clima atual exibido na tela.
- Chave de API fora do código-fonte e fora do versionamento.

**Non-Goals:**
- Streaming de tokens (a resposta chega completa). O pedido não pede streaming e ele complica o tratamento de erro e o estado de digitação.
- Persistência do histórico (o histórico vive em memória, por sessão).
- Backend intermediário / proxy de API. Explicito na spec como dívida conhecida para produção.
- Login, contas, ou qualquer estado persistente.
- Suporte a anexos, imagens, ou tools/function calling.

## Decisions

### 1. Ancoragem por `position: fixed` no canto inferior direito, sem overlay

**Escolha:** o painel é `position: fixed; right: 1.25rem; bottom: 5.5rem`, com `width: min(23rem, calc(100vw - 2.5rem))` e `max-height: min(32rem, calc(100vh - 8rem))`. O overlay e o `place-items: center` saem.

**Racional:** `position: fixed` tira o painel do fluxo do documento, então a rolagem da página não é afetada. O `bottom: 5.5rem` dá folga acima do FAB (`bottom: 1.5rem` + `3.25rem` de altura ≈ `4.75rem`), evitando sobreposição. O `max-height` em `vh` garante que o painel não ultrapasse a viewport em telas baixas.

Alternativas consideradas:
- *Manter o modal centralizado e apenas reposicionar* → descartado: o pedido é explícito sobre "não abrir no centro", e o overlay continua atrapalhando.
- *Ancorar com `position: absolute` no `body`* → descartado: dependeria da rolagem e subiria junto com o conteúdo.
- *Painel ancorado via `bottom` do FAB em JS* → descartado: acopla layout a JS desnecessariamente; CSS puro basta e não há-medida a medir.

**Trade-off:** sem overlay, o chat não "captura" a atenção como um modal. Aceito — é o comportamento de um widget de atendimento, e a previsão continua consultável, que é o objetivo.

### 2. O estado `isOpen` e a estrutura de `messages` permanecem no componente

**Escolha:** `AiChat` mantém `isOpen` e agora também `messages`, `draft`, `isPending`. O `App` passa `context` como prop.

**Racional:** o componente segue autocontido, como está hoje. A prop `context` é a única superfície de integração com o `App` — um objeto de dados, não um handler. O `App` não precisa conhecer o histórico nem o estado de carregamento da conversa.

### 3. Novo serviço `src/services/geminiClient.ts` seguindo o padrão de `weatherClient.ts`

**Escolha:** o cliente do Gemini vive em `src/services/`, junto de `weatherClient.ts` e `geocodingClient.ts`, e exporta uma função assíncrona.

**Racional:** o projeto já separa "acesso a API externa" em `src/services/`. O `AiChat.tsx` fica responsável só por UI e estado. O padrão existente (`AbortController` + timeout + `active` flag no `useEffect`) é reusado.

**Interface:**
```ts
export interface GeminiContext {
  placeName: string | null
  condition: string | null
  temperature: number | null
  windSpeed: number | null
}

export interface ChatTurn { role: 'user' | 'assistant'; text: string }

export async function sendChatMessage(
  history: ChatTurn[],
  context: GeminiContext,
  signal?: AbortSignal,
): Promise<string>
```

O serviço retorna a string da resposta e **lança** em falha, em vez de devolver um objeto de erro — inverso de `fetchForecast`, que retorna `WeatherData` com `error`. A diferença é deliberada: `fetchForecast` tem um tipo de retorno que já carrega `error`; aqui a resposta é uma string, e o `catch` do `AiChat` é onde a mensagem de erro é escolhida. Lançar `TypeError` para falha de conectividade mantém a convenção já adotada no projeto.

### 4. `@google/genai` + `gemini-3.5-flash-lite`, com modelo configurável

**Escolha:** SDK `@google/genai` (`npm i @google/genai`), modelo padrão `gemini-3.5-flash-lite`, sobrescrevível por `import.meta.env.VITE_GEMINI_MODEL`.

**Racional:** o pedido original indica `@google/generative-ai` + `gemini-1.5-flash`, mas ambos estão fora de suporte — a lib foi descontinuada em 30/11/2025 e o `gemini-1.5-flash` não está mais na API. Usá-los resultaria em erro em runtime. Entre os modelos free tier, `gemini-3.5-flash-lite` tem folga de cota diária substancialmente maior que `gemini-3.8-flash` (que fica em torno de 20 req/dia por projeto/modelo, propenso a 429) — para um chat de usuário final, limite de cota é o fator decisivo, não a qualidade da resposta. Manter o modelo configurável evita retrabalho quando a disponibilidade mudar.

**Alternativa:** `@google/generative-ai` (a lib do pedido) — rejeitada, descontinuada e sem receber correções.

### 5. Chave em `import.meta.env.VITE_GEMINI_API_KEY`, com guarda de ausência

**Escolha:** `import.meta.env.VITE_GEMINI_API_KEY` (padrão do Vite — o projeto usa Vite, não Create React App, então `process.env.REACT_APP_*` não se aplica). Quando a chave está ausente, o `AiChat` renderiza um aviso de configuração no lugar do rodapé de entrada e não chama a API.

**Racional:** `VITE_` é o prefixo que o Vite expõe ao bundle do cliente. A guarda de ausência é necessária porque `apiKey` é obrigatório em runtime de browser — construir o `GoogleGenAI` sem chave lança no primeiro uso, e a spec exige que a ausência de chave não quebre a página. A chave nunca é renderizada no DOM.

**Risco aceito e documentado:** a chave é embutida no bundle e fica visível para o usuário final. Adequado para desenvolvimento e protótipo; produção exige um backend intermediário. Registrado na spec como requisito de não-exposição no UI e de não-commit, e como dívida no design.

### 6. Histórico enviado como `contents` com `role: 'user' | 'model'`

**Escolha:** cada turno vira `{ role, parts: [{ text }] }`, com `'assistant'` do domínio mapeado para `'model'` da API.

**Racional:** `ContentRole = 'user' | 'model'` nas tipagens do SDK. Usar `'assistant'` seria um erro de tipo (e de API). O mapeamento fica no `geminiClient.ts`, de modo que o resto do app só conhece `'user' | 'assistant'`.

### 7. Estado de digitação e bloqueio de envio

**Escolha:** `isPending` booleano no `AiChat`. Enquanto `true`: o input tem `disabled`, o botão de envio tem `disabled`, e o `onKeyDown` do input ignora `Enter`.

**Racional:** o pedido pede o indicador de "Digitando…" e o resultado desejado é que o usuário não envie mensagens concorrentes. Desabilitar o input é mais simples e mais claro que validar no handler, e o estado desabilitado é anunciado naturalmente por leitores de tela.

### 8. Auto-scroll com suspensão quando o usuário lê o histórico

**Escolha:** um `useEffect` que rola o fim do histórico quando `messages` muda, **condicionado** a o usuário estar perto do fim (threshold ~80px) ou a ser a primeira renderização.

**Racional:** o requisito de auto-scroll e o de não interromper a leitura de mensagens antigas são naturalmente conflitantes. A abordagem padrão (rolar sempre) irrita quem está lendo o histórico. O threshold de 80px é a heurística consagrada em interfaces de chat: perto do fundo = acompanha a conversa; longe = respeita a posição do usuário.

**Implementação:** `useRef` no container do histórico; medir `scrollHeight - scrollTop - clientHeight` antes do efeito para decidir se deve rolar. Um `useEffect` separado com listener de `scroll` mantém o "está perto do fim" atualizado.

### 9. `aria-live` na região do histórico

**Escolha:** o container da thread tem `aria-live="polite"`.

**Racional:** a spec original de acessibilidade do chat cobria abertura/fechamento, mas não a chegada de mensagens. Com integração real, o usuário precisa saber que a resposta chegou — especialmente se o foco está no input. `polite` (não `assertive`) para não interromper.

### 10. `src/vite-env.d.ts` para tipar as variáveis de ambiente

**Escolha:** criar `src/vite-env.d.ts` com o `ImportMetaEnv` Augmented, declarando `VITE_GEMINI_API_KEY` e `VITE_GEMINI_MODEL` como `string`.

**Racional:** hoje `import.meta.env` é `any` (o `ImportMetaEnv` padrão só tem `BASE_URL`, `MODE`, `DEV`, `PROD`, `SSR`). Sem a augmentação, `import.meta.env.VITE_GEMINI_API_KEY` compila mas sem verificação de tipo — e o `tsconfig` inclui apenas `src`, então o arquivo precisa estar lá. `vite/client` já está em `types`, então o `ImportMeta` base continua funcionando.

## Risks / Trade-offs

- **[Risco] Chave de API exposta no bundle do browser.** Qualquer visitor pode extraí-la do JavaScript e usá-la, exhausting a cota. → [Mitigação] documentado explicitamente na spec, no design e no `.env.example`; `.env` no `.gitignore`; aviso de que produção exige backend. Mitigação é incompleta por natureza — a dívida é real e declarada.
- **[Risco] Cota do free tier (429) interrompe o chat.** → [Mitigação] modelo flash-lite com folga de cota; 429 tratado com mensagem específica ("limite de requisições atingido") em vez de erro genérico; modelo configurável para subir de faixa.
- **[Risco] `gemini-3.5-flash-lite` (ou qualquer id) sair de disponibilidade.** → [Mitigação] `VITE_GEMINI_MODEL` permite troca sem alteração de código; a spec exige que o modelo padrão seja um dos servidos no free tier.
- **[Risco] `response.text` ser `undefined`** (resposta sem texto, ou bloqueada por filtro de conteúdo). → [Mitigação] guarda explícita no `geminiClient.ts` que lança erro descritivo; o `AiChat` exibe a mensagem de falha.
- **[Risco] Regressão de acessibilidade ao remover o overlay.** O `aria-modal="true"` deixa de ser adequado: o painel não é mais modal, e o resto da página deve continuar sendo operável. → [Mitigação] remover `aria-modal`, manter `role="dialog"` + `aria-labelledby`, adicionar `aria-live` na thread; `Escape` e o retorno de foco ao FAB continuam.
- **[Risco] `role="dialog"` sem `aria-modal` ainda pode sugerir modalidade a leitores de tela.** → [Mitigação] alternativa considerada: usar `role="complementary"`/`region` com `aria-label`, já que o widget é não-modal por natureza. Escolhido `role="dialog"` **sem** `aria-modal` por preservar a semântica de "janela de chat" que o leitor já anuncia, mantendo `aria-labelledby` apontando para o título. Trade-off consciente, não descuido.
- **[Risco] Histórico crescendo sem limite e degradando o envio.** → [Mitigação] envio de no máximo as últimas N voltas (definido no `geminiClient.ts`); a spec não exige limite explícito, mas o cliente aplica um teto para não estourar contexto.
- **[Risco] Salto de auto-scroll ao abrir o painel.** → [Mitigação] o `useEffect` de scroll roda após o primeiro render com a lista já populada; a condição de threshold evita o salto quando o usuário está lendo o topo.

## Migration Plan

Sem migração de dados — o histórico mockado é descartado; não há estado persistido.

1. Adicionar `@google/genai` às dependências (`npm i @google/genai`).
2. Criar `src/services/geminiClient.ts`.
3. Criar `src/vite-env.d.ts` e `.env.example`; atualizar `.gitignore` para `.env`/`.env.local`.
4. Reescrever `src/components/ai-chat/AiChat.tsx` (estado, envio, input, indicator) e `AiChat.module.css` (ancoragem, rodapé, digitação).
5. Atualizar `src/App.tsx` para passar `context` ao `<AiChat />`.
6. Validar com `npm run build` e, se disponível, `npm run lint`.

**Nota de verificação:** `npm run lint` referencia `eslint`, que **não está instalado** no projeto (nem há arquivo de config ESLint). O script falha hoje, antes e depois desta mudança — a validação é `npm run build`.

## Open Questions

- **(médio impacto) Streaming de tokens.** Uma resposta que "digita" palavra a palavra é mais natural para um chat de atendimento. Não foi incluído porque o pedido não o menciona e ele aumenta a complexidade do tratamento de erro (erros em meio ao stream) e do estado. → *Decisão pendente do usuário; pode ser adicionado como change separado.*
- **(baixo impacto) Nome do modelo padrão.** `gemini-3.5-flash-lite` prioriza cota; `gemini-3.6-flash` prioriza qualidade de resposta e tem cota mais apertada. → O padrão é configurável por `VITE_GEMINI_MODEL`, então a escolha pode ser ajustada sem alteração de código.
- **(baixo impacto) Idioma das respostas.** O system instruction está em português (consistente com o resto da spec e do app), mas o app exibe strings de UI em inglês. → Definir o idioma de resposta do assistente.
- **(futuro) Proxy de backend.** Se a chave não puder ser exposta ao browser, o serviço `geminiClient.ts` é o ponto de troca natural: o corpo da requisição vira uma chamada ao backend, e a forma da função pública não muda.
