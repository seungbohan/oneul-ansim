'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import BigButton from '@/components/ui/BigButton'
import SectionCard from '@/components/ui/SectionCard'
import { useUserStore } from '@/lib/store/userStore'
import { useMedicationStore } from '@/lib/store/medicationStore'

const COLORS = ['#4a90d9', '#e8573d', '#2d5a27', '#f5a623', '#9b59b6', '#1abc9c']
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export default function NewMedicationPage() {
  const router = useRouter()
  const { mode } = useUserStore()
  const { addMedication } = useMedicationStore()

  // 보호자는 약 등록 불가 → 약 목록으로 리다이렉트
  useEffect(() => {
    if (mode === 'guardian') {
      router.replace('/medications')
    }
  }, [mode, router])
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('1정')
  const [times, setTimes] = useState<string[]>(['08:00'])
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [color, setColor] = useState(COLORS[0])

  const addTime = () => {
    setTimes([...times, '12:00'])
  }

  const removeTime = (index: number) => {
    if (times.length <= 1) return
    setTimes(times.filter((_, i) => i !== index))
  }

  const updateTime = (index: number, value: string) => {
    const newTimes = [...times]
    newTimes[index] = value
    setTimes(newTimes)
  }

  const toggleDay = (day: number) => {
    if (days.includes(day)) {
      if (days.length <= 1) return
      setDays(days.filter(d => d !== day))
    } else {
      setDays([...days, day].sort())
    }
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    addMedication({
      name: name.trim(),
      dosage,
      scheduledTimes: [...times].sort(),
      daysOfWeek: days,
      color,
    })
    router.push('/medications')
  }

  return (
    <div className="px-4 pb-6">
      <Header />

      <section className="mt-2 mb-4 px-1">
        <h2 className="text-2xl font-bold">새 약 등록 ➕</h2>
        <p className="text-muted mt-1">약 정보를 알려주세요</p>
      </section>

      <div className="space-y-4">
        {/* 약 이름 */}
        <SectionCard title="약 이름" icon="💊">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="예: 혈압약, 당뇨약"
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-primary"
          />
        </SectionCard>

        {/* 복용량 */}
        <SectionCard title="복용량" icon="💧">
          <div className="flex gap-2">
            {['1정', '2정', '반정', '1포'].map(d => (
              <button
                key={d}
                onClick={() => setDosage(d)}
                className={`flex-1 py-3 rounded-xl text-base font-bold border ${
                  dosage === d
                    ? 'bg-primary text-white border-primary'
                    : 'bg-card border-border'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </SectionCard>

        {/* 복용 시간 */}
        <SectionCard title="복용 시간" icon="⏰">
          <div className="space-y-2">
            {times.map((time, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="time"
                  value={time}
                  onChange={e => updateTime(i, e.target.value)}
                  className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-primary"
                />
                {times.length > 1 && (
                  <button
                    onClick={() => removeTime(i)}
                    className="text-danger text-xl px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addTime}
              className="w-full py-2 text-primary font-bold text-base"
            >
              + 시간 추가
            </button>
          </div>
        </SectionCard>

        {/* 요일 선택 */}
        <SectionCard title="복용 요일" icon="📅">
          <div className="grid grid-cols-7 gap-2">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={`py-3 rounded-xl text-base font-bold ${
                  days.includes(i)
                    ? 'bg-primary text-white'
                    : 'bg-background border border-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setDays([0, 1, 2, 3, 4, 5, 6])}
            className="mt-2 text-primary font-bold text-sm"
          >
            매일 선택
          </button>
        </SectionCard>

        {/* 색상 */}
        <SectionCard title="구분 색상" icon="🎨">
          <div className="flex gap-3">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-10 h-10 rounded-full border-2 ${
                  color === c ? 'border-foreground scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </SectionCard>

        {/* 등록 버튼 */}
        <BigButton
          fullWidth
          size="xl"
          variant="primary"
          icon="✅"
          onClick={handleSubmit}
          disabled={!name.trim()}
        >
          약 등록하기
        </BigButton>

        <BigButton
          fullWidth
          size="lg"
          variant="secondary"
          onClick={() => router.back()}
        >
          취소
        </BigButton>
      </div>
    </div>
  )
}
