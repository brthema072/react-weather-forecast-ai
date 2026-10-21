# Proposal

## Why

O assistente do Weather Forecast hoje é um generalista. O `buildSystemInstruction` em `src/services/geminiClient.ts` define apenas a identidade do assistente ("Você é o assistente do aplicativo Weather Forecast") e manda responder de forma breve — sem nenhuma restrição de assunto. Na prática o modelo aceita perguntas sobre qualquer coisa: literatura, matemática, código, política. A previsão do tempo continua na tela, mas o chat ao lado responde a perguntas sem nenhuma relação com ela.

Isso descaracteriza o produto. O widget existe para informar o clima do lugar da pessoa; respostas fora de escopo quebram a confiança no chat e ainda consomem a cota diária do free tier do Gemini com perguntas que o app não tem como responder.

A restrição precisa ser real, não apenas uma instrução ao modelo. Um system instruction pode ser seguido, mas não é garantido — a garantia da frase exata tem que vir do app, não do comportamento do modelo. Por isso a mudança combina uma **guarda local** que classifica a mensagem antes de qualquer chamada, com uma **instrução de sistema** que reforça o escopo para o que escapar da classificação.

## What Changes

- **Escopo restrito:** o assistente passa a responder apenas sobre clima e meteorologia — as condições do local atual (condição, temperatura, vento) e perguntas de meteorologia em geral (o que é um furacão, por que chove). Qualquer outro assunto é recusado.
- **Mensagem de recusa fixa:** toda recusa é exatamente `Posso apenas informar sobre o clima de um determinado lugar`, sem explicação, sem pedido de desculpas e sem texto do modelo misturado.
- **Guarda local antes da API:** a mensagem do usuário é classificada antes de qualquer requisição. Mensagens fora de escopo são respondidas na hora — sem chamar o Gemini, sem gastar cota e sem exibir o indicador de "Digitando…".
- **Default-deny:** uma mensagem sem vocabulário de clima que não seja continuação de uma conversa já sobre clima é tratada como fora de escopo. Mensagens ambíguas só passam quando continuam uma pergunta sobre clima já respondida.
- **Instrução de sistema restrita:** o `buildSystemInstruction` passa a declarar o escopo e a instruir o modelo a recusar fora de escopo. O modelo permanece como última linha de defesa para o que a classificação local deixar passar.
- **Normalização da recusa do modelo:** fora de escopo, o modelo responde com um marcador interno; o cliente traduz o marcador para a frase fixa. Assim o texto visível ao usuário é sempre o esperado, mesmo que o modelo acrescente palavras ao redor.
- **Mensagem de abertura:** a mensagem de boas-vindas deixa de prometer ajuda "sobre como o app funciona" (fora do novo escopo) e passa a declarar o que o assistente responde.

## Capabilities

### New Capabilities

- *(nenhuma)*

### Modified Capabilities

- `ai-chat`: o chat passa a ter escopo restrito a clima e meteorologia, recusando qualquer outro assunto com uma mensagem fixa. A recusa é imposta por guarda local antes da chamada ao modelo e reforçada pela instrução de sistema. Os requisitos de acessibilidade, responsividade, integração com o Gemini, contexto de clima e tratamento de erros permanecem inalterados.

## Impact

- **Arquivos novos:** `src/services/chatScope.ts` — política de escopo do chat (classificador local, frase de recusa, marcador interno).
- **Arquivos modificados:** `src/services/geminiClient.ts` (instrução de sistema restrita; tradução do marcador de recusa), `src/components/ai-chat/AiChat.tsx` (guarda antes do envio, mensagem de abertura, placeholder do campo).
- **Sem alteração em:** `src/App.tsx` (o contrato de `context` do chat não muda), `src/components/ai-chat/AiChat.module.css` (a recusa reaproveita a mesma bolha de mensagem do assistente — nenhuma mudança visual).
- **Comportamento observável:** perguntas fora de escopo passam a receber a frase fixa em vez de uma resposta do modelo. Quem usava o chat para outros assuntos perde essa possibilidade — é o objetivo declarado da change.
- **Risco:** baixo. A mudança é isolada ao chat e não toca em geolocalização, clima ou estilos. O ponto sensível é a classificação local: o padrão default-deny pode recusar indevidamente uma pergunta sobre clima redigida sem vocabulário de clima, e pode aceitar indevidamente uma pergunta fora de escopo que cite clima — o que é absorvido pela instrução de sistema, com o modelo como última linha de defesa.
