export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  action?: ChatAction
}

export type ChatAction = {
  type: 'medication_taken' | 'weather_check' | 'find_facility' | 'bus_check' | 'notify_guardian' | 'emergency'
  data?: Record<string, unknown>
}

/** Recognized user intent from natural language input */
export type ChatIntent =
  | 'medication_taken'
  | 'medication_check'
  | 'weather'
  | 'pharmacy'
  | 'hospital'
  | 'bus'
  | 'guardian'
  | 'emergency'
  | 'greeting'
  | 'unknown'
