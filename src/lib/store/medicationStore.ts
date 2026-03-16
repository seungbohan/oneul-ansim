'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Medication, MedicationLog } from '@/types'
import { generateId } from '@/lib/utils/id'
import { getTodayString } from '@/lib/utils/formatters'

// DB 동기화: 약 목록을 DB에 보내고, DB에서 생성된 ID 매핑을 받아 로컬 ID 업데이트
async function syncMedicationsToDb(
  medications: Medication[],
  updateIds: (idMap: { localId: string; dbId: string }[]) => void
) {
  try {
    const res = await fetch('/api/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sync: true, medications }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.idMap && data.idMap.length > 0) {
        updateIds(data.idMap)
      }
    }
  } catch {
    // 오프라인이면 무시, 로컬은 유지
  }
}

// 복용 기록 DB 동기화
function syncLogToDb(medicationId: string, scheduledTime: string, date: string, takenAt: string) {
  fetch('/api/medications/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medicationId, scheduledTime, date, takenAt }),
  }).catch(() => {})
}

type MedicationState = {
  medications: Medication[]
  logs: MedicationLog[]
  // ID 매핑 저장 (로컬ID → DB UUID)
  dbIdMap: Record<string, string>
  addMedication: (med: Omit<Medication, 'id' | 'createdAt'>) => void
  removeMedication: (id: string) => void
  markAsTaken: (medicationId: string, scheduledTime: string) => void
  getTodayLogs: () => MedicationLog[]
  isTakenAlready: (medicationId: string, scheduledTime: string) => boolean
  cleanOldLogs: () => void
  syncToDb: () => void
}

export const useMedicationStore = create<MedicationState>()(
  persist(
    (set, get) => ({
      medications: [],
      logs: [],
      dbIdMap: {},

      addMedication: (med) => {
        const newMed: Medication = {
          ...med,
          id: generateId(),
          createdAt: new Date().toISOString(),
        }
        set(state => ({ medications: [...state.medications, newMed] }))
        // DB 동기화
        setTimeout(() => get().syncToDb(), 100)
      },

      removeMedication: (id) => {
        set(state => ({ medications: state.medications.filter(m => m.id !== id) }))
        setTimeout(() => get().syncToDb(), 100)
      },

      markAsTaken: (medicationId, scheduledTime) => {
        const today = getTodayString()
        const alreadyTaken = get().logs.some(
          l => l.medicationId === medicationId &&
            l.scheduledTime === scheduledTime &&
            l.date === today &&
            l.takenAt !== null
        )
        if (alreadyTaken) return

        const takenAt = new Date().toISOString()
        const log: MedicationLog = {
          id: generateId(),
          medicationId,
          scheduledTime,
          takenAt,
          date: today,
        }
        set(state => ({ logs: [...state.logs, log] }))

        // DB에 복용 기록: DB medication ID 사용
        const dbId = get().dbIdMap[medicationId]
        if (dbId) {
          syncLogToDb(dbId, scheduledTime, today, takenAt)
        }
      },

      getTodayLogs: () => {
        const today = getTodayString()
        return get().logs.filter(l => l.date === today)
      },

      isTakenAlready: (medicationId, scheduledTime) => {
        const today = getTodayString()
        return get().logs.some(
          l => l.medicationId === medicationId &&
            l.scheduledTime === scheduledTime &&
            l.date === today &&
            l.takenAt !== null
        )
      },

      cleanOldLogs: () => {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 30)
        const cutoffStr = cutoff.toISOString().slice(0, 10)
        set(state => ({
          logs: state.logs.filter(l => l.date >= cutoffStr),
        }))
      },

      syncToDb: () => {
        const { medications } = get()
        syncMedicationsToDb(medications, (idMap) => {
          // 로컬ID → DB UUID 매핑 저장
          const newMap: Record<string, string> = {}
          for (const { localId, dbId } of idMap) {
            newMap[localId] = dbId
          }
          set({ dbIdMap: newMap })
        })
      },
    }),
    {
      name: 'oneul-medication',
      onRehydrateStorage: () => (state) => {
        state?.cleanOldLogs()
        // 앱 시작 시 DB 동기화
        if (state?.medications && state.medications.length > 0) {
          setTimeout(() => state.syncToDb(), 500)
        }
      },
    }
  )
)
