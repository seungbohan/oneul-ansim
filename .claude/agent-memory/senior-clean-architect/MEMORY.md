# Oneul-Ansim Project Memory

## Stack
- Next.js 16.1.6 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Zustand 5
- Font: Noto Sans KR (18px base)
- Target: Korean elderly users (senior-friendly UI)

## Project Structure
- `src/app/` - Next.js App Router pages + API routes
- `src/components/ui/` - Reusable UI (BigButton, SectionCard, StatusBadge, Modal, Toast, Skeleton, QuickActionButton)
- `src/components/layout/` - Header, BottomNav
- `src/components/providers/` - ClientProviders (wraps ToastProvider)
- `src/components/ErrorBoundary.tsx` - Class-based error boundary
- `src/lib/store/` - Zustand stores (medication, user, location, chat) with persist middleware
- `src/lib/hooks/` - useHydration, useGeolocation, useNotification
- `src/lib/chat/` - intentDetector.ts + responseEngine.ts (separated intent detection & response generation)
- `src/lib/utils/` - formatters, medicationScheduler, weatherHelper, id
- `src/types/` - Barrel exported from index.ts

## Key Patterns
- Zustand stores use `persist` middleware -> require hydration guard (useHydration hook)
- Home page splits into ElderHome / GuardianHome based on userStore.mode
- SkeletonHome shown during hydration
- Toast system via context (ToastProvider in ClientProviders)
- API routes at /api/weather, /api/facilities, /api/bus, /api/chat return mock data (TODO: real API)
- Chat uses Strategy pattern: intentDetector detects intent, responseEngine dispatches to handler per intent
- globals.css has custom animations: slide-up, fade-in, skeleton-pulse, toast-in/out, gentle-pulse
- Safe area insets handled via CSS env()
- All interactive elements have min-h-[44px] or min-h-[48px] for accessibility

## Conventions
- Korean comments in components, English identifiers
- 'use client' directive on all components using hooks/stores
- aria-label on interactive elements for accessibility
- eslint-disable comments for SpeechRecognition API any casts
