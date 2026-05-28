'use client'

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

async function getPublicKey(): Promise<string> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/api\/?$/, '') || ''
  const endpoints = ['/api/push/public-key']

  if (backendUrl) {
    endpoints.push(`${backendUrl}/api/push/public-key`)
  }

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        continue
      }

      const data = await response.json()
      if (typeof data?.publicKey === 'string' && data.publicKey) {
        return data.publicKey
      }
    } catch (error) {
      continue
    }
  }

  throw new Error('Unable to load push key')
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

  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      roles: [role],
      user_id: user?.id || null,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to save notification subscription')
  }

  return existingSubscription ? 'Phone notifications are already enabled.' : 'Phone notifications are enabled.'
}
