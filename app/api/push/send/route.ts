import webpush from 'web-push'

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails('mailto:admin@safegate.local', VAPID_PUBLIC, VAPID_PRIVATE)
  } catch (err) {
    console.error('Failed to set VAPID details', err)
  }
}

export async function POST(req: Request) {
  try {
    const { subscription, payload } = await req.json()
    if (!subscription) {
      return new Response(JSON.stringify({ error: 'No subscription provided' }), { status: 400 })
    }

    const body = JSON.stringify(payload || { title: 'SafeGate', body: 'You have a notification' })

    await webpush.sendNotification(subscription, body)

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err: any) {
    console.error('Push send error', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
