# Proposal

## Why

Os usuários da aplicação de previsão do tempo podem ter dúvidas (sobre a leitura da temperatura, códigos do tempo, ou como funciona a geolocalização) e atualmente não há nenhum canal de suporte. Adicionar um assistente conversacional mockado prepara a base para um futuro chat com IA sem reestruturar a UI depois.

## What Changes

- Adiciona um floating action button (FAB) no canto inferior direito da página.
- Ao clicar, abre um chat flutuante contendo 1 pergunta (mock) e 1 resposta (mock).
- Novo componente de chat encapsulado, com CSS próprio e acessibilidade (fechar com `Esc`, foco travado no chat aberto).
- Alteração mínima na página: o card de clima permanece inalterado; o chat é sobreposto.

## Capabilities

### New Capabilities

- `ai-chat`: comportamentos do chat flutuante de ajuda (abrir/fechar, trocar de estado, exibir mensagens mockadas), incluindo acessibilidade e sobreposição na UI.

### Modified Capabilities

- *(nenhuma — não há alteração de requisito em `user-location` ou `weather-fetch`)*

## Impact

- **Novos arquivos:** `src/components/ai-chat/AiChat.tsx`, `src/components/ai-chat/AiChat.module.css`, e registro no `App.tsx`.
- **Dependências:** nenhuma nova dependência externa — tudo com React + CSS nativo.
- **Risco:** mínimo, pois o chat é sobreposto e isolado; não modifica o fluxo de geolocalização/clima.
