'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useUserStore } from '@/lib/store/userStore'
import { useLocationStore, REGION_PRESETS } from '@/lib/store/locationStore'

const REGION_KEYS = Object.keys(REGION_PRESETS)

export default function Header() {
  const { mode } = useUserStore()
  const { data: session } = useSession()
  const { region, setRegion, updateLocation, isLoading, lat } = useLocationStore()
  const [showRegion, setShowRegion] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  // 앱 시작 시 자동으로 GPS 위치 요청
  useEffect(() => {
    if (!lat) {
      updateLocation()
    }
  }, [lat, updateLocation])

  const currentLabel = REGION_PRESETS[region]?.label ?? '서울'

  const handleLogout = () => {
    signOut({ redirect: true, callbackUrl: '/login' })
  }

  return (
    <>
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-primary">오늘안심</h1>
          <button
            onClick={() => setShowRegion(!showRegion)}
            className="
              px-3 py-1 rounded-full text-sm font-bold
              bg-primary-light text-primary
              min-h-[36px]
              transition-all duration-200
              active:scale-95
            "
          >
            {isLoading ? '📍 찾는중...' : `📍 ${currentLabel}`}
          </button>
        </div>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="
            px-4 py-2 rounded-full text-sm font-bold
            border-2 border-border bg-card
            min-h-[44px]
            transition-all duration-200
            active:scale-95
          "
        >
          {mode === 'elder' ? '👴 어르신' : '👨‍👩‍👧 보호자'}
        </button>
      </header>

      {/* 사용자 메뉴 */}
      {showMenu && (
        <div className="px-5 pb-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-lg">
            <div className="mb-3 pb-3 border-b border-border">
              <p className="font-bold text-base">{session?.user?.name || '사용자'}</p>
              <p className="text-sm text-muted">{session?.user?.email}</p>
              <p className="text-sm text-muted mt-1">
                {mode === 'elder' ? '👴 어르신 모드' : '👨‍👩‍👧 보호자 모드'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="
                w-full py-3 rounded-xl text-base font-bold
                bg-danger/10 text-danger
                transition-all duration-200
                active:scale-95
              "
            >
              로그아웃
            </button>
          </div>
        </div>
      )}

      {/* 지역 선택 패널 */}
      {showRegion && (
        <div className="px-5 pb-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-lg">
            <button
              onClick={() => {
                updateLocation()
                setShowRegion(false)
              }}
              className="
                w-full mb-3 py-3 rounded-xl text-base font-bold
                bg-primary text-white
                transition-all duration-200
                active:scale-95
              "
            >
              📡 현재 위치로 자동 설정
            </button>

            <p className="text-sm text-muted mb-2">또는 직접 선택</p>
            <div className="grid grid-cols-4 gap-2">
              {REGION_KEYS.map((key) => {
                const preset = REGION_PRESETS[key]
                const isSelected = region === key
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setRegion(key)
                      setShowRegion(false)
                    }}
                    className={`
                      py-2 rounded-xl text-sm font-bold
                      transition-all duration-200
                      active:scale-95
                      ${isSelected
                        ? 'bg-primary text-white'
                        : 'bg-background border border-border hover:border-primary'
                      }
                    `}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
