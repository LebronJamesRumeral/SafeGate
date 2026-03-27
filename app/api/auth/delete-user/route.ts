import { createClient } from '@supabase/supabase-js';

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return Response.json({ success: false, error: 'Missing user id' }, { status: 400 });
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json({ success: false, error: 'Missing Supabase service credentials' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
