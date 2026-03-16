'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import SectionCard from '@/components/ui/SectionCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { useLocationStore } from '@/lib/store/locationStore'
import { Facility, FacilityType } from '@/types'
import { formatDistance } from '@/lib/utils/formatters'

const TABS: { type: FacilityType; icon: string; label: string }[] = [
  { type: 'pharmacy', icon: '💊', label: '약국' },
  { type: 'hospital', icon: '🏥', label: '병원' },
  { type: 'welfare', icon: '🏛️', label: '복지관' },
]

export default function FacilitiesPage() {
  const [activeTab, setActiveTab] = useState<FacilityType>('pharmacy')
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { updateLocation, lat, lng, isLoading: locLoading, getEffectiveCoords, region } = useLocationStore()

  useEffect(() => {
    if (!lat) {
      updateLocation()
    }
  }, [lat, updateLocation])

  const fetchFacilities = useCallback(async (type: FacilityType) => {
    setLoading(true)
    setError(null)
    try {
      const { lat: queryLat, lng: queryLng } = getEffectiveCoords()
      const res = await fetch(`/api/facilities?lat=${queryLat}&lng=${queryLng}&type=${type}`)
      if (!res.ok) throw new Error('시설 정보를 가져올 수 없어요')
      const data: Facility[] = await res.json()
      setFacilities(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했어요')
    } finally {
      setLoading(false)
    }
  }, [lat, lng, region, getEffectiveCoords])

  useEffect(() => {
    fetchFacilities(activeTab)
  }, [activeTab, fetchFacilities])

  return (
    <div className="px-4 pb-6">
      <Header />

      <section className="mt-2 mb-4 px-1">
        <h2 className="text-2xl font-bold">주변 찾기 📍</h2>
        <p className="text-muted mt-1">가까운 곳부터 보여드려요</p>
      </section>

      {/* 탭 */}
      <div className="flex gap-2 mb-4">
        {TABS.map(tab => (
          <button
            key={tab.type}
            onClick={() => setActiveTab(tab.type)}
            className={`flex-1 py-3 rounded-xl text-base font-bold transition-colors ${
              activeTab === tab.type
                ? 'bg-primary text-white'
                : 'bg-card border border-border'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading || locLoading ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-muted text-lg">찾는 중...</p>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-danger text-lg">{error}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {facilities.map(f => (
            <SectionCard key={f.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-lg">{f.name}</p>
                    <StatusBadge variant={f.isOpen ? 'success' : 'danger'}>
                      {f.isOpen ? '영업 중' : '문 닫음'}
                    </StatusBadge>
                  </div>
                  <p className="text-muted text-sm">{f.address}</p>
                  <p className="text-info font-bold text-sm mt-1">
                    📏 {formatDistance(f.distance)}
                  </p>
                </div>
                <a
                  href={`tel:${f.phone}`}
                  className="shrink-0 ml-3 bg-primary text-white rounded-xl px-4 py-3 font-bold text-base active:scale-95 transition-transform"
                >
                  📞 전화
                </a>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  )
}
