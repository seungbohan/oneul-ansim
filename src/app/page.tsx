'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import QuickActionButton from '@/components/ui/QuickActionButton'
import SectionCard from '@/components/ui/SectionCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { SkeletonHome } from '@/components/ui/Skeleton'
import { useHydration } from '@/lib/hooks/useHydration'
import { useUserStore } from '@/lib/store/userStore'
import { useMedicationStore } from '@/lib/store/medicationStore'
import { formatDate, formatTime, getGreeting, getTodayString } from '@/lib/utils/formatters'
import { getTodayMedications, getTodayProgress, getNextMedicationTime, getMissedMedications } from '@/lib/utils/medicationScheduler'

/* ===== 어르신 모드 홈 화면 ===== */
function ElderHome() {
  const { medications, logs } = useMedicationStore()
  const { userName } = useUserStore()
  const today = getTodayString()
  const todayMeds = getTodayMedications(medications)
  const progress = getTodayProgress(medications, logs)
  const nextMed = getNextMedicationTime(medications, logs)
  const missedMeds = getMissedMedications(medications, logs)

  const [guardianCount, setGuardianCount] = useState(0)

  useEffect(() => {
    fetch('/api/invite')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setGuardianCount(d.guardians?.length || 0) })
      .catch(() => {})
  }, [])

  return (
    <>
      {/* 인사말 */}
      <section className="mt-2 mb-6 px-1" aria-label="인사말">
        <p className="text-2xl font-bold">
          {getGreeting()}
          {userName && <span className="text-primary"> {userName}님</span>}
        </p>
        <p className="text-muted mt-1">{formatDate(today)}</p>
      </section>

      {/* 빠른 실행 */}
      <section className="grid grid-cols-2 gap-3 mb-6" aria-label="빠른 실행 메뉴">
        <QuickActionButton href="/medications" icon="💊" label="약 챙기기" />
        <QuickActionButton href="/weather" icon="🌤️" label="날씨 보기" />
        <QuickActionButton href="/facilities" icon="📍" label="주변 찾기" />
        <QuickActionButton href="/bus" icon="🚌" label="버스 보기" />
      </section>

      {/* 오늘의 복약 */}
      <SectionCard title="오늘의 약" icon="💊" className="mb-4">
        {todayMeds.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-4xl mb-3" aria-hidden="true">📋</p>
            <p className="text-muted mb-4 text-base">
              등록된 약이 없어요.<br />
              약을 등록하면 복약 알림을 받을 수 있어요.
            </p>
            <Link
              href="/medications/new"
              className="
                inline-flex items-center gap-2
                bg-primary-light text-primary
                font-bold text-base
                px-6 py-3 rounded-2xl
                transition-all duration-200
                hover:bg-primary hover:text-white
                active:scale-95
                min-h-[48px]
              "
            >
              💊 약 등록하기
            </Link>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge variant={progress.taken === progress.total ? 'success' : 'warning'}>
                {progress.taken}/{progress.total} 완료
              </StatusBadge>
            </div>

            {missedMeds.length > 0 && (
              <div className="bg-danger-light rounded-xl p-3 mb-3 border border-danger/20">
                <p className="text-danger font-bold text-base">
                  놓친 약이 {missedMeds.length}건 있어요
                </p>
                {missedMeds.map((m, i) => (
                  <p key={i} className="text-sm text-danger/80 mt-1">
                    {m.medication.name} - {formatTime(m.time)}
                  </p>
                ))}
              </div>
            )}

            {nextMed && (
              <p className="text-base">
                다음 약: <span className="font-bold">{nextMed.medication.name}</span>{' '}
                {formatTime(nextMed.time)}
              </p>
            )}
            {progress.taken === progress.total && progress.total > 0 && (
              <p className="text-primary font-bold text-lg mt-2">
                오늘 약 다 챙기셨어요!
              </p>
            )}
          </div>
        )}
      </SectionCard>

      {/* 긴급 전화 버튼 */}
      <section className="mb-4" aria-label="긴급 전화">
        <a
          href="tel:119"
          aria-label="긴급 전화 119 걸기"
          className="
            flex items-center justify-center gap-3
            bg-danger text-white
            rounded-2xl py-5
            text-xl font-bold
            shadow-lg
            transition-all duration-200
            hover:bg-danger/90
            active:scale-[0.97]
            animate-gentle-pulse
            min-h-[64px]
          "
        >
          <span className="text-3xl" aria-hidden="true">🚨</span>
          긴급 전화 (119)
        </a>
      </section>

      {/* 보호자 연결 상태 */}
      <SectionCard title="보호자 연결" icon="👨‍👩‍👧" className="mb-4">
        <Link
          href="/guardian"
          className="flex items-center justify-between text-base py-1"
        >
          {guardianCount > 0 ? (
            <>
              <span className="text-foreground">
                연결된 보호자 <span className="text-primary font-bold">{guardianCount}명</span>
              </span>
              <span className="text-xl text-muted" aria-hidden="true">→</span>
            </>
          ) : (
            <>
              <span className="text-muted">보호자를 초대해서 연결해보세요</span>
              <span className="text-xl text-muted" aria-hidden="true">→</span>
            </>
          )}
        </Link>
      </SectionCard>
    </>
  )
}

/* ===== 보호자 모드 홈 화면 ===== */
type ElderSummary = {
  elderId: string
  name: string
  total: number
  taken: number
  missed: number
}

function GuardianHome() {
  const { userName } = useUserStore()
  const today = getTodayString()
  const [elders, setElders] = useState<ElderSummary[]>([])
  const [loading, setLoading] = useState(true)

  const loadElderData = useCallback(async () => {
    try {
      const res = await fetch('/api/connect')
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      const elderList: { elderId: string; name: string }[] = data.elders || []

      if (elderList.length === 0) {
        setElders([])
        setLoading(false)
        return
      }

      // 각 어르신 복약현황 병렬 로드
      const summaries = await Promise.all(
        elderList.map(async (e) => {
          try {
            const r = await fetch(`/api/connect/medications?elderId=${e.elderId}`)
            if (!r.ok) return { elderId: e.elderId, name: e.name, total: 0, taken: 0, missed: 0 }
            const d = await r.json()
            const now = new Date()
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
            const missed = (d.schedule || []).filter(
              (s: { taken: boolean; time: string }) => !s.taken && s.time < currentTime
            ).length
            return { elderId: e.elderId, name: e.name, total: d.total, taken: d.taken, missed }
          } catch {
            return { elderId: e.elderId, name: e.name, total: 0, taken: 0, missed: 0 }
          }
        })
      )
      setElders(summaries)
    } catch {
      // 무시
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadElderData()
  }, [loadElderData])

  return (
    <>
      {/* 인사말 */}
      <section className="mt-2 mb-6 px-1" aria-label="보호자 대시보드">
        <p className="text-2xl font-bold">
          {getGreeting()}
          {userName && <span className="text-primary"> {userName}님</span>}
        </p>
        <p className="text-muted mt-1">{formatDate(today)}</p>
      </section>

      {/* 어르신 현황 */}
      {loading ? (
        <SectionCard title="어르신 현황" icon="👴" className="mb-4">
          <div className="text-center py-6">
            <p className="text-muted">불러오는 중...</p>
          </div>
        </SectionCard>
      ) : elders.length === 0 ? (
        <SectionCard title="어르신 현황" icon="👴" className="mb-4">
          <div className="flex flex-col items-center py-6">
            <p className="text-4xl mb-3" aria-hidden="true">🔗</p>
            <p className="text-lg font-bold mb-2">어르신을 연결해주세요</p>
            <p className="text-muted text-center text-sm mb-4 leading-relaxed">
              어르신 앱에서 초대 코드를 받아<br />
              연결하면 복약 현황을 확인할 수 있어요
            </p>
            <Link
              href="/guardian"
              className="
                inline-flex items-center gap-2
                bg-primary text-white
                font-bold text-base
                px-6 py-3 rounded-2xl
                transition-all duration-200
                active:scale-95
                min-h-[48px]
              "
            >
              어르신 연결하기
            </Link>
          </div>
        </SectionCard>
      ) : (
        <section className="mb-4">
          <h3 className="text-lg font-bold mb-3 px-1">어르신 복약 현황</h3>
          {elders.map(e => (
            <Link
              key={e.elderId}
              href="/guardian"
              className="block bg-card rounded-2xl p-4 mb-3 border border-border active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">👴</span>
                <div className="flex-1">
                  <p className="font-bold text-lg">{e.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge variant={
                      e.taken === e.total && e.total > 0 ? 'success' :
                      e.missed > 0 ? 'danger' : 'warning'
                    }>
                      {e.taken}/{e.total} 완료
                    </StatusBadge>
                    {e.missed > 0 && (
                      <span className="text-xs text-danger font-bold">
                        놓친 약 {e.missed}건
                      </span>
                    )}
                    {e.taken === e.total && e.total > 0 && (
                      <span className="text-xs text-primary font-bold">
                        모두 완료
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-muted text-xl">→</span>
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* 빠른 액션 */}
      <section className="mb-6" aria-label="보호자 빠른 메뉴">
        <Link
          href="/guardian"
          className="
            flex items-center justify-between
            bg-card border border-border rounded-2xl p-4
            active:scale-[0.98] transition-transform
          "
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">👴</span>
            <span className="font-bold text-base">어르신 관리 / 연결하기</span>
          </div>
          <span className="text-muted text-xl">→</span>
        </Link>
      </section>

      {/* 긴급 전화 */}
      <section className="mb-4" aria-label="긴급 전화">
        <a
          href="tel:119"
          aria-label="긴급 전화 119 걸기"
          className="
            flex items-center justify-center gap-3
            bg-danger text-white
            rounded-2xl py-5
            text-xl font-bold
            shadow-lg
            transition-all duration-200
            hover:bg-danger/90
            active:scale-[0.97]
            animate-gentle-pulse
            min-h-[64px]
          "
        >
          <span className="text-3xl" aria-hidden="true">🚨</span>
          긴급 전화 (119)
        </a>
      </section>
    </>
  )
}

/* ===== 메인 홈 페이지 ===== */
export default function Home() {
  const { mode, isOnboarded } = useUserStore()
  const isHydrated = useHydration()
  const router = useRouter()
  const { status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (isHydrated && !isOnboarded) {
      router.push('/onboarding')
    }
  }, [status, isHydrated, isOnboarded, router])

  if (status === 'loading' || !isHydrated) {
    return <SkeletonHome />
  }

  if (status === 'unauthenticated' || !isOnboarded) {
    return <SkeletonHome />
  }

  return (
    <div className="px-4 pb-6">
      <Header />
      {mode === 'elder' ? <ElderHome /> : <GuardianHome />}
    </div>
  )
}
