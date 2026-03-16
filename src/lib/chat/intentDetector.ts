import { ChatIntent } from '@/types/chat'

/**
 * Keyword groups mapped to intents.
 * Order matters: more specific intents are checked first.
 * Each entry has an intent and one or more keyword-combos.
 * A combo is satisfied when ALL keywords in the array are present.
 */
const INTENT_RULES: { intent: ChatIntent; combos: string[][] }[] = [
  {
    intent: 'emergency',
    combos: [['아파'], ['어지러'], ['쓰러'], ['가슴'], ['숨'], ['출혈']],
  },
  {
    intent: 'medication_taken',
    combos: [
      ['약', '먹었'],
      ['약', '복용'],
      ['약', '챙겼'],
    ],
  },
  {
    intent: 'medication_check',
    combos: [
      ['약', '언제'],
      ['약', '시간'],
      ['약', '뭐'],
    ],
  },
  {
    intent: 'weather',
    combos: [['날씨'], ['비'], ['나가'], ['외출']],
  },
  {
    intent: 'pharmacy',
    combos: [['약국']],
  },
  {
    intent: 'hospital',
    combos: [['병원'], ['의원']],
  },
  {
    intent: 'bus',
    combos: [['버스'], ['정류장']],
  },
  {
    intent: 'guardian',
    combos: [['가족'], ['보호자'], ['딸'], ['아들'], ['알려']],
  },
  {
    intent: 'greeting',
    combos: [['안녕'], ['반가'], ['ㅎㅇ']],
  },
]

/**
 * Detects user intent from free-text input using keyword matching.
 * Returns the first matching intent, or 'unknown' if none match.
 */
export function detectIntent(input: string): ChatIntent {
  const lower = input.toLowerCase()

  for (const rule of INTENT_RULES) {
    for (const combo of rule.combos) {
      const allMatched = combo.every((keyword) => lower.includes(keyword))
      if (allMatched) return rule.intent
    }
  }

  return 'unknown'
}
