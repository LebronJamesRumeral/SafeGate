import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { endpoint } = await req.json()
    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Missing endpoint' }), { status: 400 })
    }

    if (supabase) {
      const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
      if (error) console.error('Supabase delete error', error)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err: any) {
    console.error('Unsubscribe error', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
