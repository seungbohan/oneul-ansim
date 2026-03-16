'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import SectionCard from '@/components/ui/SectionCard'
import BigButton from '@/components/ui/BigButton'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { useUserStore } from '@/lib/store/userStore'
import { useMedicationStore } from '@/lib/store/medicationStore'
import { formatTime, getTodayString } from '@/lib/utils/formatters'
import { getTodayMedications } from '@/lib/utils/medicationScheduler'

// 시간대 분류
function getTimeSlot(time: string): { label: string; icon: string; order: number } {
  const hour = parseInt(time.split(':')[0], 10)
  if (hour < 9) return { label: '이른 아침', icon: '🌅', order: 0 }
  if (hour < 12) return { label: '아침', icon: '☀️', order: 1 }
  if (hour < 14) return { label: '점심', icon: '🍚', order: 2 }
  if (hour < 18) return { label: '오후', icon: '🌤️', order: 3 }
  if (hour < 21) return { label: '저녁', icon: '🌆', order: 4 }
  return { label: '밤', icon: '🌙', order: 5 }
}

export default function MedicationsPage() {
  const { mode } = useUserStore()
  const { medications, logs, markAsTaken, isTakenAlready, removeMedication } = useMedicationStore()
  const [warningOpen, setWarningOpen] = useState(false)
  const [warningMed, setWarningMed] = useState('')

  const isElder = mode === 'elder'
  const todayMeds = getTodayMedications(medications)
  const today = getTodayString()

  const handleTake = (medId: string, time: string, medName: string) => {
    if (isTakenAlready(medId, time)) {
      setWarningMed(medName)
      setWarningOpen(true)
      return
    }
    markAsTaken(medId, time)
  }

  // 시간순 정렬된 스케줄
  const schedule = todayMeds
    .flatMap(med =>
      med.scheduledTimes.map(time => ({
        med,
        time,
        taken: isTakenAlready(med.id, time),
      }))
    )
    .sort((a, b) => a.time.localeCompare(b.time))

  // 시간대별 그룹화
  const grouped = schedule.reduce<Record<string, { label: string; icon: string; order: number; items: typeof schedule }>>((acc, item) => {
    const slot = getTimeSlot(item.time)
    const key = slot.label
    if (!acc[key]) {
      acc[key] = { ...slot, items: [] }
    }
    acc[key].items.push(item)
    return acc
  }, {})

  const sortedGroups = Object.values(grouped).sort((a, b) => a.order - b.order)

  // 현재 시간대 판별
  const now = new Date()
  const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  const currentSlot = getTimeSlot(currentTimeStr).label

  return (
    <div className="px-4 pb-6">
      <Header />

      <section className="mt-2 mb-4 px-1">
        <h2 className="text-2xl font-bold">
          {isElder ? '약 챙기기' : '복약 현황'}
        </h2>
        <p className="text-muted mt-1">
          {isElder ? '오늘 드셔야 할 약이에요' : '어르신의 오늘 복약 상태예요'}
        </p>
      </section>

      {/* 전체 진행률 */}
      {schedule.length > 0 && (
        <div className="mb-4">
          {(() => {
            const total = schedule.length
            const taken = schedule.filter(s => s.taken).length
            const percent = total > 0 ? Math.round((taken / total) * 100) : 0
            return (
              <div className="bg-card rounded-2xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">오늘 복약</span>
                  <StatusBadge variant={taken === total ? 'success' : 'warning'}>
                    {taken}/{total} 완료
                  </StatusBadge>
                </div>
                <div className="w-full bg-background rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500 bg-primary"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {schedule.length === 0 ? (
        <SectionCard className="mb-4">
          <p className="text-center text-muted py-4">
            등록된 약이 없어요.
          </p>
          {isElder && (
            <Link href="/medications/new">
              <BigButton fullWidth icon="➕" variant="primary">
                약 등록하기
              </BigButton>
            </Link>
          )}
        </SectionCard>
      ) : (
        <div className="space-y-4 mb-4">
          {sortedGroups.map(group => {
            const groupTaken = group.items.filter(i => i.taken).length
            const groupTotal = group.items.length
            const allDone = groupTaken === groupTotal
            const isCurrent = group.label === currentSlot

            return (
              <div key={group.label}>
                {/* 시간대 헤더 */}
                <div className={`flex items-center gap-2 mb-2 px-1 ${isCurrent ? 'text-primary' : 'text-muted'}`}>
                  <span className="text-xl">{group.icon}</span>
                  <span className="font-bold text-base">{group.label}</span>
                  <span className="text-sm">
                    ({groupTaken}/{groupTotal})
                  </span>
                  {allDone && <span className="text-xs text-primary font-bold ml-auto">완료</span>}
                  {isCurrent && !allDone && <span className="text-xs text-primary font-bold ml-auto animate-pulse">지금</span>}
                </div>

                {/* 약 목록 */}
                <div className="space-y-2">
                  {group.items.map(({ med, time, taken }, idx) => {
                    const isPast = time < currentTimeStr && !taken
                    return (
                      <div
                        key={`${med.id}-${time}-${idx}`}
                        className={`
                          bg-card rounded-2xl p-4 border transition-all
                          ${taken ? 'border-primary/20 bg-primary/5' : isPast ? 'border-danger/30 bg-danger/5' : 'border-border'}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className="w-4 h-4 rounded-full shrink-0"
                              style={{ backgroundColor: med.color || '#4a90d9' }}
                            />
                            <div className="min-w-0">
                              <p className={`font-bold text-lg ${taken ? 'line-through text-muted' : ''}`}>{med.name}</p>
                              <p className="text-muted text-sm">
                                {formatTime(time)} · {med.dosage}
                                {isPast && <span className="text-danger font-bold ml-2">놓침</span>}
                              </p>
                            </div>
                          </div>
                          {taken ? (
                            <StatusBadge variant="success">완료</StatusBadge>
                          ) : isElder ? (
                            <BigButton
                              size="md"
                              variant={isPast ? 'danger' : 'primary'}
                              onClick={() => handleTake(med.id, time, med.name)}
                            >
                              복용
                            </BigButton>
                          ) : (
                            <StatusBadge variant={isPast ? 'danger' : 'warning'}>
                              {isPast ? '놓침' : '미복용'}
                            </StatusBadge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 어르신만 약 등록/삭제 가능 */}
      {isElder && (
        <div className="space-y-3">
          <Link href="/medications/new">
            <BigButton fullWidth icon="➕" variant="secondary">
              새 약 등록하기
            </BigButton>
          </Link>

          {medications.length > 0 && (
            <SectionCard title="등록된 약 목록" icon="📋">
              <div className="space-y-2 mt-2">
                {medications.map(med => (
                  <div key={med.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: med.color || '#4a90d9' }}
                      />
                      <span className="font-bold">{med.name}</span>
                      <span className="text-muted text-sm">{med.dosage}</span>
                    </div>
                    <button
                      onClick={() => removeMedication(med.id)}
                      className="text-danger text-sm font-bold px-2 py-1"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* 보호자: 약 목록 조회만 */}
      {!isElder && medications.length > 0 && (
        <SectionCard title="등록된 약 목록" icon="📋">
          <div className="space-y-2 mt-2">
            {medications.map(med => (
              <div key={med.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: med.color || '#4a90d9' }}
                />
                <span className="font-bold">{med.name}</span>
                <span className="text-muted text-sm">{med.dosage}</span>
                <span className="text-muted text-sm ml-auto">
                  {med.scheduledTimes.map(t => formatTime(t)).join(', ')}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <Modal
        isOpen={warningOpen}
        onClose={() => setWarningOpen(false)}
        title="잠깐만요!"
      >
        <p className="text-lg mb-4">
          <span className="font-bold">{warningMed}</span>은 이미 드셨어요.
        </p>
        <p className="text-danger font-bold mb-6">
          확실하지 않으면 다시 드시지 마세요.
          약국이나 병원에 먼저 확인하는 게 안전해요.
        </p>
        <BigButton
          fullWidth
          variant="secondary"
          onClick={() => setWarningOpen(false)}
        >
          알겠어요
        </BigButton>
      </Modal>
    </div>
  )
}
