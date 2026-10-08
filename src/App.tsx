import { useEffect, useState } from 'react'
import { useGeolocation } from './hooks/useGeolocation'
import {
  fetchForecast,
  type WeatherData,
} from './services/weatherClient.ts'
import { fetchPlaceName } from './services/geocodingClient.ts'
import styles from './App.module.css'

const emptyWeather: WeatherData = {
  temperature: null,
  condition: '',
  windSpeed: null,
  code: -1,
  loading: false,
  error: null,
}

function App() {
  const location = useGeolocation()
  const [weather, setWeather] = useState<WeatherData>(emptyWeather)
  const [retryCount, setRetryCount] = useState(0)
  const [placeName, setPlaceName] = useState<string | null>(null)
  const [geocodingLoading, setGeocodingLoading] = useState(false)

  useEffect(() => {
    const { latitude, longitude } = location
    if (latitude === null || longitude === null) {
      setWeather(emptyWeather)
      return
    }

    const controller = new AbortController()
    let active = true
    setWeather({ ...emptyWeather, loading: true })

    fetchForecast(latitude, longitude, controller.signal)
      .then((result) => {
        if (active) setWeather(result)
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) {
          return
        }
        setWeather({
          ...emptyWeather,
          error:
            error instanceof TypeError
              ? 'Unable to connect to the weather service. Check your internet connection and try again.'
              : 'An unexpected error occurred while loading the weather. Please try again.',
        })
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [location.latitude, location.longitude, retryCount])

  const retryWeather = () => setRetryCount((count) => count + 1)

  // Reverse-geocode the obtained coordinates to a place name. This lookup is
  // independent of the weather request: a failure keeps the forecast visible
  // and shows "Location name unavailable" with the coordinates instead.
  useEffect(() => {
    const { latitude, longitude } = location
    if (latitude === null || longitude === null) {
      setPlaceName(null)
      setGeocodingLoading(false)
      return
    }

    let active = true
    setGeocodingLoading(true)
    const controller = new AbortController()

    if (controller.signal.aborted) {
      active = false
      return
    }

    const timeoutId = setTimeout(() => controller.abort(), 10_000)

    fetchPlaceName(latitude, longitude, controller.signal)
      .then((result) => {
        if (!active) return
        setGeocodingLoading(false)
        setPlaceName(result?.name ?? null)
      })
      .catch(() => {
        if (!active) return
        setGeocodingLoading(false)
        setPlaceName(null)
      })

    return () => {
      active = false
      setGeocodingLoading(false)
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [location.latitude, location.longitude])

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="page-title">
        <p className={styles.eyebrow}>Local forecast</p>
        <h1 id="page-title">Weather where you are</h1>
        <p className={styles.intro}>
          Allow location access to see the current conditions near you.
        </p>

        {!location.isSupported ? (
          <div className={styles.message} role="alert">
            Geolocation is not supported in this browser.
          </div>
        ) : location.isLoading ? (
          <p className={styles.message} role="status">
            Detecting your location…
          </p>
        ) : location.error ? (
          <div className={styles.error} role="alert">
            <p>{location.error}</p>
            <button className={styles.secondaryButton} onClick={() => location.requestLocation()}>
              Try location again
            </button>
          </div>
        ) : location.latitude === null || location.longitude === null ? (
          <button
            className={styles.primaryButton}
            onClick={() => location.requestLocation()}
          >
            Detect my location
          </button>
        ) : weather.loading ? (
          <p className={styles.message} role="status">
            Loading current weather…
          </p>
        ) : weather.error ? (
          <div className={styles.error} role="alert">
            <p>{weather.error}</p>
            <button className={styles.secondaryButton} onClick={retryWeather}>
              Retry weather
            </button>
          </div>
        ) : (
          <div className={styles.weather} aria-live="polite">
            {geocodingLoading ? (
              <p className={styles.message}>Looking up your location…</p>
            ) : placeName ? (
              <p className={styles.placeName}>{placeName}</p>
            ) : (
              <p className={styles.placeName}>
                Location name unavailable
                <span className={styles.coordinates}>
                  ({location.latitude.toFixed(4)}, {location.longitude.toFixed(4)})
                </span>
              </p>
            )}
            <p className={styles.condition}>{weather.condition}</p>
            <p className={styles.temperature}>
              {weather.temperature === null ? '—' : `${weather.temperature}°`}
            </p>
            <dl className={styles.details}>
              <div>
                <dt>Wind</dt>
                <dd>
                  {weather.windSpeed === null ? '—' : `${weather.windSpeed} km/h`}
                </dd>
              </div>
              {location.accuracy !== null && (
                <div>
                  <dt>Location accuracy</dt>
                  <dd>±{Math.round(location.accuracy)} m</dd>
                </div>
              )}
            </dl>
            <button className={styles.secondaryButton} onClick={retryWeather}>
              Refresh weather
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
