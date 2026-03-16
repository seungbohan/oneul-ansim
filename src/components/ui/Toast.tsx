'use client'

import { useEffect, useState, useCallback, createContext, useContext } from 'react'

/* ===== 토스트 타입 정의 ===== */
type ToastVariant = 'success' | 'info' | 'warning' | 'error'

type ToastItem = {
  id: string
  message: string
  variant: ToastVariant
  icon?: string
  duration?: number
}

type ToastContextType = {
  showToast: (toast: Omit<ToastItem, 'id'>) => void
}

/* ===== 변형별 스타일 ===== */
const variantStyles: Record<ToastVariant, string> = {
  success: 'bg-primary text-white',
  info: 'bg-info text-white',
  warning: 'bg-warning text-white',
  error: 'bg-danger text-white',
}

const variantIcons: Record<ToastVariant, string> = {
  success: '✅',
  info: '💡',
  warning: '⚠️',
  error: '❌',
}

/* ===== 토스트 컨텍스트 ===== */
const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast는 ToastProvider 안에서 사용해야 합니다')
  }
  return context
}

/* ===== 토스트 개별 아이템 ===== */
function ToastMessage({
  toast,
  onRemove,
}: {
  toast: ToastItem
  onRemove: (id: string) => void
}) {
  const [isExiting, setIsExiting] = useState(false)
  const duration = toast.duration ?? 3000

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true)
    }, duration - 300)

    const removeTimer = setTimeout(() => {
      onRemove(toast.id)
    }, duration)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(removeTimer)
    }
  }, [toast.id, duration, onRemove])

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        fixed top-4 left-1/2 z-[200]
        max-w-[calc(100vw-2rem)] w-auto min-w-[280px]
        px-5 py-4 rounded-2xl shadow-lg
        flex items-center gap-3
        text-lg font-bold
        ${variantStyles[toast.variant]}
        ${isExiting ? 'animate-toast-out' : 'animate-toast-in'}
      `}
      style={{
        /* safe area 대응 */
        marginTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <span className="text-2xl flex-shrink-0" aria-hidden="true">
        {toast.icon || variantIcons[toast.variant]}
      </span>
      <span className="flex-1">{toast.message}</span>
    </div>
  )
}

/* ===== 토스트 Provider ===== */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts(prev => [...prev, { ...toast, id }])
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map(toast => (
        <ToastMessage key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </ToastContext.Provider>
  )
}
