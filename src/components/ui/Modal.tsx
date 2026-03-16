'use client'

import { useEffect, useRef } from 'react'

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      /* 열릴 때: 스크롤 잠금 + 이전 포커스 저장 + 모달에 포커스 */
      previousFocusRef.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
      setTimeout(() => {
        modalRef.current?.focus()
      }, 100)
    } else {
      /* 닫힐 때: 스크롤 복원 + 이전 포커스 복원 */
      document.body.style.overflow = ''
      previousFocusRef.current?.focus()
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  /* ESC 키로 닫기 */
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* 모달 본체 */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative bg-card rounded-t-3xl w-full max-w-lg p-6 animate-slide-up"
        style={{
          paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* 드래그 핸들 (시각적 힌트) */}
        <div className="flex justify-center mb-4" aria-hidden="true">
          <div className="w-10 h-1.5 bg-border rounded-full" />
        </div>
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}
