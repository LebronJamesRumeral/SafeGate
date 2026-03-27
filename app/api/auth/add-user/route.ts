import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, full_name, role } = body;

    if (!email || !password || !role) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
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

    // Create user in auth.users
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: full_name || '',
        role,
      },
      email_confirm: true,
    });

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    // Optionally, insert into profiles table for additional info
    if (data?.user?.id) {
      await supabase.from('profiles').insert([
        {
          id: data.user.id,
          full_name: full_name || '',
          role,
        },
      ]);
    }

    return Response.json({ success: true, user: data.user });
  } catch (error) {
    return Response.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
