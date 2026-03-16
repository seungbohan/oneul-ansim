'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import SectionCard from '@/components/ui/SectionCard'
import StatusBadge from '@/components/ui/StatusBadge'
import BigButton from '@/components/ui/BigButton'
import { WeatherInfo } from '@/types'
import { useLocationStore } from '@/lib/store/locationStore'
import { getOutingAdvice, getWeatherIcon, getWeatherGreeting } from '@/lib/utils/weatherHelper'

export default function WeatherPage() {
  const [weather, setWeather] = useState<WeatherInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { updateLocation, getEffectiveCoords, lat, region } = useLocationStore()

  useEffect(() => {
    if (!lat) updateLocation()
  }, [lat, updateLocation])

  const fetchWeather = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { lat: queryLat, lng: queryLng } = getEffectiveCoords()
      const res = await fetch(`/api/weather?lat=${queryLat}&lng=${queryLng}`)
      if (!res.ok) throw new Error('날씨 정보를 가져올 수 없어요')
      const data: WeatherInfo = await res.json()
      setWeather(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했어요')
    } finally {
      setLoading(false)
    }
  }, [lat, region, getEffectiveCoords])

  useEffect(() => {
    fetchWeather()
  }, [fetchWeather])

  if (loading || !weather) {
    return (
      <div className="px-4 pb-6">
        <Header />
        <div className="flex items-center justify-center h-60">
          <p className="text-xl text-muted">날씨 확인 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 pb-6">
        <Header />
        <div className="flex flex-col items-center justify-center h-60 gap-4">
          <p className="text-xl text-danger">{error}</p>
          <BigButton variant="secondary" icon="🔄" onClick={fetchWeather}>
            다시 시도
          </BigButton>
        </div>
      </div>
    )
  }

  const advice = getOutingAdvice(weather)
  const icon = getWeatherIcon(weather.condition)

  return (
    <div className="px-4 pb-6">
      <Header />

      <section className="mt-2 mb-4 px-1">
        <h2 className="text-2xl font-bold">오늘 날씨 {icon}</h2>
        <p className="text-muted mt-1">{getWeatherGreeting(weather)}</p>
      </section>

      {/* 외출 판단 */}
      <SectionCard className="mb-4">
        <div className="text-center py-2">
          <p className="text-5xl mb-3">{advice.canGoOut ? '😊' : '😷'}</p>
          <p className="text-xl font-bold mb-2">
            {advice.canGoOut ? '나가셔도 좋아요!' : '오늘은 조심하세요'}
          </p>
          {advice.reasons.map((r, i) => (
            <p key={i} className="text-base text-muted">{r}</p>
          ))}
        </div>
      </SectionCard>

      {/* 기온 */}
      <SectionCard title="기온" icon="🌡️" className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-4xl font-bold">{weather.temperature}°</p>
            <p className="text-muted">체감 {weather.feelsLike}°</p>
          </div>
          <div className="text-right text-base">
            <p>최고 <span className="text-danger font-bold">{weather.maxTemp}°</span></p>
            <p>최저 <span className="text-info font-bold">{weather.minTemp}°</span></p>
          </div>
        </div>
      </SectionCard>

      {/* 미세먼지 */}
      <SectionCard title="미세먼지" icon="😷" className="mb-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-sm text-muted mb-1">미세먼지</p>
            <StatusBadge variant={weather.pm10Grade === '좋음' ? 'success' : weather.pm10Grade === '보통' ? 'info' : 'danger'}>
              {weather.pm10Grade}
            </StatusBadge>
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted mb-1">초미세먼지</p>
            <StatusBadge variant={weather.pm25Grade === '좋음' ? 'success' : weather.pm25Grade === '보통' ? 'info' : 'danger'}>
              {weather.pm25Grade}
            </StatusBadge>
          </div>
        </div>
      </SectionCard>

      {/* 팁 */}
      {advice.tips.length > 0 && (
        <SectionCard title="오늘의 팁" icon="💡" className="mb-4">
          <ul className="space-y-1">
            {advice.tips.map((tip, i) => (
              <li key={i} className="text-base">• {tip}</li>
            ))}
          </ul>
        </SectionCard>
      )}

      <BigButton
        fullWidth
        variant="secondary"
        icon="🔄"
        onClick={fetchWeather}
      >
        새로고침
      </BigButton>
    </div>
  )
}
