'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Guardian } from '@/types'
import { generateId } from '@/lib/utils/id'

type ElderContact = {
  id: string
  name: string
  phone: string
  relationship: string
}

type UserState = {
  mode: 'elder' | 'guardian'
  userName: string
  guardians: Guardian[]
  elderContacts: ElderContact[]
  isOnboarded: boolean
  setMode: (mode: 'elder' | 'guardian') => void
  setUserName: (name: string) => void
  addGuardian: (guardian: Omit<Guardian, 'id'>) => void
  removeGuardian: (id: string) => void
  addElderContact: (contact: Omit<ElderContact, 'id'>) => void
  removeElderContact: (id: string) => void
  setOnboarded: () => void
  resetStore: () => void
}

const initialState = {
  mode: 'elder' as const,
  userName: '',
  guardians: [] as Guardian[],
  elderContacts: [] as ElderContact[],
  isOnboarded: false,
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      ...initialState,

      setMode: (mode) => set({ mode }),

      setUserName: (name) => set({ userName: name }),

      addGuardian: (guardian) => {
        set(state => ({
          guardians: [...state.guardians, { ...guardian, id: generateId() }],
        }))
      },

      removeGuardian: (id) => {
        set(state => ({
          guardians: state.guardians.filter(g => g.id !== id),
        }))
      },

      addElderContact: (contact) => {
        set(state => ({
          elderContacts: [...state.elderContacts, { ...contact, id: generateId() }],
        }))
      },

      removeElderContact: (id) => {
        set(state => ({
          elderContacts: state.elderContacts.filter(c => c.id !== id),
        }))
      },

      setOnboarded: () => set({ isOnboarded: true }),

      resetStore: () => set(initialState),
    }),
    { name: 'oneul-user' }
  )
)
