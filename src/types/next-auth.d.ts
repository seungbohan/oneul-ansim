import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      mode: string
      isOnboarded: boolean
    } & DefaultSession['user']
  }
}
