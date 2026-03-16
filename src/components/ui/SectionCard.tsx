type SectionCardProps = {
  children: React.ReactNode
  title?: string
  icon?: string
  onClick?: () => void
  className?: string
  ariaLabel?: string
}

export default function SectionCard({
  children,
  title,
  icon,
  onClick,
  className = '',
  ariaLabel,
}: SectionCardProps) {
  const isClickable = !!onClick
  const Wrapper = isClickable ? 'button' : 'div'

  return (
    <Wrapper
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={ariaLabel || (isClickable && title ? title : undefined)}
      className={`
        w-full bg-card rounded-2xl p-5 shadow-sm border border-border
        text-left
        transition-all duration-200 ease-out
        ${isClickable
          ? 'cursor-pointer hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 active:scale-[0.98] active:shadow-sm focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2'
          : ''
        }
        ${className}
      `}
    >
      {title && (
        <div className="flex items-center gap-2 mb-3">
          {icon && <span className="text-2xl" aria-hidden="true">{icon}</span>}
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
      )}
      {children}
    </Wrapper>
  )
}
