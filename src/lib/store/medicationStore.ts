'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Medication, MedicationLog } from '@/types'
import { generateId } from '@/lib/utils/id'
import { getTodayString } from '@/lib/utils/formatters'

// DB에 약 목록 동기화 (upsert 방식, 로그 보존)
function syncToDb(medications: Medication[]) {
  fetch('/api/medications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sync: true, medications }),
  }).catch(() => {})
}

// 복용 기록 DB 동기화 (로컬 ID = DB UUID)
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
  addMedication: (med: Omit<Medication, 'id' | 'createdAt'>) => void
  removeMedication: (id: string) => void
  markAsTaken: (medicationId: string, scheduledTime: string) => void
  getTodayLogs: () => MedicationLog[]
  isTakenAlready: (medicationId: string, scheduledTime: string) => boolean
  cleanOldLogs: () => void
  syncToDb: () => void
  resetStore: () => void
}

export const useMedicationStore = create<MedicationState>()(
  persist(
    (set, get) => ({
      medications: [],
      logs: [],

      addMedication: (med) => {
        const newMed: Medication = {
          ...med,
          id: generateId(),
          createdAt: new Date().toISOString(),
        }
        set(state => ({ medications: [...state.medications, newMed] }))
        setTimeout(() => syncToDb([...get().medications]), 100)
      },

      removeMedication: (id) => {
        set(state => ({ medications: state.medications.filter(m => m.id !== id) }))
        setTimeout(() => syncToDb(get().medications), 100)
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

        // 로컬 ID = DB UUID이므로 바로 전송
        syncLogToDb(medicationId, scheduledTime, today, takenAt)
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
        syncToDb(get().medications)
      },

      resetStore: () => {
        set({ medications: [], logs: [] })
      },
    }),
    {
      name: 'oneul-medication',
      onRehydrateStorage: () => (state) => {
        state?.cleanOldLogs()
        // 앱 시작 시 DB 동기화
        if (state?.medications && state.medications.length > 0) {
          setTimeout(() => syncToDb(state.medications), 500)
        }
      },
    }
  )
)
