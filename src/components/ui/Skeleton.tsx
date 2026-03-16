/**
 * Skeleton - 로딩 상태를 나타내는 스켈레톤 UI 컴포넌트
 *
 * 고령자를 위해 부드러운 펄스 애니메이션 적용.
 * 다양한 형태(직사각형, 원형, 텍스트 줄) 지원.
 */

type SkeletonProps = {
  /** 너비 (CSS 값, 기본: 100%) */
  width?: string
  /** 높이 (CSS 값, 기본: 20px) */
  height?: string
  /** 둥근 형태 여부 (프로필 이미지 등) */
  circle?: boolean
  /** 둥근 모서리 크기 */
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  /** 추가 클래스 */
  className?: string
}

const roundedMap = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
}

export default function Skeleton({
  width = '100%',
  height = '20px',
  circle = false,
  rounded = '2xl',
  className = '',
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      className={`
        bg-border/50 animate-skeleton-pulse
        ${circle ? 'rounded-full' : roundedMap[rounded]}
        ${className}
      `}
      style={{
        width: circle ? height : width,
        height,
      }}
    />
  )
}

/** 카드 형태의 스켈레톤 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      className={`bg-card rounded-2xl p-5 shadow-sm border border-border ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Skeleton width="32px" height="32px" circle />
        <Skeleton width="120px" height="24px" rounded="lg" />
      </div>
      <div className="space-y-3">
        <Skeleton height="16px" width="100%" rounded="lg" />
        <Skeleton height="16px" width="80%" rounded="lg" />
        <Skeleton height="16px" width="60%" rounded="lg" />
      </div>
    </div>
  )
}

/** 퀵 액션 버튼 그리드용 스켈레톤 */
export function SkeletonQuickActions() {
  return (
    <div aria-hidden="true" role="presentation" className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="flex flex-col items-center justify-center gap-2 bg-card rounded-2xl p-4 border border-border shadow-sm min-h-[100px]"
        >
          <Skeleton width="48px" height="48px" circle />
          <Skeleton width="64px" height="18px" rounded="lg" />
        </div>
      ))}
    </div>
  )
}

/** 홈 페이지 전체 스켈레톤 */
export function SkeletonHome() {
  return (
    <div className="px-4 pb-6" aria-label="로딩 중" role="status">
      <span className="sr-only">페이지를 불러오는 중입니다</span>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-4">
        <Skeleton width="80px" height="28px" rounded="lg" />
        <Skeleton width="90px" height="36px" rounded="full" />
      </div>
      {/* 인사말 */}
      <div className="mt-2 mb-6 px-1 space-y-2">
        <Skeleton width="200px" height="32px" rounded="lg" />
        <Skeleton width="140px" height="20px" rounded="lg" />
      </div>
      {/* 퀵 액션 */}
      <div className="mb-6">
        <SkeletonQuickActions />
      </div>
      {/* 카드들 */}
      <SkeletonCard className="mb-4" />
      <SkeletonCard className="mb-4" />
    </div>
  )
}
