/**
 * Client for fetching current weather from the Open-Meteo forecast API.
 *
 * The API requires no authentication and is called directly from the browser,
 * so no API key is needed. CORS is supported by the public endpoint.
 */

// https://open-meteo.com/documentation
const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Slight thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
}

export function getWeatherDescription(code: number): string {
  return WEATHER_CODES[code] ?? 'Unknown weather'
}

export interface WeatherData {
  temperature: number | null
  condition: string
  windSpeed: number | null
  code: number
  loading: boolean
  error: string | null
}

export interface FetchForecastParams {
  latitude: number
  longitude: number
  signal?: AbortSignal
}

const BASE_URL = 'https://api.open-meteo.com/v1/forecast'
const REQUEST_TIMEOUT_MS = 10_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Build the forecast request URL.
 */
function buildUrl(params: FetchForecastParams): string {
  const url = new URL(BASE_URL)
  url.searchParams.set('latitude', params.latitude.toString())
  url.searchParams.set('longitude', params.longitude.toString())
  url.searchParams.set('current', [
    'temperature_2m',
    'relative_humidity_2m',
    'weather_code',
    'wind_speed_10m',
  ].join(','))
  url.searchParams.set('interval', '1hour')
  return url.toString()
}

/**
 * Parse the Open-Meteo API response into the normalized weather shape.
 */
function parseResponse(json: unknown): WeatherData {
  if (
    typeof json !== 'object' ||
    json === null ||
    !('current' in json) ||
    !isRecord(json.current)
  ) {
    return {
      temperature: null,
      condition: 'Unknown weather',
      windSpeed: null,
      code: -1,
      loading: false,
      error: 'The weather service returned invalid data. Please try again.',
    }
  }

  const current = json.current
  const temperature =
    typeof current.temperature_2m === 'number'
      ? current.temperature_2m
      : null
  const windSpeed =
    typeof current.wind_speed_10m === 'number'
      ? current.wind_speed_10m
      : null
  const code =
    typeof current.weather_code === 'number' ? current.weather_code : null

  if (temperature === null || windSpeed === null || code === null) {
    return {
      temperature: null,
      condition: 'Unknown weather',
      windSpeed: null,
      code: -1,
      loading: false,
      error: 'The weather service returned incomplete data. Please try again.',
    }
  }

  return {
    temperature,
    condition: getWeatherDescription(code),
    windSpeed,
    code,
    loading: false,
    error: null,
  }
}

/**
 * Fetch the current weather forecast for the given coordinates.
 *
 * @returns A normalized WeatherData object. HTTP errors are represented in the
 *          returned object (not thrown), with an appropriate error message.
 *          Network errors (timeout, offline) throw a TypeError, which callers
 *          should catch and treat as a connectivity failure.
 */
export async function fetchForecast(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<WeatherData> {
  const params: FetchForecastParams = { latitude, longitude, signal }
  const url = buildUrl(params)
  const controller = new AbortController()
  let timedOut = false
  const abortFromCaller = () => controller.abort(signal?.reason)

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
    const response = await fetch(url, { signal: controller.signal })

    if (!response.ok) {
      if (response.status === 400) {
        return {
          temperature: null,
          condition: 'Unknown weather',
          windSpeed: null,
          code: -1,
          loading: false,
          error: 'These coordinates could not be used. Please try detecting your location again.',
        }
      }
      if (response.status === 500) {
        return {
          temperature: null,
          condition: 'Unknown weather',
          windSpeed: null,
          code: -1,
          loading: false,
          error: 'The weather service is temporarily unavailable. Please try again later.',
        }
      }
      return {
        temperature: null,
        condition: 'Unknown weather',
        windSpeed: null,
        code: -1,
        loading: false,
        error: `The weather service returned an error (HTTP ${response.status}). Please try again.`,
      }
    }

    const json = await response.json()
    return parseResponse(json)
  } catch (error) {
    if (signal?.aborted) throw error
    if (timedOut) {
      throw new TypeError('The weather request timed out.')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}
