# Design

## Context

- A aplicação é um app React 19 + TypeScript monocomponente: `App.tsx` orquestra geolocalização, clima e geocoding, com estilos em `App.module.css` (CSS modules) e variáveis globais em `style.css`.
- Não há biblioteca de UI externa; componentes são feitos com React + CSS nativo. Não há estado global compartilhado (o `App` é a única árvore).
- Os specs definem: FAB na região inferior-direita, abertura/fechamento do chat, 1 pergunta + 1 resposta mockadas, acessibilidade (fechar com `Esc`, foco gerenciado, sem bloquear leitores de tela) e responsividade.

## Goals / Non-Goals

**Goals:**
- Componente de chat isolado e reutilizável, fora da árvore de decisão do clima (`src/components/ai-chat/`).
- Integração mínima em `App.tsx`: renderizar o componente ao lado do card, sem alterar o fluxo existente.
- Acessibilidade de primeira classe: `role="dialog"` com `aria-modal`, foco travado enquanto aberto, `Esc` fecha, foco retorna ao FAB ao fechar.
- Estilo consistente com o tema do app (azul `#162b45`, acentos `#1768b3`, cards brancos).

**Non-Goals:**
- Integração real com IA — apenas mensagens mockadas.
- Persistência, histórico de conversas, ou envio de mensagens pelo usuário.
- Reposicionamento do FAB (fica fixo na inferior-direita, `bottom`/`right`).
- Suporte a SSR/hidtação (app puramente cliente).

## Decisions

### 1. Localização do componente: `src/components/ai-chat/` (subdiretório de `src/`)

Alternativas consideradas: colocar o chat dentro do `App` (arquivo único) vs. subpasta dedicada vs. pastas separadas (`components/`, `styles/`).

Escolha: subpasta `src/components/ai-chat/` com `AiChat.tsx` + `AiChat.module.css`.

Racional: isola responsabilidade, segue o padrão do projeto (pastas `hooks/`, `services/` com subpasta por domínio), e permite futura expansão (mais mensagens, tema) sem tocar em `App.tsx`.

### 2. Estado local de controle no componente, com evento customizado para fechar

Alternativas: `useState` no `AiChat` vs. passar `isOpen` como prop vs. `useContext` global.

Escolha: `useState<boolean>` interno + botão de fechar que dispara `onClose`, acionado pelo FAB no `App.tsx`.

Racional: o componente é autocontido; o FAB (fora do dialog) é o único gatilho de abertura — isso evita que o chat fique aberto sem origem e simplifica o foco (o elemento de origem é sempre o FAB). Não vale um contexto global para um único botão.

### 3. Overlay e container: CSS `position: fixed` com `inset: 0`, dialog com `inset: 0.75rem`

Racional: posicionamento fixo não depende de rolagem da página (o card de clima não rola em viewports grandes). Container levemente recuado das bordas garante usabilidade em mobile e evita sobreposição total com o FAB (`bottom`/`right` do container, FAB `bottom`/`right` fixo).

### 4. Acessibilidade com atributos ARIA em vez de bibliotecas

- `role="dialog"` + `aria-labelledby` apontando para o título do chat.
- Trapping de foco: usar o API de foco nativa do React 19 (`useFocusManager` não é necessária; focar manualmente o container de mensagens e o botão de fechar, retornando ao FAB no fechar).
- `onKeyDown` no overlay para fechar ao `Escape`.

Alternativa: biblioteca `@radix-ui/react-dialog` — rejeitada por ser uma nova dependência para uma funcionalidade mockada simples; o projeto atual não usa nenhuma lib de UI.

### 5. Estilo: `AiChat.module.css` com classes de baixo nome (`aiChat`, `fab`, `dialog`, `thread`, `message`)

Racional: CSS modules já é o padrão do projeto (`App.module.css`); evita colisão de nomes globais e mantém a arquitetura de estilos sem configuração extra.

### 6. Conteúdo mockado: array de mensagens `[{ id, role, text }]` definido dentro do componente

Racional: dado que é um mock de 1 pergunta/1 resposta, não faz sentido criar serviço ou API. Mantém o `AiChat` autocontido e fácil de futuramente trocar por chamadas de rede.

## Risks / Trade-offs

- [Risco] Foco travado (`focus trap`) mal implementado → usabilidade ruim e quebra de fluxo de teclado. → [Mitigação] Implementar trap simples e testável (lista de focáveis: input de envio inexistente neste mock; apenas botão "Fechar" + área de mensagens); retornar foco ao FAB no fechar.
- [Risco] Overlay cobrindo totalmente o conteúdo em mobile → leitura impossibilitada. → [Mitigação] Container com `inset: 0.75rem`, `max-height: 80vh`, `overflow-y: auto`; largura limitada e `bottom` posicionado acima do FAB.
- [Risco] Animação de abrir/fechar causar problemas em `prefers-reduced-motion` → usar `@media (prefers-reduced-motion: reduce)` para desativar transições.
- [Risco] Dialog sobrepor controles do navegador ou a barra de rolagem mobile → [Mitigação] `inset` generoso e `z-index` fixo baixo (`1000`), abaixo de possíveis overflows do sistema.
- [Risco] Mudança futura para chat real → reescrita do mock → o design já deixa a estrutura de mensagens pronta (`messages` array) para ser substituída por estado assíncrono sem mudar a UI.

## Migration Plan

Não há migração: é uma feature nova em um app v0.0.0, sem usuários.

1. Criar `src/components/ai-chat/AiChat.tsx` e `AiChat.module.css`.
2. Importar e renderizar `<AiChat onClose={...} />` em `App.tsx` dentro do `<main>`, ao lado do card.
3. Validar com `npm run build` e `npm run lint`; testar abertura/fechamento via mouse e teclado (Tab, Esc).

## Open Questions

- **(baixo impacto)** Onde posicionar verticalmente o FAB: `bottom: 1.5rem` (espaçamento confortável) ou `bottom: 1rem` (mais próximo da borda)? Recomenda-se `bottom: 1.5rem` / `right: 1.5rem` para evitar colisão com a barra de rolagem mobile.
- **(futuro)** O que o FAB deve mostrar quando o usuário tem dúvidas de clima? Hoje é apenas ajuda genérica; definir o texto da primeira pergunta mockada (recomendação: "Como funciona a previsão de clima atual?" — relacionado ao contexto do app).
