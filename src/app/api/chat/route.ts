import { NextRequest, NextResponse } from 'next/server'
import { ChatIntent, ChatAction } from '@/types/chat'
import { detectIntent } from '@/lib/chat/intentDetector'

// -- Request / Response types --

interface ChatRequestBody {
  message: string
  context?: {
    medications?: { name: string; time: string }[]
    weather?: { temp: number; condition: string }
  }
}

interface ChatResponseBody {
  reply: string
  intent: ChatIntent
  action?: ChatAction
}

// -- Intent to action mapping --

const INTENT_ACTION_MAP: Partial<Record<ChatIntent, ChatAction>> = {
  medication_taken: { type: 'medication_taken' },
  weather: { type: 'weather_check' },
  pharmacy: { type: 'find_facility', data: { facilityType: 'pharmacy' } },
  hospital: { type: 'find_facility', data: { facilityType: 'hospital' } },
  bus: { type: 'bus_check' },
  guardian: { type: 'notify_guardian' },
  emergency: { type: 'emergency' },
}

// -- Local rule-based response engine --

const LOCAL_RESPONSES: Record<ChatIntent, string> = {
  medication_taken: '약 복용을 기록했어요. 잘 하셨어요!',
  medication_check: '약 정보를 확인하고 있어요. 약 탭에서 자세히 볼 수 있어요.',
  weather: '날씨 정보를 가져오고 있어요. 날씨 탭에서 확인하세요.',
  pharmacy: '근처 약국을 찾고 있어요. 주변 탭에서 확인하세요.',
  hospital: '근처 병원을 찾고 있어요. 주변 탭에서 확인하세요.',
  bus: '버스 정보를 확인하고 있어요. 버스 탭에서 확인하세요.',
  guardian: '보호자에게 안부를 보낼 수 있어요. 가족 탭에서 확인하세요.',
  emergency:
    '많이 불편하시면 바로 119에 전화하세요.\n혼자 계시면 가까운 가족에게도 알리세요.',
  greeting: '안녕하세요! 오늘도 안심하세요.\n무엇을 도와드릴까요?',
  unknown:
    '네, 말씀하세요!\n약, 날씨, 약국, 버스, 가족 안부 등을 도와드릴 수 있어요.',
}

function generateLocalResponse(
  message: string,
  _context?: ChatRequestBody['context'],
): ChatResponseBody {
  const intent = detectIntent(message)
  const reply = LOCAL_RESPONSES[intent]
  const action = INTENT_ACTION_MAP[intent]

  return { reply, intent, ...(action && { action }) }
}

// -- Claude API integration (prepared for future use) --
//
// When ANTHROPIC_API_KEY is set, the chat will use Claude for responses.
// The local rule-based engine serves as fallback.
//
// async function generateClaudeResponse(
//   message: string,
//   context?: ChatRequestBody['context'],
// ): Promise<ChatResponseBody> {
//   const apiKey = process.env.ANTHROPIC_API_KEY
//
//   const systemPrompt = `당신은 "오늘안심" 앱의 AI 도우미입니다.
// 한국 고령자를 대상으로 친절하고 쉬운 말로 응답합니다.
//
// 도울 수 있는 것:
// - 약 복용 관리 (등록, 알림, 기록)
// - 날씨 확인
// - 근처 약국/병원/복지관 검색
// - 버스 도착 정보
// - 보호자 안부 전달
// - 긴급 상황 안내 (119)
//
// 규칙:
// - 존댓말 사용
// - 짧고 명확한 문장
// - 이모지 최소 사용
// - 고령자가 이해하기 쉬운 표현`
//
//   const messages = [
//     { role: 'user' as const, content: message },
//   ]
//
//   // Context injection for medication/weather info
//   if (context?.medications?.length) {
//     const medInfo = context.medications
//       .map((m) => `${m.name} (${m.time})`)
//       .join(', ')
//     messages[0].content = `[사용자 약 정보: ${medInfo}]\n\n${message}`
//   }
//
//   const response = await fetch('https://api.anthropic.com/v1/messages', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'x-api-key': apiKey!,
//       'anthropic-version': '2023-06-01',
//     },
//     body: JSON.stringify({
//       model: 'claude-sonnet-4-20250514',
//       max_tokens: 300,
//       system: systemPrompt,
//       messages,
//       // Tool use for app feature integration (future)
//       // tools: [
//       //   {
//       //     name: 'record_medication',
//       //     description: '사용자의 약 복용을 기록합니다',
//       //     input_schema: {
//       //       type: 'object',
//       //       properties: { medicationId: { type: 'string' } },
//       //     },
//       //   },
//       //   {
//       //     name: 'search_facility',
//       //     description: '근처 시설(약국, 병원, 복지관)을 검색합니다',
//       //     input_schema: {
//       //       type: 'object',
//       //       properties: { type: { type: 'string', enum: ['pharmacy', 'hospital', 'welfare'] } },
//       //     },
//       //   },
//       // ],
//     }),
//   })
//
//   if (!response.ok) {
//     throw new Error(`Claude API error: ${response.status}`)
//   }
//
//   const data = await response.json()
//   const textBlock = data.content?.find((b: { type: string }) => b.type === 'text')
//   const reply = textBlock?.text ?? LOCAL_RESPONSES.unknown
//
//   // Detect intent from the original message for action mapping
//   const intent = detectIntent(message)
//   const action = INTENT_ACTION_MAP[intent]
//
//   return { reply, intent, ...(action && { action }) }
// }

// -- Engine selector --

type ResponseEngine = (
  message: string,
  context?: ChatRequestBody['context'],
) => Promise<ChatResponseBody> | ChatResponseBody

function selectEngine(): ResponseEngine {
  // When Claude API key is available, switch to AI-powered responses
  // if (process.env.ANTHROPIC_API_KEY) {
  //   return generateClaudeResponse
  // }

  return generateLocalResponse
}

// -- Route handler --

/**
 * POST /api/chat
 * Body: { message: string, context?: { medications, weather } }
 *
 * Returns: { reply: string, intent: ChatIntent, action?: ChatAction }
 *
 * Currently uses local rule-based engine.
 * Set ANTHROPIC_API_KEY to enable Claude-powered responses (uncomment above).
 */
export async function POST(request: NextRequest) {
  const body: ChatRequestBody | null = await request
    .json()
    .catch(() => null)

  if (!body?.message || typeof body.message !== 'string') {
    return NextResponse.json(
      { error: '메시지가 필요합니다' },
      { status: 400 },
    )
  }

  const engine = selectEngine()

  try {
    const result = await engine(body.message, body.context)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[chat] Engine error, falling back to local:', error)

    // Fallback to local engine on any failure
    const fallback = generateLocalResponse(body.message, body.context)
    return NextResponse.json(fallback)
  }
}
