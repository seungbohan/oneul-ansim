'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUserStore } from '@/lib/store/userStore'

const elderTabs = [
  { href: '/', icon: '🏠', label: '홈' },
  { href: '/medications', icon: '💊', label: '약' },
  { href: '/weather', icon: '🌤️', label: '날씨' },
  { href: '/bus', icon: '🚌', label: '버스' },
  { href: '/facilities', icon: '📍', label: '주변' },
]

const guardianTabs = [
  { href: '/', icon: '🏠', label: '홈' },
  { href: '/guardian', icon: '👴', label: '어르신' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { mode } = useUserStore()

  // 로그인, 온보딩 페이지에서는 네비게이션 숨김
  if (pathname === '/login' || pathname === '/onboarding') {
    return null
  }

  const tabs = mode === 'guardian' ? guardianTabs : elderTabs

  return (
    <nav
      role="navigation"
      aria-label="메인 내비게이션"
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto max-w-lg flex justify-around items-center h-[72px]">
        {tabs.map(tab => {
          const isActive = tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href)

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`
                relative flex flex-col items-center justify-center
                w-full h-full gap-0.5
                transition-all duration-200 ease-out
                min-w-[56px]
                ${isActive
                  ? 'text-primary font-bold'
                  : 'text-muted hover:text-foreground'
                }
              `}
            >
              {isActive && (
                <span
                  className="absolute top-1.5 rounded-2xl bg-primary-light"
                  style={{
                    width: '48px',
                    height: '48px',
                    zIndex: -1,
                  }}
                  aria-hidden="true"
                />
              )}
              <span
                className={`text-2xl leading-none transition-transform duration-200 ${
                  isActive ? 'scale-110' : 'scale-100'
                }`}
              >
                {tab.icon}
              </span>
              <span className={`text-xs transition-colors duration-200 ${
                isActive ? 'text-primary' : ''
              }`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
