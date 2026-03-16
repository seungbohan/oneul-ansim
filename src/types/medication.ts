export type Medication = {
  id: string
  name: string
  dosage: string
  scheduledTimes: string[]
  daysOfWeek: number[]
  color: string
  createdAt: string
}

export type MedicationLog = {
  id: string
  medicationId: string
  scheduledTime: string
  takenAt: string | null
  date: string
}
