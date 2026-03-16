type StatusBadgeProps = {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'danger' | 'info'
}

const badgeStyles = {
  success: 'bg-primary-light text-primary border-primary/20',
  warning: 'bg-warning-light text-warning border-warning/20',
  danger: 'bg-danger-light text-danger border-danger/20',
  info: 'bg-info-light text-info border-info/20',
}

export default function StatusBadge({
  children,
  variant = 'info',
}: StatusBadgeProps) {
  return (
    <span
      role="status"
      className={`
        inline-flex items-center
        px-3 py-1.5 rounded-full
        text-sm font-bold
        border
        ${badgeStyles[variant]}
      `}
    >
      {children}
    </span>
  )
}
