import { Medication, MedicationLog } from '@/types'
import { getTodayString } from './formatters'

export function getTodayMedications(medications: Medication[]): Medication[] {
  const today = new Date().getDay()
  return medications.filter(m => m.daysOfWeek.includes(today))
}

export function isTakenAlready(
  medicationId: string,
  scheduledTime: string,
  logs: MedicationLog[]
): boolean {
  const today = getTodayString()
  return logs.some(
    l => l.medicationId === medicationId &&
      l.scheduledTime === scheduledTime &&
      l.date === today &&
      l.takenAt !== null
  )
}

export function getMissedMedications(
  medications: Medication[],
  logs: MedicationLog[]
): { medication: Medication; time: string }[] {
  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const todayMeds = getTodayMedications(medications)
  const missed: { medication: Medication; time: string }[] = []

  for (const med of todayMeds) {
    for (const time of med.scheduledTimes) {
      if (time < currentTime && !isTakenAlready(med.id, time, logs)) {
        missed.push({ medication: med, time })
      }
    }
  }

  return missed
}

export function getNextMedicationTime(
  medications: Medication[],
  logs: MedicationLog[]
): { medication: Medication; time: string } | null {
  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const todayMeds = getTodayMedications(medications)

  let nearest: { medication: Medication; time: string } | null = null

  for (const med of todayMeds) {
    for (const time of med.scheduledTimes) {
      if (time >= currentTime && !isTakenAlready(med.id, time, logs)) {
        if (!nearest || time < nearest.time) {
          nearest = { medication: med, time }
        }
      }
    }
  }

  return nearest
}

export function getTodayProgress(
  medications: Medication[],
  logs: MedicationLog[]
): { total: number; taken: number } {
  const todayMeds = getTodayMedications(medications)
  let total = 0
  let taken = 0
  const today = getTodayString()

  for (const med of todayMeds) {
    for (const time of med.scheduledTimes) {
      total++
      if (logs.some(
        l => l.medicationId === med.id &&
          l.scheduledTime === time &&
          l.date === today &&
          l.takenAt !== null
      )) {
        taken++
      }
    }
  }

  return { total, taken }
}
