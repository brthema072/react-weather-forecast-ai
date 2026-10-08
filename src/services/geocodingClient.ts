/**
 * Client for reverse-geocoding coordinates to a human-readable place name
 * via the BigDataCloud public API.
 *
 * This lookup is independent of the Open-Meteo weather request: if it fails,
 * the forecast remains visible and a "Location name unavailable" message along
 * with the coordinates is shown instead of the place name.
 */

const GECODING_BASE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client'
const GECODING_TIMEOUT_MS = 10_000

export interface FetchPlaceNameParams {
  latitude: number
  longitude: number
  signal?: AbortSignal
}

export interface PlaceNameResult {
  name: string
  latitude: number
  longitude: number
}

/**
 * Resolve the best place name from a BigDataCloud response, preferring
 * locality, then city, then principalSubdivision, then countryName.
 */
function resolvePlaceName(json: Record<string, unknown>): string | null {
  const fields = ['locality', 'city', 'principalSubdivision', 'countryName']
  for (const field of fields) {
    const value = json[field]
    if (typeof value === 'string' && value.trim() !== '') {
      return value
    }
  }
  return null
}

/**
 * Build the reverse-geocoding request URL.
 */
function buildUrl(params: FetchPlaceNameParams): string {
  const url = new URL(GECODING_BASE_URL)
  url.searchParams.set('latitude', params.latitude.toString())
  url.searchParams.set('longitude', params.longitude.toString())
  url.searchParams.set('localityLanguage', 'en')
  return url.toString()
}

/**
 * Reverse-geocode the given coordinates to a human-readable place name.
 *
 * Returns null when the lookup fails (non-2xx response, network error,
 * timeout, invalid response, or no usable place name in the response) so the
 * weather forecast can still display.
 */
export async function fetchPlaceName(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<PlaceNameResult | null> {
  const params: FetchPlaceNameParams = { latitude, longitude, signal }
  const url = buildUrl(params)
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort(signal?.reason)

  if (signal?.aborted) {
    abortFromCaller()
  } else {
    signal?.addEventListener('abort', abortFromCaller, { once: true })
  }

  const timeoutId = setTimeout(() => controller.abort(), GECODING_TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      return null
    }

    const json = await response.json()
    if (typeof json !== 'object' || json === null) {
      return null
    }

    const name = resolvePlaceName(json)
    if (!name) {
      return null
    }

    return { name, latitude, longitude }
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}
