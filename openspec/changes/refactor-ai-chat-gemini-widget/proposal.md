# Proposal

## Why

O chat de ajuda atual é um mock: abre como modal centralizado sobre um overlay escuro, mostra uma pergunta e uma resposta fixas, e não aceita nenhuma entrada do usuário. Isso atende a nenhum dos objetivos reais do produto — o usuário não consegue perguntar nada, e o overlay impede ver a previsão do tempo enquanto conversa.

Além disso, o pedido original indica a biblioteca `@google/generative-ai` com o modelo `gemini-1.5-flash`, mas essa combinação não funciona mais: a biblioteca foi descontinuada em 30/11/2025 e o `gemini-1.5-flash` saiu da API. Usá-la resultaria em falha em tempo de execução.

Refatorar o chat para um widget de atendimento ancorado no canto inferior direito — com entrada de texto, envio por Enter, indicador de digitação e integração real com o Gemini no free tier — transforma o mock em funcionalidade utilizável, e faz isso sobre uma base de API que ainda existe.

## What Changes

- **Layout:** o chat deixa de ser modal centralizado com overlay e passa a ser um painel fixo ancorado acima do FAB, no canto inferior direito (`position: fixed`, `right: 1.25rem`, `bottom: 5.5rem`). O overlay escurecido e o bloqueio visual da página são removidos; a previsão do tempo permanece visível durante a conversa.
- **Estrutura do painel:** cabeçalho (título + botão de fechar), corpo com histórico de mensagens rolável com auto-scroll para a última mensagem, e rodapé com campo de texto + botão de envio.
- **Interação:** o usuário envia mensagens pelo botão de envio ou pela tecla `Enter`; durante a espera pela resposta, um indicador visual de "Digitando…" é exibido e o campo de entrada é desabilitado.
- **Integração real:** as mensagens mockadas são substituídas por chamadas ao Google Gemini via `@google/genai`, usando `gemini-3.5-flash-lite` (free tier), com o modelo configurável por variável de ambiente.
- **Contexto do app:** o assistente recebe o local, a condição, a temperatura e o vento atuais via prop, e os dados são injetados no system instruction — o chat passa a responder sobre a previsão exibida na tela, e não só sobre dúvidas genéricas.
- **Chave de API:** lida de `import.meta.env.VITE_GEMINI_API_KEY` (padrão do Vite neste projeto). Quando ausente, o chat exibe uma mensagem de configuração no lugar do campo de envio, sem quebrar a página.

## Capabilities

### New Capabilities

- *(nenhuma)*

### Modified Capabilities

- `ai-chat`: o chat deixa de ser mockado e centrado, e passa a ser um widget de atendimento ancorado no FAB, com envio de mensagens, estado de carregamento e integração com o Gemini. Os requisitos de acessibilidade, responsividade e não-interferência com o clima permanecem, e os requisitos de mockagem são removidos.

## Impact

- **Arquivos modificados:** `src/components/ai-chat/AiChat.tsx` (estrutura, estado, envio), `src/components/ai-chat/AiChat.module.css` (posicionamento, rodapé, estado de digitação), `src/App.tsx` (passa o contexto de clima ao chat).
- **Arquivos novos:** `src/services/geminiClient.ts` (cliente do Gemini), `src/vite-env.d.ts` (tipagem de `import.meta.env`), `.env.example` (chave comentada). O `.gitignore` precisa ignorar `.env.local`/`.env` para que a chave não seja versionada.
- **Dependências:** adiciona `@google/genai` (SDK oficial atual; substitui `@google/generative-ai`, que não será instalada).
- **Segurança:** a chave é embutida no bundle do navegador e fica visível para o usuário final. É aceitável para uso local/de protótipo, mas a spec registra explicitamente que produção exige um backend intermediário. A chave nunca deve ser commitada.
- **Risco:** médio-baixo. A mudança é isolada no componente de chat e não toca no fluxo de geolocalização/clima. O principal risco é de cota (free tier) e de exposição da chave, tratados por modelo configurável e mensagem de erro explícita.
