export type Guardian = {
  id: string
  name: string
  phone: string
  relationship: string
}

export type SafetyMessage = {
  type: 'medication' | 'safety' | 'outing' | 'custom'
  message: string
  sentAt: string
}
