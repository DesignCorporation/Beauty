import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string
      remove: (widgetId: string) => void
      reset: (widgetId: string) => void
    }
    __turnstileLoader?: Promise<void>
  }
}

const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const ensureTurnstileScript = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Turnstile unavailable in SSR'))
  }

  if (window.turnstile) {
    return Promise.resolve()
  }

  if (window.__turnstileLoader) {
    return window.__turnstileLoader
  }

  window.__turnstileLoader = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src^="${TURNSTILE_SCRIPT_SRC.split('?')[0]}"]`
    )

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve())
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Turnstile script')))
      return
    }

    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Turnstile script'))
    document.head.appendChild(script)
  })

  return window.__turnstileLoader
}

type TurnstileWidgetProps = {
  siteKey: string
  onSuccess?: (token: string) => void
  onError?: (error?: unknown) => void
  onExpire?: () => void
  className?: string
}

const TurnstileWidget = ({ siteKey, onSuccess, onError, onExpire, className }: TurnstileWidgetProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const callbacksRef = useRef({
    onSuccess,
    onError,
    onExpire,
  })

  useEffect(() => {
    callbacksRef.current = {
      onSuccess,
      onError,
      onExpire,
    }
  }, [onSuccess, onError, onExpire])

  useEffect(() => {
    let widgetId: string | null = null
    let cancelled = false

    ensureTurnstileScript()
      .then(() => {
        if (!window.turnstile || cancelled || !containerRef.current) {
          return
        }

        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            callbacksRef.current.onSuccess?.(token)
          },
          'error-callback': (error: unknown) => {
            callbacksRef.current.onError?.(error)
            if (widgetId) {
              window.turnstile?.reset(widgetId)
            }
          },
          'expired-callback': () => {
            callbacksRef.current.onExpire?.()
            if (widgetId) {
              window.turnstile?.reset(widgetId)
            }
          },
        })
      })
      .catch((error) => {
        onError?.(error)
      })

    return () => {
      cancelled = true
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId)
      }
    }
  }, [siteKey])

  return <div ref={containerRef} className={className} />
}

export default TurnstileWidget
