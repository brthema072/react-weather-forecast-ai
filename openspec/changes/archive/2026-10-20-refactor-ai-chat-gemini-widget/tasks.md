# Tasks

## 1. Dependência e configuração de ambiente

- [x] 1.1 Instalar o SDK atual do Gemini (`npm i @google/genai`), verificando que `package.json` registra `@google/genai` e que `node_modules/@google/genai` existe; confirmar que `@google/generative-ai` **não** foi instalado
- [x] 1.2 Criar `src/vite-env.d.ts` com a augmentação de `ImportMetaEnv` declarando `VITE_GEMINI_API_KEY: string` e `VITE_GEMINI_MODEL: string` (opcional), verificando que `import.meta.env.VITE_GEMINI_API_KEY` é tipado como `string` e não como `any`
- [x] 1.3 Criar `.env.example` com a chave comentada e a explicação de onde obter a chave e de que ela é exposta no bundle do browser, verificando que o arquivo não contém nenhuma chave real
- [x] 1.4 Atualizar `.gitignore` para ignorar `.env` e `.env.local` (mantendo `.env.example` versionado), verificando com `git check-ignore` que um `.env.local` é ignorado e que `.env.example` **não** é

## 2. Cliente do Gemini (`src/services/geminiClient.ts`)

- [x] 2.1 Criar `src/services/geminiClient.ts` com os tipos `GeminiContext` (`placeName`, `condition`, `temperature`, `windSpeed`) e `ChatTurn` (`role: 'user' | 'assistant'`, `text`), verificando que os tipos são exportados
- [x] 2.2 Implementar a construção do system instruction a partir do `GeminiContext`, incluindo apenas os valores disponíveis e omitendo os indisponíveis, verificando que o texto gerado contém o local e a condição quando presentes e não contém `null`/`undefined`
- [x] 2.3 Implementar o mapeamento do histórico de `ChatTurn` para `contents` do SDK, traduzindo `role: 'assistant'` para `role: 'model'`, verificando que nenhum payload usa o papel `'assistant'` (que não existe em `ContentRole`)
- [x] 2.4 Implementar `sendChatMessage(history, context, signal?)` chamando `ai.models.generateContent` com `model` vindo de `VITE_GEMINI_MODEL` (padrão `gemini-3.5-flash-lite`), `config.systemInstruction` e `config.abortSignal`, verificando que a chamada usa o padrão quando a variável não está definida
- [x] 2.5 Implementar a guarda de `response.text` (`string | undefined`) lançando erro descritivo quando a resposta não tiver texto utilizável, verificando que uma resposta vazia não resulta em `undefined` retornado
- [x] 2.6 Implementar o tratamento de erro por status HTTP via `ApiError` (429 → limite de requisições; 400/401/403 → credencial/configuração inválida), lançando `TypeError` para falha de conectividade/timeout, consistente com `weatherClient.ts`
- [x] 2.7 Limitar o número de voltas enviadas ao modelo (teto de contexto) preservando as mais recentes, verificando que um histórico longo é truncado mantendo a ordem cronológica
- [x] 2.8 Implementar o padrão de `AbortController` com timeout de 10s e escuta do `AbortSignal` do caller, verificando que o timeout é limpo no `finally` e que abortar o caller rejeita a promise

## 3. Refatoração do componente (`AiChat.tsx`)

- [x] 3.1 Remover o overlay, o `handleOverlayClick` e o `aria-modal`, mantendo `role="dialog"` e `aria-labelledby` apontando para o título, verificando que o dialog renderizado não tem overlay nem `aria-modal`
- [x] 3.2 Alterar `AiChatProps` para aceitar `context: GeminiContext` e um `onClose` opcional, verificando que o componente compila com a nova prop
- [x] 3.3 Substituir `mockMessages` por estado `messages` inicializado com uma mensagem de boas-vindas do assistente, verificando que o estado inicial tem exatamente uma mensagem com `role: 'assistant'`
- [x] 3.4 Implementar o `handleSubmit`: validar que o texto não é vazio (apenas espaços), adicionar a mensagem do usuário, limpar o campo e disparar a chamada ao Gemini
- [x] 3.5 Implementar o envio por `Enter` (com `event.preventDefault()` para não inserir quebra de linha) e por clique no botão de envio, verificando que ambos resultam em exatamente uma mensagem adicionada
- [x] 3.6 Implementar o estado `isPending` que desabilita o input e o botão de envio durante a espera e exibe o indicador de "Digitando…" na thread, verificando que uma segunda mensagem não pode ser enviada enquanto `isPending` é verdadeiro
- [x] 3.7 Tratar o erro da chamada (exibindo a mensagem retornada na thread, com destaque para 429) e garantir que `isPending` volte a `false` e o input seja reabilitado, verificando que o chat continua utilizável após a falha
- [x] 3.8 Renderizar a mensagem de aviso de "chave não configurada" no lugar do rodapé de entrada quando `import.meta.env.VITE_GEMINI_API_KEY` estiver ausente, verificando que nenhuma requisição é tentada e que o restante da página funciona normalmente
- [x] 3.9 Implementar o auto-scroll para a última mensagem com a condição de threshold (perto do fim), suspendendo o scroll automático quando o usuário leu mensagens anteriores, e adicionar `aria-live="polite"` na região do histórico
- [x] 3.10 Adaptar a_effect_ de foco e o fechamento por `Escape` ao novo layout (sem overlay), mantendo o retorno de foco ao FAB ao fechar, verificando que `Escape` fecha o painel e o foco volta ao FAB

## 4. Estilos (`AiChat.module.css`)

- [x] 4.1 Substituir `.overlay` por um painel com `position: fixed`, `right: 1.25rem`, `bottom: 5.5rem`, `width: min(23rem, calc(100vw - 2.5rem))` e `max-height: min(32rem, calc(100vh - 8rem))`, verificando que o painel fica acima do FAB e não ultrapassa a viewport
- [x] 4.2 Remover a regra de `.overlay` e a animação de `fadeIn` associadas, mantendo a animação de entrada do painel com `transform: translateY` (sem `opacity` no overlay)
- [x] 4.3 Estilizar o rodapé com o campo de texto e o botão de envio lado a lado, o botão de envio com ícone e estado `:disabled`, e o estado desabilitado do input
- [x] 4.4 Estilizar o indicador de "Digitando…" (bolas/pontos animados) respeitando `@media (prefers-reduced-motion: reduce)`
- [x] 4.5 Garantir que o histórico de mensagens tenha `overflow-y: auto` e `min-height: 0` dentro do container flex, verificando que a rolagem do histórico funciona e que a página não rola junto
- [x] 4.6 Ajustar a media query de viewport estreito para manter o painel utilizável em mobile (largura de tela inteira ou quase, sem colidir com o FAB), verificando que o painel cabe na viewport
- [x] 4.7 Manter o `z-index` do painel acima do do FAB e as regras de `prefers-reduced-motion` existentes

## 5. Integração no `App.tsx`

- [x] 5.1 Importar o tipo `GeminiContext` e passar `context={{ placeName, condition: weather.condition, temperature: weather.temperature, windSpeed: weather.windSpeed }}` ao `<AiChat />`, verificando que os valores chegam ao componente
- [x] 5.2 Garantir que o `onClose` continue compatível com o uso atual em `App.tsx`, verificando que a compilação não quebra

## 6. Verificação

- [x] 6.1 Executar `npm run build` (`tsc -b && vite build`), verificando build sem erros de tipo e sem avisos do TypeScript
- [x] 6.2 Executar `npm run lint` e registrar o resultado; se continuar falhando por ausência do `eslint` instalado, registrar como limitação pré-existente e **não** como regressão desta change
- [x] 6.3 Verificar no build gerado que o bundle do browser não contém imports de módulos Node (`node:fs`, `crypto`, `http`, `ws`) vindos do SDK, confirmando que o entrypoint `web` foi resolvido
- [x] 6.4 Testar manualmente com `npm run dev`: abrir o chat pelo FAB, confirmar que ele abre ancorado acima do FAB, que a previsão do tempo permanece visível e não escurecida, e que a página continua rolável
- [x] 6.5 Testar o envio: digitar e pressionar `Enter` (sem quebra de linha no input), digitar e clicar no botão de envio, e confirmar que a mensagem do usuário aparece na thread
- [x] 6.6 Testar o indicador de digitação: confirmar que ele aparece durante a espera, que o input fica desabilitado e que uma segunda mensagem não pode ser enviada
- [x] 6.7 Testar o auto-scroll: confirmar que a thread rola até a última mensagem e que, ao ler mensagens antigas, a chegada de uma nova mensagem não move a posição de leitura
- [x] 6.8 Testar o caminho de erro: sem `VITE_GEMINI_API_KEY` configurada, confirmar que aparece o aviso de configuração e que nenhuma requisição é feita; com chave inválida, confirmar que a mensagem de erro é exibida e o chat continua utilizável
- [x] 6.9 Testar em viewport estreito (mobile), confirmando que o painel fica utilizável e não ultrapassa a tela
- [x] 6.10 Confirmar com `git status` que nenhum arquivo `.env` com chave real está prestes a ser versionado

## Workflow follow-up

- **Pré-requisito de arquivamento:** a change `ai-chat-floating-button` (que introduziu a capability `ai-chat`) ainda não foi arquivada, então `openspec/specs/ai-chat/spec.md` não existe como baseline. Arquivar `ai-chat-floating-button` **antes** desta change, para que o delta `MODIFIED`/`REMOVED` seja aplicado sobre uma spec consolidada real. As tasks 2.x e 3.x dela estão marcadas como pendentes mas o código já está implementado — marcá-las como concluídas antes de arquivar.
- Atualizar o `README.md` para documentar o chat com Gemini: como obter a chave, como configurar o `.env.local`, o modelo padrão e o aviso de que a chave fica exposta no bundle do browser.
- Arquivar esta change (`openspec archive`) após a revisão, atualizando a spec consolidada de `ai-chat` em `openspec/specs/ai-chat/spec.md`.
