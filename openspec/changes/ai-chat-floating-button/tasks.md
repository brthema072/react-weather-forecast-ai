# Tasks

## 1. Estruturar o componente de chat

- [x] 1.1 Criar pasta `src/components/ai-chat/` com `AiChat.tsx` e `AiChat.module.css`, verificando que os dois arquivos existem
- [x] 1.2 Definir estrutura de dados mockada de mensagens (`messages: { id, role, text }[]` com 1 pergunta + 1 resposta) em `AiChat.tsx`, verificando que há exatamente uma mensagem com `role: "user"` e uma com `role: "assistant"`

## 2. Implementar a interface do chat

- [ ] 2.1 Implementar o FAB (`button`) com estilo consistente ao tema (azul `#1768b3`/`#162b45`) e `position: fixed` inferior-direito (`bottom: 1.5rem`, `right: 1.5rem`), verificando que o FAB aparece na página e não sobrepõe o card de clima
- [ ] 2.2 Implementar o overlay + dialog com `role="dialog"` e `aria-labelledby`, verificando os atributos de acessibilidade presentes no DOM
- [ ] 2.3 Renderizar o thread de mensagens com as mensagens mockadas dentro do dialog, verificando que as duas mensagens aparecem ao abrir
- [ ] 2.4 Implementar o botão "Fechar" (×) que fecha o chat, verificando que o clique fecha o overlay

## 3. Gerenciar abertura/fechamento e acessibilidade

- [ ] 3.1 Implementar estado interno `isOpen` no `AiChat` com efeito que prende o foco no dialog enquanto aberto, verificando que o foco entra no dialog ao abrir
- [ ] 3.2 Implementar fechamento por tecla `Escape` e retorno do foco ao FAB ao fechar, verificando que `Esc` fecha e o foco volta ao FAB
- [ ] 3.3 Implementar `@media (prefers-reduced-motion: reduce)` sem transições e layout responsivo (container com `inset: 0.75rem`, `max-height: 80vh`, `overflow-y: auto`), verificando que o chat é legível em viewports estreitas
- [ ] 3.4 Garantir que a interação com o chat não altera o estado de clima/ localização (sem mudanças em `App.tsx` além de renderizar `<AiChat onClose={...} />`), verificando que os dados do clima se mantêm iguais antes/depois de abrir e fechar o chat

## 4. Integrar ao App e validar

- [ ] 4.1 Importar e renderizar `<AiChat onClose={handleClose} />` em `App.tsx` dentro do `<main>`, ao lado do card, verificando a compilação sem erros de tipo TypeScript
- [ ] 4.2 Executar `npm run build` e `npm run lint`, verificando build e lint limpos
- [ ] 4.3 Testar fluxo completo manualmente (abrir FAB → ver mensagem → fechar por botão e por `Esc`) e confirmar o chat funciona em mobile, verificando os três comportamentos observáveis

## Workflow follow-up

- Arquivar a change (`openspec archive`) após a revisão do projeto, verificando o resultado do arquivo.
- Atualizar a README do projeto para mencionar o chat de ajuda, se adequado.
