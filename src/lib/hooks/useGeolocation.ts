'use client'

import { useState, useCallback } from 'react'

export interface GeolocationState {
  lat: number | null
  lng: number | null
  error: string | null
  isLoading: boolean
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

const DEFAULT_OPTIONS: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 300_000, // 5 minutes cache
}

/**
 * A reusable hook for browser Geolocation API.
 * Decoupled from any store so it can be used in any component.
 *
 * Usage:
 *   const { lat, lng, error, isLoading, requestLocation } = useGeolocation()
 */
export function useGeolocation(options?: UseGeolocationOptions) {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    error: null,
    isLoading: false,
  })

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options }

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: '이 기기에서는 위치를 찾을 수 없어요.',
        isLoading: false,
      }))
      return
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          error: null,
          isLoading: false,
        })
      },
      (positionError) => {
        let message = '위치를 찾을 수 없어요.'
        if (positionError.code === positionError.PERMISSION_DENIED) {
          message = '위치 권한을 허용해주세요.'
        } else if (positionError.code === positionError.TIMEOUT) {
          message = '위치 확인이 너무 오래 걸려요. 다시 시도해주세요.'
        }
        setState((prev) => ({ ...prev, error: message, isLoading: false }))
      },
      mergedOptions,
    )
  }, [mergedOptions.enableHighAccuracy, mergedOptions.timeout, mergedOptions.maximumAge])

  return { ...state, requestLocation }
}
