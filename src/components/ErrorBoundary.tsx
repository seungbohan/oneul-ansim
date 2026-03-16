'use client'

import React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Catches uncaught errors in child components and shows a
 * senior-friendly recovery UI instead of a white screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // TODO: Send to error tracking service (e.g., Sentry)
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (this.props.fallback) {
      return this.props.fallback
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
        <p className="text-5xl mb-6">😥</p>
        <h2 className="text-2xl font-bold mb-3">
          문제가 생겼어요
        </h2>
        <p className="text-lg text-muted mb-8">
          잠시 후 다시 시도해주세요.
          <br />
          계속 안 되면 가족에게 알려주세요.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={this.handleReload}
            className="w-full bg-primary text-white rounded-2xl py-4 text-lg font-bold active:scale-95 transition-transform"
          >
            다시 시도하기
          </button>
          <button
            onClick={this.handleGoHome}
            className="w-full bg-card border border-border rounded-2xl py-4 text-lg font-bold active:scale-95 transition-transform"
          >
            처음으로 가기
          </button>
        </div>
      </div>
    )
  }
}
