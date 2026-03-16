'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ChatMessage } from '@/types'
import { generateId } from '@/lib/utils/id'

type ChatState = {
  messages: ChatMessage[]
  isLoading: boolean
  addMessage: (role: 'user' | 'assistant', content: string) => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      isLoading: false,

      addMessage: (role, content) => {
        const msg: ChatMessage = {
          id: generateId(),
          role,
          content,
          timestamp: new Date().toISOString(),
        }
        set(state => ({ messages: [...state.messages, msg] }))
      },

      setLoading: (loading) => set({ isLoading: loading }),

      clearMessages: () => set({ messages: [] }),
    }),
    { name: 'oneul-chat' }
  )
)
