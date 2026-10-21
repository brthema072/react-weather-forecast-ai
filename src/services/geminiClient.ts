/**
 * Client for the Google Gemini chat backing the help widget.
 *
 * Uses the currently maintained `@google/genai` SDK (the older
 * `@google/generative-ai` package was deprecated in November 2025 and no
 * longer receives updates).
 *
 * The API key is read from `import.meta.env.VITE_GEMINI_API_KEY`, which Vite
 * inlines into the browser bundle at build time. That means the key is
 * visible to anyone who opens the app: fine for local development, not
 * acceptable for production, where the call must go through a backend.
 */

import { ApiError, GoogleGenAI, type Content } from '@google/genai'
import { OUT_OF_SCOPE_MARKER, toVisibleReply } from './chatScope.ts'

/**
 * Model used when `VITE_GEMINI_MODEL` is not set. `gemini-3.5-flash-lite`
 * is served on the free tier with a generous daily quota, which matters more
 * than raw quality for an end-user chat that can be called many times.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite'

const REQUEST_TIMEOUT_MS = 10_000

/**
 * Upper bound on how many past turns are sent to the model. Keeps the request
 * from growing without limit during a long conversation.
 */
const MAX_HISTORY_TURNS = 20

/**
 * Current conditions shown in the app, injected into the system instruction so
 * the assistant can answer questions about the forecast on screen.
 */
export interface GeminiContext {
  placeName: string | null
  condition: string | null
  temperature: number | null
  windSpeed: number | null
}

/** A single turn of the conversation, in the app's own vocabulary. */
export interface ChatTurn {
  role: 'user' | 'assistant'
  text: string
}

/**
 * An error whose message is already written for the user.
 *
 * Used for failures detected before (or after) the API call, where there is
 * no HTTP status to translate — the message is passed through untouched
 * instead of being replaced by a generic one.
 */
export class ChatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ChatError'
  }
}

/**
 * The API key configured for the app, or an empty string when unset.
 *
 * `apiKey` is required by the SDK at runtime in the browser, so callers must
 * check this before attempting a request.
 */
export function getGeminiApiKey(): string {
  return import.meta.env.VITE_GEMINI_API_KEY ?? ''
}

/** The Gemini model to query, honouring the `VITE_GEMINI_MODEL` override. */
export function getGeminiModel(): string {
  return import.meta.env.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL
}

/**
 * Build the system instruction from the current app context.
 *
 * Only the values that are actually available are included, so the model is
 * never told about a location or temperature the app does not have.
 */
export function buildSystemInstruction(context: GeminiContext): string {
  const lines = [
    'Você é o assistente do aplicativo Weather Forecast, que mostra a previsão do tempo atual na localização da pessoa ou na que ela informar.',
    'Responda de forma breve e direta, em português.',
    'Você responde apenas sobre clima e meteorologia: as condições atuais do local da pessoa e perguntas de clima em geral.',
    `Para qualquer assunto que não seja sobre clima, responda exatamente ${OUT_OF_SCOPE_MARKER}, sem nenhuma outra palavra.`,
  ]

  const details: string[] = []
  if (context.placeName) details.push(`Local atual: ${context.placeName}`)
  if (context.condition) details.push(`Condição: ${context.condition}`)
  if (context.temperature !== null) details.push(`Temperatura: ${context.temperature}°C`)
  if (context.windSpeed !== null) details.push(`Velocidade do vento: ${context.windSpeed} km/h`)

  if (details.length > 0) {
    lines.push('Dados atuais do app:', ...details.map((detail) => `- ${detail}`))
    lines.push(
      'Use esses dados quando a pessoa perguntar sobre o clima atual. Se os dados não forem suficientes para a pergunta, diga isso claramente.',
    )
  } else {
    lines.push(
      'O app ainda não tem dados de clima carregados. Se a pessoa perguntar sobre o clima atual, informe que os dados ainda não estão disponíveis.',
    )
  }

  return lines.join('\n')
}

/**
 * Map the app's conversation history to the SDK's `contents` format.
 *
 * The Gemini API only accepts the roles `'user'` and `'model'` — there is no
 * `'assistant'` role — so the app's vocabulary is translated here.
 */
export function buildContents(history: ChatTurn[]): Content[] {
  return history.map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.text }],
  }))
}

/**
 * Turn an SDK/API failure into a message that can be shown to the user.
 *
 * `ApiError` carries the HTTP status, which lets the quota case (429) be
 * reported distinctly from a generic failure.
 */
function describeError(error: unknown): string {
  if (error instanceof ChatError) {
    return error.message
  }

  if (error instanceof ApiError) {
    if (error.status === 429) {
      return 'O limite de requisições do Gemini foi atingido. Aguarde alguns instantes e tente novamente.'
    }
    if (error.status === 400 || error.status === 401 || error.status === 403) {
      return 'A chave da API do Gemini foi recusada. Verifique a configuração de VITE_GEMINI_API_KEY.'
    }
    if (error.status >= 500) {
      return 'O serviço do Gemini está temporariamente indisponível. Tente novamente em instantes.'
    }
    return `O Gemini respondeu com um erro (HTTP ${error.status}). Tente novamente.`
  }

  if (error instanceof TypeError) {
    return 'Não foi possível conectar ao serviço do Gemini. Verifique sua conexão e tente novamente.'
  }

  return 'Ocorreu um erro inesperado ao falar com o assistente. Tente novamente.'
}

/**
 * Send the conversation to Gemini and return the assistant's reply.
 *
 * @param history Prior turns, oldest first. Only the most recent
 *                {@link MAX_HISTORY_TURNS} are sent.
 * @param context Current weather/place context for the system instruction.
 * @param signal  Optional caller signal used to cancel the request.
 * @returns The reply text.
 * @throws {TypeError} When the request fails due to connectivity or timeout.
 * @throws {Error} When the request fails for any other reason, including a
 *                 missing API key or a response without usable text.
 */
export async function sendChatMessage(
  history: ChatTurn[],
  context: GeminiContext,
  signal?: AbortSignal,
): Promise<string> {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    throw new ChatError(
      'A chave da API do Gemini não está configurada. Defina VITE_GEMINI_API_KEY no arquivo .env.local.',
    )
  }

  const ai = new GoogleGenAI({ apiKey })
  const controller = new AbortController()
  let timedOut = false
  const abortFromCaller = (): void => controller.abort(signal?.reason)

  if (signal?.aborted) {
    abortFromCaller()
  } else {
    signal?.addEventListener('abort', abortFromCaller, { once: true })
  }

  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  try {
    const recentTurns = history.slice(-MAX_HISTORY_TURNS)
    const response = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: buildContents(recentTurns),
      config: {
        systemInstruction: buildSystemInstruction(context),
        abortSignal: controller.signal,
      },
    })

    const text = response.text
    if (!text || text.trim() === '') {
      throw new ChatError('O Gemini respondeu sem nenhum texto.')
    }

    // The model may decline on its own, using the internal marker. Translate
    // that into the fixed decline so the text shown to the user is always
    // the expected one.
    return toVisibleReply(text.trim())
  } catch (error) {
    if (signal?.aborted) {
      throw error
    }
    if (timedOut) {
      throw new TypeError('A requisição ao Gemini demorou demais e foi cancelada.')
    }
    // A connectivity failure is a TypeError, matching the convention used by
    // weatherClient.ts. Everything else becomes a message written for the user.
    if (error instanceof TypeError) {
      throw error
    }
    if (error instanceof ChatError) {
      throw error
    }
    throw new Error(describeError(error), { cause: error })
  } finally {
    clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}
