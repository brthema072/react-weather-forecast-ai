import { useCallback, useState } from 'react'

export type GeolocationErrorCode =
  | 'permission_denied'
  | 'unavailable'
  | 'timeout'
  | 'unsupported'
  | 'unknown'

export interface GeolocationError extends Error {
  code: GeolocationErrorCode
  message: string
}

export interface Position {
  latitude: number
  longitude: number
  accuracy: number | null
}

type GeoStatus =
  | { kind: 'unsupported' }
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; position: Position }
  | { kind: 'error'; code: GeolocationErrorCode; message: string }

/**
 * Custom hook for browser geolocation.
 *
 * Coordinates must be requested explicitly by calling requestLocation() —
 * the geolocation permission request is never triggered on page load.
 */
export function useGeolocation() {
  const [status, setStatus] = useState<GeoStatus>({ kind: 'idle' })
  const isSupported =
    typeof navigator !== 'undefined' && navigator.geolocation !== undefined

  /**
   * Trigger the geolocation permission request.
   *
   * @param fixedLat Optional latitude for testing without requesting permission.
   * @param fixedLon Optional longitude for testing without requesting permission.
   */
  const requestLocation = useCallback(
    (fixedLat?: number, fixedLon?: number) => {
      if (!isSupported) {
        setStatus({ kind: 'unsupported' })
        return
      }

      // Testing helper: skip the geolocation API and return fixed coordinates.
      if (typeof fixedLat === 'number' && typeof fixedLon === 'number') {
        setStatus({ kind: 'loading' })
        setStatus({
          kind: 'success',
          position: { latitude: fixedLat, longitude: fixedLon, accuracy: null },
        })
        return
      }

      setStatus({ kind: 'loading' })

      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setStatus({
            kind: 'success',
            position: {
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy ?? null,
            },
          })
        },
        ({ code, message }) => {
          let codeName: GeolocationErrorCode
          let messageText: string

          if (code === 1) {
            codeName = 'permission_denied'
            messageText =
              'Location access was denied. Please enable location access in your browser settings and try again.'
          } else if (code === 2) {
            codeName = 'unavailable'
            messageText =
              'The current position could not be determined. Please try again.'
          } else if (code === 3) {
            codeName = 'timeout'
            messageText =
              'The request to get your location timed out. Please try again.'
          } else {
            codeName = 'unknown'
            messageText = message || 'An unknown error occurred while getting your location.'
          }

          setStatus({ kind: 'error', code: codeName, message: messageText })
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
      )
    },
    [isSupported],
  )

  let isSupportedField = isSupported
  let isLoading = false
  let latitude: number | null = null
  let longitude: number | null = null
  let accuracy: number | null = null
  let error: string | null = null

  switch (status.kind) {
    case 'unsupported':
      isSupportedField = false
      error = 'Geolocation is not supported in this browser.'
      break
    case 'loading':
      isLoading = true
      break
    case 'success':
      latitude = status.position.latitude
      longitude = status.position.longitude
      accuracy = status.position.accuracy
      break
    case 'error':
      error = status.message
      break
  }

  return {
    isSupported: isSupportedField,
    isLoading,
    latitude,
    longitude,
    accuracy,
    error,
    requestLocation,
  }
}
