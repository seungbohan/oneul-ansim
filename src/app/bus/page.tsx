'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import SectionCard from '@/components/ui/SectionCard'
import BigButton from '@/components/ui/BigButton'
import { useLocationStore } from '@/lib/store/locationStore'
import { BusStop, BusArrival } from '@/types'
import { formatDistance } from '@/lib/utils/formatters'

export default function BusPage() {
  const [stops, setStops] = useState<BusStop[]>([])
  const [selectedStop, setSelectedStop] = useState<BusStop | null>(null)
  const [arrivals, setArrivals] = useState<BusArrival[]>([])
  const [loading, setLoading] = useState(true)
  const [arrivalsLoading, setArrivalsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { updateLocation, lat, lng, getEffectiveCoords, region } = useLocationStore()

  useEffect(() => {
    if (!lat) updateLocation()
  }, [lat, updateLocation])

  const fetchStops = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { lat: queryLat, lng: queryLng } = getEffectiveCoords()
      const res = await fetch(`/api/bus?lat=${queryLat}&lng=${queryLng}`)
      if (!res.ok) throw new Error('정류장 정보를 가져올 수 없어요')
      const data: BusStop[] = await res.json()
      setStops(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했어요')
    } finally {
      setLoading(false)
    }
  }, [lat, lng, region, getEffectiveCoords])

  const fetchArrivals = useCallback(async (stopId: string) => {
    setArrivalsLoading(true)
    try {
      const res = await fetch(`/api/bus?stopId=${stopId}`)
      if (!res.ok) throw new Error('도착 정보를 가져올 수 없어요')
      const data: BusArrival[] = await res.json()
      setArrivals(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했어요')
    } finally {
      setArrivalsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStops()
  }, [fetchStops])

  const selectStop = async (stop: BusStop) => {
    setSelectedStop(stop)
    await fetchArrivals(stop.id)
  }

  return (
    <div className="px-4 pb-6">
      <Header />

      <section className="mt-2 mb-4 px-1">
        <h2 className="text-2xl font-bold">버스 보기 🚌</h2>
        <p className="text-muted mt-1">
          {selectedStop ? `${selectedStop.name} 정류장` : '가까운 정류장을 골라주세요'}
        </p>
      </section>

      {/* 정류장 선택 */}
      {!selectedStop && (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 animate-fade-in">
              <p className="text-4xl mb-3" aria-hidden="true">🔍</p>
              <p className="text-muted text-lg font-medium">정류장 찾는 중...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
              <p className="text-5xl mb-4" aria-hidden="true">😥</p>
              <p className="text-xl font-bold mb-2 text-center">정보를 불러오지 못했어요</p>
              <p className="text-muted text-center mb-6">{error}</p>
              <BigButton variant="secondary" icon="🔄" onClick={fetchStops}>
                다시 시도
              </BigButton>
            </div>
          ) : stops.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
              <p className="text-5xl mb-4" aria-hidden="true">🚏</p>
              <p className="text-xl font-bold mb-2 text-center">주변 정류장을 찾지 못했어요</p>
              <p className="text-muted text-center mb-6 leading-relaxed">
                위치 서비스가 꺼져 있거나<br />주변에 정류장이 없을 수 있어요
              </p>
              <BigButton variant="secondary" icon="📍" onClick={fetchStops}>
                위치 다시 확인하기
              </BigButton>
            </div>
          ) : (
            <div className="space-y-3">
              {stops.map(stop => (
                <SectionCard
                  key={stop.id}
                  onClick={() => selectStop(stop)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-lg">🚏 {stop.name}</p>
                      <p className="text-muted text-sm">📏 {formatDistance(stop.distance)}</p>
                    </div>
                    <span className="text-primary text-2xl">→</span>
                  </div>
                </SectionCard>
              ))}
            </div>
          )}
        </>
      )}

      {/* 버스 도착 정보 */}
      {selectedStop && (
        <>
          <div className="space-y-3 mb-4">
            {arrivalsLoading ? (
              <div className="flex flex-col items-center justify-center h-40 animate-fade-in">
                <p className="text-4xl mb-3" aria-hidden="true">🚌</p>
                <p className="text-muted text-lg font-medium">도착 정보 확인 중...</p>
              </div>
            ) : arrivals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 animate-fade-in">
                <p className="text-5xl mb-4" aria-hidden="true">🕐</p>
                <p className="text-xl font-bold mb-2">도착 예정 버스가 없어요</p>
                <p className="text-muted text-center">잠시 후 다시 확인해보세요</p>
              </div>
            ) : (
              arrivals.map((bus, i) => (
                <SectionCard key={i}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xl text-primary">{bus.routeName}</p>
                      <p className="text-muted text-sm">{bus.destination}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {bus.arrivalMinutes <= 2 ? (
                          <span className="text-danger">곧 도착</span>
                        ) : (
                          <>{bus.arrivalMinutes}분</>
                        )}
                      </p>
                      <p className="text-muted text-sm">{bus.remainingStops}정거장 전</p>
                    </div>
                  </div>
                </SectionCard>
              ))
            )}
          </div>

          <div className="space-y-2">
            <BigButton
              fullWidth
              variant="secondary"
              icon="🔄"
              onClick={() => fetchArrivals(selectedStop.id)}
            >
              새로고침
            </BigButton>
            <BigButton
              fullWidth
              variant="secondary"
              onClick={() => {
                setSelectedStop(null)
                setArrivals([])
                setError(null)
              }}
            >
              다른 정류장 보기
            </BigButton>
          </div>
        </>
      )}
    </div>
  )
}
