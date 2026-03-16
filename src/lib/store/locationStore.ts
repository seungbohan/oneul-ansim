'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 주요 지역 기본 좌표 */
export const REGION_PRESETS: Record<string, { lat: number; lng: number; label: string }> = {
  seoul:    { lat: 37.5665, lng: 126.978,  label: '서울' },
  daegu:    { lat: 35.8714, lng: 128.6014, label: '대구' },
  busan:    { lat: 35.1796, lng: 129.0756, label: '부산' },
  incheon:  { lat: 37.4563, lng: 126.7052, label: '인천' },
  gwangju:  { lat: 35.1595, lng: 126.8526, label: '광주' },
  daejeon:  { lat: 36.3504, lng: 127.3845, label: '대전' },
  ulsan:    { lat: 35.5384, lng: 129.3114, label: '울산' },
  sejong:   { lat: 36.4800, lng: 127.2590, label: '세종' },
  gyeonggi: { lat: 37.2750, lng: 127.0094, label: '경기' },
  gangwon:  { lat: 37.8228, lng: 128.1555, label: '강원' },
  chungbuk: { lat: 36.6357, lng: 127.4912, label: '충북' },
  chungnam: { lat: 36.6588, lng: 126.6728, label: '충남' },
  jeonbuk:  { lat: 35.8203, lng: 127.1088, label: '전북' },
  jeonnam:  { lat: 34.8161, lng: 126.4629, label: '전남' },
  gyeongbuk:{ lat: 36.4919, lng: 128.8889, label: '경북' },
  gyeongnam:{ lat: 35.4606, lng: 128.2132, label: '경남' },
  jeju:     { lat: 33.4996, lng: 126.5312, label: '제주' },
}

const DEFAULT_REGION = 'seoul'

/** GPS 좌표로 가장 가까운 지역 키를 반환 */
function detectNearestRegion(lat: number, lng: number): string {
  let closest = DEFAULT_REGION
  let minDist = Infinity
  for (const [key, preset] of Object.entries(REGION_PRESETS)) {
    const d = Math.pow(preset.lat - lat, 2) + Math.pow(preset.lng - lng, 2)
    if (d < minDist) {
      minDist = d
      closest = key
    }
  }
  return closest
}

type LocationState = {
  lat: number | null
  lng: number | null
  region: string // region key (e.g. 'daegu')
  address: string
  lastUpdated: string | null
  isLoading: boolean
  error: string | null
  updateLocation: () => Promise<void>
  setRegion: (regionKey: string) => void
  setManualAddress: (address: string) => void
  getEffectiveCoords: () => { lat: number; lng: number }
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      lat: null,
      lng: null,
      region: DEFAULT_REGION,
      address: '',
      lastUpdated: null,
      isLoading: false,
      error: null,

      updateLocation: async () => {
        set({ isLoading: true, error: null })

        if (!navigator.geolocation) {
          set({ isLoading: false, error: '위치를 찾을 수 없어요' })
          return
        }

        try {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000,
              })
            }
          )

          const lat = position.coords.latitude
          const lng = position.coords.longitude
          // GPS 좌표로 가장 가까운 지역 자동 감지
          const detectedRegion = detectNearestRegion(lat, lng)

          set({
            lat,
            lng,
            region: detectedRegion,
            lastUpdated: new Date().toISOString(),
            isLoading: false,
            error: null,
          })
        } catch {
          set({
            isLoading: false,
            error: '위치를 찾을 수 없어요. 설정에서 위치를 허용해주세요.',
          })
        }
      },

      setRegion: (regionKey) => {
        const preset = REGION_PRESETS[regionKey]
        if (preset) {
          set({ region: regionKey, lat: preset.lat, lng: preset.lng, lastUpdated: new Date().toISOString() })
        }
      },

      setManualAddress: (address) => set({ address }),

      getEffectiveCoords: () => {
        const { lat, lng, region } = get()
        if (lat !== null && lng !== null) {
          return { lat, lng }
        }
        const preset = REGION_PRESETS[region] ?? REGION_PRESETS[DEFAULT_REGION]
        return { lat: preset.lat, lng: preset.lng }
      },
    }),
    {
      name: 'oneul-location',
      partialize: (state) => ({ region: state.region }),
    }
  )
)
