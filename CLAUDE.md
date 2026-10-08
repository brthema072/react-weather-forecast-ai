# CLAUDE.md - Weather Forecast React AI

## 🛑 Regra Crítica: Proibição de Commits

**O agente NÃO deve fazer commits de git por conta própria.**

- Nunca execute `git commit`, `git push` ou qualquer comando de git que realize commits.
- Se precisar que alterações sejam salvas no repositório, **comunique ao usuário** e aguarde autorização explícita.
- Use `git status` e `git diff` para mostrar o estado das alterações, mas não realize a commit.
- O commit é uma ação que pertence ao desenvolvedor humano; a aprovação e o timing são decisões dele.

---

## Sobre o Projeto

**Nome:** Weather Forecast (weather-app-scaffold)
**Tipo:** Aplicação de previsão do tempo baseada na localização atual do usuário
**Stack:** React 19 + TypeScript 6 + Vite 8
**Licença:** privada

### Funcionalidade Principal

A aplicação solicita permissão de geolocalização ao usuário (sem ser disparada automaticamente no carregamento da página), busca as coordenadas atuais e exibe:
- Nome da localidade (via reverse geocoding) ou as coordenadas
- Condição do tempo atual
- Temperatura (2m)
- Velocidade do vento (10m)
- Precisão da localização
- Indicadores de loading, erro e botões de retry

---

## Arquitetura Técnica

### Estrutura de Arquivos

```
src/
├── main.tsx        # Ponto de entrada
├── App.tsx         # Componente principal (orquestra geolocalização, clima e geocoding)
├── App.module.css  # Estilos do App.tsx
├── style.css       # Estilos globais
├── hooks/
│   └── useGeolocation.ts   # Hook de geolocalização do navegador
└── services/
    ├── weatherClient.ts    # Cliente Open-Meteo (clima)
    └── geocodingClient.ts  # Cliente BigDataCloud (reverse geocoding)
```

### Dependências

- **Tempo de execução:** `react` ^19.1.0, `react-dom` ^19.1.0
- **Desenvolvimento:** `typescript` ~6.0.2, `vite` ^8.3.0, `@vitejs/plugin-react` 5.2.0

### Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento Vite |
| `npm run build` | Compila TypeScript (`tsc -b`) e gera build de produção (`vite build`) |
| `npm run lint` | Executa ESLint |
| `npm run preview` | Serve o build de produção localmente |

---

## Configurações Técnicas

### TypeScript (`tsconfig.json`)

- **target:** `es2023`, **module:** `esnext`, **lib:** `["ES2023", "DOM"]`
- **jsx:** `react-jsx`
- **moduleResolution:** `bundler`, com `allowImportingTsExtensions: true` e `verbatimModuleSyntax: true`
- **noEmit:** true (o Vite trata a emissão dos bundles)
- **Linting ativo:** `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`
- `skipLibCheck: true`, `allowArbitraryExtensions: true`
- **Include:** apenas `src`

### Vite (`vite.config.ts`)

Plugin React básico, sem configurações extras de aliases ou plugins.

### Tipos Exponíveis

- `WeatherData` (`temperature: number \| null`, `condition: string`, `windSpeed: number \| null`, `code: number`, `loading: boolean`, `error: string \| null`)
- `PlaceNameResult` (`name`, `latitude`, `longitude`)
- `Position` (`latitude`, `longitude`, `accuracy: number \| null`)
- `GeolocationError` e `GeolocationErrorCode` (`permission_denied`, `unavailable`, `timeout`, `unsupported`, `unknown`)

---

## APIs Utilizadas

### Open-Meteo (`https://api.open-meteo.com/v1/forecast`)

- Sem autenticação necessária; chamada direta do navegador (CORS suportado).
- Parâmetros: `latitude`, `longitude`, `current` (`temperature_2m`, `relative_humidity_2m`, `weather_code`, `wind_speed_10m`), `interval: 1hour`.
- **Tratamento de erros:** códigos HTTP 400 e 500 são convertidos em objetos `WeatherData` com `error` (não lançam). Erros de rede/timeout lançam `TypeError`, que o caller deve tratar como falha de conectividade.
- **Timeout:** 10.000 ms; suporte a `AbortSignal` do caller.
- Mapeamento `WEATHER_CODES` → descrição textual WMO (111 códigos).

### BigDataCloud (`https://api.bigdatacloud.net/data/reverse-geocode-client`)

- Reverse geocoding para nome da localidade.
- Parâmetros: `latitude`, `longitude`, `localityLanguage: en`.
- **Timeout:** 10.000 ms.
- **Fallback:** em caso de falha, a aplicação exibe "Location name unavailable" junto com as coordenadas — o geocoding é independente da requisição de clima e uma falha não esconde a previsão.
- Resolução preferencial do nome: `locality` → `city` → `principalSubdivision` → `countryName`.
- Retorna `null` em qualquer falha (não-2xx, rede, timeout, resposta inválida, sem nome utilizável).

---

## Padrões de Código e Comportamento

### Gerenciamento de Estado e Efeitos

- **Geolocalização:** o hook `useGeolocation` expõe um estado explícito (`idle` → `loading` → `success`/`error`) e **nunca** dispara a permissão de navegador automaticamente — deve ser acionado por `requestLocation()`.
- **AbortController:** todas as requisições HTTP criam um controlador local que:
  - escuta o `AbortSignal` do caller;
  - aplica um timeout interno de 10s;
  - é abortado/cleanupado no return dos `useEffect`.
- **Race conditions:** flags `active` nos `useEffect` evitam `setState` após desmontagem ou em requisições supersadas.
- **Idempotência de retry:** `retryWeather` incrementa `retryCount`, reexecutando o `useEffect` dependente.

### Tratamento de Erros

- Erros de geolocalização são mapeados para códigos semânticos (`permission_denied`, `unavailable`, `timeout`, etc.) com mensagens em inglês.
- Erros de clima são representados dentro do objeto de retorno (`error: string | null`) ou como `TypeError` para falhas de conectividade.
- O UI usa `role="alert"` para erros e `role="status"` para mensagens de carregamento; área com `aria-live="polite"` para o bloco de clima.

### UI / Acessibilidade

- Card centralizado com título, subtítulo e mensagem de introdução.
- Estados visuais: navegação não suportada, detectando localização, erro de permissão (com botão "Try location again"), button "Detect my location", loading "Loading current weather…", erro de clima (com "Retry weather"), e sucesso.
- Cores globais: `--color: #162b45`, `--bg: #e9f5ff`.

---

## Fluxo de Desenvolvimento Esperado

1. **Explorar:** o agente pode ler arquivos, rodar `git status`/`git diff` e `npm run build`/`lint` para verificar integridade.
2. **Alterar:** editar os arquivos fonte conforme necessário.
3. **Verificar:** rodar os scripts do projeto para confirmar que as mudanças não quebram o build ou o lint.
4. **Reportar:** apresentar o resumo das alterações e o diff ao usuário.
5. **Commit:** **apenas com autorização explícita do usuário**, que executa o commit (`git commit` / `git push`).

---

## Observações Adicionais

- Este é um scaffold/boilerplate (versão 0.0.0); o repositório `openspec/specs/` está vazio (`.gitkeep`).
- Não há configuração de ESLint ou Prettin definida (o script `lint` existe mas nenhum arquivo de configuração de ESLint está presente).
- Arquivos de build ficam em `dist/`.
