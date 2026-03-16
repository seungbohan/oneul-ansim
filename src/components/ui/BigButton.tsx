'use client'

type BigButtonProps = {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'md' | 'lg' | 'xl'
  fullWidth?: boolean
  icon?: string
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit'
  ariaLabel?: string
}

const variantStyles = {
  primary: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-dark active:scale-[0.97]',
  secondary: 'bg-card text-foreground border-2 border-border hover:border-primary hover:bg-primary-light active:scale-[0.97]',
  danger: 'bg-danger text-white hover:bg-danger/90 active:bg-danger/80 active:scale-[0.97]',
  success: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-dark active:scale-[0.97]',
}

const sizeStyles = {
  md: 'min-h-[48px] px-5 text-base',
  lg: 'min-h-[56px] px-6 text-lg',
  xl: 'min-h-[64px] px-8 text-xl',
}

export default function BigButton({
  children,
  onClick,
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  icon,
  disabled = false,
  loading = false,
  type = 'button',
  ariaLabel,
}: BigButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading}
      className={`
        rounded-2xl font-bold flex items-center justify-center gap-2
        transition-all duration-150 ease-out
        shadow-sm hover:shadow-md
        focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-3
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed !scale-100 !shadow-none' : ''}
      `}
    >
      {loading ? (
        <span className="animate-spin" aria-hidden="true">⏳</span>
      ) : icon ? (
        <span className="text-2xl" aria-hidden="true">{icon}</span>
      ) : null}
      {children}
    </button>
  )
}
