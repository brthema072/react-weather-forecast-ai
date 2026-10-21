/**
 * Scope policy for the chat assistant.
 *
 * The assistant answers questions about weather and meteorology only. Both
 * layers of that restriction read from this module: the local guard runs
 * before any API call, and the Gemini client declares the same scope in the
 * system instruction. Keeping the policy in one place keeps the two layers
 * from drifting apart.
 *
 * The module imports nothing, so it can be reasoned about in isolation.
 */

/**
 * Fixed reply shown when a message falls outside the weather scope.
 *
 * The wording is exact on purpose: it is the only thing the user sees when
 * a message is declined, and it must not carry an explanation, an apology
 * or an offer to help with something else.
 */
export const OUT_OF_SCOPE_REPLY = 'Posso apenas informar sobre o clima de um determinado lugar'

/**
 * Internal marker the model is asked to emit when it declines on its own.
 *
 * It never reaches the screen: {@link toVisibleReply} replaces it with
 * {@link OUT_OF_SCOPE_REPLY}.
 */
export const OUT_OF_SCOPE_MARKER = '[fora-de-escopo]'

/**
 * Minimal shape of a conversation turn.
 *
 * Declared here instead of imported so the module stays dependency-free; the
 * chat client's own turn type is structurally identical to this one.
 */
export interface ScopeTurn {
  role: 'user' | 'assistant'
  text: string
}

/**
 * Words that open a follow-up to the previous turn ("e amanhã?", "e no fim
 * de semana?").
 */
const CONTINUATION_MARKERS = new Set([
  // Portuguese
  'e',
  'entao',
  'isso',
  'isto',
  'aquilo',
  'esse',
  'essa',
  'aquele',
  'aquela',
  'dele',
  'dela',
  'la',
  'ai',
  'ali',
  'tambem',
  'mais',
  'menos',
  'mesmo',
  'ainda',
  'agora',
  'hoje',
  'amanha',
  'depois',
  'antes',
  'ou',
  'mas',
  'se',
  'caso',
  'tipo',
  'meio',
  'pra',
  'pro',
  'para',
  'com',
  'sem',
  'sobre',
  'beleza',
  // English
  'and',
  'then',
  'so',
  'also',
  'more',
  'still',
  'now',
  'but',
  'if',
  'or',
])

/**
 * Whole words that mark a message as being about weather or meteorology.
 *
 * Matched with word boundaries, so "sol" does not match "solução" and "hot"
 * does not match "hotel".
 */
const WEATHER_TERMS = [
  // Portuguese
  'tempo',
  'clima',
  'climatico',
  'climatica',
  'meteorologia',
  'meteorologico',
  'meteorologica',
  'temperatura',
  'temperaturas',
  'termometro',
  'graus',
  'grau',
  'umidade',
  'umido',
  'nuvem',
  'nuvens',
  'nublado',
  'nublada',
  'enublado',
  'nebuloso',
  'nebulosa',
  'ceu',
  'ceus',
  'sol',
  'soalheiro',
  'ensolarado',
  'calor',
  'quente',
  'morno',
  'ameno',
  'frio',
  'fria',
  'frios',
  'geada',
  'gelo',
  'neve',
  'neveiro',
  'nevoeiro',
  'chuva',
  'chuvas',
  'chuvoso',
  'chuvosa',
  'garoa',
  'garoar',
  'chuvisco',
  'nevoa',
  'neblina',
  'bruma',
  'vento',
  'ventos',
  'ventania',
  'ventoso',
  'brisa',
  'calafrio',
  'tempestade',
  'tempestades',
  'tempestuoso',
  'trovoada',
  'trovoar',
  'furacao',
  'tufao',
  'ciclone',
  'tornado',
  'granizo',
  'orvalho',
  'precipitacao',
  'precipitar',
  'radiacao',
  'barometro',
  'pressao',
  'moncao',
  'estufa',
  'maximo',
  'maxima',
  'minimo',
  'minima',
  'inverno',
  'verao',
  'outono',
  'primavera',
  'onda',
  'ondas',
  // English
  'weather',
  'temperature',
  'temperatures',
  'forecast',
  'climate',
  'meteorology',
  'meteorologist',
  'humidity',
  'shower',
  'showers',
  'storm',
  'storms',
  'stormy',
  'thunder',
  'thunderstorm',
  'lightning',
  'wind',
  'winds',
  'windy',
  'breeze',
  'snow',
  'snowy',
  'snowfall',
  'snowing',
  'hail',
  'sleet',
  'frost',
  'fog',
  'foggy',
  'mist',
  'drizzle',
  'cloud',
  'clouds',
  'cloudy',
  'overcast',
  'sun',
  'sunny',
  'heat',
  'heatwave',
  'hot',
  'cold',
  'warm',
  'warmer',
  'cooler',
  'cool',
  'degree',
  'degrees',
  'celsius',
  'fahrenheit',
  'precipitation',
  'blizzard',
  'cyclone',
  'hurricane',
  'typhoon',
  'tornado',
  'gale',
  'raining',
  'rainy',
  'rain',
  'freezing',
]

/**
 * Multi-word expressions that only make sense as a whole.
 */
const WEATHER_PHRASES = [
  'ponto de orvalho',
  'indice uv',
  'frente fria',
  'frente quente',
  'onda de calor',
  'umidade relativa',
  'tempo fechado',
  'tempo instavel',
  'chuva forte',
  'chuva fraca',
  'sol forte',
  'pressao atmosferica',
  'efeito estufa',
]

/**
 * Word stems that mark a message as being about weather when the message
 * uses an inflected form ("chove", "chovendo", "nevou").
 *
 * Each stem is long and specific enough that no ordinary word in either
 * language starts with it by accident.
 */
const WEATHER_STEMS = [
  'chov', // chover, chove, chovendo, choveu
  'chuv', // chuva, chuvoso
  'neva', // nevar, nevou, nevando
  'estuf', // estufa
  'previsa', // previsao, previsoes
  'rain', // rain, raining, rainy
  'snow', // snow, snowy, snowing
  'storm', // storm, stormy
  'cloud', // cloud, cloudy
  'thund', // thunder, thunderstorm
  'forec', // forecast
  'weath', // weather
  'humid', // humid, humidity
]

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const WEATHER_WORD_PATTERN = new RegExp(
  `\\b(?:${[...WEATHER_TERMS, ...WEATHER_PHRASES].map(escapeRegExp).join('|')})\\b`,
)

/** Lowercase, strip accents and collapse whitespace. */
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Normalize further, dropping punctuation, for tolerant comparisons. */
function normalizeForComparison(text: string): string {
  return normalizeText(text)
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const MARKER_KEY = normalizeForComparison(OUT_OF_SCOPE_MARKER)
const REPLY_KEY = normalizeForComparison(OUT_OF_SCOPE_REPLY)

function mentionsWeather(normalized: string): boolean {
  if (WEATHER_WORD_PATTERN.test(normalized)) {
    return true
  }
  return normalized.split(' ').some((word) => WEATHER_STEMS.some((stem) => word.startsWith(stem)))
}

function startsWithContinuationMarker(normalized: string): boolean {
  return CONTINUATION_MARKERS.has(normalized.split(' ')[0] ?? '')
}

/**
 * Decide whether a message belongs to the weather scope.
 *
 * The check is default-deny: a message is in scope only when it is
 * recognizably about weather, or when it continues a conversation that was
 * already about weather. Anything else is declined.
 *
 * @param text       The message the user just sent.
 * @param priorTurns The turns that came before it in the conversation.
 */
export function isWeatherRelated(text: string, priorTurns: ScopeTurn[] = []): boolean {
  const normalized = normalizeText(text)
  if (normalized === '') {
    return false
  }

  if (mentionsWeather(normalized)) {
    return true
  }

  // A message with no weather vocabulary is only in scope when it reads as a
  // follow-up ("e amanhã?") to a conversation that was already about the
  // weather. Only the user's own earlier turns count: the assistant's
  // opening message is not a topic the user brought up.
  if (!startsWithContinuationMarker(normalized)) {
    return false
  }

  return priorTurns.some(
    (turn) => turn.role === 'user' && mentionsWeather(normalizeText(turn.text)),
  )
}

/**
 * Turn the model's reply into what the user should see.
 *
 * A reply carrying the internal marker — or the decline sentence itself, in
 * any punctuation or casing — is replaced by the fixed decline, so the text
 * on screen is always exactly {@link OUT_OF_SCOPE_REPLY}.
 *
 * @param text The reply text coming from the model.
 */
export function toVisibleReply(text: string): string {
  const normalized = normalizeForComparison(text)
  if (normalized.includes(MARKER_KEY) || normalized.includes(REPLY_KEY)) {
    return OUT_OF_SCOPE_REPLY
  }
  return text
}
