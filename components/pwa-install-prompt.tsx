"use client"

import { useEffect, useMemo, useState } from 'react'
import { Download, X, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DEVICE_DISMISS_KEY = 'safegate_pwa_install_dismissed_device'
const DEVICE_INSTALLED_KEY = 'safegate_pwa_install_installed_device'
const USER_DISMISS_PREFIX = 'safegate_pwa_install_dismissed_user_'
const USER_INSTALLED_PREFIX = 'safegate_pwa_install_installed_user_'

function isIosDevice() {
  if (typeof window === 'undefined') {
    return false
  }

  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function isStandaloneMode() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function PwaInstallPrompt() {
  const { user } = useAuth()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIos, setIsIos] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [mounted, setMounted] = useState(false)

  const userInstallKey = useMemo(() => {
    const userIdentifier = user?.id || user?.username || user?.full_name || ''
    return userIdentifier ? `${USER_DISMISS_PREFIX}${userIdentifier}` : null
  }, [user?.full_name, user?.id, user?.username])

  const userInstalledKey = useMemo(() => {
    const userIdentifier = user?.id || user?.username || user?.full_name || ''
    return userIdentifier ? `${USER_INSTALLED_PREFIX}${userIdentifier}` : null
  }, [user?.full_name, user?.id, user?.username])

  const readStorageFlag = (key: string | null) => {
    if (!key) {
      return false
    }

    try {
      return localStorage.getItem(key) === 'true'
    } catch {
      return false
    }
  }

  const writeStorageFlag = (key: string | null, value: boolean) => {
    if (!key) {
      return
    }

    try {
      localStorage.setItem(key, String(value))
    } catch {
      // Ignore storage errors.
    }
  }

  useEffect(() => {
    setMounted(true)
    setIsIos(isIosDevice())
    setIsStandalone(isStandaloneMode())

    const deviceDismissed = readStorageFlag(DEVICE_DISMISS_KEY)
    const userDismissed = readStorageFlag(userInstallKey)
    const deviceInstalled = readStorageFlag(DEVICE_INSTALLED_KEY)
    const userInstalled = readStorageFlag(userInstalledKey)
    setIsDismissed(deviceDismissed || userDismissed || deviceInstalled || userInstalled)

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsDismissed(true)
      writeStorageFlag(DEVICE_INSTALLED_KEY, true)
      writeStorageFlag(DEVICE_DISMISS_KEY, true)
      writeStorageFlag(userInstalledKey, true)
      writeStorageFlag(userInstallKey, true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [userInstallKey, userInstalledKey])

  useEffect(() => {
    if (!mounted) {
      return
    }

    setIsStandalone(isStandaloneMode())
  }, [mounted])

  const shouldShow = useMemo(() => {
    return mounted && !isStandalone && !isDismissed && (Boolean(deferredPrompt) || isIos)
  }, [deferredPrompt, isDismissed, isIos, isStandalone, mounted])

  const handleDismiss = () => {
    setIsDismissed(true)
    writeStorageFlag(DEVICE_DISMISS_KEY, true)
    writeStorageFlag(userInstallKey, true)
  }

  const handleInstall = async () => {
    if (isIos) {
      setShowIosGuide(true)
      return
    }

    if (deferredPrompt) {
      deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      if (choice.outcome === 'accepted') {
        writeStorageFlag(DEVICE_INSTALLED_KEY, true)
        writeStorageFlag(DEVICE_DISMISS_KEY, true)
        writeStorageFlag(userInstalledKey, true)
        writeStorageFlag(userInstallKey, true)
        setIsDismissed(true)
      }
      handleDismiss()
      return
    }

    handleDismiss()
  }

  if (!shouldShow) {
    return null
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-24 z-50 px-4 sm:px-6 md:bottom-6 lg:left-6 lg:right-auto lg:bottom-6 lg:max-w-md lg:px-0">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/95 p-5 text-card-foreground shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/5">
          <div className="absolute inset-0 bg-linear-to-br from-primary/8 via-transparent to-accent/8 dark:from-primary/12 dark:to-accent/12" aria-hidden="true" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-primary/10 text-primary shadow-sm dark:bg-primary/15">
              {isIos ? <Share2 className="h-6 w-6" /> : <Download className="h-6 w-6" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold leading-tight text-card-foreground">Install SafeGate?</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {isIos
                      ? 'Use Add to Home Screen for faster access, offline support, and a smoother app experience.'
                      : 'Add the app to your device for faster access and offline support.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-full border border-border/70 bg-muted/70 p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:bg-background/70"
                  aria-label="Dismiss install prompt"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="h-10 rounded-full px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Not now
                </Button>
                <Button
                  type="button"
                  onClick={handleInstall}
                  className={cn(
                    'h-10 rounded-full px-4 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]',
                    'bg-primary hover:bg-primary/90'
                  )}
                >
                  {isIos ? 'Open guide' : 'Install'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showIosGuide && isIos && (
        <div className="fixed inset-0 z-60 flex items-end justify-center bg-black/45 px-4 py-4 backdrop-blur-sm sm:items-center sm:px-6">
          <div className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-border/70 bg-card text-card-foreground shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
            <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-accent/10" aria-hidden="true" />
            <div className="relative p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-primary">iPhone / iPad</p>
                  <h3 className="mt-1 text-xl font-bold text-card-foreground">Add SafeGate to Home Screen</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIosGuide(false)}
                  className="rounded-full border border-border/70 bg-muted/70 p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Close guide"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
                <div className="rounded-2xl border border-border/60 bg-muted/50 p-4">
                  <p className="font-semibold text-card-foreground">1. Open this site in Safari</p>
                  <p className="mt-1">iOS only shows the Home Screen option from Safari.</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/50 p-4">
                  <p className="font-semibold text-card-foreground">2. Tap the Share button</p>
                  <p className="mt-1">It looks like a square with an arrow pointing up.</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/50 p-4">
                  <p className="font-semibold text-card-foreground">3. Choose Add to Home Screen</p>
                  <p className="mt-1">If you do not see it, scroll the share sheet a little lower.</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/50 p-4">
                  <p className="font-semibold text-card-foreground">4. Tap Add</p>
                  <p className="mt-1">SafeGate will appear like an installed app on your device.</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  type="button"
                  onClick={() => setShowIosGuide(false)}
                  className="h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Got it
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
