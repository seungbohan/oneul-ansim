'use client'

import { useState, useCallback, useEffect } from 'react'

type NotificationPermission = 'default' | 'granted' | 'denied'

interface UseNotificationReturn {
  permission: NotificationPermission
  isSupported: boolean
  requestPermission: () => Promise<void>
  sendNotification: (title: string, options?: NotificationOptions) => void
  scheduleMedicationReminder: (
    medicationName: string,
    scheduledTime: string,
  ) => void
}

/**
 * Hook for managing browser Notification API.
 * Primarily designed for medication reminders,
 * but generic enough for any notification use case.
 *
 * Usage:
 *   const { permission, requestPermission, sendNotification } = useNotification()
 */
export function useNotification(): UseNotificationReturn {
  const isSupported = typeof window !== 'undefined' && 'Notification' in window

  const [permission, setPermission] = useState<NotificationPermission>(
    isSupported ? (Notification.permission as NotificationPermission) : 'default',
  )

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission as NotificationPermission)
    }
  }, [isSupported])

  const requestPermission = useCallback(async () => {
    if (!isSupported) return

    const result = await Notification.requestPermission()
    setPermission(result as NotificationPermission)
  }, [isSupported])

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || permission !== 'granted') return

      const notification = new Notification(title, {
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        ...options,
      })

      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    },
    [isSupported, permission],
  )

  const scheduleMedicationReminder = useCallback(
    (medicationName: string, scheduledTime: string) => {
      if (!isSupported || permission !== 'granted') return

      const [hours, minutes] = scheduledTime.split(':').map(Number)
      const now = new Date()
      const target = new Date()
      target.setHours(hours, minutes, 0, 0)

      const delay = target.getTime() - now.getTime()
      if (delay <= 0) return // Already past

      const timerId = window.setTimeout(() => {
        sendNotification(`${medicationName} 드실 시간이에요`, {
          body: '오늘안심에서 알려드려요. 약을 챙겨주세요.',
          tag: `medication-${medicationName}-${scheduledTime}`,
          requireInteraction: true,
        })
      }, delay)

      // Return cleanup is not possible from a non-effect callback,
      // so we store timer references on window for debugging.
      const existing: number[] =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__medicationTimers ?? []
      existing.push(timerId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).__medicationTimers = existing
    },
    [isSupported, permission, sendNotification],
  )

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
    scheduleMedicationReminder,
  }
}
