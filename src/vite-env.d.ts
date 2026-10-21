/// <reference types="vite/client" />

/**
 * Tipagem das variáveis de ambiente expostas ao bundle do cliente pelo Vite.
 *
 * Somente variáveis com o prefixo `VITE_` são disponibilizadas em
 * `import.meta.env`. Os valores reais ficam em `.env.local`, que não é
 * versionado (veja `.gitignore`); `.env.example` documenta as chaves.
 */
interface ImportMetaEnv {
  /**
   * Chave da API do Google Gemini, usada pelo chat de atendimento.
   * Ausente quando o app roda sem configuração local.
   */
  readonly VITE_GEMINI_API_KEY?: string
  /**
   * Modelo do Gemini consultado pelo chat. Padrão: `gemini-3.5-flash-lite`
   * (disponível no free tier). Configurável para trocar de modelo sem
   * alterar código.
   */
  readonly VITE_GEMINI_MODEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
