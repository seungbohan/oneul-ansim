import { ChatIntent } from '@/types/chat'
import { Medication, MedicationLog } from '@/types/medication'
import { formatTime } from '@/lib/utils/formatters'
import {
  getTodayMedications,
  getTodayProgress,
  getNextMedicationTime,
} from '@/lib/utils/medicationScheduler'
import { detectIntent } from './intentDetector'

/** Dependencies that the response engine needs from the outside world */
export interface ResponseContext {
  medications: Medication[]
  logs: MedicationLog[]
  markAsTaken: (medicationId: string, scheduledTime: string) => void
  lat: number
  lng: number
  regionLabel: string
}

/** A structured response with text and an optional side-effect flag */
export interface ChatResponse {
  text: string
  intent: ChatIntent
}

// -- Individual response generators per intent --

function respondMedicationTaken(ctx: ResponseContext): string {
  const todayMeds = getTodayMedications(ctx.medications)
  if (todayMeds.length === 0) {
    return '등록된 약이 없어요. 약 탭에서 먼저 약을 등록해주세요.'
  }

  const next = getNextMedicationTime(ctx.medications, ctx.logs)
  if (next) {
    ctx.markAsTaken(next.medication.id, next.time)
    return `${next.medication.name} 복용 완료! 기록해드렸어요.`
  }

  const progress = getTodayProgress(ctx.medications, ctx.logs)
  if (progress.taken === progress.total) {
    return '오늘 약 다 챙기셨어요! 잘 하셨어요.'
  }

  return '약 복용을 기록했어요.'
}

function respondMedicationCheck(ctx: ResponseContext): string {
  const next = getNextMedicationTime(ctx.medications, ctx.logs)
  if (next) {
    return `다음 약은 ${next.medication.name}, ${formatTime(next.time)}이에요.\n\n시간 되면 알려드릴게요.`
  }

  const progress = getTodayProgress(ctx.medications, ctx.logs)
  if (progress.total === 0) {
    return '등록된 약이 없어요. 약 탭에서 약을 등록해주세요.'
  }

  return '오늘 약 다 드셨어요! 잘 하셨어요.'
}

function respondGuardian(): string {
  return '보호자 탭에서 가족에게 안부를 보낼 수 있어요.\n\n지금 바로 보내드릴까요?'
}

function respondEmergency(): string {
  return '많이 불편하시면 바로 119에 전화하세요.\n\n혼자 계시면 가까운 가족에게도 알리세요.\n괜찮으시면 천천히 말씀해주세요.'
}

function respondGreeting(): string {
  return '안녕하세요! 오늘도 안심하세요.\n\n무엇을 도와드릴까요?'
}

function respondUnknown(): string {
  return '네, 말씀하세요!\n\n약, 날씨, 약국, 버스, 가족 안부 등을 도와드릴 수 있어요.\n아래 버튼을 눌러도 돼요.'
}

// -- API 호출 응답 (비동기) --

async function respondWeatherAsync(ctx: ResponseContext): Promise<string> {
  try {
    const res = await fetch(`/api/weather?lat=${ctx.lat}&lng=${ctx.lng}`)
    if (!res.ok) throw new Error()
    const w = await res.json()

    const gradeEmoji = (g: string) => g === '좋음' ? '😊' : g === '보통' ? '😐' : '😷'

    return `${ctx.regionLabel} 날씨예요.\n\n🌡️ 현재 ${w.temperature}° (체감 ${w.feelsLike}°)\n🔼 최고 ${w.maxTemp}° / 🔽 최저 ${w.minTemp}°\n☁️ ${w.condition}\n💧 강수확률 ${w.precipitationChance}%\n\n미세먼지 ${w.pm10Grade} ${gradeEmoji(w.pm10Grade)} / 초미세먼지 ${w.pm25Grade} ${gradeEmoji(w.pm25Grade)}\n\n자세한 건 날씨 탭에서 확인하세요.`
  } catch {
    return '날씨 정보를 가져오지 못했어요. 날씨 탭에서 직접 확인해주세요.'
  }
}

async function respondFacilityAsync(ctx: ResponseContext, type: 'pharmacy' | 'hospital'): Promise<string> {
  const label = type === 'pharmacy' ? '약국' : '병원'
  try {
    const res = await fetch(`/api/facilities?lat=${ctx.lat}&lng=${ctx.lng}&type=${type}`)
    if (!res.ok) throw new Error()
    const list = await res.json()

    if (!list || list.length === 0) {
      return `${ctx.regionLabel} 근처에서 ${label}을 찾지 못했어요.`
    }

    const top = list.slice(0, 3)
    const lines = top.map((f: { name: string; distance: number; isOpen: boolean }, i: number) =>
      `${i + 1}. ${f.name} (${f.distance}m) - ${f.isOpen ? '영업 중' : '문 닫음'}`
    ).join('\n')

    return `${ctx.regionLabel} 근처 ${label}이에요!\n\n${lines}\n\n주변 탭에서 전화도 바로 할 수 있어요.`
  } catch {
    return `${label} 정보를 가져오지 못했어요. 주변 탭에서 직접 확인해주세요.`
  }
}

async function respondBusAsync(ctx: ResponseContext): Promise<string> {
  try {
    const res = await fetch(`/api/bus?lat=${ctx.lat}&lng=${ctx.lng}`)
    if (!res.ok) throw new Error()
    const stops = await res.json()

    if (!stops || stops.length === 0) {
      return `${ctx.regionLabel} 근처에서 정류장을 찾지 못했어요.`
    }

    const top = stops.slice(0, 3)
    const lines = top.map((s: { name: string; distance: number }, i: number) =>
      `${i + 1}. ${s.name} (${s.distance}m)`
    ).join('\n')

    return `${ctx.regionLabel} 근처 정류장이에요!\n\n${lines}\n\n버스 탭에서 도착 시간도 확인할 수 있어요.`
  } catch {
    return '버스 정보를 가져오지 못했어요. 버스 탭에서 직접 확인해주세요.'
  }
}

// -- Sync handler map (즉시 응답) --

const SYNC_HANDLERS: Partial<Record<ChatIntent, (ctx: ResponseContext) => string>> = {
  medication_taken: respondMedicationTaken,
  medication_check: respondMedicationCheck,
  guardian: respondGuardian,
  emergency: respondEmergency,
  greeting: respondGreeting,
  unknown: respondUnknown,
}

// -- Async handler map (API 호출 필요) --

const ASYNC_HANDLERS: Partial<Record<ChatIntent, (ctx: ResponseContext) => Promise<string>>> = {
  weather: respondWeatherAsync,
  pharmacy: (ctx) => respondFacilityAsync(ctx, 'pharmacy'),
  hospital: (ctx) => respondFacilityAsync(ctx, 'hospital'),
  bus: respondBusAsync,
}

/**
 * Public entry point: detects intent from raw input and returns a response.
 * Returns a Promise because some intents need API calls.
 */
export async function generateResponse(
  input: string,
  context: ResponseContext,
): Promise<ChatResponse> {
  const intent = detectIntent(input)

  const asyncHandler = ASYNC_HANDLERS[intent]
  if (asyncHandler) {
    const text = await asyncHandler(context)
    return { text, intent }
  }

  const syncHandler = SYNC_HANDLERS[intent]
  const text = syncHandler ? syncHandler(context) : respondUnknown()
  return { text, intent }
}
