'use client'

import { useState, useRef, useEffect } from 'react'
import Header from '@/components/layout/Header'
import BigButton from '@/components/ui/BigButton'
import { useChatStore } from '@/lib/store/chatStore'
import { useMedicationStore } from '@/lib/store/medicationStore'
import { useLocationStore, REGION_PRESETS } from '@/lib/store/locationStore'
import { generateResponse } from '@/lib/chat/responseEngine'

const QUICK_REPLIES = [
  '약 먹었어',
  '날씨 어때?',
  '근처 약국',
  '버스 언제 와?',
  '가족에게 알려줘',
]

export default function ChatPage() {
  const { messages, addMessage, isLoading } = useChatStore()
  const { medications, logs, markAsTaken } = useMedicationStore()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isListening, setIsListening] = useState(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg) return

    addMessage('user', msg)
    setInput('')

    const medState = useMedicationStore.getState()
    const locState = useLocationStore.getState()
    const coords = locState.getEffectiveCoords()
    const regionLabel = REGION_PRESETS[locState.region]?.label ?? '내 위치'

    const { text: reply } = await generateResponse(msg, {
      medications: medState.medications,
      logs: medState.logs,
      markAsTaken: medState.markAsTaken,
      lat: coords.lat,
      lng: coords.lng,
      regionLabel,
    })
    addMessage('assistant', reply)
  }

  const handleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      addMessage('assistant', '음성 인식을 사용할 수 없어요. 글로 입력해주세요.')
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognitionAPI()

    recognition.lang = 'ko-KR'
    recognition.continuous = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript
      if (text) handleSend(text)
    }
    recognition.onerror = () => setIsListening(false)

    recognition.start()
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-80px)]">
      <Header />

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 animate-fade-in">
            <p className="text-5xl mb-4" aria-hidden="true">🤗</p>
            <p className="text-2xl font-bold mb-2">안녕하세요!</p>
            <p className="text-lg text-muted mb-6 leading-relaxed">
              무엇이든 편하게 말씀해주세요.<br />
              도움이 필요하시면 아래를 눌러보세요.
            </p>
            <div className="space-y-2 max-w-xs mx-auto text-left">
              {[
                { emoji: '💊', text: '"약 먹었어" - 복약 기록하기' },
                { emoji: '🚌', text: '"버스 언제 와?" - 버스 정보' },
                { emoji: '💌', text: '"가족에게 알려줘" - 안부 전하기' },
              ].map(({ emoji, text }) => (
                <p key={text} className="text-muted text-base">
                  <span aria-hidden="true">{emoji} </span>{text}
                </p>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-base whitespace-pre-line ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-card border border-border rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 빠른 답변 */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto">
        {QUICK_REPLIES.map(reply => (
          <button
            key={reply}
            onClick={() => handleSend(reply)}
            className="shrink-0 bg-card border border-border rounded-full px-4 py-2 text-sm font-bold active:scale-95 transition-transform"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* 입력 영역 */}
      <div className="px-4 py-3 bg-card border-t border-border">
        <div className="flex gap-2">
          <button
            onClick={handleVoice}
            className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl ${
              isListening
                ? 'bg-danger text-white animate-pulse'
                : 'bg-background border border-border'
            }`}
          >
            🎤
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="말씀해주세요..."
            className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-base focus:outline-none focus:border-primary"
          />
          <BigButton
            size="md"
            variant="primary"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
          >
            보내기
          </BigButton>
        </div>
      </div>
    </div>
  )
}
