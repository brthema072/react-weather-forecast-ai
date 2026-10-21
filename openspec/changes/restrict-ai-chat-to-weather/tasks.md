# Tasks

## 1. Política de escopo (`src/services/chatScope.ts`)

- [x] 1.1 Criar `src/services/chatScope.ts` exportando a constante `OUT_OF_SCOPE_REPLY` com o valor exato `Posso apenas informar sobre o clima de um determinado lugar` e o marcador interno `OUT_OF_SCOPE_MARKER` (`[fora-de-escopo]`), verificando que a frase não tem acentos a mais, pontuação final ou texto adicional
- [x] 1.2 Implementar a lista de vocabulário de clima e meteorologia em português e inglês (tempo, clima, temperatura, chuva, vento, umidade, tempestade, furacão, calor, frio, sol, geada, previsão, forecast, weather, temperature, rain, storm, wind, humidity, snow…), verificando que perguntas claramente sobre clima casam
- [x] 1.3 Implementar `isWeatherRelated(text, priorTurns)`: retorna `true` quando a mensagem contém termo de clima **ou** quando a conversa anterior já tratou de clima (continuação), e `false` por padrão — verificando que "Quem escreveu Hamlet?" retorna `false` e "Qual a temperatura agora?" retorna `true`
- [x] 1.4 Implementar `toVisibleReply(text)`: devolve `OUT_OF_SCOPE_REPLY` quando a resposta contém o marcador (case-insensitive, mesmo cercado de texto) e, caso contrário, devolve o texto original, verificando que uma resposta normal do modelo passa intacta
- [x] 1.5 Garantir que o módulo não importa nada (sem dependências de React, do SDK ou do `App`), verificando que ele é importável isoladamente

## 2. Cliente do Gemini (`src/services/geminiClient.ts`)

- [x] 2.1 Alterar `buildSystemInstruction` para declarar que o assistente responde apenas sobre clima e meteorologia e para instruir o modelo a responder com exatamente `OUT_OF_SCOPE_MARKER` quando o assunto for outro, verificando que o texto gerado contém o escopo e o marcador
- [x] 2.2 Manter a instrução de contexto atual (local, condição, temperatura, vento) e o tratamento de "dados indisponíveis", verificando que nada do comportamento anterior foi perdido
- [x] 2.3 Aplicar `toVisibleReply` à resposta do modelo antes de devolvê-la, verificando que uma resposta contendo o marcador chega ao componente como `OUT_OF_SCOPE_REPLY` e que uma resposta normal não é alterada
- [x] 2.4 Verificar que a guarda de `response.text` vazio/`undefined` continua antes da tradução do marcador, e que a guarda de chave ausente e o tratamento de erro por status HTTP (429, 400/401/403, 5xx) permanecem inalterados

## 3. Componente (`src/components/ai-chat/AiChat.tsx`)

- [x] 3.1 Importar `isWeatherRelated` e `OUT_OF_SCOPE_REPLY` de `src/services/chatScope.ts`
- [x] 3.2 Aplicar a guarda no início de `sendDraft`, logo após a validação de texto vazio: se a mensagem estiver fora de escopo, adicionar a mensagem do usuário e a resposta fixa ao histórico e **retornar sem** chamar `sendChatMessage`, sem criar `AbortController` e sem `setIsPending(true)`, verificando que nenhuma requisição ao Gemini é feita e que o indicador de "Digitando…" não aparece
- [x] 3.3 Garantir que o caminho de recusa não altere `isPending`, `isSubmittingRef` nem `abortRef`, e que o input permanece habilitado e o chat aceita a próxima mensagem após a recusa, verificando que um segundo envio funciona normalmente
- [x] 3.4 Ajustar a `WELCOME_MESSAGE` para declarar que o assistente responde sobre o clima, removendo a promessa de ajuda "sobre como o app funciona", verificando que a mensagem de abertura não oferece mais o escopo removido
- [x] 3.5 Ajustar o placeholder do campo de entrada para sugerir uma pergunta de clima, verificando que o `aria-label` do input é preservado
- [x] 3.6 Confirmar que a recusa é renderizada como mensagem normal do assistente (`role: 'assistant'`, mesma classe de estilo) e **não** como erro (`role="alert"`), verificando que a bolha visual é a de mensagem do assistente

## 4. Verificação

- [ ] 4.1 Executar `npm run build` (`tsc -b && vite build`), verificando build sem erros de tipo e sem avisos do TypeScript
- [ ] 4.2 Executar `npm run lint` e registrar o resultado; se continuar falhando por ausência do `eslint` instalado, registrar como limitação pré-existente e **não** como regressão desta change
- [ ] 4.3 Testar manualmente com `npm run dev`: enviar uma pergunta sobre o clima atual e confirmar que a resposta usa os dados exibidos na tela
- [ ] 4.4 Testar a recusa: enviar uma mensagem fora de escopo e confirmar que a resposta é exatamente `Posso apenas informar sobre o clima de um determinado lugar`, sem explicação nem texto adicional
- [ ] 4.5 Confirmar na aba Network (ou nos logs) que a mensagem fora de escopo **não** gera requisição ao Gemini e que o indicador de "Digitando…" não aparece
- [ ] 4.6 Testar a continuação de conversa: perguntar sobre o clima e depois enviar um follow-up sem repetir vocabulário de clima ("e amanhã?"), confirmando que o follow-up é respondido em vez de recusado
- [ ] 4.7 Testar que uma recusa não quebra o chat: após receber a recusa, enviar uma pergunta sobre clima e confirmar que ela é respondida normalmente
- [ ] 4.8 Testar o caminho de erro existente: sem `VITE_GEMINI_API_KEY` configurada, confirmar que o aviso de configuração aparece e que nenhuma requisição é feita

## Workflow follow-up

- **Pré-requisito de arquivamento:** arquivar esta change (`/opsx:archive`) para aplicar o delta sobre a spec consolidada `openspec/specs/ai-chat/spec.md`, que já existe e serve de baseline para os requisitos modificados.
- O `openspec` CLI **não está instalado** nesta máquina. Se o arquivamento for feito por linha de comando, é preciso instalá-lo antes (`npm i -g openspec`).
