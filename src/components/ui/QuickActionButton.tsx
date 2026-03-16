'use client'

import Link from 'next/link'

type QuickActionButtonProps = {
  href: string
  icon: string
  label: string
}

export default function QuickActionButton({ href, icon, label }: QuickActionButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="
        flex flex-col items-center justify-center gap-2
        bg-card rounded-2xl p-4
        border border-border shadow-sm
        min-h-[100px]
        transition-all duration-200 ease-out
        hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5
        active:scale-95 active:shadow-sm
        focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2
      "
    >
      <span className="text-4xl" aria-hidden="true">{icon}</span>
      <span className="text-base font-bold text-foreground">{label}</span>
    </Link>
  )
}
