# UI Design Engineer Memory - oneul-ansim

## Project Stack
- Next.js 15 + TypeScript + Tailwind CSS v4
- Zustand (with persist middleware) for state management
- Font: Noto Sans KR (400, 500, 700)
- Base font-size: 18px (set on html)

## Key File Paths
- Design tokens: `src/app/globals.css` (CSS custom properties in :root + @theme inline)
- Layout: `src/app/layout.tsx` (server component, wraps with ErrorBoundary + ClientProviders)
- Components: `src/components/ui/` (BigButton, SectionCard, Modal, StatusBadge, QuickActionButton, Skeleton, Toast)
- Layout components: `src/components/layout/` (BottomNav, Header)
- Stores: `src/lib/store/` (userStore, medicationStore, locationStore, chatStore)
- Providers: `src/components/providers/ClientProviders.tsx` (ToastProvider wrapper)

## Design Conventions
- Color tokens: --primary (#2d5a27 green), --danger (#e8573d), --warning (#d4911e), --info (#4a90d9)
- Tailwind theme bridge: `@theme inline` maps CSS vars to --color-* for Tailwind usage
- Border radius: rounded-2xl (16px) for cards/buttons, rounded-full for badges/pills
- Min touch target: 56px height for buttons, 44px for smaller interactive elements
- Icons: emoji-based (not icon library)
- Animations: defined as @keyframes in globals.css, applied via utility classes (animate-slide-up, animate-fade-in, etc.)

## User Mode
- Two modes: 'elder' (default) and 'guardian', toggled via Header button
- Different home layouts per mode (elder vs guardian dashboard)

## Accessibility
- Focus-visible outline: 3px solid primary with offset
- Skip-to-content link in layout
- ARIA labels on all interactive elements
- role="navigation" on BottomNav, role="dialog" on Modal
- Safe-area-inset support for iOS notch devices (viewportFit: "cover")
