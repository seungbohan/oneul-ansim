'use client'

import { useState, useEffect, useCallback } from 'react'
import { useMedicationStore } from '@/lib/store/medicationStore'
import { getNextMedicationTime } from '@/lib/utils/medicationScheduler'

/**
 * 복약 알림 배너
 * - 다음 복약 시간이 30분 이내일 때 홈 화면 상단에 표시
 * - 주황색 배경에 큰 글씨로 알림
 * - "확인" 버튼으로 배너 닫기
 */
export default function MedicationReminder() {
  const { medications, logs } = useMedicationStore()
  const [visible, setVisible] = useState(false)
  const [nextTime, setNextTime] = useState<string | null>(null)
  const [medName, setMedName] = useState<string>('')
  const [dismissed, setDismissed] = useState(false)

  /** HH:MM 형식을 "오전/오후 N시 M분" 한국어로 변환 */
  const formatTimeKorean = useCallback((time: string): string => {
    const [h, m] = time.split(':').map(Number)
    const period = h < 12 ? '오전' : '오후'
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    if (m === 0) return `${period} ${hour12}시`
    return `${period} ${hour12}시 ${m}분`
  }, [])

  useEffect(() => {
    const check = () => {
      if (dismissed) return

      const next = getNextMedicationTime(medications, logs)
      if (!next) {
        setVisible(false)
        return
      }

      const now = new Date()
      const [h, m] = next.time.split(':').map(Number)
      const scheduledDate = new Date()
      scheduledDate.setHours(h, m, 0, 0)

      const diffMs = scheduledDate.getTime() - now.getTime()
      const diffMin = diffMs / (1000 * 60)

      // 30분 이내이면 표시 (이미 지난 시간은 제외)
      if (diffMin >= 0 && diffMin <= 30) {
        setNextTime(next.time)
        setMedName(next.medication.name)
        setVisible(true)
      } else {
        setVisible(false)
      }
    }

    check()
    // 1분마다 다시 확인
    const interval = setInterval(check, 60_000)
    return () => clearInterval(interval)
  }, [medications, logs, dismissed, formatTimeKorean])

  const handleDismiss = () => {
    setDismissed(true)
    setVisible(false)
  }

  if (!visible || !nextTime) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className="
        bg-warning-light border-2 border-warning
        rounded-2xl p-4 mb-4
        animate-slide-up
      "
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-foreground leading-snug">
            <span aria-hidden="true">💊 </span>
            곧 약 드실 시간이에요!
          </p>
          <p className="text-lg text-muted mt-1">
            {medName} - {formatTimeKorean(nextTime)}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="복약 알림 닫기"
          className="
            shrink-0
            bg-warning text-white
            font-bold text-lg
            px-5 py-3
            rounded-xl
            min-h-[48px]
            active:scale-95 transition-transform
          "
        >
          확인
        </button>
      </div>
    </div>
  )
}
