'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SessionProvider, useSession } from 'next-auth/react'
import { ToastProvider } from '@/components/ui/Toast'
import { useUserStore } from '@/lib/store/userStore'
import { useMedicationStore } from '@/lib/store/medicationStore'

/** 자정이 되면 페이지를 새로고침해서 복약 현황 등을 리셋 */
function MidnightRefresh() {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function scheduleRefresh() {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      const ms = midnight.getTime() - now.getTime()

      timerRef.current = setTimeout(() => {
        router.refresh()
        scheduleRefresh()
      }, ms)
    }

    scheduleRefresh()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [router])

  return null
}

/** 세션 정보를 Zustand에 동기화 */
function SessionSync() {
  const { data: session, status } = useSession()
  const { setMode, setUserName, resetStore, isOnboarded } = useUserStore()
  const resetMedications = useMedicationStore(s => s.resetStore)
  const prevStatus = useRef(status)

  useEffect(() => {
    // 로그인 상태 → 세션 정보를 Zustand에 반영
    if (status === 'authenticated' && session?.user) {
      const user = session.user as { mode?: string; name?: string }
      if (user.mode) {
        setMode(user.mode as 'elder' | 'guardian')
      }
      if (user.name) {
        setUserName(user.name)
      }
    }

    // 로그아웃 감지 → localStorage 초기화
    if (prevStatus.current === 'authenticated' && status === 'unauthenticated') {
      resetStore()
      resetMedications()
    }

    prevStatus.current = status
  }, [status, session, setMode, setUserName, resetStore, resetMedications, isOnboarded])

  return null
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <SessionSync />
        <MidnightRefresh />
        {children}
      </ToastProvider>
    </SessionProvider>
  )
}
