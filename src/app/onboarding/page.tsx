'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useUserStore } from '@/lib/store/userStore'
import { useLocationStore, REGION_PRESETS } from '@/lib/store/locationStore'
import BigButton from '@/components/ui/BigButton'

const REGION_OPTIONS = [
  'seoul', 'gyeonggi', 'busan', 'daegu', 'incheon',
  'gwangju', 'daejeon', 'ulsan', 'sejong',
  'gangwon', 'chungbuk', 'chungnam', 'jeonbuk', 'jeonnam',
  'gyeongbuk', 'gyeongnam', 'jeju',
] as const

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { setUserName, setOnboarded, setMode } = useUserStore()
  const { setRegion, region } = useLocationStore()
  const [step, setStep] = useState(1)
  const [selectedRegion, setSelectedRegion] = useState(region || 'seoul')

  const mode = (session?.user as { mode?: string })?.mode || 'elder'

  // 어르신: 지역→약안내→보호자안내 (3단계)
  // 보호자: 지역→완료 (1단계)
  const totalSteps = mode === 'elder' ? 3 : 1

  const handleNext = () => {
    if (step === 1) {
      setRegion(selectedRegion)
    }
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      handleComplete()
    }
  }

  const handleSkip = () => {
    if (step === 1) {
      setRegion(selectedRegion)
    }
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = async () => {
    // 세션 정보를 Zustand에 동기화
    setMode(mode as 'elder' | 'guardian')
    setUserName(session?.user?.name || '')
    setOnboarded()

    // 서버에도 온보딩 완료 표시
    await fetch('/api/auth/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region: selectedRegion }),
    })

    router.push('/')
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-background">
      {/* 진행 표시 */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`flex-1 h-2 rounded-full transition-colors duration-300 ${
              i < step ? 'bg-primary' : 'bg-border'
            }`}
          />
        ))}
      </div>

      {/* 단계별 컨텐츠 */}
      <div className="flex-1 flex flex-col justify-center">

        {/* 1단계: 지역 */}
        {step === 1 && (
          <div className="animate-fade-in">
            <p className="text-5xl text-center mb-6" aria-hidden="true">📍</p>
            <h1 className="text-3xl font-bold text-center mb-4">
              {mode === 'elder' ? '어디에 사시나요?' : '어르신이 계신 지역은요?'}
            </h1>
            <p className="text-lg text-muted text-center mb-6">
              지역에 맞는 날씨와 시설 정보를 보여드려요
            </p>
            <div className="grid grid-cols-3 gap-2 max-h-[340px] overflow-y-auto px-1">
              {REGION_OPTIONS.map((key) => {
                const preset = REGION_PRESETS[key]
                const isSelected = selectedRegion === key
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedRegion(key)}
                    className={`
                      py-3 px-2 rounded-xl text-lg font-bold
                      transition-all duration-200
                      active:scale-95
                      min-h-[52px]
                      ${isSelected
                        ? 'bg-primary text-white shadow-md scale-[1.02]'
                        : 'bg-card border border-border hover:border-primary'
                      }
                    `}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 2단계: 약 안내 (어르신만) */}
        {step === 2 && mode === 'elder' && (
          <div className="animate-fade-in">
            <p className="text-5xl text-center mb-6" aria-hidden="true">💊</p>
            <h1 className="text-3xl font-bold text-center mb-4">
              드시는 약이 있으신가요?
            </h1>
            <p className="text-lg text-muted text-center mb-4">
              약을 등록하면 시간에 맞춰 알려드려요
            </p>
            <p className="text-base text-muted text-center">
              나중에 언제든 등록할 수 있어요
            </p>
          </div>
        )}

        {/* 3단계: 보호자 안내 (어르신만) */}
        {step === 3 && mode === 'elder' && (
          <div className="animate-fade-in">
            <p className="text-5xl text-center mb-6" aria-hidden="true">👨‍👩‍👧</p>
            <h1 className="text-3xl font-bold text-center mb-4">
              보호자를 초대해보세요
            </h1>
            <p className="text-lg text-muted text-center mb-4">
              보호자가 복약 현황을 확인할 수 있어요
            </p>
            <p className="text-base text-muted text-center">
              나중에 언제든 초대할 수 있어요
            </p>
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="space-y-3 mt-8">
        <BigButton
          fullWidth
          onClick={handleNext}
        >
          {step === totalSteps ? '시작하기' : '다음으로'}
        </BigButton>
        {step >= 2 && (
          <BigButton
            fullWidth
            variant="secondary"
            onClick={handleSkip}
          >
            건너뛰기
          </BigButton>
        )}
      </div>
    </div>
  )
}
