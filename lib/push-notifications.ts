export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function registerServiceWorkerAndSubscribe(vapidPublicKey: string) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push not supported in this browser')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('Notification permission not granted')
      return null
    }

    const existing = await registration.pushManager.getSubscription()
    if (existing) return existing

    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })

    return subscription
  } catch (err) {
    console.error('Failed to register service worker or subscribe', err)
    return null
  }
}

export async function sendPushMessage(subscription: any, payload: any) {
  try {
    await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, payload }),
    })
  } catch (err) {
    console.error('Failed to send push message to server', err)
  }
}

export async function subscribeUserToServer(subscription: any, userId?: string | null) {
  try {
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, user_id: userId || null }),
    })
    return res.ok
  } catch (err) {
    console.error('Failed to save subscription to server', err)
    return false
  }
}

export async function unsubscribeUserFromServer(endpoint: string) {
  try {
    const res = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    })
    return res.ok
  } catch (err) {
    console.error('Failed to remove subscription from server', err)
    return false
  }
}

export async function unsubscribeClientOnly() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return null
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return null
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return null
    const endpoint = subscription.endpoint
    await subscription.unsubscribe()
    return endpoint
  } catch (err) {
    console.error('Failed to unsubscribe client-only', err)
    return null
  }
}

export async function unsubscribeFromPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return null
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return null
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return null
    const endpoint = subscription.endpoint
    await subscription.unsubscribe()
    await unsubscribeUserFromServer(endpoint)
    return true
  } catch (err) {
    console.error('Failed to unsubscribe', err)
    return false
  }
}

export async function getCurrentSubscription() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return null
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return null
    const subscription = await registration.pushManager.getSubscription()
    return subscription
  } catch (err) {
    console.error('Failed to get subscription', err)
    return null
  }
}
