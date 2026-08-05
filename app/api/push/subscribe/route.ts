import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { subscription, user_id } = await req.json()
    if (!subscription || !subscription.endpoint) {
      return new Response(JSON.stringify({ error: 'Invalid subscription' }), { status: 400 })
    }

    // If supabase client available, persist subscription
    if (supabase) {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .upsert({ endpoint: subscription.endpoint, keys: subscription.keys, user_id: user_id || null }, { onConflict: ['endpoint'] })

      if (error) {
        console.error('Supabase upsert error', error)
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err: any) {
    console.error('Subscribe error', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
