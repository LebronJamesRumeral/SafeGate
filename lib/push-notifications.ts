'use client'

const DEFAULT_VAPID_PUBLIC_KEY = 'BPnwXZPg1TaxnJNsbEChBlCY4-2z97MF1qHBUxVZ2fR4GJ2oVzIn1isBfeQ2aID-qMdbEVbD5zqSibUrcNYXMFw'
const PUSH_BACKEND_URL = 'https://safegate-pg3g.onrender.com'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; ++index) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function getPublicKey(): Promise<string> {
  const envPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  if (envPublicKey) {
    return envPublicKey
  }

  if (DEFAULT_VAPID_PUBLIC_KEY) {
    return DEFAULT_VAPID_PUBLIC_KEY
  }

  try {
    const response = await fetch(`${PUSH_BACKEND_URL}/api/push/public-key`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      credentials: 'omit',
    })

    if (response.ok) {
      const data = await response.json()
      if (typeof data?.publicKey === 'string' && data.publicKey) {
        return data.publicKey
      }
    }
  } catch (error) {
    // Fall through to the error below.
  }

  throw new Error('Unable to load push key')
}

async function postSubscription(payload: unknown): Promise<Response> {
  let lastError: unknown = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${PUSH_BACKEND_URL}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
        credentials: 'omit',
      })

      if (response.ok) {
        return response
      }

      lastError = response.statusText || `HTTP ${response.status}`
      if (![408, 429, 500, 502, 503, 504].includes(response.status)) {
        break
      }
    } catch (error) {
      lastError = error
    }

    if (attempt < 2) {
      await sleep(400 * (attempt + 1))
    }
  }

  throw new Error(typeof lastError === 'string' ? lastError : 'Failed to save notification subscription')
}

async function postTestPush(payload: unknown): Promise<Response> {
  let lastError: unknown = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${PUSH_BACKEND_URL}/api/push/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
        credentials: 'omit',
      })

      if (response.ok) {
        return response
      }

      lastError = response.statusText || `HTTP ${response.status}`
      if (![408, 429, 500, 502, 503, 504].includes(response.status)) {
        break
      }
    } catch (error) {
      lastError = error
    }

    if (attempt < 2) {
      await sleep(400 * (attempt + 1))
    }
  }

  throw new Error(typeof lastError === 'string' ? lastError : 'Failed to send test notification')
}

export async function enableDeviceNotifications(role: string, user?: { id?: string | null; username?: string | null; full_name?: string | null; email?: string | null }): Promise<string> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'Push notifications are not supported on this browser.'
  }

  const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  if (!standalone) {
    return 'Install the app to your home screen first, then enable notifications.'
  }

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission()

  if (permission !== 'granted') {
    return 'Notification permission was not granted.'
  }

  const registration = await navigator.serviceWorker.ready
  const existingSubscription = await registration.pushManager.getSubscription()
  const subscription = existingSubscription || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(await getPublicKey()),
  })

  await postSubscription({
    subscription: subscription.toJSON(),
    roles: [role],
    user_id: user?.id || null,
  })

  return existingSubscription ? 'Phone notifications are already enabled.' : 'Phone notifications are enabled.'
}

export async function sendTestPushNotification(role: string, href: string): Promise<{ delivered: number }> {
  const response = await postTestPush({
    title: 'SafeGate Test Notification',
    message: 'This is a test push notification from the development menu.',
    roles: [role],
    meta: {
      notification_kind: 'test_push_notification',
      href,
    },
  })

  const data = await response.json().catch(() => ({}))
  return {
    delivered: typeof data?.delivered === 'number' ? data.delivered : 0,
  }
}
